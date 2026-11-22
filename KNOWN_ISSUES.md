# NEXORA MVP Known Issues & Post-Launch Roadmap

**Document Version:** 2.0.0-MVP  
**Audit Date:** November 22, 2026  
**Status:** **ZERO CRITICAL BLOCKERS FOR MVP RELEASE**

---

## 1. Vulnerability & Blocker Status

Following the Phase 10 production-readiness review and 58-point security audit:
- **Critical Security Flaws:** **0**
- **Data Integrity / Corruption Risks:** **0**
- **Authentication / Authorization Bypass Risks:** **0**
- **Launch Verdict:** **GREEN (Production Ready)**

---

## 2. Low-Priority Non-Blocking Items & Edge Cases

The following items represent architectural improvements or non-critical edge cases slated for post-MVP iterations:

### Item 1: Free-Tier Cold Starts on Sleepy Cloud Hosts
- **Description:** When hosted on free container services (e.g., Render free tier), the server sleeps after 15 minutes of inactivity. The first visitor may experience an initial 15–25 second delay.
- **Impact:** Minimal (only affects free tiers; paid tiers maintain warm instances 24/7).
- **Workaround:** Configure an external cron ping (e.g. UptimeRobot or Cron-Job.org) targeting `https://<backend-domain>/api/health` every 10 minutes to keep instances warm.

### Item 2: Real-Time Messaging Architecture (Polling vs WebSockets)
- **Description:** For the MVP, direct messaging and notifications use lightweight HTTP polling when active.
- **Impact:** Negligible for MVP builder scale (<1,000 active concurrent connections).
- **Roadmap:** Transition direct messaging and unread notification delivery to a dedicated Socket.IO / WebSocket cluster backed by Redis Pub/Sub in v2.1.

### Item 3: Local Disk Storage vs Cloudinary
- **Description:** When deployed in ephemeral container environments (e.g., standard Render/Heroku without persistent disk volumes), uploads saved to local `/uploads` disk storage will be reset on container restart if Cloudinary is not configured.
- **Impact:** Documented in deployment guide.
- **Mitigation:** Recommended for production to specify `CLOUDINARY_URL` in environment variables so all image and PDF uploads persist permanently in the cloud.

### Item 4: Offline Heuristic Mode for Gemini AI
- **Description:** If `GEMINI_API_KEY` is not provided, the platform automatically activates its built-in heuristic analysis engine. Heuristic output is accurate and grounded in the builder's actual data, but lacks generative language variation.
- **Impact:** Seamless user experience maintained; zero UI crashes or errors.
- **Resolution:** Supply a valid Google Gemini API key in production settings.

---

## 3. Post-MVP Feature Roadmap (v2.1 – v2.3)

1. **v2.1:** Native WebSockets for real-time typing indicators and live notification toasts.
2. **v2.2:** Integrated WebRTC audio/video rooms for remote project collaboration meetings.
3. **v2.3:** AI Agent pairing for automated pull request review integration via GitHub Apps.
