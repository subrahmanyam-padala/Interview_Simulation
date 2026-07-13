# AI-Driven Real-Time Interview Simulation System

A full-stack final-year project that simulates technical interviews with AI-generated questions, speech-based answer capture, facial expression analysis, and detailed performance reports.

## Tech Stack

- Frontend: React + Vite + Tailwind CSS + Recharts + face-api.js
- Backend: Node.js + Express.js (REST API)
- Database: MongoDB Atlas (Mongoose)
- AI: OpenAI API (question generation, answer evaluation, final feedback)
- Auth: JWT
- Optional Deployment Targets:
  - Frontend: Vercel / Netlify
  - Backend: Render / Railway
  - DB: MongoDB Atlas

## Features

1. User Registration and Login (JWT)
2. Dashboard with performance metrics
3. Interview setup (role, topic, difficulty, question count)
4. Live interview page with:
   - Webcam stream
   - Speech-to-text (Web Speech API)
   - Timer per answer
   - Dynamic AI questions
5. AI evaluation for each answer
6. Face analysis metrics (eye contact, confidence, expression stability)
7. Voice analysis metrics (WPM, filler words, clarity, fluency)
8. Final report with charts and AI recommendations
9. Interview history stored in MongoDB
10. Admin analytics page

## Project Structure

```text
.
+-- client/                     # React frontend
¦   +-- src/
¦   ¦   +-- api/                # API clients
¦   ¦   +-- components/         # Reusable UI
¦   ¦   +-- context/            # Auth context
¦   ¦   +-- hooks/              # Speech/face/timer hooks
¦   ¦   +-- pages/              # Route pages
¦   ¦   +-- utils/              # Format + voice scoring
¦   +-- public/models/          # face-api model files
+-- server/                     # Express backend
¦   +-- src/
¦       +-- config/             # DB and env config
¦       +-- controllers/        # Route handlers
¦       +-- middlewares/        # Auth + error handling
¦       +-- models/             # Mongoose schemas
¦       +-- routes/             # API routes
¦       +-- services/           # OpenAI service
¦       +-- utils/              # helpers
+-- docs/                       # Report-ready documentation
+-- package.json                # Monorepo scripts
+-- .gitignore
```

## Quick Start

### 1) Install Dependencies

```bash
npm install
npm install --prefix server
npm install --prefix client
```

### 2) Configure Environment Variables

Copy and edit:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Required server variables:

- `MONGODB_URI`
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (default: `gpt-4o-mini`)
- `CLIENT_URL` (default: `http://localhost:5173`)

### 3) Run Development Servers

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## API Overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/interviews/setup`
- `GET /api/interviews/history/me`
- `GET /api/interviews/:id`
- `POST /api/interviews/:id/answer`
- `POST /api/interviews/:id/complete`
- `GET /api/interviews/:id/report`
- `GET /api/admin/overview` (admin only)

## Important Notes

- Place face-api model files in `client/public/models`.
- Speech-to-text works best in latest Chrome/Edge.
- If `OPENAI_API_KEY` is missing, backend uses fallback deterministic scoring so the app still runs.

## Documentation

See `docs/`:

- `docs/01_SYSTEM_ARCHITECTURE.md`
- `docs/02_DATABASE_SCHEMA.md`
- `docs/03_API_ROUTES.md`
- `docs/04_DEPLOYMENT.md`
- `docs/05_TESTING_GUIDE.md`
- `docs/06_VIVA_PREP.md`
- `docs/07_ABSTRACT_AND_REPORT.md`

## Common Errors and Fixes

- CORS error:
  - Set `CLIENT_URL` in `server/.env` to your frontend URL.
- MongoDB connection error:
  - Verify Atlas IP access and connection string.
- JWT invalid token:
  - Clear localStorage and log in again.
- Face analysis not active:
  - Add all face-api model files under `client/public/models`.
- Speech recognition not supported:
  - Use Chrome or Edge; allow microphone permission.

## License

For academic use.
