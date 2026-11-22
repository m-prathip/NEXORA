# NEXORA Security Audit & Vulnerability Assessment

> **Document Version:** 1.0.0  
> **System:** NEXORA – The Network for Builders  
> **Standard:** OWASP Top 10 (2021/2025) & Cloud Security Standards  
> **Classification:** Confidential Architectural Assessment

---

## 1. Executive Summary

A comprehensive, zero-trust security audit of the repository was conducted across frontend source files, backend controllers, middleware pipelines, and database models.

The current architecture displays high baseline hygiene, notably:
- **No plaintext token storage:** Access tokens live exclusively in JavaScript memory; refresh tokens reside in `HttpOnly` cookies.
- **NoSQL Injection immunity:** All request bodies, query params, and route params are filtered via `express-mongo-sanitize`.
- **Anti-automation defenses:** Global bot protection and IP-based rate limiting are enforced at the `/api` root.

---

## 2. Threat Modeling & Vulnerability Findings

### Category A: Confirmed Bugs & Security Vulnerabilities

> [!NOTE]
> None currently critical in active code paths. The critical vulnerabilities discovered in initial Phase 1 audits (e.g. vulnerable localStorage token persistence and unindexed collection sort operations) have been fixed.

#### Confirmed Minor Finding: File Upload MIME-Type Spoofing Risk
- **Location:** `backend/middleware/upload.js`
- **Severity:** Low-Medium
- **Finding:** The file filter checks file extensions (`.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`) and basic `file.mimetype`. However, Multer relies on the client-supplied `Content-Type` header without inspecting the binary magic bytes of the file.
- **Impact:** An attacker could rename a malicious executable or HTML/SVG payload to `.png` with `image/png` header. Since `/uploads` is served with `express.static`, if an attacker uploads SVG or HTML and tricks an admin into opening `/uploads/evil.html`, stored XSS could theoretically trigger on that origin.
- **Remediation Recommendation:**
  1. Restrict uploaded profile images and cover photos strictly to raster formats (`image/jpeg`, `image/png`, `image/webp`). Disallow `.svg` and `.html`.
  2. Implement magic-number binary inspection using `file-type` before finalizing upload disk writes.
  3. Ensure `/uploads` headers include `Content-Disposition: inline` and `X-Content-Type-Options: nosniff`.

---

### Category B: Potential Risks & Architectural Hardening Opportunities

> [!WARNING]
> These are architectural risks that do not represent active breaches, but should be hardened as user traffic scales.

#### 1. Per-Route Rate Limiting Granularity
- **Risk:** Currently, rate limits are applied globally (`apiLimiter`: 100 requests / 15 mins).
- **Potential Issue:** Critical authentication endpoints (such as `POST /api/auth/resend-otp` or `POST /api/auth/forgot-password`) share the global rate window. A dedicated attacker could consume an email quota or launch targeted OTP guessing against a single address if not capped by a dedicated `authLimiter`.
- **Recommendation:** Implement a dedicated strict rate limiter for OTP endpoints (e.g. maximum 3 OTP requests per 10 minutes per IP/account).

#### 2. Cross-Origin Resource Sharing (CORS) Dynamic Protocol Parsing
- **Location:** `backend/server.js` (lines 41–53)
- **Risk:** `allowedOrigins` matches strings stripped of trailing slashes. If `FRONTEND_URL` in `.env` is improperly formatted with whitespace or wildcard domains, malicious origins could match.
- **Recommendation:** Enforce strict array matching using `URL` parsing rather than raw string replacement.

#### 3. WebSocket / Real-Time Messaging Auth Tokens
- **Current State:** Direct messaging operates over HTTP polling/REST (`/api/messages`).
- **Potential Risk:** As NEXORA transitions to WebSockets (Socket.io) in high-concurrency stages, socket handshake authentication must validate the short-lived JWT from the handshake query/headers without falling back to unauthenticated connections.

---

### Category C: Unverified Assumptions & Third-Party Dependencies

> [!IMPORTANT]
> The following items require operational confirmation based on production environment settings:

1. **Production Reverse Proxy Header Integrity:**
   - The server enables `app.set('trust proxy', 1)`. In hosting environments (Vercel/Render), this correctly passes `X-Forwarded-Proto` and `X-Forwarded-For`.
   - *Assumption:* Ensure the edge proxy cannot be bypassed by direct access to port 5000 from public networks, which would allow spoofed IP headers.
2. **Brevo / SMTP Service Credentials:**
   - The application supports transactional emails via Brevo/SMTP. If SMTP credentials fail or quota is exhausted, verification OTPs fall back to server console logs (`console.log`).
   - *Assumption:* In production, `SMTP_HOST` or `BREVO_API_KEY` must be active; console logging of OTPs must be suppressed in `NODE_ENV=production`.
3. **Gemini API Token Limits & Quotas:**
   - `aiController.js` calls Google Gemini 2.5 Flash via REST.
   - *Assumption:* Heavy concurrent usage on free tier quotas may trigger HTTP 429. The graceful fallback heuristics are already implemented in code, ensuring zero UI breakage if rate limited.

---

## 3. Cryptographic Controls & Token Lifecycle Audit

| Component | Implementation | Assessment |
|---|---|---|
| **Password Hashing** | `bcryptjs` with salt round cost 12 | **Compliant** (Resistant to modern GPU brute-force) |
| **Access Tokens** | JWT signed with HMAC-SHA256 (`JWT_SECRET`), 15m TTL | **Compliant** (In-memory storage prevents XSS exfiltration) |
| **Refresh Tokens** | JWT stored in HttpOnly cookie (`JWT_REFRESH_SECRET`) | **Compliant** (SameSite=Strict prevents CSRF) |
| **OTP Verification** | 6-digit random code salted with `OTP_PEPPER` + SHA256 | **Compliant** (Database breach does not reveal valid OTPs) |
| **Account Lockout** | 5 failed attempts locks account for 15 minutes | **Compliant** (Defends against online dictionary attacks) |

---

## 4. Security Verification Checklist for Deployment

- [x] HTTPS redirection enforced in production (`NODE_ENV === 'production'`).
- [x] Strict HSTS configured with 1-year max age, subdomains, and preload.
- [x] XSS protection via `sanitizeInput` HTML stripping.
- [x] NoSQL injection blocked via `mongoSanitize`.
- [x] Passwords never returned in user queries (`select('-password')`).
- [x] File upload size limited to 5MB.
- [x] Express JSON body size limited to 1MB.
