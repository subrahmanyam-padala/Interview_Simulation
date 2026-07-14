# Step 1: System Architecture & Technology Justification

## 1. Problem Statement

Students usually prepare interview content but do not get measurable feedback on delivery quality (confidence, clarity, eye contact, fluency). This system solves that gap with AI-assisted interview simulation.

## 2. High-Level Architecture

```text
[React Client]
  |  (JWT + REST)
  v
[Express API Server]
  |  (Mongoose)
  v
[MongoDB Atlas]

Client -> OpenAI usage is avoided directly.
All OpenAI calls happen from backend only.
```

## 3. Why This Architecture

- Clear separation of concerns:
  - Frontend handles UI + browser capabilities (speech, webcam, face landmarks)
  - Backend handles security, business logic, persistence, and OpenAI integration
- Secure API key handling:
  - OpenAI key is never exposed to browser
- Easy deployment:
  - Independent deploy of client and server
- Scalable enough for final-year production demo:
  - Stateless API + managed database

## 4. Technology Justification

### React + Vite + Tailwind

- Component-based UI for complex flow (auth, setup, live session, report)
- Tailwind speeds responsive professional UI delivery
- Vite gives fast local development and easy deployment build

### Node.js + Express

- Lightweight REST backend
- Strong ecosystem for JWT, validation, OpenAI SDK
- Easy integration with MongoDB

### MongoDB + Mongoose

- Flexible nested schema for interview responses, metrics, and reports
- Fast prototyping without rigid SQL migrations

### OpenAI API

- Dynamic question generation based on role/topic/difficulty
- Structured answer evaluation (content + communication)
- Final report narrative with recommendations

### Web Speech API

- Real-time speech-to-text in browser without external transcription server

### face-api.js

- Browser-side facial metrics extraction
- No need to stream raw video to backend

## 5. Data Flow (Live Interview)

1. User logs in and gets JWT.
2. User submits interview setup.
3. Backend asks OpenAI for question set and stores interview session.
4. User answers each question in live page.
5. Frontend collects:
   - Transcript (Web Speech API)
   - Voice metrics (WPM, fillers, pauses, clarity, fluency)
   - Face metrics (eye contact, confidence, expression stability)
6. Backend calls OpenAI to evaluate answer quality.
7. Backend stores response-level scoring.
8. At completion, backend aggregates totals and generates final summary.
9. Frontend displays final report with charts.

## 6. Security Design

- Password hashing with `bcryptjs`
- JWT authentication and role-based authorization (`user`, `admin`)
- Protected routes in frontend
- API-level auth middleware in backend
- OpenAI key stored in server `.env` only

## 7. Production Readiness Decisions

- Input validation using `zod`
- Centralized error handler middleware
- Fallback behavior when OpenAI is unavailable
- Managed DB support (MongoDB Atlas)
- CORS, Helmet, and JSON size limit
