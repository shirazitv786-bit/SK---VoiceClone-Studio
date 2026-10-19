const bcrypt = require('bcryptjs');
const { prisma } = require('./prismaClient');

/**
 * Ensures the superadmin user defined in .env exists and has superadmin privileges.
 * Also initializes default system settings if they do not yet exist.
 */
async function bootstrapSuperadmin() {
  try {
    const adminEmail = (process.env.SUPERADMIN_EMAIL || 'admin@voiceclonestudio.com').trim().toLowerCase();
    const adminPassword = process.env.SUPERADMIN_PASSWORD || 'SuperAdminSecret2026!';
    const adminName = process.env.SUPERADMIN_NAME || 'Super Administrator';

    // 1. Check if superadmin user exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!existingAdmin) {
      console.log(`[Superadmin] Provisioning initial superadmin account: ${adminEmail}...`);
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const newAdmin = await prisma.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
          role: 'superadmin',
          status: 'active',
          plan: 'Studio',
          credits: 1000000
        }
      });
      console.log(`[Superadmin] Successfully created superadmin (${newAdmin.email}) with 1,000,000 credits.`);
    } else {
      // Ensure superadmin role and active status
      if (existingAdmin.role !== 'superadmin' || existingAdmin.status !== 'active') {
        await prisma.user.update({
          where: { id: existingAdmin.id },
          data: {
            role: 'superadmin',
            status: 'active'
          }
        });
        console.log(`[Superadmin] Upgraded ${adminEmail} to superadmin role.`);
      }
    }

    // 2. Initialize default system settings if missing
    const defaultSettings = [
      { key: 'free_tier_credits', value: '2000' },
      { key: 'maintenance_mode', value: 'false' },
      { key: 'announcement_banner', value: 'Welcome to SK - VoiceClone Studio! Commercial Neural Audio is Live.' },
      { key: 'max_script_length_free', value: '2500' },
      { key: 'max_script_length_paid', value: '15000' }
    ];

    for (const s of defaultSettings) {
      const exists = await prisma.systemSetting.findUnique({ where: { key: s.key } });
      if (!exists) {
        await prisma.systemSetting.create({ data: s });
      }
    }
  } catch (err) {
    console.error('[Superadmin Bootstrap Warning]:', err.message);
  }
}

module.exports = {
  bootstrapSuperadmin
};
