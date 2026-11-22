# NEXORA Project Audit: Portfolio Publisher to NEXORA Ecosystem

> **Document Version:** 1.0.0  
> **Target System:** NEXORA – The Network for Builders  
> **Audit Status:** Complete & Verified  
> **Scope:** Full-Stack Repository (`frontend/`, `backend/`, and Root Configs)

---

## 1. Folder Structure Map

Below is the verified tree structure of the repository, excluding `node_modules` and `.git`:

```
portfolio-project/
├── .github/
│   └── workflows/
├── .gitignore
├── README.md
├── SECURITY.md
├── docker-compose.yml
├── package.json
├── backend/
│   ├── .dockerignore
│   ├── .env
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js
│   ├── vercel.json
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── aiController.js
│   │   ├── analyticsController.js
│   │   ├── assistantController.js
│   │   ├── authController.js
│   │   ├── collaborationController.js
│   │   ├── communityController.js
│   │   ├── crudController.js
│   │   ├── eventController.js
│   │   ├── messagesController.js
│   │   ├── networkController.js
│   │   ├── notificationController.js
│   │   ├── opportunityController.js
│   │   ├── portfolioController.js
│   │   ├── postsController.js
│   │   └── profileController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── lockout.js
│   │   ├── rateLimiters.js
│   │   ├── resolveUser.js
│   │   ├── sanitizeInput.js
│   │   ├── upload.js
│   │   └── validate.js
│   ├── models/
│   │   ├── Achievements.js
│   │   ├── Activities.js
│   │   ├── Certificate.js
│   │   ├── CollaborationRequest.js
│   │   ├── Comment.js
│   │   ├── Community.js
│   │   ├── CommunityMember.js
│   │   ├── Connection.js
│   │   ├── ContactMessage.js
│   │   ├── Conversation.js
│   │   ├── Education.js
│   │   ├── Event.js
│   │   ├── Experience.js
│   │   ├── Follow.js
│   │   ├── LoginActivity.js
│   │   ├── Message.js
│   │   ├── Notification.js
│   │   ├── Opportunity.js
│   │   ├── Otp.js
│   │   ├── Post.js
│   │   ├── Profile.js
│   │   ├── Projects.js
│   │   ├── Reaction.js
│   │   ├── ResumeDownload.js
│   │   ├── Skills.js
│   │   ├── ThemeEvent.js
│   │   ├── User.js
│   │   ├── Visit.js
│   │   └── WhyHire.js
│   ├── routes/
│   │   ├── achievements.js
│   │   ├── activities.js
│   │   ├── ai.js
│   │   ├── auth.js
│   │   ├── certificates.js
│   │   ├── collaborations.js
│   │   ├── communities.js
│   │   ├── education.js
│   │   ├── events.js
│   │   ├── experience.js
│   │   ├── messages.js
│   │   ├── network.js
│   │   ├── notifications.js
│   │   ├── opportunities.js
│   │   ├── portfolio.js
│   │   ├── posts.js
│   │   ├── profile.js
│   │   ├── projects.js
│   │   ├── skills.js
│   │   └── whyHire.js
│   ├── tests/
│   │   ├── api.flow.test.js
│   │   └── auth.flow.test.js
│   ├── uploads/
│   └── utils/
│       ├── cookieHelper.js
│       ├── emailService.js
│       ├── otpHelper.js
│       ├── securityLogger.js
│       └── tokenHelper.js
└── frontend/
    ├── .dockerignore
    ├── .env
    ├── .env.example
    ├── Dockerfile
    ├── index.html
    ├── nginx.conf
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── vercel.json
    ├── vite.config.js
    ├── public/
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── components/
        │   ├── admin/
        │   ├── common/
        │   ├── landing/
        │   ├── layout/
        │   └── portfolio/
        ├── context/
        │   ├── AuthContext.jsx
        │   ├── BackgroundContext.jsx
        │   └── ThemeContext.jsx
        ├── pages/
        │   ├── Activities.jsx
        │   ├── Certificates.jsx
        │   ├── Education.jsx
        │   ├── Experience.jsx
        │   ├── Home.jsx
        │   ├── Landing.jsx
        │   ├── NotFound.jsx
        │   ├── PortfolioLayout.jsx
        │   ├── Privacy.jsx
        │   ├── Projects.jsx
        │   ├── Terms.jsx
        │   ├── admin/
        │   │   ├── Dashboard.jsx
        │   │   ├── ForgotPassword.jsx
        │   │   ├── Login.jsx
        │   │   ├── Profile.jsx
        │   │   ├── ResetPassword.jsx
        │   │   ├── Sections.jsx
        │   │   ├── Share.jsx
        │   │   ├── Signup.jsx
        │   │   └── VerifyEmail.jsx
        │   ├── communities/
        │   │   └── Communities.jsx
        │   ├── discover/
        │   │   └── Discover.jsx
        │   ├── events/
        │   │   └── Events.jsx
        │   ├── feed/
        │   │   └── Feed.jsx
        │   ├── messages/
        │   │   └── Messages.jsx
        │   ├── network/
        │   │   └── Network.jsx
        │   ├── notifications/
        │   │   └── Notifications.jsx
        │   ├── opportunities/
        │   │   └── Opportunities.jsx
        │   ├── profile/
        │   │   └── BuilderProfile.jsx
        │   └── projects/
        │       └── ProjectHub.jsx
        └── services/
            └── api.js
```

---

## 2. Frontend and Backend Entry Points

### Frontend Entry Points
1. **HTML Host (`frontend/index.html`)**: Sets viewport, base stylesheet tags, and mounts `<div id="root"></div>`.
2. **Bootstrap (`frontend/src/main.jsx`)**: Mounts React Root (`createRoot`), wraps inside `React.StrictMode` and `HelmetProvider`.
3. **Application Shell & Router (`frontend/src/App.jsx`)**:
   - Provider cascade: `ThemeProvider` ➔ `BackgroundProvider` ➔ `AuthProvider` ➔ `BrowserRouter`.
   - Global Toast container: `react-hot-toast` (`Toaster`).
   - Lazy load suspension: `Suspense` wrapping `<PageLoader />`.
   - Route resolution order:
     1. Marketing & Static: `/`, `/terms`, `/privacy`.
     2. Authentication: `/auth/login`, `/auth/signup`, `/auth/verify-email`, `/auth/forgot-password`, `/auth/reset-password`.
     3. NEXORA Core Hubs (`AppLayout` nested): `/feed`, `/network`, `/discover`, `/communities`, `/projects`, `/opportunities`, `/events`, `/messages`, `/messages/:conversationId`, `/notifications`, `/profile/me`, `/profile/:username`.
     4. Public 3D Portfolios (`PortfolioLayout` nested): `/u/:username` (Index, `education`, `projects`, `certificates`, `experience`, `activities`).
     5. Admin Portfolio CMS: `/:dashboardId` (Protected via `ProtectedRoute`).
     6. Fallback: `NotFound.jsx`.

### Backend Entry Points
1. **Express Server (`backend/server.js`)**:
   - Initializes environment variables (`dotenv.config()`).
   - Configures reverse-proxy awareness (`app.set('trust proxy', 1)`).
   - Middleware initialization: Helmet, CORS, Compression, JSON (1MB), URL-encoded, CookieParser, MongoSanitize, SanitizeInput.
   - Global rate limiting: `botProtection` and `apiLimiter`.
   - Mounts 20 API route groups under `/api/*`.
   - Error handling: Centralized error middleware with security logging.
2. **Database Connector (`backend/config/db.js`)**:
   - Connects to MongoDB via Mongoose with auto-reconnect and error traps.

---

## 3. Inventory of Pages, Routes, APIs, Controllers, and Models

### Frontend Pages (30 total)
- **Marketing & Legal (3):** `Landing.jsx`, `Terms.jsx`, `Privacy.jsx`.
- **Auth (5):** `Login.jsx`, `Signup.jsx`, `VerifyEmail.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`.
- **Standalone 3D Portfolio (7):** `PortfolioLayout.jsx`, `Home.jsx`, `Education.jsx`, `Projects.jsx`, `Certificates.jsx`, `Experience.jsx`, `Activities.jsx`.
- **Portfolio Publisher CMS (4):** `Dashboard.jsx`, `Profile.jsx`, `Share.jsx`, `Sections.jsx`.
- **NEXORA Ecosystem Hubs (10):**
  - `Feed.jsx`: Social stream, devlogs, code snippets, multi-reactions.
  - `Network.jsx`: Connections, invitations, suggestions, following graph.
  - `Discover.jsx`: Verifiable builder search by skill and domain.
  - `Communities.jsx`: Guilds, member management, discussions.
  - `ProjectHub.jsx`: "Find My Teammate", collaboration calls, team applications.
  - `Opportunities.jsx`: Radar for internships, jobs, freelance gigs, referrals.
  - `Events.jsx`: Hackathons, workshops, AMAs, RSVP tracking.
  - `Messages.jsx`: Real-time conversation threads, direct messaging.
  - `Notifications.jsx`: Centralized activity alerts and status updates.
  - `BuilderProfile.jsx`: Profile showcase, verified evidence, Gemini AI optimizer.
- **Utility (1):** `NotFound.jsx`.

### Backend Routes (20 files) & Controllers (15 files)
| Route Mount | File | Associated Controller | Key Capabilities |
|---|---|---|---|
| `/api/auth` | `routes/auth.js` | `authController.js` | Signup, login, OTP verification, password reset, token refresh, lockout check |
| `/api/profile` | `routes/profile.js` | `profileController.js` | Get/update user profile, multipart cover/avatar upload, public profile resolution |
| `/api/posts` | `routes/posts.js` | `postsController.js` | Feed pagination, post creation, reactions (`like`, `celebrate`, etc.), comment threads |
| `/api/network` | `routes/network.js` | `networkController.js` | Connection requests, response actions, follow toggle, suggested builders, search |
| `/api/communities`| `routes/communities.js` | `communityController.js` | List communities, slug resolution, create guild, join/leave toggle |
| `/api/collaborations`| `routes/collaborations.js`| `collaborationController.js`| Collab requests, "Find My Teammate", role application submission & acceptance |
| `/api/opportunities`| `routes/opportunities.js`| `opportunityController.js`| List opportunities, post jobs/internships, save/apply actions |
| `/api/events` | `routes/events.js` | `eventController.js` | Upcoming hackathons, create event, RSVP status toggle |
| `/api/messages` | `routes/messages.js` | `messagesController.js` | Conversation list, message history, send message, start 1:1 chat |
| `/api/notifications`| `routes/notifications.js`| `notificationController.js`| Unread counter, list notifications, mark read |
| `/api/ai` | `routes/ai.js` | `aiController.js` | Gemini AI profile summaries, post polish, project descriptions, career roadmap |
| `/api/portfolio` | `routes/portfolio.js` | `portfolioController.js` | QR code generation, public links, recruiter assistant queries |
| `/api/skills` | `routes/skills.js` | `crudController.js` | User skills management (CRUD) |
| `/api/projects` | `routes/projects.js` | `crudController.js` | Portfolio project showcase (CRUD) |
| `/api/experience` | `routes/experience.js` | `crudController.js` | Work history entries (CRUD) |
| `/api/education` | `routes/education.js` | `crudController.js` | Academic credentials (CRUD) |
| `/api/achievements`| `routes/achievements.js`| `crudController.js` | Awards & competition honors (CRUD) |
| `/api/certificates`| `routes/certificates.js`| `crudController.js` | Certifications & credentials (CRUD) |
| `/api/activities` | `routes/activities.js` | `crudController.js` | Extracurriculars & clubs (CRUD) |
| `/api/whyhire` | `routes/whyHire.js` | `crudController.js` | Value propositions for recruiters (CRUD) |

### MongoDB Models (29 Collections)
1. `User`: Identity, password hash, role, builder badges, reputation points, counters.
2. `Profile`: Core builder attributes, about, cover image, social links, badges.
3. `Post`: Social devlogs, embedded code snippets, media, multi-reactions count, comments count.
4. `Comment`: Threaded post replies, author ref, likes count.
5. `Reaction`: User reaction mapping on posts/comments (`like`, `celebrate`, `insightful`, `love`).
6. `Connection`: Reciprocal peer connections (`pending`, `accepted`, `rejected`, `cancelled`).
7. `Follow`: Unidirectional follow graph (`follower`, `following`).
8. `Community`: Developer guilds, category, creator, admins, rules, member count.
9. `CommunityMember`: Membership table (`community`, `user`, role: `admin`/`moderator`/`member`).
10. `CollaborationRequest`: Project collaboration posts, required roles, spots, team members, applications.
11. `Opportunity`: Internships, fresher jobs, freelance contracts, salary, savedBy list.
12. `Event`: Hackathons, workshops, webinars, attendees array with RSVP status.
13. `Conversation`: 1:1 and group chat threads, last message preview, timestamps.
14. `Message`: Individual chat messages, sender, content, read receipts.
15. `Notification`: In-app alerts, type enum, link, read status.
16. `Projects`: Individual portfolio showcase items with tech stacks and links.
17. `Skills`: Individual technical skills, categories, proficiency levels.
18. `Experience`: Work experience records.
19. `Education`: Academic degrees and institutions.
20. `Achievements`: Awards, honors, hackathon placements.
21. `Certificate`: Verified credentials and certificates.
22. `Activities`: Extracurricular leadership and open source activities.
23. `WhyHire`: Elevator pitches and strengths for recruiters.
24. `ContactMessage`: Public visitor inquiries sent from `/u/:username`.
25. `Otp`: One-time verification codes with cryptographic hashes.
26. `LoginActivity`: Audit trail of user logins, IPs, and user agents.
27. `ResumeDownload`: Telemetry tracking resume downloads.
28. `Visit`: Unique visitor analytics for portfolios.
29. `ThemeEvent`: Interaction telemetry for theme changes.

---

## 4. Dependencies & Code Cleanliness

### Frontend Dependencies (`frontend/package.json`)
- **Core:** `react` 18.2.0, `react-dom` 18.2.0, `react-router-dom` 6.20.1.
- **3D & Visual:** `three` 0.160.1, `@react-three/fiber` 8.17.10, `framer-motion` 11.13.1.
- **Utilities:** `axios` 1.6.2, `react-icons` 4.12.0, `react-hot-toast` 2.4.1, `react-helmet-async` 2.0.5.
- **Tooling:** `vite` 5.0.8, `tailwindcss` 3.3.6, `autoprefixer` 10.4.16, `postcss` 8.4.32, `terser` 5.49.0.

### Backend Dependencies (`backend/package.json`)
- **Server Framework:** `express` 4.18.2.
- **Data & Storage:** `mongoose` 8.0.3, `multer` 1.4.5, `multer-storage-cloudinary` 4.0.0, `cloudinary` 1.41.3.
- **Security & Validation:** `bcryptjs` 2.4.3, `jsonwebtoken` 9.0.2, `cookie-parser` 1.4.6, `helmet` 7.1.0, `cors` 2.8.5, `express-mongo-sanitize` 2.2.0, `express-rate-limit` 7.1.5, `express-validator` 7.0.1.
- **Utilities:** `compression` 1.8.1, `dotenv` 16.3.1, `qrcode` 1.5.3, `@getbrevo/brevo` 5.0.4.
- **Testing:** `mongodb-memory-server` 9.1.6, `supertest` 6.3.4, `nodemon` 3.0.2.
