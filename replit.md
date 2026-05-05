# AI-Powered Technical Interview Prepper

A full-stack application that simulates real-world technical interviews, allowing users to practice answering conceptual and coding questions verbally and programmatically with AI-driven feedback.

## Completed Features

### Task #1 — College Operational Essentials
Departments, batches, subject analytics, batch goals tracking, invite emails, digest scheduling.

### Task #2 — Placement Drive Module (complete)
- **Backend**: `PlacementDriveModel.js`, `DriveEnrollmentModel.js`, `driveController.js` (full CRUD + leaderboard + analytics + CSV export + enrollment endpoint), `driveRoutes.js` (student-facing), `orgAdminRoutes.js` (org-admin CRUD), `SessionModel.js` (driveId field), `sessionController.js` (driveId accepted in createSession, DriveEnrollment updated on endSession with score tracking and certificate issuance).
- **Frontend Redux**: `drivesSlice.js` (student-facing — fetchEligibleDrives, enrollInDrive, fetchMyEnrollments), `orgAdminSlice.js` (fetchDrives, createDrive, updateDrive, deleteDrive, closeDrive, fetchDriveLeaderboard, fetchDriveAnalytics + state), `store.js` (drives reducer registered).
- **Frontend UI**: `OrgAdminDashboard.jsx` — `DrivesTab` component with drive list, create/edit modal, leaderboard modal, close/delete/CSV export; `Dashboard.jsx` — "Upcoming Placement Drives" section with enroll, practice, and qualification status cards; `SessionReview.jsx` — drive certificate download button (canvas-generated PNG) when session belongs to a drive with a qualifying score.

## Architecture

Three-tier microservices architecture:

1. **Frontend** (React + Vite) — port 5000
   - React 19, Redux Toolkit, Tailwind CSS
   - Monaco Editor for code challenges
   - Chart.js for performance analytics
   - Socket.io client for real-time updates

2. **Backend API** (Node.js + Express) — port 3000
   - Express 5, Mongoose, JWT auth
   - Socket.io for real-time session updates
   - Proxied via Vite dev server (`/api` and `/socket.io`)

3. **AI Microservice** (Python + FastAPI) — port 8000
   - FastAPI, Uvicorn
   - OpenAI for question generation and evaluation
   - OpenAI Whisper for audio transcription
   - PyDub + FFmpeg for audio processing

## Project Structure

```
/
├── frontend/         # React + Vite app
│   ├── src/
│   │   ├── app/          # Redux store
│   │   ├── components/   # Header, PrivateRoute, AdminRoute, SessionCard
│   │   ├── features/     # auth, sessions, admin Redux slices
│   │   ├── hooks/        # useSocket (Socket.io)
│   │   └── pages/        # Dashboard, Login, Register, InterviewRunner,
│   │                     # SessionReview, SharedReview, AdminLogin, AdminDashboard
│   └── vite.config.js    # Proxies /api and /socket.io to backend:3000
├── backend/          # Node.js Express API
│   ├── config/       # MongoDB connection
│   ├── controllers/  # userController, sessionController, adminController
│   ├── middleware/   # auth, adminAuth, error, upload (multer)
│   ├── models/       # User, SessionModel, RoleModel, SkillModel,
│   │                 # QuestionBankModel, TemplateModel
│   ├── routes/       # userRoutes, sessionRoutes, adminRoutes
│   └── server.js
└── ai-service/       # Python FastAPI microservice
    ├── main.py       # /generate-questions, /transcribe, /evaluate
    └── requirements.txt
```

## Environment Variables / Secrets

| Key | Description |
|-----|-------------|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for JWT token signing |
| `NODE_ENV` | Set to `development` |
| `PORT` | Backend port (3000) |
| `AI_SERVICE_PORT` | AI service port (8000) |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_MODEL` | OpenAI model name (gpt-4o-mini) |
| `VITE_API_URL` | Frontend API base URL (`/api`) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID (optional) |
| `ADMIN_USERNAME` | Admin console username (default: admin) |
| `ADMIN_PASSWORD` | Admin console password (default: admin123) |

## Workflows

- **Start application** — `cd frontend && npm run dev` (port 5000, webview)
- **Backend API** — `cd backend && node server.js` (port 3000, console)
- **AI Service** — `cd ai-service && python main.py` (port 8000, console)

## Key User Features

- Customizable interviews: Role, Level, Difficulty, Type (Oral vs Coding Mix)
- Resume upload for personalized question generation
- Voice responses transcribed via OpenAI Whisper
- Code editor via Monaco Editor
- Real-time AI feedback via Socket.io
- Session history with performance charts (bar, radar, line)
- Skill gap analysis with color-coded progress bars
- Skill progress tracking across sessions (multi-line chart)
- PDF export of interview review reports
- "Practice This Skill" shortcut from skill gap panel
- JWT + Google OAuth authentication
- Shareable session review links

## Admin Panel (`/admin`)

Separate login at `/admin/login` using `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars.
Admin JWT is signed with role: 'admin' and stored in localStorage as `adminToken`.

### Admin Tabs

| Tab | Description |
|-----|-------------|
| Analytics | Sessions by role/level, avg scores, top skills, daily activity chart, recent sessions |
| Roles & Levels | CRUD interview roles; define available levels per role |
| Skills | CRUD skills; tag skills to roles; searchable |
| Question Bank | Browse/filter/edit/delete all AI-generated and manual questions; paginated |
| Generate Qs | AI question generation with role/level/skill/count/difficulty config; auto-saved to bank |
| Templates | Reusable interview presets (role + level + question counts + skills) |
| Q Config | Per-level question count configuration (easy/medium/hard/coding/oral) per role |

### Admin API Routes (`/api/admin/*`)

- `POST /login` — returns admin JWT
- CRUD `/roles`, `/skills`, `/questions`, `/templates`
- `POST /questions/generate` — calls AI service and saves to QuestionBank
- `GET /analytics` — aggregated stats

## Phase 4 Corporate / Onboarding Features (Dashboard.jsx)

Corporate employees (userType = 'corporate') see a dedicated onboarding panel:
- **Readiness Score** — avg score across completed sessions for preferred role+level
- **Practice Streak Badges** — 3 / 7 / 30-day streaks tracked in localStorage
- **Certificate Sharing** — Canvas 2D PNG certificate + LinkedIn post button
- **Readiness Goal Panel** — set a target score + deadline; tracks pace (on-track / at-risk / overdue / achieved)
  - Goal persisted in both localStorage (`aiint_goal_<userId>`) AND MongoDB (`User.readinessGoal`)
  - On login, goal is hydrated from the backend if localStorage is empty
  - Saving a goal dispatches `PUT /api/users/goal` to sync to the server

## Manager View — OrgAdminDashboard Goals Tab (corporate only)

Corporate org admins see a **Goals** tab (5th tab, hidden for college orgs):

### Summary cards
- Set Goals (employees with a goal set)
- Achieved
- Needs Attention (overdue + urgent — deadline ≤ 7 days away)
- In Progress

### Needs-Attention callout
Highlights overdue/urgent employees with their gap and a **📣 Nudge** button.

### Full employee list
Sortable by Status / Name / Days Left / Gap. Shows each employee's current readiness %, target %, deadline countdown, and status badge. Nudge button on active goals.

### Nudge emails
`POST /api/org-admin/students/:id/nudge` sends a personalized HTML email if SMTP is configured (SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_PORT). Falls back gracefully with a 200 if SMTP is not set up.

### Backend
- `GET /api/org-admin/team-goals` — MongoDB aggregation: users + role sessions → readiness score → goal status (achieved / overdue / urgent / in-progress / no-goal)
- `User` model extended with `readinessGoal: { targetScore, targetDate }`
- `PUT /api/users/goal` — user saves their own goal (protected by user JWT)

## Notes

- Google OAuth requires a valid `VITE_GOOGLE_CLIENT_ID` from Google Cloud Console. Without it, only email/password login works.
- MongoDB Atlas must have the Replit IP whitelisted (or allow all IPs: `0.0.0.0/0`).
- Audio files are temporarily stored in `backend/uploads/` during transcription.
- Admin credentials default to `admin` / `admin123` — change via `ADMIN_USERNAME` and `ADMIN_PASSWORD` secrets.
- Optional SMTP env vars for nudge emails: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `APP_URL`.
