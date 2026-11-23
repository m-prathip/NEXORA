# NEXORA – AES-256-GCM URL Encryption Test Verification Report
**Execution Date:** 23 November 2026  
**Test Suite:** `backend/tests/nexora.url.encryption.test.js`  
**Execution Environment:** Node.js v26.13.1, Express v4.18.2, MongoDB In-Memory Server (v9.1.6), Supertest (v6.3.4)  
**Security Standard:** NIST SP 800-38D (AES-256-GCM AEAD)  
**Status:** **100% PASSED (12 of 12 Test Cases Verified)**  

---

## 1. Executive Summary

A comprehensive automated security test suite was developed and executed to rigorously validate the **AES-256-GCM Encrypted Route Implementation** across backend cryptographic utilities, MongoDB revocation models, Express route guards, and React client interfaces.

All 11 required scenarios specified in the security specification—plus key rotation verification—passed with zero regressions.

---

## 2. Test Execution Results Matrix

| # | Test Scenario | Expected Result | Actual Result | Status |
| :-: | :--- | :--- | :--- | :-: |
| **1** | **Valid Encrypted Token** | Returns HTTP 200, resolves destination `targetPath`, sets `Cache-Control: no-store` and `Referrer-Policy: no-referrer` | HTTP 200 OK, destination `/settings`, security headers verified | **PASSED** |
| **2** | **Invalid Token Structure** | Non-token string rejected with HTTP 400 `INVALID_OR_TAMPERED_TOKEN` and security audit log | HTTP 400 Bad Request, error logged | **PASSED** |
| **3** | **Modified / Tampered Ciphertext** | Bit-flipped ciphertext triggers GCM tag mismatch and HTTP 400 rejection | HTTP 400 Bad Request, tampering logged to audit | **PASSED** |
| **4** | **Expired Token** | Token with past `exp` timestamp rejected with HTTP 410 `TOKEN_EXPIRED` | HTTP 410 Gone, `TOKEN_EXPIRED` | **PASSED** |
| **5** | **Wrong Authentication Tag** | Corrupted 16-byte auth tag triggers decryption failure and HTTP 400 rejection | HTTP 400 Bad Request, `Authentication tag verification failed` | **PASSED** |
| **6** | **Wrong Encryption Key** | Token encrypted with unknown key version fails safely without leaking keys | HTTP 400 Bad Request, `unknown or expired key version` | **PASSED** |
| **7** | **Revoked Token** | Token flagged `isRevoked: true` in MongoDB rejected with HTTP 403 `TOKEN_REVOKED` | HTTP 403 Forbidden, `TOKEN_REVOKED` recorded in AuditLog | **PASSED** |
| **8** | **Replayed Single-Use Token** | 1st consumption succeeds (HTTP 200); 2nd replay attempt fails with HTTP 410 `TOKEN_ALREADY_USED` | HTTP 200 then HTTP 410, replay attempt logged | **PASSED** |
| **9** | **Cross-User Access (IDOR Prevention)** | User A cannot resolve token bound to User B's private settings (HTTP 403 `FORBIDDEN_RESOURCE`) | HTTP 403 Forbidden, IDOR logged in security audit | **PASSED** |
| **10** | **Privilege Escalation / Admin Protection** | Normal user cannot resolve admin token (HTTP 403); Admin resolves same token (HTTP 200) | Normal user: HTTP 403; Admin user: HTTP 200 | **PASSED** |
| **11** | **Direct API Access Without Auth** | Requests without Bearer token or with forged JWT rejected with HTTP 401 | HTTP 401 Unauthorized (`Not authorized, no token`) | **PASSED** |
| **12** | **Key Rotation & Fallback Key Support** | Token encrypted with fallback key `v2` decrypts cleanly alongside primary `v1` | HTTP 200 OK, zero-downtime rotation verified | **PASSED** |

---

## 3. Detailed Test Case Analysis

### 3.1 Test 1: Valid Encrypted Token Resolution
- **Payload:** `{ rid: "user_settings", uid: "<user_id>", pur: "NAV", exp: now + 3600 }`
- **Output:**
  ```json
  {
    "success": true,
    "routeId": "user_settings",
    "targetPath": "/settings",
    "title": "Account & Privacy Settings",
    "module": "settings"
  }
  ```
- **Response Headers Verified:**
  - `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`
  - `Pragma: no-cache`
  - `Expires: 0`
  - `Referrer-Policy: no-referrer`

### 3.2 Test 2: Invalid / Corrupted Token Rejection
- **Input:** `"not-a-valid-token-string"`
- **Response:** HTTP 400 Bad Request
- **Security Audit Output:**
  ```
  [SECURITY][HIGH][SUSPICIOUS_ACTIVITY] - {"type":"INVALID_ENCRYPTED_ROUTE_TOKEN","details":"Invalid token structure: expected 4 segments (<kid>.<iv>.<tag>.<ciphertext>)"}
  ```

### 3.3 Test 3: Tampered Ciphertext (Bit-Flip Detection)
- **Input:** Single-bit XOR modification (`rawCipher[len - 1] ^= 0x01`).
- **Cryptographic Behavior:** In AES-256-GCM, the Galois field multiplier verifies the GHASH authentication tag over both the ciphertext and Additional Authenticated Data (AAD). Modifying even 1 bit of ciphertext causes deciphering to immediately throw:
  ```
  Error: Unsupported state or unable to authenticate data
  ```
- **Response:** HTTP 400 Bad Request (`Authentication tag verification failed: token has been tampered with or corrupted`).

### 3.4 Test 4: Expired Token Rejection
- **Input:** Token with `iat` = now - 7200, `exp` = now - 3600.
- **Response:** HTTP 410 Gone (`code: "TOKEN_EXPIRED"`).

### 3.5 Test 5: Wrong Authentication Tag Rejection
- **Input:** Valid IV, ciphertext, and key, but auth tag replaced with random 16-byte buffer.
- **Response:** HTTP 400 Bad Request (`Authentication tag verification failed`).

### 3.6 Test 6: Unknown / Wrong Encryption Key Rejection
- **Input:** Token encrypted with key ID `alien_v99` not present in key ring.
- **Response:** HTTP 400 Bad Request (`Invalid token: unknown or expired key version "alien_v99"`). No cryptographic key bytes leaked in response.

### 3.7 Test 7: Revoked Token Enforcement
- **Action:** Created token, stored hash in MongoDB `RouteToken`, called `/api/secure-routes/revoke`.
- **Validation:** Follow-up decryption request resulted in HTTP 403 Forbidden (`code: "TOKEN_REVOKED"`).

### 3.8 Test 8: Replay Attack on Single-Use Token
- **Setup:** Generated token with `isSingleUse: true`.
- **First Request:** Resolves successfully with HTTP 200 and marks `isConsumed = true`.
- **Replay Request:** Blocked with HTTP 410 Gone (`code: "TOKEN_ALREADY_USED"`).

### 3.9 Test 9: Insecure Direct Object Reference (IDOR) Isolation
- **Setup:** Bob generates token bound to Bob's private user ID. Alice submits Bob's token with Alice's JWT session.
- **Result:** Decryption extracts Bob's user ID. Server-side check compares `payload.uid !== req.user.id`.
- **Response:** HTTP 403 Forbidden (`code: "FORBIDDEN_RESOURCE"`). IDOR attempt recorded in immutable audit log.

### 3.10 Test 10: Role-Based Access Control / Privilege Escalation
- **Setup:** Normal user with role `USER` attempts to resolve a token targeting `admin_users` (requires `MODERATOR` or above).
- **Result:** Decryption succeeds, but authorization engine verifies `ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY[route.minRole]`.
- **Response:** HTTP 403 Forbidden (`code: "INSUFFICIENT_PRIVILEGES"`).
- **Admin Verification:** Admin user Sarah with role `ADMIN` resolves the exact same token successfully with HTTP 200.

### 3.11 Test 11: Direct API Access Without Bearer Token
- **Input:** Direct POST request to `/api/secure-routes/decrypt` without `Authorization` header, and with forged JWT.
- **Response:** HTTP 401 Unauthorized (`Not authorized, no token` / `Not authorized, token failed`).

### 3.12 Test 12: Zero-Downtime Key Rotation
- **Setup:** Primary key `v1`, fallback key `v2`. Token encrypted with `v2`.
- **Result:** Successfully looked up `v2` in key ring and decrypted with HTTP 200. Demonstrates seamless key rotation without invalidating active links.

---

## 4. Security Verification Checklist

- [x] **AES-256-GCM authenticated encryption** implemented via Node.js built-in `crypto` module.
- [x] **Unique 12-byte IV** generated cryptographically per encryption operation.
- [x] **16-byte authentication tag** verified before plaintext return.
- [x] **No hardcoded encryption keys**: Keys managed via `ROUTE_ENCRYPTION_KEY` and `ROUTE_ENCRYPTION_KEY_FALLBACK`.
- [x] **Zero key exposure to frontend**: Frontend never possesses encryption keys or decrypts tokens in client JS.
- [x] **Minimalist payload**: No passwords, emails, phone numbers, or JWTs stored in tokens.
- [x] **Cache-Control & Referrer-Policy**: Strict HTTP response headers prevent downstream caching and Referer leakage.
- [x] **Rate limiting**: `secureRouteLimiter` defends against decryption flooding.
- [x] **Replay prevention & revocation**: Single-use token tracking and explicit revocation via MongoDB `RouteToken`.
- [x] **Public portfolio URLs preserved**: `/u/:username` routes and public assets remain fully intact.
