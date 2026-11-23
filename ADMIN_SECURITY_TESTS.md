# NEXORA – Platform Administration & RBAC Security Test Specification
**Document Version:** 1.0.0  
**Test Suite:** `backend/tests/nexora.rbac.admin.test.js`  
**Test Environment:** Node.js v26.13.1, Express v4.18.2, MongoDB In-Memory Server (v9.1.6), Supertest (v6.3.4)  
**Security Standard:** OWASP ASVS v4.0 (Access Control & Authentication Verification)  
**Date:** November 2026  

---

## 1. Test Suite Objective

This document defines the automated test scenarios required to verify the complete separation between individual user/student experiences and platform administration, validating that:
- Role boundaries are strictly enforced on every API endpoint server-side.
- Front-end route protection is backed by un-bypassable backend middleware.
- Privilege escalation, self-promotion, and horizontal IDOR attacks are blocked and logged.

---

## 2. Test Scenarios & Assertion Criteria

| Test ID | Scenario Name | Attack Vector / Action Tested | Expected HTTP Status | Expected Error / Response Code |
| :---: | :--- | :--- | :---: | :--- |
| **RBAC-01** | **User Blocks from Admin APIs** | Authenticated `USER` invokes `GET /api/admin/stats`, `GET /api/admin/users`, `GET /api/admin/audit-logs` | `403 Forbidden` | `Forbidden: Insufficient administrative privileges` |
| **RBAC-02** | **User Blocks from Moderator APIs** | Authenticated `USER` invokes `GET /api/admin/posts`, `GET /api/admin/reports` | `403 Forbidden` | `Forbidden: Insufficient administrative privileges` |
| **RBAC-03** | **Moderator Blocks from Admin APIs** | Authenticated `MODERATOR` invokes `GET /api/admin/users`, `GET /api/admin/analytics`, `GET /api/admin/audit-logs` | `403 Forbidden` | `Forbidden: Insufficient administrative privileges` |
| **RBAC-04** | **Moderator Access to Content Moderation** | Authenticated `MODERATOR` invokes `GET /api/admin/posts` and `GET /api/admin/reports` | `200 OK` | Access granted to moderation queue |
| **RBAC-05** | **Admin Cannot Promote to SUPER_ADMIN** | Authenticated `ADMIN` attempts to PATCH role to `SUPER_ADMIN` | `403 Forbidden` | `Forbidden: Only Super Administrators can modify roles` |
| **RBAC-06** | **Super Admin Manages Roles** | Authenticated `SUPER_ADMIN` promotes a user to `ADMIN` or `MODERATOR` | `200 OK` | `User role updated` + Audit log created |
| **RBAC-07** | **Super Admin Manages Security Settings** | Authenticated `SUPER_ADMIN` updates platform security settings with valid re-auth | `200 OK` | Settings updated + Audit log created |
| **RBAC-08** | **Re-Authentication for Critical Actions** | Admin or Super Admin updates security without password confirmation | `401 Unauthorized` | `Re-authentication required: Valid password must be provided` |
| **RBAC-09** | **Profile IDOR Isolation** | User A submits `PUT /api/profile/me` with another user's ID or attempts to edit User B's profile | `403 Forbidden` or ignores foreign ID | Only authenticated user's profile is updated |
| **RBAC-10** | **Suspension Enforcement** | Suspended user attempts to create post, comment, or access private endpoints | `403 Forbidden` | `Your account has been suspended` with reason |
| **RBAC-11** | **Tampered Registration Role** | Unauthenticated user registers with `{ role: 'ADMIN' }` or `{ role: 'SUPER_ADMIN' }` | `201 Created` | Account is created strictly as `USER` |
| **RBAC-12** | **Direct API Request Without Token** | Unauthenticated attacker calls `/api/admin/stats` directly | `401 Unauthorized` | `Not authorized, no token` |

---

## 3. Test Execution Command

The test suite is executed directly within the backend testing harness:
```bash
npm run test:rbac
# or directly:
node tests/nexora.rbac.admin.test.js
```

---

## 4. Acceptance Criteria

- **100% Pass Rate:** All 12 test assertions must pass before code is approved for staging or production.
- **Zero Mocked Telemetry:** All tests must query real MongoDB collections inside an isolated in-memory replica.
- **Audit Logging Verification:** Every critical administrative action must be accompanied by an immutable record in the `AuditLog` collection.
