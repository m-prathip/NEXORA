# NEXORA – Encrypted URL & Route Obfuscation Security Audit
**Document Version:** 1.0.0  
**Target Architecture:** NEXORA (React 18 + Vite, Node.js + Express, MongoDB + Mongoose, JWT)  
**Security Standard:** NIST SP 800-38D (GCM Mode), RFC 7518 / RFC 5116 (AEAD)  
**Lead Security Engineer:** Senior Node.js Security Architect  
**Audit Date:** November 2026  

---

## 1. Executive Summary

In modern professional web platforms such as **NEXORA**, sensitive endpoints frequently expose internal routing structures, role distinctions, and database resource identifiers directly in browser address bars, history logs, web server access logs, proxy caches, and HTTP `Referer` headers.

Examples of unencrypted route exposure in the baseline system:
- **Platform Administration:** `/admin/users`, `/admin/reports`, `/admin/audit-logs`, `/admin/settings`
- **User Dashboard & Portfolio CMS:** `/:dashboardId` (`:dashboardId` = `${username}-${dashboardHash}`)
- **Private Project Hub & Collaborations:** `/collaborations`, `/projects/showcase`
- **Internal Direct Messaging:** `/messages/:conversationId`

Exposing raw route names and resource IDs introduces several severe security risks:
1. **Route Enumeration & Reconnaissance:** Attackers map out administrative interfaces and privilege hierarchies.
2. **Shoulder Surfing & Screen Scraping:** Observers can view sensitive resource IDs or user roles directly on screen.
3. **Browser History & Referer Leakage:** Resource identifiers and private URLs persist in browser histories and leak through outbound HTTP `Referer` headers.
4. **Token Replay & URL Guessing:** Predictable or static slugs allow unauthorized users to attempt targeted brute-force attacks against backend APIs.

### The Objective
To replace plaintext sensitive routes with **authenticated, encrypted route tokens** formatted as:
```
/secure/:encryptedToken
```
This URL encryption layer uses **AES-256-GCM** (authenticated encryption with associated data) implemented via the Node.js native `crypto` module. This provides an additional confidentiality and privacy boundary **without** replacing or bypassing core authentication, authorization, or HTTPS.

---

## 2. Audit of Existing Frontend Routing Architecture (`frontend/src/App.jsx`)

The frontend application uses `react-router-dom` v6 with dynamic lazy loading.

### 2.1 Route Classification Matrix

| Route Path | Component | Sensitivity Tier | Current Protection | Target Post-Audit State |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `Landing.jsx` | Public | None | Unchanged (Public Marketing) |
| `/terms`, `/privacy` | `Terms.jsx`, `Privacy.jsx` | Public | None | Unchanged (Legal Documents) |
| `/auth/login`, `/signup` | Auth Views | Public / Anonymous | Rate Limiting | Unchanged (Public Authentication) |
| `/u/:username/*` | `PortfolioLayout.jsx` | Public / Standalone | Read-only | **Preserved Unchanged** (Public 3D Portfolios) |
| `/feed`, `/discover` | Community Views | Authenticated | `AppLayout` | Plain standard routes |
| `/settings` | `Settings.jsx` | **Sensitive** | `AppLayout` (Session) | **Encrypted Route Support** |
| `/:dashboardId/*` | `AdminLayout.jsx` | **Sensitive / High** | `ProtectedRoute` | **Encrypted Route Support** |
| `/admin/*` | `AdminDashboardLayout.jsx` | **Critical / Admin** | `AdminRoute` | **Encrypted Route Protection** |
| `/admin/users` | `PlatformAdminUsers.jsx` | **Critical / Admin** | `AdminRoute` | **Encrypted Route Protection** |
| `/admin/reports` | `PlatformAdminReports.jsx` | **Critical / Admin** | `AdminRoute` | **Encrypted Route Protection** |
| `/admin/audit-logs` | `AdminAuditLogs.jsx` | **Critical / Admin** | `AdminRoute` | **Encrypted Route Protection** |
| `/admin/settings` | `AdminSettings.jsx` | **Critical / Admin** | `AdminRoute` | **Encrypted Route Protection** |
| `/collaborations` | `ProjectHub.jsx` | **Sensitive** | `AppLayout` | **Encrypted Route Support** |

### 2.2 Vulnerabilities Identified in Existing Routing
1. **Predictable Dashboard Hash in URL:**
   - In `ProtectedRoute.jsx`:
     ```javascript
     const expectedDashboardId = `${user.username}-${user.dashboardHash}`;
     ```
   - While `dashboardHash` prevents naive username-only guessing, exposing it in `/:dashboardId/profile` reveals that hash in browser bookmarks, copy-pasted URLs, and server logs.
2. **Exposed Administrative Hierarchy:**
   - The `/admin/*` paths immediately signal administrative privilege boundaries to any user or inspecting proxy.
3. **Absence of a Generic Secure Token Route Handler:**
   - The frontend lacks a generic `/secure/:encryptedToken` routing wrapper that can decrypt route intent via an authorized backend contract and safely render target components without exposing internal URLs.

---

## 3. Audit of Express APIs & Backend Controllers (`backend`)

### 3.1 Route Registration & Mounting Defect Discovered
During the architectural code review of `backend/server.js`, an operational defect was identified:
- `backend/routes/admin.js` defines all administrative endpoints (`/stats`, `/users`, `/posts`, `/communities`, `/reports`, `/opportunities`, `/analytics`, `/audit-logs`, `/settings`).
- However, `backend/server.js` was missing:
  ```javascript
  app.use('/api/admin', require('./routes/admin'));
  ```
- **Remediation Action:** Mount `/api/admin` into `server.js` with `protect` middleware and proper rate limiting.

### 3.2 Authorization & Identity Verification
- In `backend/middleware/auth.js`:
  - `protect` verifies the JWT access token, checks user suspension, checks verification status, and validates `passwordChangedAfter`.
  - Roles: `USER` (level 1), `MODERATOR` (level 2), `ADMIN` (level 3), `SUPER_ADMIN` (level 4).
  - Role hierarchy is enforced via `requireRole(...)`.
- **Crucial Security Requirement:** The decrypted route token must **never** be treated as proof of user identity, role, or authorization. The server must evaluate:
  1. Valid JWT bearer token (`req.user`).
  2. Token purpose match (e.g. `ROUTE_ACCESS`, `SINGLE_USE_SHARE`).
  3. Token expiration timestamp (`exp`).
  4. Server-side revocation list / replay status in MongoDB.
  5. Object-level access control (ownership of `resourceId` or required administrative role for administrative routes).

---

## 4. Threat Modeling (STRIDE Analysis)

| Threat Category | Attack Vector | Baseline Vulnerability | AES-256-GCM Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Forging route tokens to access unauthorized areas | Attackers could craft URLs or tamper with parameters | AES-256-GCM authenticated encryption guarantees ciphertext authenticity. Any modification causes decryption failure via the 16-byte authentication tag. |
| **Tampering** | Bit-flipping ciphertext or altering expiry/resource ID | CBC or unauthenticated ciphers allow malleability | GCM mode computes an authentication tag (`authTag`). Any bit manipulation in IV, ciphertext, or associated data causes decryption to fail immediately. |
| **Repudiation** | Denying access to sensitive administration or records | Lack of specific audit trail for route token usage | Every token generation, decryption attempt, validation failure, and revocation is recorded in the immutable `AuditLog` collection. |
| **Information Disclosure** | Sniffing or leaking private routes from logs/Referer | Cleartext routes (`/admin/users`, `/:dashboardId/profile`) | URLs are uniformly masked as `/secure/<token>`. HTTP headers enforce `Referrer-Policy: no-referrer` and `Cache-Control: no-store`. |
| **Denial of Service** | Flooding backend with random token decryption requests | Expensive cryptographic operations consuming CPU | Dedicated rate limiters (`secureRouteLimiter`) throttle resolution attempts per IP and per user session. |
| **Elevation of Privilege** | Normal user obtaining an admin's encrypted token | If token grants permissions directly, token leakage = compromise | Decryption only extracts **target route intent**. The backend still verifies `req.user.role >= targetRole` and rejects unauthorized users with `403 Forbidden`. |

---

## 5. Cryptographic Design Specification

### 5.1 Cipher & Parameters
- **Cipher Algorithm:** `aes-256-gcm` (NIST SP 800-38D).
- **Key Length:** 256 bits (32 bytes), cryptographically random.
- **Initialization Vector (IV):** 96 bits (12 bytes), generated per encryption operation via `crypto.randomBytes(12)`. **Never reused**.
- **Authentication Tag:** 128 bits (16 bytes), verified via `cipher.getAuthTag()` / `decipher.setAuthTag()`.
- **Encoding:** URL-safe Base64 (`base64url` - RFC 4648 §5, replacing `+` with `-`, `/` with `_`, and stripping padding `=`).

### 5.2 Key Management & Rotation Support
- Key storage: Backend environment variable `ROUTE_ENCRYPTION_KEY` (primary 32-byte key in hex or base64) and `ROUTE_ENCRYPTION_KEY_FALLBACK` (previous rotated key).
- Key Identifier (`kid`): Encrypted tokens are prefixed with the key version (e.g. `v1:...`).
- Decryption dynamically looks up the key corresponding to `kid`. When keys are rotated, old tokens continue to decrypt until their natural expiration, while new tokens are encrypted with the active primary key.

### 5.3 Token Payload Structure (Minimalist & Non-Sensitive)
```json
{
  "rid": "admin_users",
  "res": "65b9e18f2d8a4e001c38a912",
  "pur": "ROUTE_NAV",
  "iat": 1711200000,
  "exp": 1711203600,
  "jti": "b4e84b86-46b0-4fa8-b2e1-8846c4f7457a",
  "uid": "65b9df232d8a4e001c38a901"
}
```
*Note: Excludes passwords, emails, names, phone numbers, or database dumps.*

### 5.4 Token Format
```
v1.<base64url(iv)>.<base64url(authTag)>.<base64url(ciphertext)>
```
Total token length is typically ~120-160 characters, safely within browser URL limits (2,048 chars) and URL-safe without escaping.

---

## 6. Audit Recommendations & Implementation Roadmap

1. **Phase 1: Cryptographic Engine & Utilities (`backend/utils/urlCrypto.js`)**
   - Implement `encryptRoute(payload, options)`
   - Implement `decryptRoute(tokenString)`
   - Implement `validateRouteToken(tokenString, expectedPurpose)`
   - Unit test key rotation, IV randomness, tag verification, and tampering rejection.

2. **Phase 2: Database Replay & Revocation Engine (`backend/models/RouteToken.js`)**
   - Store SHA-256 hashes of token identifiers (`jti`) or token strings.
   - Support single-use tokens (auto-consumed upon first valid resolution).
   - Support explicit revocation for emergency link cancellation.

3. **Phase 3: Backend API Endpoints & Access Control (`backend/routes/secureRoutes.js`)**
   - `POST /api/secure-routes/decrypt` (Resolves encrypted token, enforces user role and resource ownership).
   - `POST /api/secure-routes/generate` (Generates encrypted tokens for authorized users).
   - `POST /api/secure-routes/revoke` (Revokes a token hash).
   - Mount `/api/admin` into `server.js` with proper auth guards.
   - Enforce HTTP headers: `Cache-Control: no-store`, `Referrer-Policy: no-referrer`.

4. **Phase 4: Frontend Generic Route Handler (`frontend/src/pages/secure/SecureRouteHandler.jsx`)**
   - Define `/secure/:encryptedToken` in `App.jsx`.
   - Submit token to backend `/api/secure-routes/decrypt` with current JWT bearer token.
   - Handle loading, invalid token, expired token, and revoked token states gracefully.
   - Dynamically load and mount the authorized target view without altering browser location to expose internal paths.

5. **Phase 5: Automated Verification & Security Test Suite**
   - Create 11 specialized test cases covering all edge cases.
