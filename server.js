const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
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

// Helper: Determine python executable path (checks local venv first, unquoted for execFile)
const getPythonExecutable = () => {
  if (process.env.PYTHON_PATH) return process.env.PYTHON_PATH;
  const venvPythonWin = path.join(__dirname, 'venv', 'Scripts', 'python.exe');
  const venvPythonUnix = path.join(__dirname, 'venv', 'bin', 'python');
  if (fs.existsSync(venvPythonWin)) return venvPythonWin;
  if (fs.existsSync(venvPythonUnix)) return venvPythonUnix;

  // On Linux (Railway, Docker, Ubuntu), test if python3 is available
  try {
    const { execSync } = require('child_process');
    execSync('python3 --version', { stdio: 'ignore' });
    return 'python3';
  } catch (e) {
    return 'python';
  }
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
    fs.writeFileSync(historyFile, JSON.stringify(list.slice(0, 100), null, 2), 'utf8');
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
 * Lists all available .wav reference voice files
 */
app.get('/api/voices', (req, res) => {
  try {
    const files = fs.readdirSync(voicesDir).filter(file => file.toLowerCase().endsWith('.wav'));
    res.json({ voices: files });
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
 * Returns the list of past script voice conversion records
 */
app.get('/api/history', (req, res) => {
  const history = readHistory();
  res.json({ history });
});

/**
 * GET /api/emotions
 * Returns available emotion profiles and acoustic modulation metadata
 */
app.get('/api/emotions', (req, res) => {
  res.json({
    emotions: [
      { id: 'neutral', label: 'Neutral / Balanced', icon: '🌟', description: 'Natural baseline conversational delivery', defaultRate: '+0%', defaultPitch: '+0Hz' },
      { id: 'cheerful', label: 'Cheerful', icon: '😊', description: 'High energy, smiling tone, bright inflection', defaultRate: '+12%', defaultPitch: '+8Hz' },
      { id: 'excited', label: 'Excited', icon: '🤩', description: 'Rapid pacing, dynamic pitch shifts', defaultRate: '+22%', defaultPitch: '+14Hz' },
      { id: 'sad', label: 'Sad', icon: '😢', description: 'Lower energy, slower pacing, subdued delivery', defaultRate: '-18%', defaultPitch: '-8Hz' },
      { id: 'empathetic', label: 'Empathetic / Friendly', icon: '💖', description: 'Soft, caring, warm tone (great for customer service or podcasts)', defaultRate: '-5%', defaultPitch: '+3Hz' },
      { id: 'whispering', label: 'Whispering / Soft', icon: '🤫', description: 'Lower volume, breathy, intimate sound', defaultRate: '-8%', defaultPitch: '-4Hz' },
      { id: 'angry', label: 'Angry', icon: '😠', description: 'Intense, stressed inflection', defaultRate: '+10%', defaultPitch: '+5Hz' },
      { id: 'terrified', label: 'Terrified', icon: '😨', description: 'Breathless, trembling, high stress inflection', defaultRate: '+15%', defaultPitch: '+10Hz' },
      { id: 'newscast', label: 'Newscast / Documentary', icon: '🎙️', description: 'Calm, authoritative, formal broadcast tone', defaultRate: '+0%', defaultPitch: '-2Hz' }
    ]
  });
});

/**
 * POST /api/clone-voice
 * Executes Python runner using execFile with emotion & acoustic modulation support
 */
app.post('/api/clone-voice', (req, res) => {
  const {
    text,
    referenceVoice,
    emotion = 'neutral',
    styleDegree = 1.0,
    speed = -8,
    pitch = -4,
    pause = 0.22
  } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text prompt is required.' });
  }

  if (!referenceVoice || !referenceVoice.trim()) {
    return res.status(400).json({ error: 'Reference voice selection is required.' });
  }

  const referenceVoicePath = path.join('voices', path.basename(referenceVoice));
  const absoluteVoicePath = path.join(__dirname, referenceVoicePath);

  if (!fs.existsSync(absoluteVoicePath)) {
    return res.status(404).json({
      error: `Reference voice sample "${referenceVoice}" not found on server.`
    });
  }

  // Generate unique timestamped output audio filename and destination path
  const timestamp = Date.now();
  const audioFilename = `output_${timestamp}.wav`;
  const targetAudioPath = path.join(audioDir, audioFilename);

  // Temporary file for safe script handling without Windows CLI arg limits
  const tempScriptPath = path.join(tempDir, `temp_script_${timestamp}_${Math.random().toString(36).substring(7)}.txt`);
  fs.writeFileSync(tempScriptPath, text.trim(), 'utf8');

  // Temporary file for emotion & acoustic modulation options
  const tempOptionsPath = path.join(tempDir, `temp_opts_${timestamp}_${Math.random().toString(36).substring(7)}.json`);
  const optionsPayload = {
    emotion: emotion || 'neutral',
    styleDegree: parseFloat(styleDegree) || 1.0,
    speed: (speed !== undefined && speed !== null) ? parseInt(speed) : -8,
    pitch: (pitch !== undefined && pitch !== null) ? parseInt(pitch) : -4,
    pause: parseFloat(pause) || 0.22
  };
  fs.writeFileSync(tempOptionsPath, JSON.stringify(optionsPayload), 'utf8');

  const pythonBin = getPythonExecutable();
  const runnerScript = path.join(__dirname, 'tts_runner.py');

  // Arguments array passed directly to OS without cmd.exe shell interpolation
  const args = [
    runnerScript,
    tempScriptPath,
    absoluteVoicePath,
    'en',
    targetAudioPath,
    tempOptionsPath
  ];

  console.log(`Executing voice cloning via: ${pythonBin}`);
  console.log(`Target output: ${audioFilename} [Emotion: ${optionsPayload.emotion}, StyleDegree: ${optionsPayload.styleDegree}]`);

  // Child process execution options with Coqui license agreement environment variable
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
    // Cleanup temporary files
    if (fs.existsSync(tempScriptPath)) {
      try {
        fs.unlinkSync(tempScriptPath);
      } catch (e) {
        console.error('Failed to remove temp script file:', e);
      }
    }

    if (fs.existsSync(tempOptionsPath)) {
      try {
        fs.unlinkSync(tempOptionsPath);
      } catch (e) {
        console.error('Failed to remove temp options file:', e);
      }
    }

    if (error) {
      console.error('Python TTS execution failed:\n', stderr || error.message);
      return res.status(500).json({
        success: false,
        error: 'Voice cloning generation failed.',
        details: stderr || error.message
      });
    }

    console.log('Python script output:', stdout);

    // Relative audio URL served via /audio route
    const audioUrl = `/audio/${audioFilename}`;

    // Record this conversion in history.json
    const historyEntry = {
      id: `conv_${timestamp}`,
      timestamp: new Date().toISOString(),
      text: text.trim().length > 120 ? text.trim().substring(0, 120) + '...' : text.trim(),
      referenceVoice: referenceVoice,
      emotion: optionsPayload.emotion,
      styleDegree: optionsPayload.styleDegree,
      audioUrl: audioUrl
    };

    appendHistory(historyEntry);

    return res.json({
      success: true,
      audioUrl: audioUrl,
      historyRecord: historyEntry
    });
  });
});

/**
 * DELETE /api/cleanup-audio
 * Server-side cleanup utility to delete old or all generated audio files
 */
app.delete('/api/cleanup-audio', (req, res) => {
  try {
    const { all, olderThanHours } = req.query;
    const files = fs.readdirSync(audioDir).filter(f => f.startsWith('output_') && f.endsWith('.wav'));
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
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` AI Voice Cloning Backend Server Running!`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` Voices directory: ${voicesDir}`);
  console.log(` Audio output directory: ${audioDir}`);
  console.log(` Python executable: ${getPythonExecutable()}`);
  console.log(`===============================================`);
});
