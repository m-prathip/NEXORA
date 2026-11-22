# NEXORA MVP Production Security Review

**Document Version:** 2.0.0-MVP  
**Review Date:** November 22, 2026  
**Classification:** Confidential – Security Audit  
**Status:** **APPROVED FOR MVP DEPLOYMENT**

---

## 1. Threat Modeling & Attack Surface Overview

NEXORA exposes REST APIs, static uploads, and interactive client workflows. The application's attack surface was evaluated against the OWASP Top 10 Web Application Security Risks:

```
┌────────────────────────────────────────────────────────────┐
│                    Public Internet                         │
└─────────────────────────────┬──────────────────────────────┘
                              │ HTTPS / TLS 1.3
                              ▼
┌────────────────────────────────────────────────────────────┐
│                  NEXORA Defense In Depth                   │
│  1. Helmet (HSTS 1-Yr, Sniff Protection, CORP)             │
│  2. CORS Whitelisting (Exact Origin Matching)              │
│  3. express-rate-limit (7 Multi-Tiered Limiters)           │
│  4. BotProtection Middleware (Blocks Malicious Scrapers)   │
│  5. express-mongo-sanitize (Strips NoSQL $ and . Operators)│
│  6. sanitizeInput (Recursive XSS Script & Protocol Strip)  │
│  7. Multer Hardened Storage (MIME Whitelist + 5MB Ceiling) │
│  8. JWT Authentication & Password Change Invalidation      │
│  9. Object-Level Ownership & RBAC Authorization Checks     │
│ 10. Production Error Masking (No Internal Stack Leakage)   │
└─────────────────────────────┬──────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────┐
│                      Core Database                         │
│               MongoDB Atlas (Encrypted at Rest)            │
└────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication & Session Security

### 2.1 Password Security & Hashing
- **Algorithm:** `bcryptjs` salted password hashing with 10 rounds of cryptographic salting.
- **Complexity Enforcement:** Passwords must meet minimum length requirements. Plaintext passwords are never logged, echoed, or stored.
- **Data Protection:** The `password` field on the `User` schema is defined with `select: false`, preventing accidental inclusion in query projections.

### 2.2 Token Management
- **Short-Lived Access Tokens:** Signed with HMAC-SHA256 using `JWT_SECRET` with a default TTL of 15 minutes.
- **Token Invalidation:** When a user changes their password, `passwordChangedAt` is updated. The authentication middleware compares `decoded.iat < user.passwordChangedAt`, automatically invalidating previously issued sessions.
- **Verification Gate:** Users without email verification (`isVerified: false`) are blocked with HTTP `403 Forbidden` from accessing authenticated application endpoints.

---

## 3. Authorization & Insecure Direct Object References (IDOR)

NEXORA implements strict ownership checks across all state-changing endpoints:

| Resource | Action | Endpoint | Authorization Rule | Test Result |
|---|---|---|---|---|
| **Post** | Edit | `PUT /api/posts/:postId` | `post.author.toString() === req.user.id` | **PASS (403)** |
| **Post** | Delete | `DELETE /api/posts/:postId` | `post.author.toString() === req.user.id \|\| req.user.role === 'admin'` | **PASS (403)** |
| **Profile** | Update | `PUT /api/profile/me` | Strictly scoped to `req.user.id` | **PASS (403)** |
| **Comment** | Delete | `DELETE /api/posts/:postId/comments/:commentId` | `author === req.user.id \|\| post_author === req.user.id` | **PASS (403)** |
| **Community** | Settings | `PUT /api/communities/:communityId` | Must be in `community.admins` array | **PASS (403)** |
| **Community** | Creator Role | `PATCH /api/communities/:communityId/members/:memberId` | Creator cannot be demoted or removed | **PASS (400)** |
| **Project** | Manage App | `PATCH /api/collaborations/:collabId/applications/:appId` | `collab.creator.toString() === req.user.id` | **PASS (403)** |
| **Project** | Self-Apply | `POST /api/collaborations/:collabId/apply` | `collab.creator.toString() !== req.user.id` | **PASS (400)** |

---

## 4. Injection Defenses (NoSQL & XSS)

### 4.1 NoSQL Injection Protection
- **Vulnerability Vector:** Attacker supplying `{"$gt": ""}` in place of a string to bypass authentication or extract records.
- **Defense:** `express-mongo-sanitize` is mounted globally before route dispatch. It recursively searches `req.body`, `req.query`, and `req.params` and removes keys containing `$` or `.`.

### 4.2 Cross-Site Scripting (XSS)
- **Vulnerability Vector:** Stored HTML or JavaScript tags inside post content, bios, or comments.
- **Defense 1 (Server-Side):** `backend/middleware/sanitizeInput.js` recursively strips `<script>` tags, inline event attributes (`onload=`, `onerror=`, `onclick=`), and `javascript:` protocols from all incoming string values.
- **Defense 2 (Client-Side):** The React frontend relies on JSX's native text node encoding, preventing string data from executing as live DOM elements.

---

## 5. Rate Limiting & Anti-Abuse Defenses

Seven distinct rate limiters protect the API against automated attacks:

1. **`registerLimiter`**: Max 5 registrations per hour per IP (blocks mass bot account creation).
2. **`loginLimiter`**: Max 5 attempts per 15 minutes per IP (blocks credential stuffing).
3. **`otpLimiter`**: Max 10 attempts per 15 minutes per IP (slows OTP guessing).
4. **`forgotLimiter`**: Max 3 requests per hour per IP (prevents email bombing).
5. **`aiLimiter`**: Max 30 requests per 15 minutes per IP (protects Gemini quota and server compute).
6. **`apiLimiter`**: Max 100 requests per 15 minutes per IP (general DoS protection).
7. **`botProtection`**: Automatically rejects state-changing requests with empty or known scraper User-Agents (`scrapy`, `sqlmap`, `nikto`, `zgrab`, `masscan`).

---

## 6. File Upload Hardening

- **Storage Strategy:** Dual-mode storage supports Cloudinary with fallback to local disk storage.
- **MIME & Extension Enforcement:** Multer `fileFilter` verifies file extensions and MIME headers against `/jpeg|jpg|png|gif|webp|pdf/`. Executable files (`.exe`, `.sh`, `.php`, `.js`, `.html`) are rejected.
- **File Size Ceiling:** Strictly enforced at **5 MB** per file.
- **Collision & Traversal Protection:** Uploaded filenames are overwritten with randomized timestamp identifiers:
  ```javascript
  file.fieldname + '-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext
  ```

---

## 7. Secrets & AI Credential Isolation

- **Gemini API Key:** Accessible solely via `process.env.GEMINI_API_KEY` in `backend/controllers/aiController.js`.
- **Client Security Scan:** Automated source code scan verified **zero API keys, secrets, or JWT private keys are compiled into the frontend build**.
- **Offline Resilience:** If `GEMINI_API_KEY` is not provided or fails, heuristic algorithms compute scores and descriptions without breaking the user experience.

---

## 8. Summary & Sign-Off

The NEXORA MVP application demonstrates comprehensive security controls across all core layers. No high or critical security vulnerabilities were discovered. The application is **approved for production staging and deployment**.
