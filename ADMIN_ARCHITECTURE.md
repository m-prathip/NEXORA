# NEXORA – Multi-Tier Administration & RBAC System Architecture
**Document Version:** 1.0.0  
**Target Systems:** NEXORA Individual Builder Experience vs. Platform Administration  
**Architecture Standard:** NIST SP 800-53 / OWASP ASVS Section 4  
**Date:** November 2026  

---

## 1. System Overview & Domain Separation

NEXORA divides functionality into two completely separate domains:
1. **User-Facing System (Student / Builder Domain):** Focused on personal portfolio building, discovering peers, showcasing projects, applying for opportunities, and joining communities.
2. **Platform Administration System (Governance Domain):** Focused on content moderation, trust and safety, user lifecycle management, opportunities review, platform analytics, and developer-level security controls.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   NEXORA APPLICATION                                  │
├──────────────────────────────────────────┬─────────────────────────────────────────────┤
│        USER-FACING DOMAIN                │            GOVERNANCE DOMAIN                │
│       (Student / Builder)                │        (Moderators & Administrators)        │
├──────────────────────────────────────────┼──────────────────────┬──────────────────────┤
│ Core Views:                              │ Moderator Views:     │ Admin & Super Views: │
│ - /dashboard (Main Student Feed & Stats) │ - /moderator         │ - /admin             │
│ - /account/settings (Personal Privacy)   │ - /moderator/reports │ - /admin/users       │
│ - /profile (Own Builder Profile)         │ - /moderator/content │ - /admin/reports     │
│ - /projects (Projects & Collaborations)  │ - /moderator/        │ - /admin/communities │
│ - /u/:username (Public Portfolios)       │   communities        │ - /admin/analytics   │
│                                          │                      │ - /admin/audit-logs  │
│                                          │                      │ Super Admin Views:   │
│                                          │                      │ - /admin/security    │
│                                          │                      │ - /admin/roles       │
│                                          │                      │ - /admin/platform-   │
│                                          │                      │   settings           │
└──────────────────────────────────────────┴──────────────────────┴──────────────────────┘
```

---

## 2. Dedicated Routing Architecture

### 2.1 Individual User Routes
- `/dashboard` – Main personalized dashboard (feed recommendations, connection requests, application statuses).
- `/account/settings` – Personal account settings (email preferences, password changes, portfolio visibility toggles).
- `/profile` (and `/profile/me`) – Builder profile editor and portfolio visualizer.
- `/projects` – Project showcase and peer collaboration requests.
- `/u/:username/*` – Public, 3D interactive portfolio views (preserved unchanged).

### 2.2 Moderator Routes (`/moderator/*`)
Protected by `requireModerator` / `ModeratorRoute` frontend guard:
- `/moderator` – Moderation Overview (pending reports queue, recent moderation actions).
- `/moderator/reports` – Report triage table (filter by status: `pending`, `investigating`, `resolved`).
- `/moderator/content` – Content moderation console (flagged posts, hidden comments, project takedowns).
- `/moderator/communities` – Community moderation interface (community guidelines enforcement).

### 2.3 Administrator Routes (`/admin/*`)
Protected by `requireAdmin` / `AdminRoute` frontend guard:
- `/admin` – Executive Platform Overview (real-time platform KPIs, user growth, active communities).
- `/admin/users` – User Directory & Lifecycle (search, view builder details, temporary/permanent suspension, restore).
- `/admin/reports` – Platform-wide report escalation and dispute resolution.
- `/admin/communities` – Community directory, suspension, and ownership reassignment.
- `/admin/opportunities` – Recruiter opportunity review and verification (jobs, internships, hackathons).
- `/admin/analytics` – Platform analytics, builder activity charts, cohort retention.
- `/admin/audit-logs` – Immutable system audit log viewer.

### 2.4 Super Admin Dedicated Routes (`/admin/*`)
Protected by `requireSuperAdmin` / `SuperAdminRoute` frontend guard:
- `/admin/security` – Platform security configuration (session timeouts, login rate limits, bot protection toggles, encryption key rotation status).
- `/admin/roles` & `/admin/administrators` – Administrator role assignments (promote/demote MODERATOR and ADMIN).
- `/admin/platform-settings` – Global platform toggles (maintenance mode, feature flags, registration limits).

---

## 3. Centralized 5-Tier RBAC Backend Middleware Pipeline

Every protected Express route enforces a strict 5-tier evaluation pipeline:

```
 Incoming Request
       │
       ▼
 [Tier 1: Authentication]
   └── Is JWT valid? User exists in DB? Session not invalidated by password change?
       │
       ▼
 [Tier 2: Account Status & Suspension]
   └── Is user suspended (user.status === 'suspended' || user.suspension.isSuspended)?
       If temporary suspension expired -> auto-restore.
       If active suspension -> return 403 Forbidden with reason and expiresAt.
       │
       ▼
 [Tier 3: Role Hierarchy Resolution]
   └── Normalizes role (USER=1, MODERATOR=2, ADMIN=3, SUPER_ADMIN=4).
       │
       ▼
 [Tier 4: Granular Permission Check]
   └── Does role level >= minRequiredLevel for requested API operation?
       Blocks normal users from admin APIs (403 Forbidden).
       Blocks moderators from user management and security settings.
       │
       ▼
 [Tier 5: Resource Ownership or Moderation Scope]
   └── If operating on a specific resource (e.g. editing a profile or deleting a post),
       is the user the author/owner? OR is user an ADMIN/SUPER_ADMIN?
       │
       ▼
 Route Controller Execution
```

---

## 4. Security, Accountability & Defense-in-Depth

### 4.1 Re-Authentication for Critical Administrative Actions
High-risk administrative operations require explicit re-authentication (submitting the admin's current password in `req.body.adminPassword` or via an `X-Reauth-Token` header):
- Modifying security settings.
- Promoting or demoting administrators.
- Permanently deleting platform communities or content.
- Exporting platform analytics or user data.

### 4.2 Mandatory Reasoning for Suspensions and Penalties
The backend strictly enforces that any account suspension, community freeze, or post removal includes a non-empty `reason` string (minimum 5 characters, maximum 1,000 characters). The action, moderator ID, reason, timestamp, and target ID are saved to both `ModerationAction` and the immutable `AuditLog`.

### 4.3 PII Masking in Administration & Moderation Views
To adhere to data privacy standards (GDPR / ISO 27001):
- Moderators can only see masked emails (`j***@example.com`) and masked IPs (`192.168.***.***`).
- Only verified Administrators and Super Admins can view unmasked contact emails for account recovery purposes.

### 4.4 Real Database Telemetry (Zero Fabricated Metrics)
Platform stats and analytics endpoints calculate live counts and aggregations:
- `totalUsers`: `User.countDocuments()`
- `verifiedUsers`: `User.countDocuments({ isVerified: true })`
- `activePosts`: `Post.countDocuments({ isDeleted: false })`
- `pendingReports`: `Report.countDocuments({ status: 'pending' })`
- `openOpportunities`: `Opportunity.countDocuments({ status: 'active' })`
- `communities`: `Community.countDocuments()`

---

## 5. One-Time Secure Super Admin Bootstrap Process

- Handled via `backend/scripts/bootstrapAdmin.js`.
- If an existing `SUPER_ADMIN` is discovered in the database, the script immediately exits with an informational message and **refuses execution** unless explicitly invoked with `--force`.
- Records `ADMIN_BOOTSTRAP_EXECUTED` in the immutable `AuditLog` collection.
- Can be permanently disabled via `DISABLE_ADMIN_BOOTSTRAP=true` in production environment variables.
