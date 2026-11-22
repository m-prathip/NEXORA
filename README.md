# ⚡ NEXORA — The Network for Builders

> **A modern professional networking and community platform combining portfolio publishing, reciprocal networking, developer communities, project collaboration ("Find My Teammate", "Build in Public"), career opportunities radar, real-time messaging, and Gemini AI.**

---

## 🚀 Overview

NEXORA empowers software developers, AI/ML engineers, data scientists, UI/UX designers, researchers, and students to:
- **Showcase Verifiable Work:** Host standalone 3D interactive portfolios at `/u/:username` backed by real GitHub code evidence.
- **Build Meaningful Connections:** Send reciprocal connection requests, follow builders, and discover complementary peers.
- **Engage in the Feed:** Publish Build-in-Public devlogs, project milestones, code snippets, and react with multi-reaction tokens.
- **Find Teammates:** Publish and apply to collaboration calls with defined skill requirements and project pitches.
- **Join Technical Communities:** Participate in domain-specific guilds (AI/ML, Web Architecture, Cloud Systems, Open Source).
- **Radar for Opportunities:** Discover matched internships, entry roles, freelance contracts, and referrals.
- **Gemini AI Integration:** Server-side AI executive summary generation, devlog polish, and career roadmaps.

---

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19 / 18, Vite, Tailwind CSS, Three.js, React Three Fiber, Framer Motion, React Hot Toast |
| **Backend** | Node.js, Express.js (REST API Gateway), Mongoose, Multer |
| **Database** | MongoDB 7 / Atlas (Compound Indexes, Aggregations) |
| **Security** | Helmet, HSTS, MongoSanitize, XSS input scrubbing, Bot rate limiters, HttpOnly SameSite refresh cookies |
| **AI Engine** | Google Gemini 2.5 Flash (Secure server-side API integration with offline heuristic fallbacks) |
| **DevOps** | Docker, Docker Compose, Nginx reverse proxy, Vercel SPA rewrites |

---

## 📁 Repository Structure

```
portfolio-project/
├── frontend/                     # React 19 + Tailwind client
│   ├── src/
│   │   ├── components/           # AppLayout, Navbars, Hero, Footers
│   │   ├── context/              # AuthContext, ThemeContext, BackgroundContext
│   │   ├── pages/
│   │   │   ├── feed/             # Feed.jsx (Social devlogs & reactions)
│   │   │   ├── network/          # Network.jsx (Connections & invitations)
│   │   │   ├── discover/         # Discover.jsx (Builder & skill search)
│   │   │   ├── communities/      # Communities.jsx (Domain guilds)
│   │   │   ├── projects/         # ProjectHub.jsx (Find My Teammate)
│   │   │   ├── opportunities/    # Opportunities.jsx (Internships & jobs)
│   │   │   ├── events/           # Events.jsx (Hackathons & webinars)
│   │   │   ├── messages/         # Messages.jsx (Direct chat)
│   │   │   ├── notifications/    # Notifications.jsx (Inbox alerts)
│   │   │   └── profile/          # BuilderProfile.jsx (Profile & Gemini AI)
│   │   └── services/api.js       # Centralized Axios API client
│   └── vercel.json               # SPA client-side rewrite configuration
│
├── backend/                      # Node.js + Express API
│   ├── config/db.js              # MongoDB connection
│   ├── controllers/              # Business logic (network, posts, communities, ai, etc.)
│   ├── middleware/               # auth.js, rateLimiters.js, sanitizeInput.js, upload.js
│   ├── models/                   # Extended Mongoose schemas
│   ├── routes/                   # Namespaced Express routers
│   └── server.js                 # Express server with security middlewares
│
└── docker-compose.yml            # Multi-container orchestration (Mongo, Backend, Frontend)
```

---

## ⚡ Quick Start

### 1. Prerequisites
- Node.js (v18 or higher)
- MongoDB instance (local or MongoDB Atlas connection string)
- *(Optional)* Google Gemini API Key for AI features

### 2. Environment Variables

Create `backend/.env`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/nexora
FRONTEND_URL=http://localhost:5173

JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
OTP_PEPPER=your_otp_pepper_string

# Optional: Gemini AI key (offline fallback active if unset)
GEMINI_API_KEY=your_gemini_api_key_here
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000
```

### 3. Run Locally

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

The application will be live at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`

---

## 🐳 Docker Deployment

To launch the full stack (Frontend, Backend, and MongoDB) in Docker:
```bash
docker-compose up --build
```
Access the application on `http://localhost:8080`.

---

## 🔒 Security Architecture

- **HttpOnly Refresh Cookies:** JWT access token kept in memory; long-lived sessions verified via secure HttpOnly cookies to mitigate XSS credential theft.
- **NoSQL Injection Defense:** All incoming inputs sanitized via `express-mongo-sanitize`.
- **Anti-Abuse Rate Limiting:** Global API rate limiters and bot protection guards prevent brute force and denial of service attacks.
- **Resource Ownership:** Controllers strictly verify document ownership before permitting updates or deletions.

---

## 📄 License
MIT © NEXORA
