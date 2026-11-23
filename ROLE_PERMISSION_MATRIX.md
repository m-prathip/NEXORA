# NEXORA – Role-Based Access Control (RBAC) Permission Matrix
**Document Version:** 1.0.0  
**Target Systems:** NEXORA Community Platform & Platform Command Center  
**Security Standard:** NIST SP 800-53 (AC-2, AC-3, AC-6 - Least Privilege), OWASP ASVS v4.0  
**Lead Security Engineer:** Senior Node.js Security Architect  
**Date:** November 2026  

---

## 1. Executive Definition of the Four Roles

NEXORA maintains a strict separation between **Individual Users (Students / Builders)** and **Platform Administration (Moderators, Administrators, and Platform Owner/Developer)**.

> **CRITICAL DISTINCTION:** The Administrative Command Center is strictly for platform governance, trust/safety, and infrastructure maintenance. It is completely isolated from an individual student's personal portfolio CMS or dashboard.

```
                              ┌──────────────────────────────────────────┐
                              │               SUPER_ADMIN                │
                              │     (Platform Owner / Developer)         │
                              └────────────────────┬─────────────────────┘
                                                   │
                                                   ▼
                              ┌──────────────────────────────────────────┐
                              │                  ADMIN                   │
                              │    (Platform Governance & Operations)    │
                              └────────────────────┬─────────────────────┘
                                                   │
                                                   ▼
                              ┌──────────────────────────────────────────┐
                              │                MODERATOR                 │
                              │     (Trust, Safety & Content Scope)      │
                              └────────────────────┬─────────────────────┘
                                                   │
                                                   ▼
                              ┌──────────────────────────────────────────┐
                              │                  USER                    │
                              │     (Student / Builder / Creator)        │
                              └──────────────────────────────────────────┘
```

### 1.1 USER (Student / Builder)
- **Scope:** Self and public/connected community interactions.
- **Capabilities:**
  - Create and manage their own builder profile, portfolio sections, skills, education, experience, achievements, and custom themes.
  - Create, edit, and delete their own posts, projects, collaboration proposals, and comments.
  - Follow, connect with, and direct-message other students.
  - Join, participate in, and create student communities.
  - Manage personal account privacy settings (visibility, online status, messaging permissions).
  - Submit trust & safety reports regarding abusive content or fake accounts.
- **Restrictions:**
  - Strictly blocked from all `/admin/*` and `/moderator/*` routes and APIs.
  - Cannot view platform-wide analytics, server health, audit logs, or other users' private records.
  - Cannot alter their own role or privileges through registration or profile update endpoints.

### 1.2 MODERATOR (Trust & Safety Guardian)
- **Scope:** Community content moderation and user report triage.
- **Capabilities:**
  - Access dedicated moderation tools (`/moderator/*`).
  - Review, investigate, and triage user reports and complaints (`/moderator/reports`).
  - Moderate flagged posts, comments, and project submissions (`/moderator/content`).
  - Manage and moderate assigned student communities (`/moderator/communities`).
  - Record official moderation decisions with mandatory audit reasons.
- **Restrictions:**
  - Cannot access platform security settings, environment configs, or developer settings.
  - Cannot view platform revenue or full business analytics.
  - Cannot suspend platform administrators or modify user roles.
  - Cannot access immutable system audit logs.

### 1.3 ADMIN (Platform Administrator)
- **Scope:** Platform-wide operations, user management, and opportunity governance.
- **Capabilities:**
  - Full user lifecycle management: view user lists, search builders, inspect account standing, suspend abusive users with mandatory reasoning, and restore accounts (`/admin/users`).
  - Manage reports, disputes, and escalated moderation decisions (`/admin/reports`).
  - Oversee all communities, collaborations, and posts (`/admin/communities`, `/admin/posts`).
  - Review, approve, or reject recruiter-submitted jobs, internships, and hackathons (`/admin/opportunities`).
  - Appoint, monitor, and manage MODERATOR accounts.
  - Access real-time platform analytics, retention metrics, and growth data (`/admin/analytics`).
  - View standard platform audit logs (`/admin/audit-logs`).
- **Restrictions:**
  - **Self-Promotion Blocked:** Cannot promote themselves or other ADMINs to SUPER_ADMIN.
  - Cannot modify platform-wide encryption keys, CORS settings, or low-level security parameters (`/admin/security`, `/admin/platform-settings`).
  - Cannot suspend or demote a SUPER_ADMIN.

### 1.4 SUPER_ADMIN (Platform Developer / Owner)
- **Scope:** Full sovereign platform control.
- **Capabilities:**
  - All ADMIN and MODERATOR capabilities.
  - Manage platform administrators: promote users to ADMIN or MODERATOR, demote administrators, and control administrator access (`/admin/administrators`, `/admin/roles`).
  - Configure platform-wide security policies, rate limits, feature flags, and maintenance modes (`/admin/security`, `/admin/platform-settings`).
  - Access immutable administrative audit logs with IP and user-agent forensics (`/admin/audit-logs`).
  - Perform or authorize data exports and database maintenance.
- **Account Creation Rule:**
  - Initial SUPER_ADMIN is provisioned exclusively through a one-time, secure server-side CLI bootstrap script (`npm run seed:admin`), permanently locked after initialization.

---

## 2. Granular Role-Permission Matrix

| Permission Key | Description | USER | MODERATOR | ADMIN | SUPER_ADMIN | Enforcing Backend Middleware |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `profile:read_self` | View own builder profile | ✅ | ✅ | ✅ | ✅ | `protect`, ownership check |
| `profile:update_self` | Edit own profile & portfolio | ✅ | ✅ | ✅ | ✅ | `protect`, ownership check |
| `profile:read_public` | View public portfolios (`/u/:username`) | ✅ | ✅ | ✅ | ✅ | Public endpoint (no auth required) |
| `content:create` | Create posts, projects, comments | ✅ | ✅ | ✅ | ✅ | `protect`, `checkAccountStatus` |
| `content:delete_own` | Delete own content | ✅ | ✅ | ✅ | ✅ | `protect`, ownership check |
| `report:create` | Submit content/user report | ✅ | ✅ | ✅ | ✅ | `protect`, `checkAccountStatus` |
| `report:review` | Review & investigate reports | ❌ | ✅ | ✅ | ✅ | `requireModerator` |
| `report:resolve` | Resolve / dismiss reports | ❌ | ✅ | ✅ | ✅ | `requireModerator` |
| `content:moderate` | Remove / hide flagged posts or comments | ❌ | ✅ | ✅ | ✅ | `requireModerator` |
| `community:moderate` | Manage/moderate student communities | ❌ | ✅ | ✅ | ✅ | `requireModerator` |
| `users:list_all` | Search & list all registered users | ❌ | ❌ | ✅ | ✅ | `requireAdmin` |
| `users:view_details` | View user metadata & moderation history | ❌ | ❌ | ✅ | ✅ | `requireAdmin` |
| `users:suspend` | Temporarily or permanently suspend user | ❌ | ❌ | ✅ | ✅ | `requireAdmin`, mandatory reason |
| `users:restore` | Restore suspended account | ❌ | ❌ | ✅ | ✅ | `requireAdmin`, mandatory reason |
| `moderator:manage` | Assign / revoke MODERATOR role | ❌ | ❌ | ✅ | ✅ | `requireAdmin` (cannot touch SUPER_ADMIN) |
| `opportunities:review` | Review & approve jobs/hackathons | ❌ | ❌ | ✅ | ✅ | `requireAdmin` |
| `analytics:view` | View real database growth & usage stats | ❌ | ❌ | ✅ | ✅ | `requireAdmin` |
| `analytics:export` | Export platform analytics CSV/JSON | ❌ | ❌ | ✅ | ✅ | `requireAdmin` |
| `audit_logs:view` | Inspect immutable audit trails | ❌ | ❌ | ✅ | ✅ | `requireAdmin` |
| `admin:manage_roles` | Assign ADMIN or SUPER_ADMIN roles | ❌ | ❌ | ❌ | ✅ | `requireSuperAdmin` |
| `security:manage` | Modify security settings & policies | ❌ | ❌ | ❌ | ✅ | `requireSuperAdmin`, re-auth |
| `platform:settings` | Toggle global maintenance & features | ❌ | ❌ | ❌ | ✅ | `requireSuperAdmin`, re-auth |

---

## 3. Strict Boundary & Isolation Rules

1. **Self-Promotion Defense:**
   - Any API request attempting to change `user.role` from ADMIN to SUPER_ADMIN is rejected with `403 Forbidden: Only an existing SUPER_ADMIN can grant administrator roles`.
   - `SUPER_ADMIN` accounts cannot demote themselves to prevent accidental lockouts.

2. **Profile & Registration Sanitization:**
   - Public registration (`POST /api/auth/register`) strictly sets `role: 'USER'` regardless of client payload.
   - Profile update endpoints (`PUT /api/profile/me`) strictly whitelist profile metadata and discard any incoming `role`, `status`, `suspension`, or `isVerified` fields.

3. **Student Privacy Shield:**
   - Students cannot view internal moderation notes (`adminNotes`, `suspension.history.notes`).
   - Personally identifiable information (PII) like raw email addresses, IP addresses, and user-agent strings are masked in moderator views (`j***@example.com`, `192.168.***.***`).
