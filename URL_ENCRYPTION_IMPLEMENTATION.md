# NEXORA – AES-256-GCM URL Encryption Architecture & Implementation Guide
**Document Version:** 1.0.0  
**Security Standard:** NIST SP 800-38D / RFC 7518 / RFC 5116  
**Status:** Implementation Blueprint  

---

## 1. Architectural Architecture Overview

The NEXORA Encrypted Route system protects internal paths and database resource IDs from being leaked through URLs, browser history, bookmarks, proxy logs, and HTTP Referer headers.

```
       User Browser / Client
                 │
                 │ 1. Requests: GET /secure/:encryptedToken
                 ▼
     ┌───────────────────────┐
     │  SecureRouteHandler   │
     │  (React 18 + Vite)    │
     └───────────┬───────────┘
                 │ 2. POST /api/secure-routes/decrypt
                 │    Headers: Authorization: Bearer <JWT>
                 │    Body: { encryptedToken }
                 ▼
     ┌────────────────────────────────────────────────────────┐
     │               NEXORA Express Backend                  │
     ├────────────────────────────────────────────────────────┤
     │  [1] Rate Limiter (secureRouteLimiter)                │
     │  [2] User Auth (protect middleware -> req.user)       │
     │  [3] AES-256-GCM Decryption (urlCrypto.decryptRoute)  │
     │      - Validate token format & key version (kid)       │
     │      - Verify 128-bit Authentication Tag               │
     │  [4] Expiry & Purpose Verification                     │
     │  [5] MongoDB RouteToken Replay & Revocation Check      │
     │      - Check if revoked (RouteToken collection)        │
     │      - Check if single-use (mark as consumed)          │
     │  [6] Server-Side RBAC & Resource Ownership Check       │
     │      - Check user role >= target required role         │
     │      - Check ownership of target resource ID           │
     │  [7] Audit Logging (securityLogger + AuditLog model)   │
     └───────────┬────────────────────────────────────────────┘
                 │ 3. Response:
                 │    Headers: Cache-Control: no-store
                 │             Referrer-Policy: no-referrer
                 │    Body: { success: true, routeId, pageData, viewConfig }
                 ▼
     ┌───────────────────────┐
     │  SecureRouteHandler   │
     │  Renders Authorized   │
     │  Component In-Place   │
     └───────────────────────┘
```

---

## 2. Cryptographic Specifications

### 2.1 Cipher & Parameters
- **Cipher:** `aes-256-gcm` using Node.js built-in `crypto` module.
- **Key:** 256 bits (32 bytes).
  - Primary Key: `ROUTE_ENCRYPTION_KEY` (hex or base64).
  - Fallback Key: `ROUTE_ENCRYPTION_KEY_FALLBACK` (hex or base64) for seamless rotation.
  - Test / Dev Fallback: Deterministic cryptographically generated key if unset.
- **Initialization Vector (IV):** 96 bits (12 bytes), generated per call via `crypto.randomBytes(12)`.
- **Authentication Tag:** 128 bits (16 bytes), generated via `cipher.getAuthTag()` and verified via `decipher.setAuthTag()`.
- **Serialization Format:**
  ```
  <keyId>.<base64url(iv)>.<base64url(authTag)>.<base64url(ciphertext)>
  ```
  - `keyId`: e.g. `v1`, `v2`.
  - Encoding: RFC 4648 §5 `base64url` (`+` -> `-`, `/` -> `_`, no `=` padding).

### 2.2 Payload Schema (Strictly Minimalist)
The decrypted payload contains **zero sensitive personal information** (no passwords, emails, names, or JWTs):
```typescript
interface EncryptedRoutePayload {
  rid: string;         // Route identifier: e.g. "admin_users", "user_settings", "collab_hub"
  res?: string;        // Opaque resource ID (e.g. MongoDB ObjectId) if route targets a specific entity
  pur: string;         // Token purpose: "NAV" | "SHARE" | "SINGLE_USE"
  iat: number;         // Issued-at Unix timestamp (seconds)
  exp: number;         // Expiration Unix timestamp (seconds)
  jti: string;         // Unique token ID (UUIDv4) for revocation & replay tracking
  uid?: string;        // Optional user ID binding (binds token to the issuing user)
}
```

---

## 3. Key Rotation Strategy

1. **Active Key:** Stored in `process.env.ROUTE_ENCRYPTION_KEY`. All new tokens are encrypted with `v1` (or current `kid`).
2. **Key Ring Map:**
   ```javascript
   const KEY_RING = {
     v1: parseKey(process.env.ROUTE_ENCRYPTION_KEY),
     v2: parseKey(process.env.ROUTE_ENCRYPTION_KEY_FALLBACK)
   };
   ```
3. **Decryption Flow:**
   - Extracts `kid` from prefix.
   - If `kid` exists in key ring, decrypts with matching key.
   - If not found or decryption fails, safely returns error without exposing key details.
4. **Zero Downtime Rotation:**
   - When rotating:
     - Set `ROUTE_ENCRYPTION_KEY_FALLBACK` = old key.
     - Set `ROUTE_ENCRYPTION_KEY` = new key.
     - Advance default `kid` to `v2`.
   - All existing tokens decrypt seamlessly using fallback key until expired.

---

## 4. Replay Prevention and Token Revocation Engine

### 4.1 MongoDB `RouteToken` Model
Stored in `backend/models/RouteToken.js`:
- `tokenHash`: SHA-256 hash of the token string (indexed, unique).
- `jti`: UUID string of token.
- `userId`: ObjectId of creator/owner.
- `purpose`: `NAV`, `SHARE`, `SINGLE_USE`.
- `isSingleUse`: Boolean.
- `isConsumed`: Boolean (set to `true` upon first valid decryption).
- `consumedAt`: Date.
- `isRevoked`: Boolean.
- `revokedAt`: Date.
- `revokedBy`: ObjectId.
- `expiresAt`: TTL index in MongoDB (`expireAfterSeconds: 0`) for automatic database cleanup.

### 4.2 Replay Protection Flow
1. If token is marked `isSingleUse: true`:
   - Decryption checks `isConsumed`. If `true`, request is rejected with `410 Gone: Token has already been used`.
   - If `false`, atomically set `{ isConsumed: true, consumedAt: new Date() }`.
2. If token is revoked:
   - Rejected with `401 Unauthorized / 403 Forbidden: Token has been revoked`.

---

## 5. Route Registry & Server-Side Access Control

Every `rid` (route identifier) maps to a strictly controlled server route definition:

| `rid` | Target Page Description | Min Role Required | Ownership Required |
| :--- | :--- | :--- | :--- |
| `admin_overview` | Platform Admin Overview | `MODERATOR` | No |
| `admin_users` | Platform Admin User Management | `MODERATOR` | No |
| `admin_posts` | Platform Admin Post Moderation | `MODERATOR` | No |
| `admin_communities` | Platform Admin Communities | `MODERATOR` | No |
| `admin_reports` | Platform Admin Reports & Moderation | `MODERATOR` | No |
| `admin_opportunities`| Platform Admin Opportunities | `MODERATOR` | No |
| `admin_analytics` | Platform Admin Analytics | `MODERATOR` | No |
| `admin_audit_logs` | Platform Admin Audit Logs | `ADMIN` | No |
| `admin_settings` | Platform Admin System Settings | `ADMIN` | No |
| `user_dashboard` | User Portfolio CMS Dashboard | `USER` | Yes (`req.user.id == res.userId`) |
| `user_settings` | Private Profile Settings | `USER` | Yes (`req.user.id == res.userId`) |
| `project_hub` | Private Collaborations & Projects | `USER` | Yes (Member or Creator) |

---

## 6. Frontend Route Handler (`/secure/:encryptedToken`)

1. React Router route: `<Route path="/secure/:encryptedToken" element={<SecureRouteHandler />} />`
2. Lifecycle:
   - Displays loading skeleton with `PageLoader` or `Spinner`.
   - Dispatches `secureRouteAPI.decryptToken(encryptedToken)`.
   - On `200 OK`:
     - Renders target component (e.g. `PlatformAdminUsers`, `AdminProfile`, `ProjectHub`) directly within the view layout without changing URL to cleartext!
   - On error:
     - Shows secure, non-revealing error card:
       - `Invalid Link`: Token is corrupted, malformed, or tampered with.
       - `Expired Link`: Token validity window has lapsed.
       - `Revoked Link`: Link was invalidated by owner or administrator.
       - `Unauthorized`: Insufficient user permissions for target resource.
3. Security Controls:
   - No token decryption in browser JavaScript.
   - No encryption keys bundled into Vite output.
   - Standard browser history is not polluted with plaintext administration or resource identifiers.
