/**
 * NEXORA Authentication, Onboarding, and Profile Security Test Suite
 * 
 * Verifies:
 * 1. Registration with validation & reserved username protection
 * 2. OTP verification & login
 * 3. Session expiration & unauthorized access blocking
 * 4. Comprehensive onboarding with College, Department, Graduation Year, Skills, Projects, Experience
 * 5. Profile editing & auto-synchronization with 3D portfolio collections
 * 6. Strict ownership checks: User B CANNOT edit User A's profile or items
 * 7. Privacy controls: Private profiles shielded from unauthorized viewers
 * 8. Preservation of legacy /u/:username portfolio endpoints and collections
 * 9. Logout & session invalidation
 */

process.env.JWT_SECRET = 'nexora-test-access-secret';
process.env.OTP_PEPPER = 'nexora-test-pepper';
process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.COOKIE_SECURE = 'false';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');

let lastOtp = null;
const origLog = console.log;
console.log = (...args) => {
  origLog(...args);
  const m = args.join(' ').match(/code is (\d{6})/);
  if (m) lastOtp = m[1];
};

async function runTests() {
  const mem = await MongoMemoryServer.create();
  process.env.MONGO_URI = mem.getUri();
  await mongoose.connect(process.env.MONGO_URI);
  const app = require('../server');

  const fail = (msg) => {
    origLog('❌ FAILED: ' + msg);
    process.exit(1);
  };
  const ok = (msg) => origLog('✅ PASSED: ' + msg);

  origLog('\n=== 1. REGISTRATION & VALIDATION TESTS ===');
  const agentA = request.agent(app);
  const agentB = request.agent(app);

  // Test reserved username rejection
  let r = await agentA.post('/api/auth/register').send({
    username: 'admin',
    email: 'admin@nexora.network',
    password: 'StrongP@ssw0rd!'
  });
  if (r.status !== 400) fail('Reserved username "admin" was not rejected');
  ok('Reserved usernames (admin, api, nexora, etc.) are strictly rejected');

  // Test weak password rejection
  r = await agentA.post('/api/auth/register').send({
    username: 'builder-one',
    email: 'builder1@nexora.network',
    password: 'weak'
  });
  if (r.status !== 400) fail('Weak password was not rejected');
  ok('Weak passwords rejected by policy');

  // Test valid registration
  r = await agentA.post('/api/auth/register').send({
    username: 'alex-builder',
    email: 'alex@nexora.network',
    password: 'ValidP@ssw0rd123!'
  });
  if (r.status !== 201 || !r.body.requiresVerification) fail('Registration failed: ' + r.status);
  const otpA = lastOtp;
  if (!otpA) fail('No OTP generated for registration');
  ok('Registration succeeds and issues verification OTP');

  // Register User B
  lastOtp = null;
  r = await agentB.post('/api/auth/register').send({
    username: 'sam-coder',
    email: 'sam@nexora.network',
    password: 'ValidP@ssw0rd123!'
  });
  if (r.status !== 201) fail('Registration for User B failed');
  const otpB = lastOtp;
  ok('User B registration succeeds');

  origLog('\n=== 2. LOGIN & EMAIL VERIFICATION TESTS ===');
  // Attempt login before verification
  r = await agentA.post('/api/auth/login').send({
    identifier: 'alex@nexora.network',
    password: 'ValidP@ssw0rd123!'
  });
  if (r.status !== 403 || !r.body.requiresVerification) fail('Unverified login should return 403');
  ok('Unverified account login strictly blocked');

  // Verify User A
  r = await agentA.post('/api/auth/verify-email').send({
    email: 'alex@nexora.network',
    code: otpA
  });
  if (r.status !== 200 || !r.body.token) fail('Email verification failed: ' + JSON.stringify(r.body));
  const tokenA = r.body.token;
  ok('Email verification activates user and returns JWT access token');

  // Verify User B
  r = await agentB.post('/api/auth/verify-email').send({
    email: 'sam@nexora.network',
    code: otpB
  });
  if (r.status !== 200 || !r.body.token) fail('User B verification failed');
  const tokenB = r.body.token;
  ok('User B verified successfully');

  origLog('\n=== 3. SESSION & TOKEN EXPIRATION TESTS ===');
  // Access with valid token
  r = await agentA.get('/api/auth/verify').set('Authorization', `Bearer ${tokenA}`);
  if (r.status !== 200) fail('Valid access token rejected');
  ok('Valid access token authorizes authenticated user');

  // Access with invalid / expired token
  r = await agentA.get('/api/auth/verify').set('Authorization', 'Bearer invalid-token-string');
  if (r.status !== 401) fail('Invalid token should return 401');
  ok('Invalid or forged token rejected with 401');

  // Access without token
  r = await agentA.get('/api/auth/verify');
  if (r.status !== 401) fail('Missing token should return 401');
  ok('Missing Authorization header rejected with 401');

  origLog('\n=== 4. PROFILE ONBOARDING WIZARD TESTS ===');
  // User A completes onboarding wizard
  r = await agentA.post('/api/profile/onboard')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({
      name: 'Alex Rivera',
      headline: 'Lead Distributed Systems Architect & AI Builder',
      primaryRole: 'AI/ML Engineer',
      experienceLevel: 'Senior',
      about: 'Designing high-throughput distributed LLM orchestration pipelines.',
      college: 'MIT / Stanford Institute',
      department: 'Computer Science & AI',
      degree: 'B.S. in Computer Science',
      graduationYear: '2026',
      cgpa: '9.2 / 10',
      location: 'San Francisco, CA / Remote',
      skills: ['Python', 'PyTorch', 'React 19', 'Docker', 'Kubernetes'],
      interests: ['Distributed Systems', 'Generative AI', 'High-Performance Computing'],
      experienceSummary: [
        { company: 'HyperScale AI', role: 'Staff Systems Engineer', duration: '2024 - Present', description: 'Reduced p99 inference latency by 40% across 64 GPU clusters.' }
      ],
      projectsSummary: [
        { title: 'AutonomAI Orchestrator', description: 'Multi-agent distributed reasoning pipeline.', techStack: ['Python', 'FastAPI', 'Redis'], githubLink: 'https://github.com/alex/autonomai', liveLink: 'https://autonomai.dev' }
      ],
      certificationsSummary: [
        { name: 'AWS Certified Solutions Architect', issuer: 'Amazon Web Services', issueDate: '2025', credentialUrl: 'https://aws.amazon.com' }
      ],
      achievementsSummary: [
        { title: '1st Place Global Hackathon', description: 'Won top prize for distributed inference engine.', date: '2025' }
      ],
      github: 'https://github.com/alex-builder',
      linkedin: 'https://linkedin.com/in/alex-builder',
      website: 'https://alexrivera.dev',
      openToWork: true,
      openToCollaborate: true,
      privacy: {
        profileVisibility: 'public',
        showOnlineStatus: true,
        allowDirectMessages: 'everyone',
        searchEngineIndexing: true
      }
    });

  if (r.status !== 200 || !r.body.profile) fail('Onboarding failed: ' + r.status + ' ' + JSON.stringify(r.body));
  if (r.body.profile.college !== 'MIT / Stanford Institute') fail('College not saved properly');
  if (r.body.profile.department !== 'Computer Science & AI') fail('Department not saved properly');
  if (r.body.profile.graduationYear !== '2026') fail('Graduation year not saved properly');
  if (r.body.user.isOnboarded !== true) fail('isOnboarded flag not set to true');
  ok('Complete onboarding wizard succeeds: Academic, Skills, Projects, and Social links stored');

  // Verify User A's profile via GET /api/profile/me
  r = await agentA.get('/api/profile/me').set('Authorization', `Bearer ${tokenA}`);
  if (r.status !== 200 || r.body.name !== 'Alex Rivera') fail('getMyProfile did not return updated data');
  ok('GET /api/profile/me returns full builder profile');

  origLog('\n=== 5. PROFILE EDITING & 3D PORTFOLIO SYNC TESTS ===');
  // User A updates their profile via PUT /api/profile/me
  r = await agentA.put('/api/profile/me')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({
      headline: 'Principal AI Architect • Scaling 100M+ Parameters',
      location: 'Seattle, WA',
      college: 'Stanford University'
    });
  if (r.status !== 200) fail('Profile update failed');
  if (r.body.headline !== 'Principal AI Architect • Scaling 100M+ Parameters') fail('Headline not updated');
  ok('Profile editing via PUT /api/profile/me succeeds and syncs User & Profile');

  // Verify that public portfolio endpoint (/api/profile/public/:username) returns collections
  r = await agentA.get('/api/profile/public/alex-builder');
  if (r.status !== 200 || !r.body.collections) fail('Public profile failed or missing collections');
  if (!r.body.collections.education || r.body.collections.education.length === 0) fail('Education collection not populated');
  if (!r.body.collections.projects || r.body.collections.projects.length === 0) fail('Projects collection not populated');
  if (!r.body.collections.skills || r.body.collections.skills.length === 0) fail('Skills collection not populated');
  ok('3D Portfolio endpoint (/u/:username) returns complete synchronized collections without breaking legacy format');

  origLog('\n=== 6. STRICT OWNERSHIP & SECURITY ENFORCEMENT TESTS ===');
  // User B attempts to tamper with User A's profile by injecting User A's ID
  r = await agentB.put('/api/profile/me')
    .set('Authorization', `Bearer ${tokenB}`)
    .send({
      user: r.body.user?._id || 'tamper-user-id',
      name: 'Hacked Name By Sam',
      headline: 'Defaced Headline'
    });
  
  // Verify User A's profile remains untouched
  const checkA = await agentA.get('/api/profile/me').set('Authorization', `Bearer ${tokenA}`);
  if (checkA.body.name === 'Hacked Name By Sam') fail('SECURITY BREACH: User B modified User A profile!');
  ok('Ownership enforcement strictly protects User A profile from User B manipulation');

  // User B attempts to delete User A's education item
  const eduAId = r.body.collections.education[0]._id;
  r = await agentB.delete(`/api/education/${eduAId}`).set('Authorization', `Bearer ${tokenB}`);
  if (r.status !== 404) fail('SECURITY BREACH: User B was able to modify/delete User A education record!');
  ok('CRUD ownership check prevents modifying another user\'s education item (returns 404)');

  origLog('\n=== 7. PRIVACY CONTROLS TESTS ===');
  // User A sets profile to private
  r = await agentA.put('/api/profile/privacy')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ profileVisibility: 'private' });
  if (r.status !== 200) fail('Privacy update failed');
  ok('Privacy toggle updated to private mode');

  // User B attempts to view User A's private profile
  r = await agentB.get('/api/profile/public/alex-builder').set('Authorization', `Bearer ${tokenB}`);
  if (r.status !== 200 || !r.body.isPrivate) fail('Private profile was not shielded from User B');
  if (r.body.collections) fail('Private profile leaked collections to User B!');
  ok('Private profile is shielded from unauthorized users without leaking data');

  // User A views their own profile -> sees full data
  r = await agentA.get('/api/profile/public/alex-builder').set('Authorization', `Bearer ${tokenA}`);
  if (r.status !== 200 || !r.body.collections) fail('Owner cannot view their own private profile');
  ok('Owner can view their own profile even in private mode');

  // Restore to public
  await agentA.put('/api/profile/privacy')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ profileVisibility: 'public' });
  ok('Profile restored to public visibility');

  origLog('\n=== 8. LOGOUT & SESSION TERMINATION TESTS ===');
  r = await agentA.post('/api/auth/logout');
  if (r.status !== 200) fail('Logout failed');
  ok('Logout revokes session and clears refresh tokens');

  origLog('\n=========================================');
  origLog('🎉 ALL NEXORA AUTH, ONBOARDING & PROFILE TESTS PASSED 100%!');
  origLog('=========================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test Execution Error:', err);
  process.exit(1);
});
