require('dotenv').config();
const { prisma } = require('./prismaClient');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sk_voiceclone_studio_secret_key_jwt_2026_production_v1';
const BASE_URL = 'http://localhost:5000';

async function runSecurityAudit() {
  console.log('====================================================');
  console.log('🔒 Comprehensive Backend Security & DB Audit Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // TEST 1: Railway Database Integrity
  console.log('--- TEST 1: Railway PostgreSQL Data Verification ---');
  const superadminEmail = (process.env.SUPERADMIN_EMAIL || 'admin@voiceclonestudio.com').toLowerCase();
  const superadmin = await prisma.user.findUnique({ where: { email: superadminEmail } });
  assert(superadmin !== null, `Superadmin exists in DB (${superadminEmail})`);
  assert(superadmin && superadmin.role === 'superadmin', 'Superadmin has role "superadmin"');
  assert(superadmin && superadmin.credits >= 1000000, `Superadmin has >= 1,000,000 credits (${superadmin?.credits})`);

  const settingsCount = await prisma.systemSetting.count();
  assert(settingsCount >= 5, `System settings present in Railway DB (Found: ${settingsCount})`);

  const voicesCount = await prisma.voice.count();
  assert(voicesCount >= 120, `All reference voices present in Railway DB (Found: ${voicesCount})`);

  const genCount = await prisma.generation.count();
  assert(genCount >= 11, `Historical generations present in Railway DB (Found: ${genCount})`);

  // Start server checks using fetch
  console.log('\n--- TEST 2: Authentication & Rate Limiting Controls ---');
  
  // 2a. Register invalid input tests
  const shortPassRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Short', email: 'test_short@example.com', password: '123' })
  });
  assert(shortPassRes.status === 400, 'Rejects password shorter than 6 characters with 400');

  // 2b. Register normal user
  const testUserEmail = `sec_test_${Date.now()}@example.com`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Security Tester', email: testUserEmail, password: 'StrongPassword2026!' })
  });
  const regData = await regRes.json();
  assert(regRes.status === 201 && regData.user.credits === 2000, 'New user receives exactly 2,000 starter credits');
  const userToken = regData.token;
  const testUserId = regData.user.id;

  // 2c. Register duplicate email
  const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Duplicate Tester', email: testUserEmail, password: 'StrongPassword2026!' })
  });
  assert(dupRes.status === 409, 'Rejects duplicate email registration with 409 Conflict');

  // 2d. Login with bad password
  const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUserEmail, password: 'WrongPassword' })
  });
  assert(badLoginRes.status === 401, 'Rejects incorrect password with 401 Unauthorized');

  // 2e. Superadmin login
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: superadminEmail, password: process.env.SUPERADMIN_PASSWORD || 'SuperAdminSecret2026!' })
  });
  const adminLoginData = await adminLoginRes.json();
  assert(adminLoginRes.status === 200 && adminLoginData.user.role === 'superadmin', 'Superadmin login successful with role: superadmin');
  const adminToken = adminLoginData.token;

  console.log('\n--- TEST 3: RBAC & Authorization Protections ---');
  // 3a. Regular user blocked from admin overview
  const userAdminTry = await fetch(`${BASE_URL}/api/admin/overview`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  assert(userAdminTry.status === 403, 'Regular user blocked from /api/admin/overview (403 Forbidden)');

  // 3b. Regular user blocked from cleanup-audio
  const userCleanupTry = await fetch(`${BASE_URL}/api/cleanup-audio`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  assert(userCleanupTry.status === 403, 'Regular user blocked from /api/cleanup-audio (403 Forbidden)');

  // 3c. Unauthenticated blocked from cleanup-audio
  const anonCleanupTry = await fetch(`${BASE_URL}/api/cleanup-audio`, {
    method: 'DELETE'
  });
  assert(anonCleanupTry.status === 401, 'Unauthenticated user blocked from /api/cleanup-audio (401 Unauthorized)');

  // 3d. Superadmin allowed into admin overview
  const adminOverviewRes = await fetch(`${BASE_URL}/api/admin/overview`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const adminOverviewData = await adminOverviewRes.json();
  assert(adminOverviewRes.status === 200 && adminOverviewData.stats.totalVoices >= 0, 'Superadmin successfully accesses /api/admin/overview');

  // 3e. Credit Injection Prevention in update-plan
  const creditInjectionRes = await fetch(`${BASE_URL}/api/auth/update-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({ plan: 'Pro', creditCount: 999999999 }) // Attacker tries to inject 999M credits
  });
  const creditInjectionData = await creditInjectionRes.json();
  // Plan 'Pro' should only grant exactly 1,000,000 credits (total 2000 + 1,000,000 = 1,002,000), not 999M!
  assert(creditInjectionRes.status === 200 && creditInjectionData.user.credits === 1002000, 'Credit injection blocked: Server applies strict tier limit (1,000,000), ignoring client forged amount');

  console.log('\n--- TEST 4: IDOR Protection & Ownership Validation ---');
  // Create a generation record for superadmin
  const testGen = await prisma.generation.create({
    data: {
      id: `gen_sec_${Date.now()}`,
      userId: superadmin.id,
      text: 'Superadmin confidential audio generation',
      referenceVoice: 'Adam (Deep Narration - ElevenLabs Style).wav',
      audioUrl: '/audio/test_idor.mp3'
    }
  });

  // Regular user attempts to delete Superadmin's generation
  const idorDeleteRes = await fetch(`${BASE_URL}/api/user/generations/${testGen.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  assert(idorDeleteRes.status === 404, 'IDOR Attack Blocked: User cannot delete another user\'s generation (404 Not Found)');

  // Cleanup testGen
  await prisma.generation.delete({ where: { id: testGen.id } });

  console.log('\n--- TEST 5: Account Suspension Enforcement ---');
  // Suspend testUser
  await prisma.user.update({
    where: { id: testUserId },
    data: { status: 'suspended' }
  });

  // Attempt to access /api/auth/me while suspended
  const suspendedMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  assert(suspendedMeRes.status === 403, 'Suspended user blocked from /api/auth/me (403 Forbidden)');

  // Attempt to generate speech while suspended
  const suspendedGenRes = await fetch(`${BASE_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({ text: 'Should be blocked' })
  });
  assert(suspendedGenRes.status === 403, 'Suspended user blocked from /api/generate (403 Forbidden)');

  // Clean up test user
  await prisma.user.delete({ where: { id: testUserId } });

  console.log('\n====================================================');
  console.log(`Audit Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runSecurityAudit()
  .catch((e) => {
    console.error('Audit execution error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
