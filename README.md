# AI Interviewer — AI-Powered Technical Interview Prepper

A full-stack application for simulating real-world technical interviews with AI feedback, supporting individual students (B2C), college placement cells, and corporate training teams.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite, Redux Toolkit, Tailwind CSS, Socket.io-client |
| Backend | Node.js + Express 5, MongoDB (Mongoose), Socket.io, JWT |
| AI Service | Python 3.10+, FastAPI, Ollama (Mistral), OpenAI Whisper |
| Database | MongoDB Atlas (cloud) or local MongoDB |

---

## Prerequisites

Install these before starting:

1. **Node.js v18+** — https://nodejs.org
2. **Python 3.10+** — https://python.org
3. **MongoDB** — Atlas (cloud) URI or local: https://mongodb.com/atlas
4. **Ollama** — Local LLM engine: https://ollama.com
   - After installing: `ollama pull mistral`
5. **FFmpeg** — Required for audio transcription
   - Windows: https://ffmpeg.org/download.html (add to PATH)
   - Mac: `brew install ffmpeg`
   - Linux: `sudo apt install ffmpeg`

---

## Local Setup — Step by Step

### Step 1 — Clone the Repository

```bash
git clone https://github.com/sriharin-ai/aivirtualinterview.git
cd aivirtualinterview
```

---

### Step 2 — Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend/` folder:

```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=any_long_random_string_here
NODE_ENV=development
AI_SERVICE_URL=http://localhost:8000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin@2024

# Optional — Google OAuth (for Google login)
GOOGLE_CLIENT_ID=your_google_client_id

# Optional — Email features (invites, notifications, digest)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM=your_email@gmail.com
APP_URL=http://localhost:5000
```

Start the backend:

```bash
node server.js
```

Backend runs on **http://localhost:3000**

---

### Step 3 — AI Service Setup

```bash
cd ../ai-service
```

Create a virtual environment:

```bash
# Mac / Linux
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file inside `ai-service/`:

```env
OLLAMA_MODEL_NAME=mistral
```

Make sure Ollama is running in the background:

```bash
ollama serve
```

Start the AI service:

```bash
uvicorn main:app --reload --port 8000
```

AI service runs on **http://localhost:8000**

---

### Step 4 — Frontend Setup

```bash
cd ../frontend
npm install
```

Create a `.env` file inside `frontend/`:

```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

Start the frontend:

```bash
npm run dev
```

Frontend runs on **http://localhost:5000**

---

### Step 5 — Seed Demo Data (Optional)

To create a demo college org admin account:

```bash
cd backend
node scripts/seedAdmin.js
```

This creates:
- **Org Code:** `DEMO01`
- **Admin Username:** `demoadmin`
- **Admin Password:** `Demo@1234`

---

## Running All Three Services

Open **3 separate terminals** and run one command in each:

| Terminal | Command |
|---|---|
| Terminal 1 (Backend) | `cd backend && node server.js` |
| Terminal 2 (AI Service) | `cd ai-service && source venv/bin/activate && uvicorn main:app --reload --port 8000` |
| Terminal 3 (Frontend) | `cd frontend && npm run dev` |

---

## Login Credentials

| Portal | URL | Credentials |
|---|---|---|
| Student | http://localhost:5000/login | Register at `/register` |
| Super Admin | http://localhost:5000/admin/login | `admin` / `Admin@2024` |
| Org Admin | http://localhost:5000/org-admin/login | Org Code: `DEMO01`, Username: `demoadmin`, Password: `Demo@1234` |

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | Backend port (default: 3000) |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret key for JWT tokens |
| `AI_SERVICE_URL` | Yes | URL of the AI service (default: http://localhost:8000) |
| `ADMIN_USERNAME` | Yes | Super admin username |
| `ADMIN_PASSWORD` | Yes | Super admin password |
| `NODE_ENV` | Yes | `development` or `production` |
| `GOOGLE_CLIENT_ID` | No | For Google OAuth login |
| `SMTP_HOST` | No | SMTP server (for email features) |
| `SMTP_PORT` | No | SMTP port (587 or 465) |
| `SMTP_USER` | No | SMTP username/email |
| `SMTP_PASS` | No | SMTP password or app password |
| `SMTP_FROM` | No | Sender email address |
| `APP_URL` | No | Public URL (used in email invite links) |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Backend API URL |
| `VITE_SOCKET_URL` | Yes | Backend Socket.io URL |

---

## Features Overview

### B2C (Individual Students)
- Register and login (email/password or Google OAuth)
- Practice interviews — pick role, level, type (oral / coding-mix)
- Real-time AI question generation and evaluation
- Audio transcription via Whisper
- Code editor (Monaco) for coding questions
- Session history, review, and shareable links
- Personal readiness goal tracking

### College Module
- Org admin manages students, departments, batches
- Placement drives with leaderboards and qualification certificates
- Batch leaderboard with shareable progress cards
- Email invites with dept/batch pre-tagging
- Weekly digest emails and coaching nudges
- Subject-wise analytics

### Corporate Module
- Same as college but with role-based analytics
- Individual employee readiness goals
- Coaching nudge emails

### Super Admin
- Manage roles, skills, question bank
- AI question generation for bank
- Interview templates
- Platform-wide analytics

---

## Project Structure

```
aivirtualinterview/
├── frontend/          # React + Vite app (port 5000)
│   └── src/
│       ├── pages/     # All page components
│       ├── features/  # Redux slices
│       └── components/
├── backend/           # Node.js + Express API (port 3000)
│   ├── controllers/
│   ├── models/        # Mongoose schemas
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   └── scripts/       # Seed scripts
└── ai-service/        # FastAPI AI microservice (port 8000)
    └── main.py
```

---

## License

MIT License
