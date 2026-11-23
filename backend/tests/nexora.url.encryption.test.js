/**
 * NEXORA AES-256-GCM Encrypted Route Security Test Suite
 * 
 * Verifies all 11 required security scenarios:
 * 1. Valid encrypted token
 * 2. Invalid token
 * 3. Modified / tampered token
 * 4. Expired token
 * 5. Wrong authentication tag
 * 6. Wrong encryption key
 * 7. Revoked token
 * 8. Replayed single-use token
 * 9. User accessing another user's resource (IDOR prevention)
 * 10. Normal user accessing admin routes (Privilege escalation prevention)
 * 11. Direct API access without authorization
 * 12. Key rotation support (primary & fallback key ring)
 */

process.env.JWT_SECRET = 'nexora-test-access-secret-12345';
process.env.JWT_REFRESH_SECRET = 'nexora-test-refresh-secret-67890';
process.env.OTP_PEPPER = 'nexora-test-pepper-salt';
process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.COOKIE_SECURE = 'false';
process.env.ROUTE_ENCRYPTION_KEY = 'd7a3f4e8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8';
process.env.ROUTE_ENCRYPTION_KEY_FALLBACK = 'e8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const {
  encryptRoute,
  decryptRoute,
  validateRouteToken,
  hashToken,
  base64UrlEncode,
  base64UrlDecode
} = require('../utils/urlCrypto');
const User = require('../models/User');
const RouteToken = require('../models/RouteToken');

async function runTestSuite() {
  const origLog = console.log;
  const ok = (msg) => origLog(`  ✅ PASSED: ${msg}`);
  const fail = (msg) => {
    origLog(`  ❌ FAILED: ${msg}`);
    process.exit(1);
  };

  origLog('\n======================================================');
  origLog('   NEXORA AES-256-GCM ENCRYPTED ROUTE SECURITY SUITE  ');
  origLog('======================================================\n');

  // Setup In-Memory Database
  const memServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = memServer.getUri();
  await mongoose.connect(process.env.MONGO_URI);
  const app = require('../server');

  // Helper to create test user with active verified status
  const createTestUser = async ({ username, email, role = 'USER' }) => {
    const user = await User.create({
      username,
      email,
      password: 'StrongP@ssw0rd123!',
      role,
      isVerified: true,
      dashboardHash: crypto.randomBytes(8).toString('hex'),
      status: 'active'
    });
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    return { user, token };
  };

  // Seed Users
  const userA = await createTestUser({ username: 'alice-builder', email: 'alice@nexora.network', role: 'USER' });
  const userB = await createTestUser({ username: 'bob-builder', email: 'bob@nexora.network', role: 'USER' });
  const adminUser = await createTestUser({ username: 'admin-sarah', email: 'sarah@nexora.network', role: 'ADMIN' });
  const superAdmin = await createTestUser({ username: 'super-rex', email: 'rex@nexora.network', role: 'SUPER_ADMIN' });

  // ──────────────────────────────────────────────────────────
  // 1. VALID ENCRYPTED TOKEN TEST
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 1: Valid Encrypted Token Resolution ---');
  const validToken = encryptRoute({
    rid: 'user_settings',
    uid: userA.user._id.toString(),
    pur: 'NAV'
  }, { ttlSeconds: 3600 });

  const res1 = await request(app)
    .post('/api/secure-routes/decrypt')
    .set('Authorization', `Bearer ${userA.token}`)
    .send({ encryptedToken: validToken });

  if (res1.status !== 200 || !res1.body.success) {
    fail(`Valid token decryption failed: ${res1.status} - ${JSON.stringify(res1.body)}`);
  }
  if (res1.body.routeId !== 'user_settings') fail('Route ID mismatch in resolved token');
  if (res1.headers['cache-control'] !== 'no-store, no-cache, must-revalidate, proxy-revalidate') {
    fail('Cache-Control: no-store header missing or incomplete');
  }
  if (res1.headers['referrer-policy'] !== 'no-referrer') {
    fail('Referrer-Policy: no-referrer header missing');
  }
  ok('Valid encrypted token decrypts with correct destination and strict security headers (no-store, no-referrer)');

  // ──────────────────────────────────────────────────────────
  // 2. INVALID TOKEN STRUCTURE TEST
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 2: Invalid / Corrupted Token Rejection ---');
  const res2 = await request(app)
    .post('/api/secure-routes/decrypt')
    .set('Authorization', `Bearer ${userA.token}`)
    .send({ encryptedToken: 'not-a-valid-token-string' });

  if (res2.status !== 400 || res2.body.code !== 'INVALID_OR_TAMPERED_TOKEN') {
    fail(`Expected 400 INVALID_OR_TAMPERED_TOKEN, got: ${res2.status} ${JSON.stringify(res2.body)}`);
  }
  ok('Malformed token without correct 4-part structure is strictly rejected (HTTP 400)');

  // ──────────────────────────────────────────────────────────
  // 3. MODIFIED / TAMPERED CIPHERTEXT TEST
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 3: Tampered Ciphertext (Bit-Flip Detection) ---');
  const parts = validToken.split('.');
  // Flip the last byte of the ciphertext
  const rawCipher = base64UrlDecode(parts[3]);
  rawCipher[rawCipher.length - 1] ^= 0x01; // flip single bit
  const tamperedToken = `${parts[0]}.${parts[1]}.${parts[2]}.${base64UrlEncode(rawCipher)}`;

  const res3 = await request(app)
    .post('/api/secure-routes/decrypt')
    .set('Authorization', `Bearer ${userA.token}`)
    .send({ encryptedToken: tamperedToken });

  if (res3.status !== 400) {
    fail(`Tampered token should return 400, got: ${res3.status}`);
  }
  ok('Single-bit modification of ciphertext triggers immediate GCM auth tag failure and rejection (HTTP 400)');

  // ──────────────────────────────────────────────────────────
  // 4. EXPIRED TOKEN TEST
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 4: Expired Token Rejection ---');
  const expiredToken = encryptRoute({
    rid: 'user_settings',
    uid: userA.user._id.toString(),
    iat: Math.floor(Date.now() / 1000) - 7200,
    exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
  });

  const res4 = await request(app)
    .post('/api/secure-routes/decrypt')
    .set('Authorization', `Bearer ${userA.token}`)
    .send({ encryptedToken: expiredToken });

  if (res4.status !== 410 || res4.body.code !== 'TOKEN_EXPIRED') {
    fail(`Expected 410 TOKEN_EXPIRED, got: ${res4.status} ${JSON.stringify(res4.body)}`);
  }
  ok('Expired route tokens are rejected with HTTP 410 Gone');

  // ──────────────────────────────────────────────────────────
  // 5. WRONG AUTHENTICATION TAG TEST
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 5: Wrong Authentication Tag Rejection ---');
  const fakeAuthTag = base64UrlEncode(crypto.randomBytes(16));
  const badTagToken = `${parts[0]}.${parts[1]}.${fakeAuthTag}.${parts[3]}`;

  const res5 = await request(app)
    .post('/api/secure-routes/decrypt')
    .set('Authorization', `Bearer ${userA.token}`)
    .send({ encryptedToken: badTagToken });

  if (res5.status !== 400) {
    fail(`Wrong auth tag must be rejected with 400, got: ${res5.status}`);
  }
  ok('Mismatched authentication tag fails cryptographic verification and is rejected (HTTP 400)');

  // ──────────────────────────────────────────────────────────
  // 6. WRONG ENCRYPTION KEY TEST
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 6: Unknown / Wrong Encryption Key Rejection ---');
  const alienKey = crypto.randomBytes(32);
  const alienToken = encryptRoute({
    rid: 'user_settings',
    uid: userA.user._id.toString()
  }, {
    keyId: 'alien_v99',
    keyRing: { alien_v99: alienKey }
  });

  const res6 = await request(app)
    .post('/api/secure-routes/decrypt')
    .set('Authorization', `Bearer ${userA.token}`)
    .send({ encryptedToken: alienToken });

  if (res6.status !== 400) {
    fail(`Unknown key version must return 400, got: ${res6.status}`);
  }
  ok('Tokens encrypted with unknown/unregistered keys fail safely without leaking key details');

  // ──────────────────────────────────────────────────────────
  // 7. REVOKED TOKEN TEST
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 7: Revoked Token Enforcement ---');
  // Generate a token via the generation endpoint
  const genRes = await request(app)
    .post('/api/secure-routes/generate')
    .set('Authorization', `Bearer ${userA.token}`)
    .send({
      routeId: 'user_settings',
      purpose: 'SHARE',
      ttlSeconds: 1800
    });

  if (genRes.status !== 201 || !genRes.body.token) {
    fail(`Token generation failed: ${genRes.status}`);
  }
  const shareToken = genRes.body.token;

  // Revoke the token
  const revokeRes = await request(app)
    .post('/api/secure-routes/revoke')
    .set('Authorization', `Bearer ${userA.token}`)
    .send({ token: shareToken, reason: 'Security testing cancellation' });

  if (revokeRes.status !== 200 || !revokeRes.body.success) {
    fail(`Token revocation failed: ${revokeRes.status}`);
  }

  // Attempt to resolve revoked token
  const res7 = await request(app)
    .post('/api/secure-routes/decrypt')
    .set('Authorization', `Bearer ${userA.token}`)
    .send({ encryptedToken: shareToken });

  if (res7.status !== 403 || res7.body.code !== 'TOKEN_REVOKED') {
    fail(`Expected 403 TOKEN_REVOKED, got: ${res7.status} ${JSON.stringify(res7.body)}`);
  }
  ok('Explicitly revoked tokens are immediately blocked from further access (HTTP 403)');

  // ──────────────────────────────────────────────────────────
  // 8. REPLAYED SINGLE-USE TOKEN TEST
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 8: Replay Attack on Single-Use Token ---');
  const singleGen = await request(app)
    .post('/api/secure-routes/generate')
    .set('Authorization', `Bearer ${userA.token}`)
    .send({
      routeId: 'user_settings',
      purpose: 'SINGLE_USE',
      isSingleUse: true,
      ttlSeconds: 600
    });

  if (singleGen.status !== 201) fail('Failed to generate single-use token');
  const singleUseToken = singleGen.body.token;

  // 1st consumption -> Success
  const firstUse = await request(app)
    .post('/api/secure-routes/decrypt')
    .set('Authorization', `Bearer ${userA.token}`)
    .send({ encryptedToken: singleUseToken });

  if (firstUse.status !== 200) fail(`First consumption of single-use token failed: ${firstUse.status}`);

  // 2nd consumption -> Must fail with 410 TOKEN_ALREADY_USED
  const replayUse = await request(app)
    .post('/api/secure-routes/decrypt')
    .set('Authorization', `Bearer ${userA.token}`)
    .send({ encryptedToken: singleUseToken });

  if (replayUse.status !== 410 || replayUse.body.code !== 'TOKEN_ALREADY_USED') {
    fail(`Expected 410 TOKEN_ALREADY_USED on replay, got: ${replayUse.status} ${JSON.stringify(replayUse.body)}`);
  }
  ok('Single-use tokens allow initial access then block all replay attempts (HTTP 410)');

  // ──────────────────────────────────────────────────────────
  // 9. CROSS-USER IDOR ISOLATION TEST
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 9: Insecure Direct Object Reference (IDOR) Isolation ---');
  // Bob generates a private settings token bound to Bob's UID
  const bobsToken = encryptRoute({
    rid: 'user_settings',
    uid: userB.user._id.toString(),
    pur: 'NAV'
  });

  // Alice attempts to use Bob's token
  const res9 = await request(app)
    .post('/api/secure-routes/decrypt')
    .set('Authorization', `Bearer ${userA.token}`)
    .send({ encryptedToken: bobsToken });

  if (res9.status !== 403 || res9.body.code !== 'FORBIDDEN_RESOURCE') {
    fail(`Expected 403 FORBIDDEN_RESOURCE on cross-user token access, got: ${res9.status}`);
  }
  ok('Decrypted token ownership check prevents Alice from accessing Bob private settings (HTTP 403)');

  // ──────────────────────────────────────────────────────────
  // 10. PRIVILEGE ESCALATION / ADMIN ROUTE PROTECTION TEST
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 10: Role-Based Access Control / Privilege Escalation ---');
  // Token targets the admin_users route
  const adminRouteToken = encryptRoute({
    rid: 'admin_users',
    pur: 'NAV'
  });

  // Normal User A attempts to resolve admin route token
  const res10A = await request(app)
    .post('/api/secure-routes/decrypt')
    .set('Authorization', `Bearer ${userA.token}`)
    .send({ encryptedToken: adminRouteToken });

  if (res10A.status !== 403 || res10A.body.code !== 'INSUFFICIENT_PRIVILEGES') {
    fail(`Expected 403 INSUFFICIENT_PRIVILEGES for standard user, got: ${res10A.status}`);
  }

  // Admin user Sarah resolves the same token -> Success
  const res10B = await request(app)
    .post('/api/secure-routes/decrypt')
    .set('Authorization', `Bearer ${adminUser.token}`)
    .send({ encryptedToken: adminRouteToken });

  if (res10B.status !== 200 || res10B.body.routeId !== 'admin_users') {
    fail(`Authorized Admin failed to resolve admin route: ${res10B.status}`);
  }
  ok('Standard users cannot access admin routes via token; admin privileges strictly verified server-side');

  // ──────────────────────────────────────────────────────────
  // 11. DIRECT API ACCESS WITHOUT AUTHORIZATION TEST
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 11: Direct API Access Without Bearer Token ---');
  const res11A = await request(app)
    .post('/api/secure-routes/decrypt')
    .send({ encryptedToken: validToken });

  if (res11A.status !== 401) {
    fail(`Direct API access without token must return 401, got: ${res11A.status}`);
  }

  const res11B = await request(app)
    .post('/api/secure-routes/decrypt')
    .set('Authorization', 'Bearer invalid.bogus.jwt')
    .send({ encryptedToken: validToken });

  if (res11B.status !== 401) {
    fail(`Direct API access with forged JWT must return 401, got: ${res11B.status}`);
  }
  ok('Unauthenticated or forged requests are strictly blocked with HTTP 401 Unauthorized');

  // ──────────────────────────────────────────────────────────
  // 12. KEY ROTATION & FALLBACK VERIFICATION TEST
  // ──────────────────────────────────────────────────────────
  origLog('--- TEST 12: Zero-Downtime Key Rotation & Fallback Key Support ---');
  // Encrypt with v2 (fallback key)
  const v2Token = encryptRoute({
    rid: 'user_settings',
    uid: userA.user._id.toString(),
    pur: 'NAV'
  }, { keyId: 'v2' });

  // Decrypt should succeed because v2 is in the fallback key ring
  const res12 = await request(app)
    .post('/api/secure-routes/decrypt')
    .set('Authorization', `Bearer ${userA.token}`)
    .send({ encryptedToken: v2Token });

  if (res12.status !== 200) {
    fail(`Fallback key rotation decryption failed: ${res12.status}`);
  }
  ok('Key rotation functions seamlessly: tokens encrypted with fallback key v2 decrypt cleanly');

  origLog('\n======================================================');
  origLog('   🎉 ALL 12 SECURITY TEST SCENARIOS PASSED 100%!     ');
  origLog('======================================================\n');

  await mongoose.disconnect();
  await memServer.stop();
  process.exit(0);
}

runTestSuite().catch((err) => {
  console.error('Test suite crashed with unhandled error:', err);
  process.exit(1);
});
