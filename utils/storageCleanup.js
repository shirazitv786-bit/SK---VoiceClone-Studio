const fs = require('fs');
const path = require('path');
const { prisma } = require('../prismaClient');

const RETENTION_HOURS_DEFAULT = 24;
const DEFAULT_AUDIO_DIR = path.join(__dirname, '..', 'audio');
const HISTORY_FILE = path.join(__dirname, '..', 'history.json');

/**
 * Scans the audio directory and removes generated voice clips older than retention window.
 * Keeps all database text, prompt, voice, and user metadata completely intact.
 *
 * @param {Object} options
 * @param {number} [options.olderThanHours=24] Max age in hours before a file is considered expired
 * @param {string} [options.audioDir] Target directory to clean
 * @param {boolean} [options.deleteAll=false] Force delete all temporary generated outputs
 * @returns {Promise<{deletedCount: number, freedBytes: number, remainingCount: number}>}
 */
async function cleanupOldAudioFiles({
  olderThanHours = RETENTION_HOURS_DEFAULT,
  audioDir = DEFAULT_AUDIO_DIR,
  deleteAll = false
} = {}) {
  let deletedCount = 0;
  let freedBytes = 0;

  if (!fs.existsSync(audioDir)) {
    return { deletedCount: 0, freedBytes: 0, remainingCount: 0 };
  }

  const now = Date.now();
  const maxAgeMs = olderThanHours * 3600 * 1000;
  const files = fs.readdirSync(audioDir);
  const deletedJobIds = [];

  for (const file of files) {
    // Only clean temporary generated output files (leave permanent voice samples untouched!)
    if (!file.startsWith('output_') || (!file.endsWith('.mp3') && !file.endsWith('.wav'))) {
      continue;
    }

    const filePath = path.join(audioDir, file);
    try {
      const stats = fs.statSync(filePath);
      const fileAgeMs = now - stats.mtimeMs;

      if (deleteAll || fileAgeMs > maxAgeMs) {
        freedBytes += stats.size;
        fs.unlinkSync(filePath);
        deletedCount++;

        // Extract jobId: output_<jobId>.mp3 -> <jobId>
        const jobId = file.replace(/^output_/, '').replace(/\.(mp3|wav)$/, '');
        deletedJobIds.push({ jobId, filename: file });
      }
    } catch (err) {
      console.warn(`[Storage Cleanup] Warning removing file "${file}":`, err.message);
    }
  }

  // Synchronize PostgreSQL database: mark records as expired while preserving text/metadata
  if (deletedJobIds.length > 0) {
    try {
      const ids = deletedJobIds.map(d => d.jobId);
      const filenames = deletedJobIds.map(d => `/audio/${d.filename}`);

      await prisma.generation.updateMany({
        where: {
          OR: [
            { id: { in: ids } },
            { audioUrl: { in: filenames } }
          ]
        },
        data: {
          isExpired: true
        }
      });
    } catch (dbErr) {
      console.warn('[Storage Cleanup DB Sync Warning]:', dbErr.message);
    }

    // Update history.json if it exists (preserve prompt & metadata, mark isExpired: true)
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        const historyRaw = fs.readFileSync(HISTORY_FILE, 'utf8');
        const history = JSON.parse(historyRaw);
        const deletedFileSet = new Set(deletedJobIds.map(d => d.filename));

        let modified = false;
        const updated = history.map(item => {
          if (item.audioUrl) {
            const fname = path.basename(item.audioUrl);
            if (deletedFileSet.has(fname)) {
              modified = true;
              return { ...item, isExpired: true, audioUrl: null };
            }
          }
          return item;
        });

        if (modified) {
          fs.writeFileSync(HISTORY_FILE, JSON.stringify(updated, null, 2), 'utf8');
        }
      }
    } catch (histErr) {
      // Non-blocking
    }
  }

  const remainingFiles = fs.readdirSync(audioDir).filter(f => f.startsWith('output_'));
  const freedMb = (freedBytes / (1024 * 1024)).toFixed(2);

  if (deletedCount > 0) {
    console.log(`[Storage Cleanup] Purged ${deletedCount} audio file(s) older than ${olderThanHours}h. Freed: ${freedMb} MB. Remaining: ${remainingFiles.length} file(s).`);
  }

  return {
    deletedCount,
    freedBytes,
    freedMb,
    remainingCount: remainingFiles.length
  };
}

/**
 * Initializes the background scheduled cleanup worker
 * Runs automatically every `intervalMinutes` (default: every 30 minutes)
 */
function initScheduledCleanup({ intervalMinutes = 30, olderThanHours = 24 } = {}) {
  const intervalMs = intervalMinutes * 60 * 1000;

  // Run initial cleanup 5 seconds after server start to clear any files expired during downtime
  setTimeout(() => {
    cleanupOldAudioFiles({ olderThanHours }).catch(e => {
      console.error('[Storage Cleanup Initial Run Error]:', e.message);
    });
  }, 5000);

  // Set recurring interval
  const timer = setInterval(() => {
    cleanupOldAudioFiles({ olderThanHours }).catch(e => {
      console.error('[Storage Cleanup Worker Error]:', e.message);
    });
  }, intervalMs);

  // Allow Node.js process to exit gracefully if only this timer is open
  if (timer.unref) timer.unref();

  console.log(`[Storage Cleanup Service] Scheduled auto-cleanup every ${intervalMinutes} mins for files older than ${olderThanHours} hours.`);
  return timer;
}

module.exports = {
  cleanupOldAudioFiles,
  initScheduledCleanup,
  RETENTION_HOURS_DEFAULT
};
