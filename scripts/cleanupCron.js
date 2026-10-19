#!/usr/bin/env node
/**
 * Standalone Audio Storage Cleanup Cron Script
 * 
 * Can be run manually or as a system cron job:
 * Usage:
 *   node scripts/cleanupCron.js
 *   node scripts/cleanupCron.js --hours=24
 *   node scripts/cleanupCron.js --all
 * 
 * Example Linux crontab (runs every hour):
 *   0 * * * * cd /path/to/Ai-voice && node scripts/cleanupCron.js >> /var/log/ai-voice-cleanup.log 2>&1
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { cleanupOldAudioFiles } = require('../utils/storageCleanup');

async function main() {
  const args = process.argv.slice(2);
  let olderThanHours = 24;
  let deleteAll = false;

  for (const arg of args) {
    if (arg.startsWith('--hours=')) {
      olderThanHours = parseFloat(arg.split('=')[1]) || 24;
    } else if (arg === '--all') {
      deleteAll = true;
    }
  }

  console.log(`[Cron Task] Running audio storage cleanup at ${new Date().toISOString()}...`);
  console.log(`[Cron Task] Policy: ${deleteAll ? 'DELETE ALL' : `Older than ${olderThanHours} hours`}`);

  try {
    const result = await cleanupOldAudioFiles({ olderThanHours, deleteAll });
    console.log(`[Cron Task] Success! Deleted ${result.deletedCount} files, Freed ${result.freedMb} MB.`);
    console.log(`[Cron Task] Remaining active audio files: ${result.remainingCount}`);
    process.exit(0);
  } catch (err) {
    console.error('[Cron Task] Error executing audio cleanup:', err);
    process.exit(1);
  }
}

main();
