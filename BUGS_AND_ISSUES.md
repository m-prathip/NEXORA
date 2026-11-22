# NEXORA: Bugs, Issues, Performance Bottlenecks & Risk Register

> **Document Version:** 1.0.0  
> **Target System:** NEXORA – The Network for Builders  
> **Classification:** Architectural Quality & Reliability Audit

---

## 1. Confirmed Bugs (Verified Flaws)

> [!CAUTION]
> The items in this section have been verified through direct code inspection and AST analysis.

### Bug 1: Missing Mongoose Index on `Skill.js` for Fast Discover Filtering
- **File:** `backend/models/Skills.js`
- **Issue:** In `backend/controllers/networkController.js` and `postsController.js`, queries frequently search skills by user (`Skill.find({ user: { $in: userIds } })`) and by name in Discover. While `user` has an implicit reference, there is no compound index on `{ user: 1, name: 1 }` or `{ name: 'text' }`.
- **Impact:** Full collection scans as the builder user base grows past 10,000 users, causing latency spikes in the Discover and Teammate matching endpoints.
- **Remediation:** Add compound index `skillSchema.index({ user: 1, name: 1 })` and text index `skillSchema.index({ name: 'text' })`.

### Bug 2: Missing Transaction Rollback on Multi-Document Community Deletion
- **File:** `backend/controllers/communityController.js`
- **Issue:** When a community or post is deleted, related comments and reactions are deleted using sequential `deleteMany` calls rather than a MongoDB atomic transaction (`session.withTransaction`).
- **Impact:** If the database process or network terminates midway through deletion, orphaned comments or reaction documents will remain in the database indefinitely.
- **Remediation:** Wrap multi-collection cascading deletions inside Mongoose transactions for replica sets.

---

## 2. Performance Bottlenecks

> [!WARNING]
> These issues do not cause immediate runtime crashes, but degrade latency, increase memory overhead, and limit scalability under concurrent traffic.

### Bottleneck 1: Database Query Waterfalls in Public Profiles
- **Location:** `backend/controllers/profileController.js` (lines 92–101)
- **Current Behavior:** To load a public builder profile (`/profile/:username`), the controller executes 8 separate queries in parallel via `Promise.all` across `Skill`, `Project`, `Experience`, `Education`, `Achievement`, `Certificate`, `Activity`, and `WhyHire`.
- **Bottleneck Analysis:** While `Promise.all` executes them concurrently, each request still consumes 8 database connection pool slots. At 500 concurrent profile views, this consumes 4,000 connection operations on MongoDB Atlas.
- **Optimization Strategy:**
  1. Implement MongoDB Aggregation Pipeline (`$lookup` with `$facet`) to consolidate all sub-collections into a single database round-trip.
  2. Implement an in-memory Redis or NodeCache cache (TTL: 60 seconds) for public profile view payloads, invalidated on profile updates.

### Bottleneck 2: Three.js WebGL Context Memory Management
- **Location:** `frontend/src/pages/PortfolioLayout.jsx` and Canvas components
- **Current Behavior:** The Three.js 3D canvas initializes WebGL shaders and particle buffers. If a user navigates rapidly between `/u/builder-a`, `/feed`, and `/u/builder-b`, multiple WebGL rendering contexts can linger in browser memory before garbage collection.
- **Impact:** On mobile browsers with strict VRAM limits (iOS Safari), this can trigger WebGL context loss errors (`THREE.WebGLRenderer: Context Lost`).
- **Optimization Strategy:** Ensure explicit disposal of geometries, materials, and renderer contexts in React `useEffect` cleanup return functions.

### Bottleneck 3: Unbounded In-Memory API Cache
- **Location:** `frontend/src/services/api.js` (lines 25–40)
- **Current Behavior:** `const apiCache = new Map();` caches GET responses with a 60-second timestamp check.
- **Bottleneck Analysis:** While keys are verified by time, expired keys are only cleared when a mutation (`post`, `put`, `delete`) occurs. In a read-heavy session browsing many builders, `apiCache` grows monotonically in client memory.
- **Optimization Strategy:** Use an LRU (Least Recently Used) cache with a maximum size of 50 entries, or integrate SWR/TanStack Query.

---

## 3. Potential Risks & Edge Cases

> [!NOTE]
> Scenarios where system state could become inconsistent under non-standard operating conditions.

### Risk 1: Optimistic UI Rollback on Network Interruption
- **Location:** `frontend/src/pages/feed/Feed.jsx` and `Network.jsx`
- **Scenario:** When a user likes a post or sends a connection request, the UI immediately updates counters optimistically. If the client experiences an unstable mobile connection and the HTTP request fails with a network timeout, the UI might show a "Liked" state until the user refreshes.
- **Mitigation:** Ensure all optimistic mutations capture previous state in a closure and revert state in `.catch()` blocks with a toast notifying the user of the sync failure.

### Risk 2: Simultaneous Reciprocal Connection Race Condition
- **Location:** `backend/controllers/networkController.js`
- **Scenario:** User A and User B send connection requests to each other at the exact same millisecond. Both requests could pass the `Connection.findOne` check simultaneously before either document is committed.
- **Mitigation:** The compound unique index `{ requester: 1, recipient: 1 }` prevents duplicate records from the same requester, but bidirectional checks should handle duplicate key errors (`E11000`) by catching and gracefully treating them as mutual auto-accepts.

---

## 4. Unverified Assumptions

> [!IMPORTANT]
> The following assumptions rely on external deployment configuration:

1. **SMTP Gateway Availability:**
   - *Assumption:* The production host has an active SMTP account (Brevo / SendGrid / Postmark). If missing, OTP emails will output to the backend server stdout only.
2. **Persistent Storage Volume for Local Uploads:**
   - *Assumption:* If running in standard containerized environments without Cloudinary (or without S3), the `/uploads` directory must be bound to a persistent Docker volume; otherwise, user uploaded avatars will vanish upon container rebuilds.
3. **Gemini API Token Limits & Model Lifecycle:**
   - *Assumption:* The system utilizes `gemini-2.5-flash`. The model version string must remain actively supported by Google's API endpoint, and network egress from the backend must not be blocked by internal firewalls.
