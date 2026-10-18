const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { execFile, spawn } = require('child_process');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON body parser middleware
app.use(cors());
app.use(express.json());

// Ensure required application directories and data files exist
const voicesDir = path.join(__dirname, 'voices');
const audioDir = path.join(__dirname, 'audio');
const tempDir = path.join(__dirname, 'temp');
const historyFile = path.join(__dirname, 'history.json');
const registryFile = path.join(__dirname, 'voices_registry.json');

if (!fs.existsSync(voicesDir)) fs.mkdirSync(voicesDir, { recursive: true });
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
if (!fs.existsSync(historyFile)) fs.writeFileSync(historyFile, JSON.stringify([], null, 2));

const frontendDist = path.join(__dirname, 'frontend', 'dist');

// Serve static assets from frontend build, dedicated audio and voices directories
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}
app.use('/voices', express.static(voicesDir));
app.use('/audio', express.static(audioDir));
app.use(express.static(__dirname));

// Helper: Determine python executable path (checks Docker venv, local venv, and system paths)
const getPythonExecutable = () => {
  if (process.env.PYTHON_PATH) {
    if (fs.existsSync(process.env.PYTHON_PATH)) return process.env.PYTHON_PATH;
    try {
      const { execSync } = require('child_process');
      execSync(`"${process.env.PYTHON_PATH}" --version`, { stdio: 'ignore' });
      return process.env.PYTHON_PATH;
    } catch (e) {}
  }

  // Check Docker / Linux virtual environments
  const optVenvPython = '/opt/venv/bin/python';
  if (fs.existsSync(optVenvPython)) return optVenvPython;

  const venvPythonWin = path.join(__dirname, 'venv', 'Scripts', 'python.exe');
  const venvPythonUnix = path.join(__dirname, 'venv', 'bin', 'python');
  if (fs.existsSync(venvPythonWin)) return venvPythonWin;
  if (fs.existsSync(venvPythonUnix)) return venvPythonUnix;

  const { execSync } = require('child_process');

  // Test python3 command in PATH
  try {
    execSync('python3 --version', { stdio: 'ignore' });
    return 'python3';
  } catch (e) {}

  // Test python command in PATH
  try {
    execSync('python --version', { stdio: 'ignore' });
    return 'python';
  } catch (e) {}

  // Common Linux paths
  if (fs.existsSync('/usr/bin/python3')) return '/usr/bin/python3';
  if (fs.existsSync('/usr/local/bin/python3')) return '/usr/local/bin/python3';
  if (fs.existsSync('/root/.nix-profile/bin/python3')) return '/root/.nix-profile/bin/python3';
  if (fs.existsSync('/usr/bin/python')) return '/usr/bin/python';

  return 'python3';
};

// Log resolved Python executable on server startup
const detectedPython = getPythonExecutable();
console.log(`[TTS Engine] Python runtime resolved to: ${detectedPython}`);
try {
  const { execSync } = require('child_process');
  const pVer = execSync(`"${detectedPython}" --version`, { encoding: 'utf8' }).trim();
  console.log(`[TTS Engine] Python version: ${pVer}`);
} catch (pErr) {
  console.warn(`[TTS Engine] Warning: Could not verify Python executable "${detectedPython}":`, pErr.message);
}

// Active background jobs tracked by deviceId
const activeJobs = new Map();

// =============================================================================
// PERSISTENT WARM PYTHON TTS WORKER DAEMON
// Keeps Python, Edge-TTS, and registries loaded in memory for sub-second synthesis
// =============================================================================
let ttsWorkerProcess = null;
let ttsWorkerReady = false;
const pendingWorkerRequests = new Map();
let workerLineBuffer = '';

const startTtsWorker = () => {
  const pythonBin = getPythonExecutable();
  const workerScript = path.join(__dirname, 'tts_worker.py');

  if (!fs.existsSync(workerScript)) {
    console.warn('[TTS Engine] tts_worker.py not found, will use per-request execution.');
    return;
  }

  try {
    ttsWorkerReady = false;
    ttsWorkerProcess = spawn(pythonBin, [workerScript], {
      cwd: __dirname,
      env: {
        ...process.env,
        COQUI_TOS_AGREED: '1',
        PYTHONIOENCODING: 'utf-8',
        PYTHONUNBUFFERED: '1'
      }
    });

    ttsWorkerProcess.stdout.on('data', (data) => {
      workerLineBuffer += data.toString();
      const lines = workerLineBuffer.split('\n');
      workerLineBuffer = lines.pop();

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        if (line === 'READY') {
          ttsWorkerReady = true;
          console.log('[TTS Engine] Warm Python Daemon is READY and standing by for instant synthesis.');
          continue;
        }

        try {
          const res = JSON.parse(line);
          const reqId = res.id;
          if (reqId && pendingWorkerRequests.has(reqId)) {
            const { resolve, reject, timeoutId } = pendingWorkerRequests.get(reqId);
            clearTimeout(timeoutId);
            pendingWorkerRequests.delete(reqId);
            if (res.success) {
              resolve(res);
            } else {
              reject(new Error(res.error || 'TTS Worker synthesis failed.'));
            }
          }
        } catch (e) {
          console.warn('[TTS Engine] Non-JSON worker output:', line);
        }
      }
    });

    ttsWorkerProcess.stderr.on('data', (data) => {
      const errStr = data.toString().trim();
      if (errStr && !errStr.includes('UserWarning') && !errStr.includes('DeprecationWarning')) {
        console.warn('[TTS Worker Notice]:', errStr);
      }
    });

    ttsWorkerProcess.on('error', (err) => {
      console.error('[TTS Worker Error]:', err.message);
      ttsWorkerReady = false;
    });

    ttsWorkerProcess.on('exit', (code, signal) => {
      console.warn(`[TTS Engine] Worker exited (code: ${code}, signal: ${signal}). Auto-restarting in 1s...`);
      ttsWorkerReady = false;
      ttsWorkerProcess = null;

      for (const [reqId, { reject, timeoutId }] of pendingWorkerRequests.entries()) {
        clearTimeout(timeoutId);
        reject(new Error('TTS Worker process exited unexpectedly.'));
      }
      pendingWorkerRequests.clear();

      setTimeout(startTtsWorker, 1000);
    });
  } catch (err) {
    console.error('[TTS Engine] Failed to spawn warm worker daemon:', err.message);
    ttsWorkerReady = false;
  }
};

startTtsWorker();

/**
 * Cold start direct runner fallback using execFile with automated offline speech.
 */
const runDirectRunner = ({ id, text, referenceVoicePath, language, targetAudioPath, options }) => {
  return new Promise((resolve, reject) => {
    const pythonBin = getPythonExecutable();
    const runnerScript = path.join(__dirname, 'tts_runner.py');
    const timestamp = Date.now();
    const tempScriptPath = path.join(tempDir, `temp_script_${timestamp}_${Math.random().toString(36).substring(7)}.txt`);
    const tempOptionsPath = path.join(tempDir, `temp_opts_${timestamp}_${Math.random().toString(36).substring(7)}.json`);

    fs.writeFileSync(tempScriptPath, text.trim(), 'utf8');
    fs.writeFileSync(tempOptionsPath, JSON.stringify(options || {}), 'utf8');

    const args = [
      runnerScript,
      tempScriptPath,
      referenceVoicePath,
      language,
      targetAudioPath,
      tempOptionsPath
    ];

    const execOptions = {
      cwd: __dirname,
      env: {
        ...process.env,
        COQUI_TOS_AGREED: '1',
        PYTHONIOENCODING: 'utf-8',
        PYTHONUNBUFFERED: '1'
      }
    };

    execFile(pythonBin, args, execOptions, (error, stdout, stderr) => {
      if (fs.existsSync(tempScriptPath)) {
        try { fs.unlinkSync(tempScriptPath); } catch (e) {}
      }
      if (fs.existsSync(tempOptionsPath)) {
        try { fs.unlinkSync(tempOptionsPath); } catch (e) {}
      }

      if (error) {
        return reject(new Error(stderr || error.message));
      }
      resolve({ success: true, stdout, time: 'fallback' });
    });
  });
};

/**
 * Execute speech synthesis via the warm worker with zero-delay auto-recovery fallback.
 */
const synthesizeSpeech = ({ id, text, referenceVoicePath, language, targetAudioPath, options }) => {
  // 1. Primary: Use persistent warm worker for instant speed
  if (ttsWorkerProcess && ttsWorkerReady) {
    return new Promise((resolve, reject) => {
      let settled = false;

      // 20-second threshold: if worker ever stalls, automatically trigger direct execution
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        if (pendingWorkerRequests.has(id)) {
          pendingWorkerRequests.delete(id);
        }
        console.warn(`[TTS Engine] Worker took >20s for ${id}. Seamlessly recovering via direct runner...`);
        runDirectRunner({ id, text, referenceVoicePath, language, targetAudioPath, options })
          .then(resolve)
          .catch(reject);
      }, 20000);

      pendingWorkerRequests.set(id, {
        resolve: (val) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          resolve(val);
        },
        reject: (err) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          console.warn(`[TTS Engine] Worker notice for ${id}: ${err.message}. Seamlessly recovering via direct runner...`);
          runDirectRunner({ id, text, referenceVoicePath, language, targetAudioPath, options })
            .then(resolve)
            .catch(reject);
        },
        timeoutId
      });

      const payload = {
        id,
        text,
        referenceVoice: referenceVoicePath,
        language,
        outputPath: targetAudioPath,
        options
      };

      try {
        ttsWorkerProcess.stdin.write(JSON.stringify(payload) + '\n');
      } catch (writeErr) {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        pendingWorkerRequests.delete(id);
        console.warn(`[TTS Engine] Stdin write error. Using direct runner: ${writeErr.message}`);
        runDirectRunner({ id, text, referenceVoicePath, language, targetAudioPath, options })
          .then(resolve)
          .catch(reject);
      }
    });
  }

  // 2. Direct runner fallback if worker process not currently ready
  return runDirectRunner({ id, text, referenceVoicePath, language, targetAudioPath, options });
};

// Helper functions for history management
const readHistory = () => {
  try {
    if (!fs.existsSync(historyFile)) return [];
    const data = fs.readFileSync(historyFile, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading history.json:', err);
    return [];
  }
};

const appendHistory = (entry) => {
  try {
    const list = readHistory();
    list.unshift(entry); // Newest records at top
    fs.writeFileSync(historyFile, JSON.stringify(list.slice(0, 500), null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing to history.json:', err);
  }
};

// Configure Multer storage for voice sample uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, voicesDir);
  },
  filename: (req, file, cb) => {
    const baseName = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeName = `${baseName}_${Date.now()}.wav`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.wav' || file.mimetype === 'audio/wav' || file.mimetype === 'audio/x-wav') {
      cb(null, true);
    } else {
      cb(new Error('Only .wav audio files are allowed.'));
    }
  }
});

/**
 * GET /api/health
 * Health check endpoint for frontend connectivity indicator
 */
app.get('/api/health', (req, res) => {
  const voices = fs.readdirSync(voicesDir).filter(f => f.toLowerCase().endsWith('.wav'));
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
    voicesAvailable: voices.length,
    pythonExecutable: getPythonExecutable()
  });
});

/**
 * GET /api/voices
 * Lists all available .wav reference voice files and rich registry metadata
 */
app.get('/api/voices', (req, res) => {
  try {
    const files = fs.readdirSync(voicesDir).filter(file => file.toLowerCase().endsWith('.wav'));
    let registry = [];
    if (fs.existsSync(registryFile)) {
      try {
        registry = JSON.parse(fs.readFileSync(registryFile, 'utf8') || '[]');
      } catch (e) {
        console.error('Error reading voices_registry.json:', e);
      }
    }

    const categories = Array.from(new Set(registry.map(v => v.category).filter(Boolean)));
    const languages = Array.from(new Set(registry.map(v => v.language).filter(Boolean)));

    res.json({
      voices: files,
      registry: registry,
      totalVoices: registry.length || files.length,
      categories: categories,
      languages: languages
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve voice samples.' });
  }
});

/**
 * POST /api/upload-voice
 * Accepts a .wav file upload and stores it inside voices/
 */
app.post('/api/upload-voice', upload.single('voiceSample'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please select a valid .wav audio file to upload.' });
  }

  console.log(`New reference voice uploaded: ${req.file.filename}`);
  return res.json({
    success: true,
    message: 'Voice sample uploaded successfully!',
    filename: req.file.filename
  });
});

/**
 * GET /api/history
 * Returns voice conversion records filtered strictly by deviceId
 */
app.get('/api/history', (req, res) => {
  const { deviceId } = req.query;
  if (!deviceId) {
    return res.json({ history: [], activeJobs: [] });
  }
  const allHistory = readHistory();
  const deviceHistory = allHistory.filter(item => item.deviceId === deviceId);
  const deviceActiveJobs = Array.from(activeJobs.values()).filter(item => item.deviceId === deviceId);
  return res.json({ history: deviceHistory, activeJobs: deviceActiveJobs });
});

/**
 * DELETE /api/history
 * Deletes records for a specific deviceId (all or single item) and safely cleans up audio files
 */
app.delete('/api/history', (req, res) => {
  try {
    const { deviceId, itemId } = req.query;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required to delete history.' });
    }

    const allHistory = readHistory();
    let toDelete = [];
    let remaining = [];

    if (itemId) {
      toDelete = allHistory.filter(item => item.deviceId === deviceId && item.id === itemId);
      remaining = allHistory.filter(item => !(item.deviceId === deviceId && item.id === itemId));
    } else {
      toDelete = allHistory.filter(item => item.deviceId === deviceId);
      remaining = allHistory.filter(item => item.deviceId !== deviceId);
    }

    // Safely remove associated audio files from disk
    toDelete.forEach(entry => {
      if (entry.audioUrl) {
        const filename = path.basename(entry.audioUrl);
        const filePath = path.join(audioDir, filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            console.warn(`Could not delete audio file ${filename}:`, e.message);
          }
        }
      }
    });

    fs.writeFileSync(historyFile, JSON.stringify(remaining, null, 2), 'utf8');

    return res.json({
      success: true,
      deletedCount: toDelete.length,
      remainingCount: remaining.filter(item => item.deviceId === deviceId).length
    });
  } catch (err) {
    console.error('Error deleting device history:', err);
    return res.status(500).json({ error: 'Failed to delete history.', details: err.message });
  }
});


/**
 * POST /api/clone-voice
 * Executes Python runner using execFile with emotion & acoustic modulation support
 */
app.post('/api/clone-voice', async (req, res) => {
  const {
    text,
    referenceVoice,
    speed = -8,
    pitch = -4,
    pause = 0.22,
    deviceId = 'anonymous',
    language = null
  } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text prompt is required.' });
  }

  // Flexible Voice Resolution: filename, id, name, or fallback
  let resolvedVoiceFilename = null;
  const cleanVoiceInput = (referenceVoice || '').trim();

  // 1. Direct file match in voices directory
  if (cleanVoiceInput && fs.existsSync(path.join(voicesDir, path.basename(cleanVoiceInput)))) {
    resolvedVoiceFilename = path.basename(cleanVoiceInput);
  } else if (cleanVoiceInput && fs.existsSync(path.join(voicesDir, `${path.basename(cleanVoiceInput)}.wav`))) {
    resolvedVoiceFilename = `${path.basename(cleanVoiceInput)}.wav`;
  }

  // 2. Registry match by id, name, or filename
  let registryMatch = null;
  let registry = [];
  if (fs.existsSync(registryFile)) {
    try {
      registry = JSON.parse(fs.readFileSync(registryFile, 'utf8') || '[]');
      registryMatch = registry.find(v => 
        v.filename === cleanVoiceInput ||
        v.name === cleanVoiceInput ||
        v.id === cleanVoiceInput ||
        v.name.toLowerCase() === cleanVoiceInput.toLowerCase() ||
        (v.filename && v.filename.toLowerCase() === cleanVoiceInput.toLowerCase())
      );
      if (registryMatch && registryMatch.filename && fs.existsSync(path.join(voicesDir, registryMatch.filename))) {
        resolvedVoiceFilename = registryMatch.filename;
      }
    } catch (e) {}
  }

  // 3. Case-insensitive filesystem fallback
  if (!resolvedVoiceFilename) {
    try {
      const allFiles = fs.readdirSync(voicesDir);
      const lowerInput = cleanVoiceInput.toLowerCase();
      const found = allFiles.find(f => f.toLowerCase() === lowerInput || f.toLowerCase() === `${lowerInput}.wav`);
      if (found) resolvedVoiceFilename = found;
    } catch (e) {}
  }

  // 4. Default fallback: Adam (Deep Narration) or first available voice in voicesDir
  if (!resolvedVoiceFilename) {
    const defaultAdam = 'Adam (Deep Narration - ElevenLabs Style).wav';
    if (fs.existsSync(path.join(voicesDir, defaultAdam))) {
      resolvedVoiceFilename = defaultAdam;
    } else {
      const allWavs = fs.readdirSync(voicesDir).filter(f => f.toLowerCase().endsWith('.wav'));
      if (allWavs.length > 0) resolvedVoiceFilename = allWavs[0];
    }
  }

  if (!resolvedVoiceFilename) {
    return res.status(404).json({ error: 'No voice samples found on server.' });
  }

  const absoluteVoicePath = path.join(voicesDir, resolvedVoiceFilename);

  // Detect language from registry if not explicitly provided
  let detectedLang = language || 'en';
  if (!language && registry.length > 0) {
    const match = registryMatch || registry.find(v => v.filename === resolvedVoiceFilename || v.name === resolvedVoiceFilename);
    if (match && match.languageCode) {
      detectedLang = match.languageCode;
    }
  }

  const timestamp = Date.now();
  const audioFilename = `output_${timestamp}.mp3`;
  const targetAudioPath = path.join(audioDir, audioFilename);
  const jobId = `conv_${timestamp}`;

  const optionsPayload = {
    speed: (speed !== undefined && speed !== null) ? parseInt(speed) : -8,
    pitch: (pitch !== undefined && pitch !== null) ? parseInt(pitch) : -4,
    pause: parseFloat(pause) || 0.22
  };

  // Register in activeJobs so frontend polling can see in-progress generation
  activeJobs.set(jobId, {
    id: jobId,
    deviceId: deviceId,
    timestamp: new Date().toISOString(),
    text: text.trim().length > 120 ? text.trim().substring(0, 120) + '...' : text.trim(),
    referenceVoice: resolvedVoiceFilename,
    status: 'generating'
  });

  try {
    console.log(`[TTS Engine] Synthesizing voice "${resolvedVoiceFilename}" (${detectedLang}) for device ${deviceId}...`);
    const t0 = Date.now();
    const result = await synthesizeSpeech({
      id: jobId,
      text: text.trim(),
      referenceVoicePath: absoluteVoicePath,
      language: detectedLang,
      targetAudioPath: targetAudioPath,
      options: optionsPayload
    });

    const elapsedMs = Date.now() - t0;
    console.log(`[TTS Engine] Completed in ${elapsedMs}ms: ${audioFilename}`);

    const audioUrl = `/audio/${audioFilename}`;
    const historyEntry = {
      id: jobId,
      deviceId: deviceId,
      timestamp: new Date().toISOString(),
      text: text.trim().length > 120 ? text.trim().substring(0, 120) + '...' : text.trim(),
      referenceVoice: resolvedVoiceFilename,
      audioUrl: audioUrl
    };

    appendHistory(historyEntry);
    activeJobs.delete(jobId);

    return res.json({
      success: true,
      audioUrl: audioUrl,
      historyRecord: historyEntry,
      duration: `${(elapsedMs / 1000).toFixed(2)}s`
    });
  } catch (error) {
    activeJobs.delete(jobId);
    console.error('[TTS Engine] Synthesis failed:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Voice cloning generation failed.',
      details: error.message
    });
  }
});

/**
 * DELETE /api/cleanup-audio
 * Server-side cleanup utility to delete old or all generated audio files
 */
app.delete('/api/cleanup-audio', (req, res) => {
  try {
    const { all, olderThanHours } = req.query;
    const files = fs.readdirSync(audioDir).filter(f => f.startsWith('output_') && (f.endsWith('.mp3') || f.endsWith('.wav')));
    let deletedCount = 0;
    const now = Date.now();
    const maxAgeMs = olderThanHours ? parseFloat(olderThanHours) * 3600 * 1000 : 0;

    files.forEach(file => {
      const filePath = path.join(audioDir, file);
      let shouldDelete = false;

      if (all === 'true' || (!olderThanHours && all !== 'false')) {
        shouldDelete = true;
      } else if (maxAgeMs > 0) {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          shouldDelete = true;
        }
      }

      if (shouldDelete) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });

    // Synchronize history.json to only contain audio files that still exist on disk
    const remainingFiles = new Set(fs.readdirSync(audioDir));
    const currentHistory = readHistory();
    const updatedHistory = (all === 'true')
      ? []
      : currentHistory.filter(item => {
          const filename = path.basename(item.audioUrl);
          return remainingFiles.has(filename);
        });

    fs.writeFileSync(historyFile, JSON.stringify(updatedHistory, null, 2), 'utf8');

    return res.json({
      success: true,
      message: `Cleaned up ${deletedCount} audio file(s).`,
      deletedCount,
      remainingCount: remainingFiles.size
    });
  } catch (err) {
    console.error('Cleanup operation failed:', err);
    return res.status(500).json({ error: 'Failed to clean audio storage.', details: err.message });
  }
});

// SPA Fallback: Serve frontend/dist/index.html for client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/audio') || req.path.startsWith('/voices')) {
    return next();
  }
  const indexPath = path.join(frontendDist, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(200).send(`
    <!DOCTYPE html>
    <html>
      <head><title>SK - VoiceClone Studio</title></head>
      <body style="font-family:sans-serif;background:#09090b;color:#f4f4f5;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
        <div style="text-align:center;max-width:500px;padding:24px;border:1px solid #27272a;border-radius:16px;background:#18181b;">
          <h2>SK - VoiceClone Studio Backend Active</h2>
          <p style="color:#a1a1aa;font-size:14px;">The API server is running, but the frontend build was not found in <code>frontend/dist</code>.</p>
          <p style="color:#a1a1aa;font-size:13px;">If you just deployed to Railway, ensure the build command <code>npm run build</code> ran during deployment.</p>
        </div>
      </body>
    </html>
  `);
});

// Multer & Error Handling Middleware
app.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message || 'Server error occurred.' });
  }
  next();
});

// Start the Express server
const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` AI Voice Cloning Backend Server Running!`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` Voices directory: ${voicesDir}`);
  console.log(` Audio output directory: ${audioDir}`);
  console.log(` Python executable: ${getPythonExecutable()}`);
  console.log(`===============================================`);
});

// Clean up child process on shutdown
const cleanUpWorker = () => {
  if (ttsWorkerProcess) {
    try {
      ttsWorkerProcess.kill();
    } catch (e) {}
    ttsWorkerProcess = null;
  }
};
process.on('SIGINT', () => { cleanUpWorker(); process.exit(0); });
process.on('SIGTERM', () => { cleanUpWorker(); process.exit(0); });
process.on('exit', cleanUpWorker);
