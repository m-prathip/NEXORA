# NEXORA – Exclusive Developer Super Admin Dashboard Architecture
**Document Version:** 1.0.0  
**Target View:** `/owner-control` (Private Platform Owner / Developer Control Center)  
**Security Standard:** NIST SP 800-53 (AC-2, AC-3, AC-6 - Least Privilege & Separation of Duties), OWASP Top 10 (A01: Broken Access Control)  
**Lead Security Engineer:** Senior Node.js Security Architect  
**Date:** November 2026  

---

## 1. Executive Summary & Non-Disclosure Principle

The **NEXORA Developer Super Admin Dashboard** (`/owner-control`) is a sovereign, isolated administrative control panel designed **exclusively for the platform developer and owner**.

It is strictly isolated from:
- Regular students and creators (`USER`).
- Community and trust/safety moderators (`MODERATOR`).
- Standard platform administrators (`ADMIN`).
- Public navigation, sitemaps, robots.txt indexing, and student dashboards (`/:dashboardId/*`).

> **Security Core Directive:** The obscurity of the `/owner-control` URL is **never** relied upon as a security boundary. Access is enforced by server-side cryptographic authentication, trusted database role verification (`role === 'SUPER_ADMIN'`), mandatory re-authentication (`requireReauth`) for destructive operations, strict rate limiting, and zero client-side privilege trust.

---

## 2. Dedicated Route & Visibility Matrix

| Route / Surface | Target Audience | Guarding Mechanism | Visible in Navigation? |
| :--- | :--- | :--- | :---: |
| `/dashboard` | Students / Builders | `AppLayout` | Yes (Main Menu) |
| `/:dashboardId/profile` | Student CMS | `ProtectedRoute` | Yes (User Menu) |
| `/moderator/*` | Moderators | `requireModerator` | Yes (Moderators Only) |
| `/admin/*` | Platform Admins | `requireAdmin` | Yes (Admins Only) |
| `/owner-control/*` | **Platform Developer / Owner ONLY** | `requireSuperAdmin` | **NEVER** (Isolated URL) |

### 2.1 Navigation & Discovery Defense
1. **Robots / Indexing Shield:** The frontend includes `robots.txt` / meta tags disallowing indexing of `/owner-control` and `/admin`.
2. **Hidden from Menus:** No links to `/owner-control` exist in student navigation, marketing landing pages, mobile sidebars, moderator headers, or standard admin sidebars.
3. **URL Tampering Defense:** If a student, moderator, or normal administrator manually types `/owner-control` into their address bar:
   - The frontend guard (`SuperAdminRoute`) checks the session.
   - If unauthenticated -> redirects to `/auth/login`.
   - If role is not `SUPER_ADMIN` -> immediately redirects to `/dashboard` with an access denied alert.
   - If the user modifies local state or devtools to spoof their role, every backend API call to `/api/owner/*` strictly validates the database-stored role from the verified JWT subject and returns `403 Forbidden`.

---

## 3. The 15 Exclusive Super Admin Modules

The Super Admin Control Center provides 15 dedicated modules:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    NEXORA DEVELOPER SUPER ADMIN CONSOLE                    │
│                               (/owner-control)                             │
├───────────────────┬───────────────────────────────────┬────────────────────┤
│ 1. Platform       │ 6. Reports & Complaints Oversight │ 11. Security       │
│    Overview       │ 7. Platform Content Moderation    │     Monitoring     │
│ 2. Complete User  │ 8. Community Management           │ 12. Audit Logs     │
│    Management     │ 9. Opportunity Management         │ 13. System Health  │
│ 3. Administrator  │ 10. Platform Analytics            │ 14. Maintenance &  │
│    Management     │                                   │     Backups        │
│ 4. Moderator Mgmt │                                   │ 15. Global Platform│
│ 5. Roles & RBAC   │                                   │     Settings       │
└───────────────────┴───────────────────────────────────┴────────────────────┘
```

1. **Platform Overview:** Real-time system vitals, total registered builders, verified accounts, active communities, pending reports, and server uptime.
2. **Complete User Management:** Platform-wide search, builder inspection, account verification overrides, temporary/permanent suspension with mandatory reasoning, and account deletion.
3. **Administrator Management:** Appointment of platform administrators, performance monitoring, and emergency revocation of admin privileges.
4. **Moderator Management:** Creation and oversight of moderators, review quotas, and community assignment scopes.
5. **Role and Permission Management:** Promotion and demotion engine. Protects `SUPER_ADMIN` accounts from being modified or demoted.
6. **Reports and Complaints Oversight:** Executive queue of all unresolved harassment, spam, and fraud reports across NEXORA.
7. **Platform-wide Content Moderation:** Direct review and takedown of flagged posts, comments, and project submissions.
8. **Community Management:** Platform-wide community freeze, guideline enforcement, and ownership transfers.
9. **Opportunity Management:** Verification and approval of recruiter job, internship, and hackathon postings.
10. **Platform Analytics:** Real database metrics (builder signups, daily active users, portfolio views, collaboration proposals).
11. **Security Monitoring:** Live telemetry of rate-limit violations, failed login spikes, NoSQL injection attempts, and suspicious user-agents.
12. **Audit Logs:** Immutable, cryptographically non-tamperable audit trail with actor IDs, roles, actions, IP addresses, and user-agent forensics.
13. **Database and System Health:** Process memory usage (`heapUsed`, `heapTotal`), V8 garbage collection telemetry, Mongoose connection state, and collection statistics.
14. **Backup and Maintenance:** On-demand database export triggers, cache purges, and global maintenance mode toggle.
15. **Global Platform Settings:** Registration controls (open/invite-only), Gemini AI feature toggles, and maximum connection limits.

---

## 4. Backend Access-Control & Security Specification

### 4.1 Middleware Pipeline (`requireSuperAdmin`)
```
Request to /api/owner/*
      │
      ▼
[1] Rate Limiter (ownerLimiter)
      │  Max 60 requests / 15 min per IP to prevent DoS
      ▼
[2] Authentication (protect)
      │  Validates short-lived JWT in Authorization header
      │  Checks account existence in database
      ▼
[3] Account Status Check (checkAccountStatus)
      │  Verifies account is active and not suspended
      ▼
[4] Super Admin Role Verification (requireSuperAdmin)
      │  Queries trusted DB user record: user.role === 'SUPER_ADMIN'
      │  Rejects USER, MODERATOR, and ADMIN with 403 Forbidden
      ▼
[5] Re-Authentication Guard (requireReauth)
      │  Enforced on critical operations (role change, maintenance, security settings)
      │  Requires valid password confirmation
      ▼
[6] Controller Execution + Immutable AuditLog Entry
      │  Records action, actor, IP, user-agent, and reason
      ▼
Response (Headers: Cache-Control: no-store, Referrer-Policy: no-referrer)
```

---

## 5. Emergency Controls & Administrator Revocation

- **Instant Revocation:** The platform developer can revoke administrator or moderator status with one click.
- **Session Kill Switch:** Revoking an administrator invalidates their active refresh tokens in MongoDB, immediately terminating active sessions across all devices.
- **Self-Protection Lock:** Standard administrators cannot view or modify the `SUPER_ADMIN` record in `/admin/users` or via APIs.
- **Owner Account Recovery:** See [`OWNER_SECURITY_RECOVERY.md`](file:///d:/projects/Nexora/Nexora-project/OWNER_SECURITY_RECOVERY.md).
