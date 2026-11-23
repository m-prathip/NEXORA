/**
 * NEXORA RBAC & Platform Administration Security Test Suite
 * 
 * Verifies:
 * 1. USER cannot access /admin APIs (403 Forbidden)
 * 2. USER cannot access /moderator APIs (403 Forbidden)
 * 3. MODERATOR can access assigned moderation tools (200 OK)
 * 4. MODERATOR cannot access Super Admin or Admin functions (403 Forbidden)
 * 5. ADMIN can access user management & analytics (200 OK)
 * 6. ADMIN cannot promote themselves or others to SUPER_ADMIN (403 Forbidden)
 * 7. ADMIN cannot modify platform security settings (403 Forbidden)
 * 8. SUPER_ADMIN can manage authorized platform settings & roles (200 OK)
 * 9. Re-authentication enforcement for critical actions (401 Unauthorized)
 * 10. Users cannot edit another user's profile (IDOR prevention)
 * 11. Suspended users cannot bypass restrictions (403 Forbidden)
 * 12. Public registration cannot assign privileged roles (Enforces USER)
 * 13. Direct API requests cannot bypass role checks (401 Unauthorized)
 */

process.env.JWT_SECRET = 'nexora-test-rbac-access-secret';
process.env.JWT_REFRESH_SECRET = 'nexora-test-rbac-refresh-secret';
process.env.OTP_PEPPER = 'nexora-test-rbac-pepper';
process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.COOKIE_SECURE = 'false';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Profile = require('../models/Profile');

async function runRBACTests() {
  const origLog = console.log;
  const ok = (msg) => origLog(`  ✅ PASSED: ${msg}`);
  const fail = (msg) => {
    origLog(`  ❌ FAILED: ${msg}`);
    process.exit(1);
  };

  origLog('\n======================================================');
  origLog('   NEXORA MULTI-TIER RBAC & ADMIN SECURITY TEST SUITE ');
  origLog('======================================================\n');

  // Spin up in-memory Mongo
  const memServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = memServer.getUri();
  await mongoose.connect(process.env.MONGO_URI);
  const app = require('../server');

  // Helper to create test user
  const createTestUser = async ({ username, email, role = 'USER', isSuspended = false, password = 'StrongP@ssw0rd123!' }) => {
    const user = await User.create({
      username,
      email,
      password,
      role,
      isVerified: true,
      dashboardHash: crypto.randomBytes(4).toString('hex'),
      status: isSuspended ? 'suspended' : 'active',
      suspension: {
        isSuspended,
        reason: isSuspended ? 'Violation of NEXORA guidelines' : ''
      }
    });

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return { user, token, rawPassword: password };
  };

  // Seed Users for All Four Roles
  const normalUserA = await createTestUser({ username: 'student-alice', email: 'alice@nexora.dev', role: 'USER' });
  const normalUserB = await createTestUser({ username: 'student-bob', email: 'bob@nexora.dev', role: 'USER' });
  const suspendedUser = await createTestUser({ username: 'bad-actor', email: 'bad@nexora.dev', role: 'USER', isSuspended: true });
  const moderator = await createTestUser({ username: 'mod-carol', email: 'carol@nexora.dev', role: 'MODERATOR' });
  const admin = await createTestUser({ username: 'admin-dave', email: 'dave@nexora.dev', role: 'ADMIN', password: 'AdminPassword123!' });
  const superAdmin = await createTestUser({ username: 'super-eve', email: 'eve@nexora.dev', role: 'SUPER_ADMIN', password: 'SuperEvePassword123!' });

  // ──────────────────────────────────────────────────────────
  // TEST 1: USER CANNOT ACCESS /admin APIS
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 1: User Blocks from /admin APIs ---');
  let res = await request(app)
    .get('/api/admin/stats')
    .set('Authorization', `Bearer ${normalUserA.token}`);
  if (res.status !== 403) fail(`USER accessed /admin/stats: got ${res.status}`);

  res = await request(app)
    .get('/api/admin/users')
    .set('Authorization', `Bearer ${normalUserA.token}`);
  if (res.status !== 403) fail(`USER accessed /admin/users: got ${res.status}`);

  res = await request(app)
    .get('/api/admin/audit-logs')
    .set('Authorization', `Bearer ${normalUserA.token}`);
  if (res.status !== 403) fail(`USER accessed /admin/audit-logs: got ${res.status}`);
  ok('Individual users are strictly blocked from all /admin APIs (HTTP 403 Forbidden)');

  // ──────────────────────────────────────────────────────────
  // TEST 2: USER CANNOT ACCESS /moderator APIS
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 2: User Blocks from Moderator Queue ---');
  res = await request(app)
    .get('/api/admin/moderator/stats')
    .set('Authorization', `Bearer ${normalUserA.token}`);
  if (res.status !== 403) fail(`USER accessed /admin/moderator/stats: got ${res.status}`);

  res = await request(app)
    .get('/api/admin/reports')
    .set('Authorization', `Bearer ${normalUserA.token}`);
  if (res.status !== 403) fail(`USER accessed /admin/reports: got ${res.status}`);
  ok('Individual users are strictly blocked from moderator queues (HTTP 403 Forbidden)');

  // ──────────────────────────────────────────────────────────
  // TEST 3: MODERATOR CAN ACCESS ASSIGNED MODERATION TOOLS
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 3: Moderator Access to Assigned Tools ---');
  res = await request(app)
    .get('/api/admin/moderator/stats')
    .set('Authorization', `Bearer ${moderator.token}`);
  if (res.status !== 200) fail(`MODERATOR failed to access moderator stats: got ${res.status}`);

  res = await request(app)
    .get('/api/admin/reports')
    .set('Authorization', `Bearer ${moderator.token}`);
  if (res.status !== 200) fail(`MODERATOR failed to access reports queue: got ${res.status}`);

  res = await request(app)
    .get('/api/admin/posts')
    .set('Authorization', `Bearer ${moderator.token}`);
  if (res.status !== 200) fail(`MODERATOR failed to access posts moderation: got ${res.status}`);
  ok('MODERATOR successfully accesses reports, posts, and moderation queue (HTTP 200 OK)');

  // ──────────────────────────────────────────────────────────
  // TEST 4: MODERATOR CANNOT ACCESS ADMIN OR SUPER ADMIN FUNCTIONS
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 4: Moderator Blocks from Admin & Super Admin Functions ---');
  res = await request(app)
    .get('/api/admin/users')
    .set('Authorization', `Bearer ${moderator.token}`);
  if (res.status !== 403) fail(`MODERATOR accessed user management: got ${res.status}`);

  res = await request(app)
    .get('/api/admin/analytics')
    .set('Authorization', `Bearer ${moderator.token}`);
  if (res.status !== 403) fail(`MODERATOR accessed platform analytics: got ${res.status}`);

  res = await request(app)
    .get('/api/admin/settings')
    .set('Authorization', `Bearer ${moderator.token}`);
  if (res.status !== 403) fail(`MODERATOR accessed security settings: got ${res.status}`);

  res = await request(app)
    .patch(`/api/admin/users/${normalUserA.user._id}/role`)
    .set('Authorization', `Bearer ${moderator.token}`)
    .send({ role: 'ADMIN', adminPassword: 'Password' });
  if (res.status !== 403) fail(`MODERATOR updated roles: got ${res.status}`);
  ok('MODERATOR is strictly blocked from user management, analytics, settings, and roles (HTTP 403)');

  // ──────────────────────────────────────────────────────────
  // TEST 5: ADMIN CAN MANAGE USERS & VIEW ANALYTICS
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 5: Admin Access to Operations ---');
  res = await request(app)
    .get('/api/admin/users')
    .set('Authorization', `Bearer ${admin.token}`);
  if (res.status !== 200) fail(`ADMIN failed to access user directory: got ${res.status}`);

  res = await request(app)
    .get('/api/admin/analytics')
    .set('Authorization', `Bearer ${admin.token}`);
  if (res.status !== 200) fail(`ADMIN failed to access analytics: got ${res.status}`);

  res = await request(app)
    .get('/api/admin/audit-logs')
    .set('Authorization', `Bearer ${admin.token}`);
  if (res.status !== 200) fail(`ADMIN failed to access audit logs: got ${res.status}`);
  ok('ADMIN successfully accesses user directory, analytics, and audit logs (HTTP 200 OK)');

  // ──────────────────────────────────────────────────────────
  // TEST 6: ADMIN CANNOT PROMOTE THEMSELVES OR OTHERS TO SUPER_ADMIN
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 6: Admin Self-Promotion & Super Admin Gate ---');
  res = await request(app)
    .patch(`/api/admin/users/${admin.user._id}/role`)
    .set('Authorization', `Bearer ${admin.token}`)
    .send({ role: 'SUPER_ADMIN', adminPassword: admin.rawPassword });
  if (res.status !== 403) fail(`ADMIN promoted self to SUPER_ADMIN: got ${res.status}`);

  res = await request(app)
    .patch(`/api/admin/users/${normalUserA.user._id}/role`)
    .set('Authorization', `Bearer ${admin.token}`)
    .send({ role: 'ADMIN', adminPassword: admin.rawPassword });
  if (res.status !== 403) fail(`ADMIN assigned roles without Super Admin privilege: got ${res.status}`);
  ok('ADMIN cannot assign roles or promote anyone to SUPER_ADMIN (HTTP 403 Forbidden)');

  // ──────────────────────────────────────────────────────────
  // TEST 7: ADMIN CANNOT ACCESS SUPER ADMIN SETTINGS
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 7: Super Admin Settings Access Gate ---');
  res = await request(app)
    .get('/api/admin/settings')
    .set('Authorization', `Bearer ${admin.token}`);
  if (res.status !== 403) fail(`ADMIN accessed Super Admin security settings: got ${res.status}`);

  res = await request(app)
    .put('/api/admin/settings')
    .set('Authorization', `Bearer ${admin.token}`)
    .send({ autoFlagReportsThreshold: 5, adminPassword: admin.rawPassword });
  if (res.status !== 403) fail(`ADMIN updated platform security settings: got ${res.status}`);
  ok('Platform security and global settings are strictly restricted to SUPER_ADMIN (HTTP 403)');

  // ──────────────────────────────────────────────────────────
  // TEST 8: SUPER ADMIN CAN MANAGE SETTINGS (WITH RE-AUTH)
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 8: Super Admin Manages Settings with Re-Auth ---');
  res = await request(app)
    .put('/api/admin/settings')
    .set('Authorization', `Bearer ${superAdmin.token}`)
    .send({ autoFlagReportsThreshold: 5, adminPassword: superAdmin.rawPassword });
  if (res.status !== 200) fail(`SUPER_ADMIN failed to update settings with valid password: got ${res.status}`);

  res = await request(app)
    .get('/api/admin/settings')
    .set('Authorization', `Bearer ${superAdmin.token}`);
  if (res.status !== 200 || res.body.autoFlagReportsThreshold !== 5) {
    fail('Setting update not reflected in database');
  }
  ok('SUPER_ADMIN successfully manages platform security parameters (HTTP 200 OK)');

  // ──────────────────────────────────────────────────────────
  // TEST 9: RE-AUTHENTICATION ENFORCEMENT ON CRITICAL ACTIONS
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 9: Critical Action Password Re-Authentication ---');
  // Attempt update without adminPassword
  res = await request(app)
    .put('/api/admin/settings')
    .set('Authorization', `Bearer ${superAdmin.token}`)
    .send({ autoFlagReportsThreshold: 10 });
  if (res.status !== 401 || !res.body.requiresReauth) {
    fail(`Missing password confirmation was not rejected with 401: got ${res.status}`);
  }

  // Attempt update with wrong adminPassword
  res = await request(app)
    .put('/api/admin/settings')
    .set('Authorization', `Bearer ${superAdmin.token}`)
    .send({ autoFlagReportsThreshold: 10, adminPassword: 'WrongPassword123!' });
  if (res.status !== 401 || !res.body.requiresReauth) {
    fail(`Wrong password confirmation was not rejected with 401: got ${res.status}`);
  }
  ok('Critical operations require password confirmation; missing or invalid password returns HTTP 401');

  // ──────────────────────────────────────────────────────────
  // TEST 10: PROFILE IDOR ISOLATION
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 10: Horizontal IDOR Isolation on Profiles ---');
  // Create profile for Bob
  await Profile.create({
    user: normalUserB.user._id,
    name: 'Original Bob',
    title: 'Lead Software Engineer',
    headline: 'Lead Software Engineer',
    about: 'Experienced builder specializing in distributed systems',
    email: 'bob@nexora.dev'
  });

  // Alice sends PUT /api/profile/me trying to overwrite Bob's ID
  res = await request(app)
    .put('/api/profile/me')
    .set('Authorization', `Bearer ${normalUserA.token}`)
    .send({
      user: normalUserB.user._id.toString(),
      name: 'Hacked Alice',
      title: 'Attacker Engineer',
      headline: 'Attacker',
      about: 'Hacker bio',
      email: 'alice@nexora.dev'
    });
  if (res.status !== 200) fail(`Profile update failed: ${res.status}`);

  // Verify Bob's profile remains untouched
  const bobProfile = await Profile.findOne({ user: normalUserB.user._id });
  if (bobProfile.name !== 'Original Bob') {
    fail('IDOR exploit succeeded! Bob profile was modified by Alice');
  }
  ok('Profile API binds strictly to authenticated session; foreign user IDs in payload are stripped');

  // ──────────────────────────────────────────────────────────
  // TEST 11: SUSPENDED USER RESTRICTIONS
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 11: Account Suspension Restrictions ---');
  res = await request(app)
    .get('/api/profile/me')
    .set('Authorization', `Bearer ${suspendedUser.token}`);
  if (res.status !== 403 || !res.body.isSuspended) {
    fail(`Suspended user bypassed suspension check: got ${res.status}`);
  }
  ok('Suspended accounts are strictly blocked with HTTP 403 and suspension notice');

  // ──────────────────────────────────────────────────────────
  // TEST 12: PUBLIC REGISTRATION PRIVILEGE ESCALATION BLOCK
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 12: Public Registration Role Tampering Block ---');
  res = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'sneaky-admin',
      email: 'sneaky@nexora.dev',
      password: 'StrongP@ssw0rd123!',
      role: 'SUPER_ADMIN' // Attacker tampering attempt
    });
  if (res.status !== 201) fail(`Registration failed: ${res.status}`);

  const createdUser = await User.findOne({ email: 'sneaky@nexora.dev' });
  if (!createdUser || createdUser.role !== 'USER') {
    fail(`Registration accepted tampered role! User got role: ${createdUser?.role}`);
  }
  ok('Public registration unconditionally forces role: USER; tampered role payloads are neutralized');

  // ──────────────────────────────────────────────────────────
  // TEST 13: DIRECT API ACCESS WITHOUT AUTHORIZATION
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 13: Unauthenticated Direct API Access ---');
  res = await request(app).get('/api/admin/stats');
  if (res.status !== 401) fail(`Direct call without token succeeded: got ${res.status}`);

  res = await request(app)
    .get('/api/admin/stats')
    .set('Authorization', 'Bearer bogus.token.value');
  if (res.status !== 401) fail(`Direct call with fake token succeeded: got ${res.status}`);
  ok('Direct API access without valid Bearer token returns HTTP 401 Unauthorized');

  origLog('\n======================================================');
  origLog('   🎉 ALL 13 RBAC & ADMIN SECURITY TESTS PASSED!      ');
  origLog('======================================================\n');

  await mongoose.disconnect();
  await memServer.stop();
  process.exit(0);
}

runRBACTests().catch((err) => {
  console.error('RBAC test runner crashed:', err);
  process.exit(1);
});
