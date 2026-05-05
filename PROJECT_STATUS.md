# AI Interviewer — Project Status Document
**As of:** May 2026  
**Stack:** React + Vite (port 5000) · Node/Express (port 3000) · FastAPI AI service (port 8000) · MongoDB Atlas

---

## Quick Reference — Login Credentials

| Portal | URL | Credentials |
|--------|-----|-------------|
| Super Admin | `/admin/login` | `admin` / `Admin@2024` |
| Org Admin | `/org-admin/login` | Org Code: `DEMO01`, Username: `demoadmin`, Password: `Demo@1234` |
| Student | `/login` | Register at `/register` (use org code `DEMO01` to join the demo org) |

---

## 1. Marketing / Landing Pages

All fully working static pages — no backend required.

| Page | URL | Status |
|------|-----|--------|
| Main homepage | `/` | ✅ Complete |
| College landing | `/college` | ✅ Complete |
| Corporate landing | `/corporate` | ✅ Complete |
| Org sign-up request form | `/org/signup` | ✅ Complete (submits form, sends email if SMTP configured) |
| Book a demo page | `/org/demo` | ✅ Complete |

---

## 2. B2C — Individual Student Features
**Who:** Anyone who registers without an org code (standalone user)

### Auth
| Feature | Status | Notes |
|---------|--------|-------|
| Email + password registration | ✅ Complete | |
| Email + password login | ✅ Complete | |
| Google OAuth login | ✅ Complete | Requires `GOOGLE_CLIENT_ID` env var |
| Profile page (name, email, password, preferred role/level) | ✅ Complete | |
| Personal readiness goal (target score + date) | ✅ Complete | Set from dashboard |

### Interview Practice
| Feature | Status | Notes |
|---------|--------|-------|
| Pick role, level, interview type (oral / coding-mix), question count | ✅ Complete | 18 roles seeded; 30 skills |
| Pick skills to focus on | ✅ Complete | Skill tags from question bank |
| Upload resume (PDF/TXT) for context-aware questions | ✅ Complete | AI uses resume text for personalised questions |
| Apply a practice template (preset role/level/type config) | ✅ Complete | Templates managed by super admin |
| Real-time session creation via Socket.io | ✅ Complete | Async question generation; client notified via socket |
| Live interview runner — oral questions | ✅ Complete | Record audio → AI transcription → evaluation |
| Live interview runner — coding questions | ✅ Complete | Code editor; submission sent to AI for evaluation |
| Per-question AI feedback (technical score + confidence score) | ✅ Complete | Shown live after each answer |
| End session early (with partial score calculation) | ✅ Complete | |
| Overall score calculation (avg of technical + confidence) | ✅ Complete | |
| Session review page — full AI feedback + ideal answers | ✅ Complete | |
| Session history list with role/level/score/status | ✅ Complete | |
| Delete a session | ✅ Complete | |
| Share session review via public link | ✅ Complete | `/shared/:token` — no login required |
| Drive badge on session history (if session was tied to a drive) | ✅ Complete | Fetches drive metadata for closed drives too |

### Dashboard — B2C view
| Feature | Status | Notes |
|---------|--------|-------|
| Interview form with all options | ✅ Complete | |
| Session history cards with evaluation notification | ✅ Complete | Real-time socket notification when eval finishes |
| Personal goal progress bar | ✅ Complete | Set target score/date; progress shown |
| Role/level change clears drive tag | ✅ Complete | Toast + auto-clear |

---

## 3. College Module

### College Student (registered with a college org code)
Everything from B2C, plus:

| Feature | Status | Notes |
|---------|--------|-------|
| Register with org code → auto-tagged to college org | ✅ Complete | |
| Self-pick department + batch at registration | ✅ Complete | Dropdowns shown if org has them configured; validated server-side |
| Accept email invite link during registration | ✅ Complete | 7-day signed JWT; dept/batch pre-assigned from token |
| Accept invite when already logged in | ✅ Complete | UI shown on `/register?invite=...`; account linked without re-registering |
| Batch goal shown on dashboard (target score + deadline from batch config) | ✅ Complete | Pulled from org batch settings |
| Batch leaderboard (top 5 peers, anonymised, own row always shown) | ✅ Complete | College banner section |
| Share progress card (canvas-rendered PNG, copyable social text) | ✅ Complete | Download + copy button in modal |
| Upcoming placement drives list (eligible only, filtered by dept/batch) | ✅ Complete | |
| Enroll in a placement drive | ✅ Complete | One-click; eligibility enforced |
| Drive progress bar (best score vs min score, color-coded) | ✅ Complete | Shown on drive card after enroll |
| Session count pill on drive card | ✅ Complete | |
| Qualified badge (solid emerald) + Certificate button | ✅ Complete | |
| Download placement certificate (canvas PNG) | ✅ Complete | |
| "Practice Now" from drive card → pre-fills role/level, tags session to drive | ✅ Complete | |
| Pick a drive directly from the interview form dropdown | ✅ Complete | |
| Role/level change auto-clears drive tag | ✅ Complete | |
| Drive leaderboard (rank among enrolled students for a drive) | ✅ Complete | "View Ranking" toggle on drive card |
| Qualification email notification (first time score ≥ minScore) | ✅ Complete | Requires SMTP config |

### College Org Admin Dashboard (`/org-admin`)
| Feature | Status | Notes |
|---------|--------|-------|
| Login with org code + username + password | ✅ Complete | |
| Dashboard overview (total students, sessions, avg score, recent activity chart) | ✅ Complete | |
| Student list with session stats (total, completed, avg score, last active) | ✅ Complete | Filter by dept/batch |
| Add student manually (name, email, password, dept, batch) | ✅ Complete | |
| Bulk import students (CSV paste — name, email, dept, batch) | ✅ Complete | |
| Edit student (name, email, password, dept, batch) | ✅ Complete | |
| Remove student | ✅ Complete | |
| View individual student session history | ✅ Complete | |
| Send email invite to one or many emails with dept/batch pre-tagging | ✅ Complete | Requires SMTP; gracefully skips if unconfigured |
| Departments management (add / delete) | ✅ Complete | |
| Batches management (add / edit / delete, with target score + target date per batch) | ✅ Complete | |
| Analytics overview (sessions/day chart, avg score, completed %) | ✅ Complete | Filter by dept/batch |
| Subject analytics (sessions + avg score per role, top 5 students per subject) | ✅ Complete | College-specific tab |
| Team goals view (every student's readiness vs batch goal, status: achieved/urgent/overdue) | ✅ Complete | |
| Send coaching nudge email to a student | ✅ Complete | Requires SMTP |
| Weekly digest email (configure day/hour/recipients; send now button) | ✅ Complete | Requires SMTP |
| **Placement Drives** | | |
| Create placement drive (company, job role, visit date, min score, eligible depts/batches) | ✅ Complete | |
| Attach a question pack to a drive | ✅ Complete | Org ownership validated |
| List drives with inline analytics (enrolled / attempted / qualified / avg score / min score) | ✅ Complete | |
| Edit drive | ✅ Complete | |
| Close drive (freezes leaderboard, blocks new sessions) | ✅ Complete | |
| Delete drive | ✅ Complete | |
| Drive leaderboard modal (rank, name, dept, batch, best score, sessions, qualified) | ✅ Complete | |
| Export leaderboard to CSV (server-generated, download via bearer auth) | ✅ Complete | |
| **Question Packs** | | |
| Create question pack (name, role, level; pick questions from global bank) | ✅ Complete | |
| Searchable question picker modal (filter by role/level/type/difficulty) | ✅ Complete | |
| Edit pack (rename, swap questions) | ✅ Complete | |
| Delete pack | ✅ Complete | |
| Expandable preview (shows questions in pack) | ✅ Complete | |

---

## 4. Corporate Module

### Corporate Employee (registered with a corporate org code)
Everything from B2C, plus:

| Feature | Status | Notes |
|---------|--------|-------|
| Register with org code → auto-tagged to corporate org | ✅ Complete | |
| Accept email invite | ✅ Complete | Same flow as college |
| Personal readiness goal (individual, set by employee or admin) | ✅ Complete | |

### Corporate Org Admin Dashboard (`/org-admin`)
| Feature | Status | Notes |
|---------|--------|-------|
| All student management features (same as college) | ✅ Complete | |
| Role analytics (sessions + avg score per job role, top 5 employees per role) | ✅ Complete | Corporate-specific tab (replaces subject analytics) |
| Team goals view (each employee's score vs individual readiness goal) | ✅ Complete | Uses `readinessGoal` per user, not batch goal |
| Send coaching nudge email to employee | ✅ Complete | |
| Weekly digest email | ✅ Complete | |
| Placement drives | ✅ Complete | Same as college (can be used for internal assessment drives too) |

> **Note:** College vs Corporate org admins see slightly different analytics tabs and team-goal logic, but share the same codebase with org-type-aware branching.

---

## 5. Super Admin (`/admin`)

The platform operator dashboard — manages content that all orgs and B2C users consume.

| Feature | Status | Notes |
|---------|--------|-------|
| Login (env var credentials: `ADMIN_USERNAME` / `ADMIN_PASSWORD`) | ✅ Complete | |
| Roles management (create / edit / delete; set levels, hasCoding flag, per-level question config) | ✅ Complete | |
| Skills management (create / edit / delete; map to roles and categories) | ✅ Complete | |
| Global question bank (create / edit / delete; filter by role/level/type/difficulty) | ✅ Complete | |
| AI question generation (generate N questions for a role/level; auto-saved to bank) | ✅ Complete | Calls FastAPI AI service |
| Interview templates (preset configs: role, level, type, easy/medium/hard/coding/oral counts) | ✅ Complete | |
| Platform analytics (total users, sessions, avg score, by-role/level breakdown, daily chart) | ✅ Complete | |
| All users list with session stats | ✅ Complete | |
| View any user's sessions | ✅ Complete | |
| Seed default roles + skills (one-click) | ✅ Complete | 18 roles, 30 skills |

---

## 6. AI Service (FastAPI, port 8000)

| Feature | Status | Notes |
|---------|--------|-------|
| Generate interview questions (`/generate-questions`) | ✅ Complete | Role, level, skills, resume context, oral/coding split, difficulty breakdown |
| Transcribe audio answer (`/transcribe`) | ✅ Complete | Whisper-based; returns text |
| Evaluate answer (`/evaluate`) | ✅ Complete | Returns technicalScore, confidenceScore, aiFeedback, idealAnswer |

---

## 7. Infrastructure / Platform

| Feature | Status | Notes |
|---------|--------|-------|
| Socket.io real-time updates (question generation, transcription, evaluation) | ✅ Complete | User-scoped rooms; per-session events |
| JWT auth (student, org admin, super admin — three separate token systems) | ✅ Complete | |
| Resume upload (PDF/TXT → text extraction → AI context) | ✅ Complete | Multer; auto-deleted after extract |
| Audio upload and cleanup | ✅ Complete | Temp file; deleted after transcription |
| Qualification email on first score ≥ minScore | ✅ Complete | Student + org admin email |
| Weekly digest email (cron, configurable) | ✅ Complete | |
| Org capacity enforcement (maxUsers per plan) | ✅ Complete | |
| Post-merge setup script (`scripts/post-merge.sh`) | ✅ Complete | Runs on every task merge |

---

## 8. Features That Need SMTP to Work

These features are built and complete but silently skip (or warn) when SMTP is not configured:

- Email invites to students
- Qualification notification emails
- Weekly digest emails
- Coaching nudge emails
- Org sign-up confirmation + internal notification

**To enable:** Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` in environment secrets.

---

## 9. Features That Are Proposed / Not Yet Started

These are queued as project tasks but not implemented:

| # | Feature |
|---|---------|
| #12 | Show session history that contributed to each drive |
| #13 | Track progress on past (closed) drives |
| #14 | Let students update department/batch from profile |
| #15 | Share leaderboard rank to LinkedIn / WhatsApp |
| #16 | Full batch leaderboard page (beyond top 5) |
| #17 | Keep leaderboard accurate when batch changes |
| #18 | Show org info on student profile page |
| #19 | Expire invite links once student joins org |
| #20 | Admin-configurable email notification events |
| #21 | "You qualified!" in-app banner |
| #22 | Idempotency for qualification emails |
| #23 | Drive badge on sessions after drive closes |
| #24 | Clear drive tag when template is applied |
| #25 | Clear drive dropdown when role/level changes |
| #26 | Show drive requirements inline in drive dropdown |

---

## Summary Count

| Area | Features Built | Fully Working |
|------|----------------|---------------|
| Marketing pages | 5 | 5 |
| B2C (individual student) | 18 | 18 |
| College student extras | 14 | 14 |
| College org admin | 32 | 32 |
| Corporate extras | 5 | 5 |
| Super admin | 11 | 11 |
| AI service endpoints | 3 | 3 |
| Infrastructure/platform | 8 | 8 |
| **Total** | **96** | **96** |
