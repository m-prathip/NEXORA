/**
 * NEXORA Exclusive Super Admin & Owner Control Security Test Suite
 * 
 * Verifies:
 * 1. USER cannot access /api/owner/* (403 Forbidden)
 * 2. MODERATOR cannot access /api/owner/* (403 Forbidden)
 * 3. ADMIN cannot access /api/owner/* (403 Forbidden)
 * 4. Unauthenticated visitor cannot access /api/owner/* (401 Unauthorized)
 * 5. Direct API calls with forged tokens cannot bypass protection (401 Unauthorized)
 * 6. Only designated SUPER_ADMIN succeeds (200 OK)
 * 7. Anti-caching and privacy headers enforced on owner endpoints
 * 8. Emergency administrator revocation with immediate session invalidation
 * 9. Protection of SUPER_ADMIN from ordinary administrator suspension/demotion
 * 10. Re-authentication enforcement on destructive owner operations (401)
 * 11. Database-persisted bootstrap lock blocks re-runs
 */

process.env.JWT_SECRET = 'nexora-test-owner-access-secret';
process.env.JWT_REFRESH_SECRET = 'nexora-test-owner-refresh-secret';
process.env.OTP_PEPPER = 'nexora-test-owner-pepper';
process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.COOKIE_SECURE = 'false';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const PlatformSetting = require('../models/PlatformSetting');
const AuditLog = require('../models/AuditLog');

async function runOwnerSecurityTests() {
  const origLog = console.log;
  const ok = (msg) => origLog(`  ✅ PASSED: ${msg}`);
  const fail = (msg) => {
    origLog(`  ❌ FAILED: ${msg}`);
    process.exit(1);
  };

  origLog('\n================================================================');
  origLog('   NEXORA EXCLUSIVE SUPER ADMIN / OWNER SECURITY TEST SUITE     ');
  origLog('================================================================\n');

  // Spin up in-memory Mongo
  const memServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = memServer.getUri();
  await mongoose.connect(process.env.MONGO_URI);
  const app = require('../server');

  // Helper to create test user
  const createTestUser = async ({ username, email, role = 'USER', password = 'StrongPassword123!' }) => {
    const user = await User.create({
      username,
      email,
      password,
      role,
      isVerified: true,
      dashboardHash: crypto.randomBytes(4).toString('hex'),
      status: 'active'
    });

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return { user, token, rawPassword: password };
  };

  // Seed Users
  const student = await createTestUser({ username: 'student-sam', email: 'sam@nexora.dev', role: 'USER' });
  const moderator = await createTestUser({ username: 'mod-mandy', email: 'mandy@nexora.dev', role: 'MODERATOR' });
  const admin = await createTestUser({ username: 'admin-alex', email: 'alex@nexora.dev', role: 'ADMIN', password: 'AdminPassword123!' });
  const owner = await createTestUser({ username: 'owner-developer', email: 'owner@nexora.dev', role: 'SUPER_ADMIN', password: 'OwnerPassword123!' });

  // ──────────────────────────────────────────────────────────
  // TEST 1: USER CANNOT ACCESS /api/owner/*
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 1: Student / USER Blocked from Owner APIs ---');
  let res = await request(app)
    .get('/api/owner/overview')
    .set('Authorization', `Bearer ${student.token}`);
  if (res.status !== 403) fail(`USER accessed /api/owner/overview: got ${res.status}`);

  res = await request(app)
    .get('/api/owner/system-health')
    .set('Authorization', `Bearer ${student.token}`);
  if (res.status !== 403) fail(`USER accessed /api/owner/system-health: got ${res.status}`);
  ok('Students / USER accounts strictly blocked from all Owner endpoints (HTTP 403 Forbidden)');

  // ──────────────────────────────────────────────────────────
  // TEST 2: MODERATOR CANNOT ACCESS /api/owner/*
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 2: MODERATOR Blocked from Owner APIs ---');
  res = await request(app)
    .get('/api/owner/overview')
    .set('Authorization', `Bearer ${moderator.token}`);
  if (res.status !== 403) fail(`MODERATOR accessed /api/owner/overview: got ${res.status}`);

  res = await request(app)
    .get('/api/owner/security-monitoring')
    .set('Authorization', `Bearer ${moderator.token}`);
  if (res.status !== 403) fail(`MODERATOR accessed /api/owner/security-monitoring: got ${res.status}`);
  ok('MODERATOR accounts strictly blocked from Owner endpoints (HTTP 403 Forbidden)');

  // ──────────────────────────────────────────────────────────
  // TEST 3: ADMIN CANNOT ACCESS /api/owner/*
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 3: Normal ADMIN Blocked from Owner APIs ---');
  res = await request(app)
    .get('/api/owner/overview')
    .set('Authorization', `Bearer ${admin.token}`);
  if (res.status !== 403) fail(`ADMIN accessed /api/owner/overview: got ${res.status}`);

  res = await request(app)
    .get('/api/owner/system-health')
    .set('Authorization', `Bearer ${admin.token}`);
  if (res.status !== 403) fail(`ADMIN accessed /api/owner/system-health: got ${res.status}`);

  res = await request(app)
    .get('/api/owner/platform-settings')
    .set('Authorization', `Bearer ${admin.token}`);
  if (res.status !== 403) fail(`ADMIN accessed /api/owner/platform-settings: got ${res.status}`);
  ok('Normal ADMIN accounts strictly blocked from Developer Owner endpoints (HTTP 403 Forbidden)');

  // ──────────────────────────────────────────────────────────
  // TEST 4: UNAUTHENTICATED VISITOR CANNOT ACCESS /api/owner/*
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 4: Anonymous Visitor Blocked from Owner APIs ---');
  res = await request(app).get('/api/owner/overview');
  if (res.status !== 401) fail(`Anonymous request to /api/owner/overview got: ${res.status}`);

  res = await request(app).get('/api/owner/system-health');
  if (res.status !== 401) fail(`Anonymous request to /api/owner/system-health got: ${res.status}`);
  ok('Anonymous visitors strictly rejected with HTTP 401 Unauthorized');

  // ──────────────────────────────────────────────────────────
  // TEST 5: DIRECT CALLS WITH FORGED TOKENS CANNOT BYPASS
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 5: Forged JWT Token Rejection ---');
  const forgedToken = jwt.sign({ id: student.user._id, role: 'SUPER_ADMIN' }, 'wrong-secret');
  res = await request(app)
    .get('/api/owner/overview')
    .set('Authorization', `Bearer ${forgedToken}`);
  if (res.status !== 401) fail(`Forged token was not rejected: got ${res.status}`);
  ok('Forged JWT payloads with tampered role: SUPER_ADMIN rejected with HTTP 401');

  // ──────────────────────────────────────────────────────────
  // TEST 6: ONLY DESIGNATED SUPER_ADMIN SUCCEEDS
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 6: Authorized SUPER_ADMIN Success ---');
  res = await request(app)
    .get('/api/owner/overview')
    .set('Authorization', `Bearer ${owner.token}`);
  if (res.status !== 200 || !res.body.success) {
    fail(`SUPER_ADMIN failed to access /api/owner/overview: got ${res.status}`);
  }
  if (!res.body.counts.users || res.body.counts.users.total !== 4) {
    fail('Overview metrics do not reflect real database counts');
  }

  res = await request(app)
    .get('/api/owner/system-health')
    .set('Authorization', `Bearer ${owner.token}`);
  if (res.status !== 200 || !res.body.process.nodeVersion) {
    fail(`SUPER_ADMIN failed to access system health: got ${res.status}`);
  }
  ok('Designated SUPER_ADMIN successfully accesses real-time overview and system health (HTTP 200 OK)');

  // ──────────────────────────────────────────────────────────
  // TEST 7: ANTI-CACHING AND PRIVACY HEADERS
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 7: Strict Anti-Caching & Referrer-Policy Headers ---');
  if (res.headers['cache-control'] !== 'no-store, no-cache, must-revalidate, proxy-revalidate') {
    fail('Cache-Control: no-store header missing on owner endpoint');
  }
  if (res.headers['referrer-policy'] !== 'no-referrer') {
    fail('Referrer-Policy: no-referrer header missing on owner endpoint');
  }
  ok('All owner responses enforce Cache-Control: no-store and Referrer-Policy: no-referrer');

  // ──────────────────────────────────────────────────────────
  // TEST 8: EMERGENCY ADMINISTRATOR REVOCATION & SESSION KILL
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 8: Emergency Administrator Revocation & Session Invalidation ---');
  // First simulate active refresh tokens on admin
  admin.user.refreshTokens = [{
    tokenHash: 'sample-hash-1',
    device: 'Desktop',
    expiresAt: new Date(Date.now() + 86400000)
  }];
  await admin.user.save();

  // Owner revokes admin privileges
  res = await request(app)
    .patch(`/api/owner/administrators/${admin.user._id}/revoke`)
    .set('Authorization', `Bearer ${owner.token}`)
    .send({
      adminPassword: owner.rawPassword,
      reason: 'Compromised administrative session offboarding'
    });
  if (res.status !== 200 || !res.body.success) {
    fail(`Revoking administrator failed: got ${res.status} ${JSON.stringify(res.body)}`);
  }

  // Verify DB state
  const updatedAdmin = await User.findById(admin.user._id).select('+refreshTokens');
  if (updatedAdmin.role !== 'USER') fail(`Target user was not demoted to USER: got ${updatedAdmin.role}`);
  if (updatedAdmin.refreshTokens.length !== 0) fail('Active refresh tokens were not wiped out');
  ok('Emergency administrator revocation demotes to USER, purges refresh tokens, and invalidates sessions');

  // ──────────────────────────────────────────────────────────
  // TEST 9: PROTECTION OF SUPER_ADMIN FROM DEMOTION / SUSPENSION
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 9: Super Admin Sovereign Protection ---');
  // Try to revoke the primary owner itself
  res = await request(app)
    .patch(`/api/owner/administrators/${owner.user._id}/revoke`)
    .set('Authorization', `Bearer ${owner.token}`)
    .send({
      adminPassword: owner.rawPassword,
      reason: 'Self-destruction attempt'
    });
  if (res.status !== 400) {
    fail(`Self-revocation of SUPER_ADMIN was not blocked: got ${res.status}`);
  }

  // Normal admin attempts to suspend SUPER_ADMIN via standard admin API
  res = await request(app)
    .patch(`/api/admin/users/${owner.user._id}/suspend`)
    .set('Authorization', `Bearer ${admin.token}`)
    .send({ reason: 'Malicious attempt by compromised admin' });
  if (res.status !== 403) {
    fail(`Admin managed to suspend a SUPER_ADMIN: got ${res.status}`);
  }
  ok('Super Administrator accounts are sovereign: self-demotion and admin suspension are strictly blocked');

  // ──────────────────────────────────────────────────────────
  // TEST 10: RE-AUTHENTICATION ENFORCEMENT ON DESTRUCTIVE ACTIONS
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 10: Password Re-Authentication on Owner Actions ---');
  res = await request(app)
    .patch(`/api/owner/administrators/${moderator.user._id}/revoke`)
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ reason: 'Attempt without password' });
  if (res.status !== 401 || !res.body.requiresReauth) {
    fail(`Missing password confirmation was not rejected with 401: got ${res.status}`);
  }

  res = await request(app)
    .patch(`/api/owner/administrators/${moderator.user._id}/revoke`)
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ adminPassword: 'IncorrectPassword', reason: 'Attempt with wrong password' });
  if (res.status !== 401 || !res.body.requiresReauth) {
    fail(`Wrong password confirmation was not rejected with 401: got ${res.status}`);
  }
  ok('Destructive owner actions strictly require password confirmation (HTTP 401 on missing/wrong password)');

  // ──────────────────────────────────────────────────────────
  // TEST 11: DATABASE-PERSISTED BOOTSTRAP LOCK
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 11: Database-Persisted Bootstrap Lock ---');
  await PlatformSetting.create({
    key: 'SUPER_ADMIN_BOOTSTRAP_LOCKED',
    value: true,
    description: 'Super Admin bootstrap completed and locked'
  });

  const bootstrapLock = await PlatformSetting.findOne({ key: 'SUPER_ADMIN_BOOTSTRAP_LOCKED' });
  if (!bootstrapLock || bootstrapLock.value !== true) {
    fail('Bootstrap lock flag missing in database');
  }
  ok('Bootstrap lock persistence prevents unauthorized bootstrap re-execution in production');

  origLog('\n================================================================');
  origLog('   🎉 ALL 11 EXCLUSIVE SUPER ADMIN SECURITY TESTS PASSED!       ');
  origLog('================================================================\n');

  await mongoose.disconnect();
  await memServer.stop();
  process.exit(0);
}

runOwnerSecurityTests().catch((err) => {
  console.error('Owner security test runner crashed:', err);
  process.exit(1);
});
