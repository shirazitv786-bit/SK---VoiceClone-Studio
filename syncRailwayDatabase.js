require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { prisma } = require('./prismaClient');

async function syncAllDataToRailway() {
  console.log('====================================================');
  console.log('🚀 Synchronizing All Data with Railway PostgreSQL');
  console.log('====================================================');

  // 1. Superadmin Synchronization
  const superadminEmail = (process.env.SUPERADMIN_EMAIL || 'admin@voiceclonestudio.com').trim().toLowerCase();
  const superadminPassword = process.env.SUPERADMIN_PASSWORD || 'SuperAdminSecret2026!';
  const superadminName = process.env.SUPERADMIN_NAME || 'Super Administrator';

  const hashedPassword = await bcrypt.hash(superadminPassword, 10);

  const superadmin = await prisma.user.upsert({
    where: { email: superadminEmail },
    update: {
      name: superadminName,
      password: hashedPassword,
      role: 'superadmin',
      status: 'active',
      plan: 'Studio',
      credits: 1000000
    },
    create: {
      name: superadminName,
      email: superadminEmail,
      password: hashedPassword,
      role: 'superadmin',
      status: 'active',
      plan: 'Studio',
      credits: 1000000
    }
  });

  console.log(`✅ [1/4] Superadmin account synced: ${superadmin.email} (Role: ${superadmin.role}, Credits: ${superadmin.credits.toLocaleString()})`);

  // 2. System Settings Synchronization
  const defaultSettings = [
    { key: 'free_tier_credits', value: '2000' },
    { key: 'maintenance_mode', value: 'false' },
    { key: 'announcement_banner', value: 'Welcome to SK VoiceClone Studio! 2,000 Free Credits added on registration.' },
    { key: 'max_script_length_free', value: '500' },
    { key: 'max_script_length_paid', value: '5000' },
    { key: 'platform_title', value: 'SK - VoiceClone Studio' },
    { key: 'contact_email', value: 'support@voiceclonestudio.com' },
    { key: 'default_model', value: 'XTTS-v2' },
    { key: 'max_queued_tasks', value: '5' }
  ];

  for (const s of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value }
    });
  }
  console.log(`✅ [2/4] System settings synced (${defaultSettings.length} keys active).`);

  // 3. Voices Registry Synchronization (120 AI Reference Voices)
  const registryFile = path.join(__dirname, 'voices_registry.json');
  let voicesSyncedCount = 0;

  if (fs.existsSync(registryFile)) {
    try {
      const voices = JSON.parse(fs.readFileSync(registryFile, 'utf8') || '[]');
      console.log(`Found ${voices.length} voice definitions in voices_registry.json. Uploading to PostgreSQL...`);

      for (const v of voices) {
        const slug = v.id || v.filename.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
        await prisma.voice.upsert({
          where: { slug },
          update: {
            name: v.name,
            filename: v.filename,
            category: v.category || 'General',
            language: v.language || 'English',
            languageCode: v.languageCode || 'en',
            gender: v.gender || 'Unknown',
            description: v.description || '',
            previewText: v.previewText || '',
            tags: Array.isArray(v.tags) ? v.tags : [],
            neuralVoice: v.neuralVoice || null,
            isCustom: false
          },
          create: {
            slug,
            name: v.name,
            filename: v.filename,
            category: v.category || 'General',
            language: v.language || 'English',
            languageCode: v.languageCode || 'en',
            gender: v.gender || 'Unknown',
            description: v.description || '',
            previewText: v.previewText || '',
            tags: Array.isArray(v.tags) ? v.tags : [],
            neuralVoice: v.neuralVoice || null,
            isCustom: false
          }
        });
        voicesSyncedCount++;
      }
      console.log(`✅ [3/4] Voices database populated: ${voicesSyncedCount} reference voices stored in Railway PostgreSQL.`);
    } catch (err) {
      console.error('❌ Error synchronizing voices registry:', err.message);
    }
  } else {
    console.warn('⚠️ voices_registry.json not found, skipping voice table populate.');
  }

  // 4. Historical Generations Synchronization (from history.json)
  const historyFile = path.join(__dirname, 'history.json');
  let gensSyncedCount = 0;

  if (fs.existsSync(historyFile)) {
    try {
      const history = JSON.parse(fs.readFileSync(historyFile, 'utf8') || '[]');
      console.log(`Found ${history.length} historical generation records in history.json. Syncing...`);

      for (const item of history) {
        const charCount = (item.text || '').length;
        const recordId = item.id || `conv_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const existing = await prisma.generation.findUnique({ where: { id: recordId } });
        if (!existing) {
          await prisma.generation.create({
            data: {
              id: recordId,
              userId: superadmin.id,
              deviceId: item.deviceId || 'legacy-device',
              text: (item.text || '').substring(0, 500),
              referenceVoice: item.referenceVoice || 'Adam (Deep Narration - ElevenLabs Style).wav',
              audioUrl: item.audioUrl || '',
              speed: -8,
              pitch: -4,
              pause: 0.22,
              charsUsed: charCount,
              createdAt: item.timestamp ? new Date(item.timestamp) : new Date()
            }
          });
          gensSyncedCount++;
        }
      }
      console.log(`✅ [4/4] Historical generations synced: ${gensSyncedCount} records added to Railway PostgreSQL.`);
    } catch (err) {
      console.error('❌ Error synchronizing history records:', err.message);
    }
  }

  // Final Verification Summary
  const [totalUsers, totalSettings, totalVoices, totalGens] = await Promise.all([
    prisma.user.count(),
    prisma.systemSetting.count(),
    prisma.voice.count(),
    prisma.generation.count()
  ]);

  console.log('====================================================');
  console.log('🎉 Railway PostgreSQL Synchronization COMPLETE!');
  console.log(`- Total Users in DB: ${totalUsers}`);
  console.log(`- Total Settings in DB: ${totalSettings}`);
  console.log(`- Total Voices in DB: ${totalVoices}`);
  console.log(`- Total Generations in DB: ${totalGens}`);
  console.log('====================================================');
}

syncAllDataToRailway()
  .catch((e) => {
    console.error('Fatal sync error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
