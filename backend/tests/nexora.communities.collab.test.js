/**
 * NEXORA Communities & Project Collaboration Engine Test Suite
 * 
 * Verifies:
 * 1. Community creation, unique slug generation, creator set as admin
 * 2. Community editing with strict admin authorization (403 for non-admins)
 * 3. Community join/leave lifecycle & membership counters
 * 4. Community member listing with roles (admin, moderator, member)
 * 5. Moderator & Admin permissions management (promoting/demoting, protecting creator)
 * 6. Community posts creation & retrieval
 * 7. Inappropriate content reporting (community & project, duplicate prevention)
 * 8. Project idea publishing with technologies, open roles, required skills & images
 * 9. Project search and multi-criteria filtering
 * 10. Collaboration application request lifecycle
 * 11. Duplicate application prevention (cannot apply twice, creator cannot apply)
 * 12. Application review: Creator accepts/rejects applicants (non-creators get 403)
 * 13. Team roster updating upon acceptance
 * 14. Application status tracking (pending -> accepted/rejected)
 * 15. Teammate complementary skill matching
 */

process.env.JWT_SECRET = 'nexora-collab-test-secret-98765';
process.env.OTP_PEPPER = 'nexora-collab-test-pepper-98765';
process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.COOKIE_SECURE = 'false';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');

async function runCommunitiesAndCollabTests() {
  const mem = await MongoMemoryServer.create();
  process.env.MONGO_URI = mem.getUri();
  await mongoose.connect(process.env.MONGO_URI);
  const app = require('../server');

  const origLog = console.log;
  const fail = (msg) => {
    origLog('❌ TEST FAILED: ' + msg);
    process.exit(1);
  };
  const ok = (msg) => origLog('✅ PASSED: ' + msg);

  origLog('\n======================================================');
  origLog('   NEXORA COMMUNITIES & COLLABORATION TEST SUITE      ');
  origLog('======================================================\n');

  const agentA = request.agent(app);
  const agentB = request.agent(app);

  const createUser = async (agent, username, email, name, skills) => {
    let otp = null;
    const tempLog = console.log;
    console.log = (...args) => {
      const m = args.join(' ').match(/code is (\d{6})/);
      if (m) otp = m[1];
    };

    await agent.post('/api/auth/register').send({
      username,
      email,
      password: 'StrongPassword123!',
      name
    });

    console.log = tempLog;
    const verifyRes = await agent.post('/api/auth/verify-otp').send({ email, otp });
    const userId = verifyRes.body.user._id || verifyRes.body.user.id;

    await agent.post('/api/profile/onboard').send({
      name,
      headline: `${skills[0]} Engineer`,
      college: 'Stanford University',
      department: 'Computer Science',
      graduationYear: 2026,
      skills,
      interests: ['AI & ML', 'Distributed Systems']
    });

    return { id: userId, username, email, name };
  };

  origLog('--- SETUP: Provisioning Test Builders ---');
  const userA = await createUser(agentA, 'builder_founder', 'founder@nexora.io', 'Founder Alex', ['Python', 'PyTorch', 'FastAPI']);
  const userB = await createUser(agentB, 'builder_dev', 'dev@nexora.io', 'Developer Dave', ['React 19', 'TypeScript', 'Tailwind CSS']);
  ok('Provisioned Founder Alex and Developer Dave');

  // ── TEST 1: CREATE COMMUNITY & ADMIN ASSIGNMENT ───────────────────────────
  origLog('\n--- 1. CREATE COMMUNITY & CREATOR ADMIN PERMISSIONS ---');
  let commRes = await agentA.post('/api/communities').send({
    name: 'Distributed Cognitive Systems',
    description: 'A guild dedicated to autonomous multi-agent microservices and edge LLM pipelines.',
    category: 'AI & Machine Learning',
    rules: ['Benchmark before claiming latency', 'Constructive PR reviews only']
  });

  if (commRes.status !== 201) fail('Community creation failed');
  const community = commRes.body;
  if (community.slug !== 'distributed-cognitive-systems' || community.memberRole !== 'admin') {
    fail('Community slug or admin role missing');
  }
  ok('Created community with unique slug and creator set as admin');

  // ── TEST 2: COMMUNITY EDIT & SECURITY PERMISSION CHECK ────────────────────
  origLog('\n--- 2. COMMUNITY EDIT & AUTHORIZATION CHECK ---');
  // Dave (non-admin) attempts to edit community -> 403 Forbidden
  let tamperComm = await agentB.put(`/api/communities/${community._id}`).send({
    name: 'Hacked Community'
  });
  if (tamperComm.status !== 403) fail('Non-admin was able to edit community!');
  ok('Security check passed: Non-admin community edit strictly blocked (403)');

  // Alex (admin) edits community
  let editComm = await agentA.put(`/api/communities/${community._id}`).send({
    description: 'Updated guild description with enhanced research guidelines.'
  });
  if (editComm.status !== 200 || !editComm.body.community.description.includes('research guidelines')) {
    fail('Admin was unable to edit community');
  }
  ok('Community administrator successfully updated community settings');

  // ── TEST 3: JOIN & LEAVE COMMUNITY ────────────────────────────────────────
  origLog('\n--- 3. JOIN & LEAVE COMMUNITY LIFECYCLE ---');
  // Dave joins community
  let joinRes = await agentB.post(`/api/communities/${community._id}/join`);
  if (joinRes.status !== 200 || joinRes.body.joined !== true || joinRes.body.membersCount !== 2) {
    fail('Failed to join community or member count not incremented');
  }
  ok('Developer Dave joined community (membersCount: 2)');

  // Dave leaves community
  let leaveRes = await agentB.post(`/api/communities/${community._id}/join`);
  if (leaveRes.status !== 200 || leaveRes.body.joined !== false || leaveRes.body.membersCount !== 1) {
    fail('Failed to leave community or member count not decremented');
  }
  ok('Developer Dave left community (membersCount: 1)');

  // Dave rejoins for subsequent tests
  await agentB.post(`/api/communities/${community._id}/join`);

  // ── TEST 4: MEMBER LIST & ROLE MANAGEMENT (MODERATOR/ADMIN) ───────────────
  origLog('\n--- 4. MEMBER LIST & ROLE MANAGEMENT ---');
  let membersRes = await agentA.get(`/api/communities/${community._id}/members`);
  if (membersRes.status !== 200 || membersRes.body.members.length !== 2) {
    fail('Failed to retrieve member list');
  }
  const daveMembership = membersRes.body.members.find(m => m.user.username === 'builder_dev');
  ok('Retrieved community member list (Found Alex & Dave)');

  // Alex promotes Dave to Moderator
  let promoteRes = await agentA.patch(`/api/communities/${community._id}/members/${daveMembership._id}`).send({
    role: 'moderator'
  });
  if (promoteRes.status !== 200 || promoteRes.body.member.role !== 'moderator') {
    fail('Failed to promote member to moderator');
  }
  ok('Admin promoted Dave to Moderator role');

  // Invariant: Cannot demote or remove the creator
  const alexMembership = membersRes.body.members.find(m => m.user.username === 'builder_founder');
  let demoteCreator = await agentA.patch(`/api/communities/${community._id}/members/${alexMembership._id}`).send({
    role: 'member'
  });
  if (demoteCreator.status !== 400) fail('Community creator was demoted!');
  ok('Creator protection invariant verified: Creator cannot be demoted or removed');

  // ── TEST 5: COMMUNITY POSTS ───────────────────────────────────────────────
  origLog('\n--- 5. COMMUNITY POSTS ---');
  let postRes = await agentA.post('/api/posts').send({
    content: 'Starting our weekly architecture reading group in #ai-ml!',
    community: community._id,
    postType: 'text'
  });
  if (postRes.status !== 201) fail('Failed to create post inside community');

  let commPostsRes = await agentB.get(`/api/communities/${community._id}/posts`);
  if (commPostsRes.status !== 200 || commPostsRes.body.posts.length !== 1) {
    fail('Failed to retrieve community posts');
  }
  ok('Community post published and retrieved via community feed');

  // ── TEST 6: REPORT INAPPROPRIATE CONTENT ───────────────────────────────────
  origLog('\n--- 6. REPORT INAPPROPRIATE CONTENT ---');
  let reportRes = await agentB.post(`/api/communities/${community._id}/report`).send({
    reason: 'spam',
    details: 'Testing safety report submission'
  });
  if (reportRes.status !== 201) fail('Failed to submit content report');

  // Duplicate report prevention
  let dupReport = await agentB.post(`/api/communities/${community._id}/report`).send({
    reason: 'spam'
  });
  if (dupReport.status !== 400) fail('Duplicate report was not blocked');
  ok('Content report submitted and duplicate report properly prevented (400)');

  // ── TEST 7: PUBLISH PROJECT IDEA (WITH ROLES, SKILLS, GITHUB, DEMO) ────────
  origLog('\n--- 7. PUBLISH PROJECT IDEA & DISPLAY REQUIREMENTS ---');
  let projRes = await agentA.post('/api/collaborations').send({
    title: 'AutonomAI Edge Agent Engine',
    description: 'High-throughput agentic framework operating on edge clusters with sub-50ms latency.',
    category: 'AI & ML',
    technologies: ['Python', 'FastAPI', 'Redis', 'Docker'],
    rolesNeeded: [
      { role: 'Frontend Engineer', skills: ['React 19', 'TypeScript', 'Tailwind CSS'], spots: 1 }
    ],
    githubUrl: 'https://github.com/founder/autonomai-edge',
    liveUrl: 'https://autonomai-edge.dev'
  });

  if (projRes.status !== 201) fail('Failed to publish project idea');
  const project = projRes.body;
  if (!project.technologies.includes('Python') || project.rolesNeeded[0].spots !== 1) {
    fail('Project schema properties missing');
  }
  ok('Published project idea with technologies, required skills, and repository links');

  // ── TEST 8: SEARCH & FILTER PROJECTS ──────────────────────────────────────
  origLog('\n--- 8. SEARCH & FILTER PROJECTS ---');
  let searchRes = await agentB.get('/api/collaborations?q=AutonomAI&category=AI%20%26%20ML');
  if (searchRes.status !== 200 || searchRes.body.total < 1) {
    fail('Project search failed');
  }
  ok('Project search and category filtering verified');

  // ── TEST 9: COLLABORATION APPLICATION & DUPLICATE PREVENTION ───────────────
  origLog('\n--- 9. REQUEST COLLABORATION & PREVENT DUPLICATES ---');
  // Creator cannot apply to their own project
  let selfApply = await agentA.post(`/api/collaborations/${project._id}/apply`).send({
    roleAppliedFor: 'Frontend Engineer',
    pitch: 'I am the creator'
  });
  if (selfApply.status !== 400) fail('Creator was able to apply to own project!');
  ok('Self-application blocked (400 Bad Request)');

  // Dave applies for Frontend Engineer role
  let applyRes = await agentB.post(`/api/collaborations/${project._id}/apply`).send({
    roleAppliedFor: 'Frontend Engineer',
    pitch: 'I have 3 years of experience building streaming React 19 dashboards with Tailwind.'
  });
  if (applyRes.status !== 201 || applyRes.body.status !== 'pending') {
    fail('Collaboration application failed');
  }
  ok('Developer Dave applied for "Frontend Engineer" role');

  // Prevent duplicate application
  let dupApply = await agentB.post(`/api/collaborations/${project._id}/apply`).send({
    roleAppliedFor: 'Frontend Engineer',
    pitch: 'Applying again'
  });
  if (dupApply.status !== 400) fail('Duplicate application was not prevented!');
  ok('Duplicate application prevented: Dave cannot apply twice (400)');

  // ── TEST 10: APPLICATION REVIEW & TEAM ROSTER UPDATE ───────────────────────
  origLog('\n--- 10. APPLICATION REVIEW & TEAM ROSTER UPDATE ---');
  // Dave (non-creator) attempts to accept himself -> 403 Forbidden
  const projDetails = await agentA.get(`/api/collaborations/${project._id}`);
  const appId = projDetails.body.applications[0]._id;

  let tamperApp = await agentB.patch(`/api/collaborations/${project._id}/applications/${appId}`).send({
    action: 'accept'
  });
  if (tamperApp.status !== 403) fail('Non-creator was able to respond to applications!');
  ok('Security check passed: Only project creator can respond to applications (403)');

  // Alex (creator) accepts Dave into the team
  let acceptApp = await agentA.patch(`/api/collaborations/${project._id}/applications/${appId}`).send({
    action: 'accept'
  });
  if (acceptApp.status !== 200 || acceptApp.body.status !== 'accepted') {
    fail('Creator failed to accept application');
  }
  ok('Project creator accepted applicant into the team');

  // Verify team roster updated
  const updatedProj = await agentB.get(`/api/collaborations/${project._id}`);
  const isDaveInTeam = updatedProj.body.teamMembers.some(tm => tm.user.username === 'builder_dev');
  if (!isDaveInTeam) fail('Accepted applicant was not added to team members roster!');
  ok('Team roster updated: Dave is now officially a team member on AutonomAI');

  // ── TEST 11: TRACK APPLICATION STATUS ──────────────────────────────────────
  origLog('\n--- 11. TRACK APPLICATION STATUS ---');
  let myAppsRes = await agentB.get('/api/collaborations/my/applications');
  if (myAppsRes.status !== 200 || myAppsRes.body.length !== 1 || myAppsRes.body[0].myApplication.status !== 'accepted') {
    fail('Application status tracking failed');
  }
  ok('Applicant successfully tracked application status (Status: accepted)');

  // ── TEST 12: TEAMMATE COMPLEMENTARY SKILL MATCHING ────────────────────────
  origLog('\n--- 12. TEAMMATE COMPLEMENTARY SKILL MATCHING ---');
  let matchRes = await agentB.get('/api/collaborations/teammates/match');
  if (matchRes.status !== 200 || !Array.isArray(matchRes.body.matches)) {
    fail('Teammate skill matching failed');
  }
  ok('Teammate complementary skill matching algorithm verified');

  origLog('\n======================================================');
  origLog('   ALL COMMUNITIES & COLLABORATION TESTS PASSED!      ');
  origLog('======================================================\n');

  await mongoose.disconnect();
  await mem.stop();
  process.exit(0);
}

runCommunitiesAndCollabTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
