# NEXORA Production Deployment Guide

**Target Architecture:**
- **Frontend:** Vercel (Edge CDN, Static Hosting & SPA Rewrites)
- **Backend:** Render / Railway / AWS / Docker (Node.js 20 Alpine)
- **Database:** MongoDB Atlas (M0/M10+ Cluster, TLS 1.3)
- **Media Storage:** Cloudinary (with local disk fallback)

---

## 1. Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description | Example |
|---|---|---|---|
| `PORT` | Optional | HTTP port for Node.js server | `5000` |
| `NODE_ENV` | **Yes** | Environment mode | `production` |
| `MONGO_URI` | **Yes** | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/nexora` |
| `FRONTEND_URL` | **Yes** | Whitelisted frontend origin(s) for CORS | `https://nexora.vercel.app,http://localhost:5173` |
| `JWT_SECRET` | **Yes** | 64+ char random secret for access tokens | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | **Yes** | 64+ char random secret for refresh tokens | `openssl rand -hex 32` |
| `COOKIE_SECURE` | **Yes** | Set `true` when serving over HTTPS | `true` |
| `COOKIE_DOMAIN` | Optional | Shared domain for cross-subdomain cookies | `.yourdomain.com` (or empty) |
| `SMTP_HOST` | Optional | SMTP mail host for verification OTPs | `smtp.brevo.com` (leave empty for console dev mode) |
| `SMTP_PORT` | Optional | SMTP port | `587` |
| `SMTP_USER` | Optional | SMTP user | `apikey` |
| `SMTP_PASS` | Optional | SMTP password | `your_smtp_key` |
| `EMAIL_FROM` | Optional | Sender header for outgoing emails | `"NEXORA <no-reply@nexora.dev>"` |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for AI features | `AIzaSy...` (heuristic fallback if absent) |
| `CLOUDINARY_URL` | Optional | Cloudinary media storage URL | `cloudinary://key:secret@cloudname` |

### Frontend (`frontend/.env`)

| Variable | Required | Description | Example |
|---|---|---|---|
| `VITE_API_URL` | **Yes** | Base URL pointing to deployed backend API | `https://nexora-api.onrender.com` |

---

## 2. Deployment Option A: Full-Stack Docker

Both frontend and backend are fully containerized with `docker-compose.yml`.

### Step 1: Clone & Configure
```bash
git clone https://github.com/your-username/nexora.git
cd nexora
cp backend/.env.example backend/.env
# Edit backend/.env with your production secrets
```

### Step 2: Build & Launch
```bash
docker-compose up -d --build
```

### Step 3: Verify Services
- **Frontend:** http://localhost:8080
- **Backend API:** http://localhost:5000/api/health
- **MongoDB:** mongodb://localhost:27017

---

## 3. Deployment Option B: Vercel (Frontend) + Render (Backend)

### Part 1: Deploy Backend to Render

1. Go to [Render Dashboard](https://dashboard.render.com/) → **New Web Service**.
2. Connect your Git repository.
3. Configure the service:
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm ci --omit=dev`
   - **Start Command:** `node server.js`
   - **Health Check Path:** `/api/health`
4. Add all environment variables from Section 1.
5. Deploy. Note your service URL (e.g., `https://nexora-api.onrender.com`).

### Part 2: Deploy Frontend to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/) → **Add New Project**.
2. Connect your Git repository.
3. Configure settings:
   - **Root Directory:** `frontend`
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. In **Environment Variables**, add:
   - `VITE_API_URL` = `https://nexora-api.onrender.com`
5. Click **Deploy**. Vercel will automatically apply SPA routing and immutable cache rules defined in `vercel.json`.

### Part 3: Connect CORS
Go back to Render, update `FRONTEND_URL` with your new Vercel domain (e.g. `https://nexora.vercel.app`), and redeploy the backend service.

---

## 4. Post-Deployment Verification Checklist

Execute these smoke checks immediately after deployment:

1. [ ] **Health Probe:** Verify `GET /api/health` returns `{"status":"healthy"}` (HTTP 200).
2. [ ] **Landing Page:** Open frontend URL; ensure marketing assets and fonts load without console errors.
3. [ ] **User Registration:** Register a new user, verify OTP, and ensure redirection to `/onboarding`.
4. [ ] **Profile Setup:** Complete profile setup with headline and skills; confirm update persists.
5. [ ] **Feed Creation:** Publish a post with a hashtag; ensure it appears on `/feed`.
6. [ ] **Opportunity Discovery:** Open `/opportunities`; ensure filters and official source links work.
7. [ ] **AI Assistant:** Test "Generate Summary" on profile; verify valid output returned without errors.
8. [ ] **Mobile Responsiveness:** Open DevTools mobile viewport; verify bottom navigation appears and works.
9. [ ] **Security Headers:** Inspect response headers on any API response; verify `Strict-Transport-Security` and `X-Content-Type-Options: nosniff`.
10. [ ] **Admin Command Center:** Verify `/admin` redirects unauthorized users and displays telemetry to administrators.

---

## 5. Administrator Bootstrap & Operations

NEXORA forbids public administrator registration to prevent privilege escalation. Initial platform administrators are provisioned via secure server-side seeding.

### Step 1: Configure Admin Credentials
Set the following environment variables in `backend/.env` (or Render/server environment):
```bash
ADMIN_USERNAME=nexora_superadmin
ADMIN_EMAIL=admin@nexora.dev
ADMIN_PASSWORD=YourSuperSecurePassword123!
```

### Step 2: Run Bootstrap CLI
Run the idempotent non-interactive bootstrap script:
```bash
cd backend
npm run seed:admin
```
If a `SUPER_ADMIN` already exists in MongoDB, the script safely exits without modifying existing records or passwords.

### Step 3: Access Platform Command Center
1. Sign in at `/auth/login` with your administrator credentials.
2. Navigate to `/admin`.
3. The 9 operational management modules are now live:
   - **Overview:** Live platform telemetry & urgent queues.
   - **Users:** Search, role assignment, and account suspensions.
   - **Posts:** Social feed moderation and violation hiding.
   - **Communities:** Student hub directory and suspension.
   - **Reports:** Ticket queue for user complaints (fake profiles, spam, harassment).
   - **Opportunities:** Moderation approval queue for student-submitted listings.
   - **Analytics:** Real MongoDB aggregations (WAU, profile completion, CSV export).
   - **Audit Logs:** Immutable, append-only operational event ledger.
   - **Settings:** Platform-wide safety thresholds and anti-spam heuristics.
