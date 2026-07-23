# ⚡ AI-Driven Interview Simulation & Recruitment System

A state-of-the-art, full-stack platform designed to revolutionize interview preparation, competitive coding, peer-to-peer technical evaluation, and live recruiter assessment. Built on a modern MERN stack with Socket.IO, WebRTC, and Gemini/OpenAI integrations.

---

## 🎯 Key Features & Modules

### 1. 🤖 AI Mock Interview Engine
* **Adaptive Question Generation**: Dynamically crafts context-aware technical, behavioral, and domain-specific questions.
* **Voice & Expression Analytics**: Monitors speaking pace (WPM), pause durations, confidence scores, and facial expression cues via `face-api.js`.
* **Proctoring & Anti-Cheat**: Real-time eye tracking, face detection, tab-switching alerts, and multi-face detection.
* **Automated Evaluation Reports**: Generates detailed performance breakdowns, code quality scores, and actionable feedback.

### 2. ⚔️ Competitive Coding Battle (1v1)
* **Real-time Synchronization**: Powered by Socket.IO for instant room matching, countdown timers, and live progress tracking.
* **Multi-Language Sandbox**: Monaco Code Editor supporting **JavaScript**, **Python**, **Java**, **C++**, and **C**.
* **Hidden Test Case Evaluation**: Server-side test case execution with automated time/memory complexity profiling.
* **Automated Leaderboards & Win Conditions**: Matches declared on pass rates, execution runtime, and submission speed.

### 3. 🤝 Peer Mock Interview Module
* **Candidate Discovery**: Search candidate profiles filtered by name, domain, experience level, and tech stack skills.
* **Invitation Management**: Send, accept, or decline private interview room invitations.
* **WebRTC Peer-to-Peer Room**: Direct low-latency audio/video calling with media controls (mute mic/camera).
* **Shared Technical Workspace**: Simultaneous live code editor and real-time text chat drawer.
* **Role Toggling**: Instant role switching between *Interviewer* and *Interviewee*.
* **Mutual Feedback & Rating**: Post-interview ratings (1-5 stars) and dual report generation.

### 4. 🏢 Recruiter Live Interview Portal
* **Recruiter Dashboard**: Complete management hub to schedule live interviews and track candidate pipelines.
* **Email Invitations**: Automated invite dispatches containing secure live room links.
* **WebRTC Video, Audio & Screen Sharing**: Native screen sharing (`getDisplayMedia`) alongside dual camera/audio feeds.
* **Resume Viewer Sidepanel**: In-room resume document viewer for candidate evaluation.
* **4-Tier Candidate Scoring**: Score candidates across Communication, Technical Knowledge, Problem Solving, and Coding.
* **Session Recording & Reports**: In-browser session recording status and downloadable report generation.

### 5. 🗺️ Career Roadmap & AI Coach
* **Interactive AI Career Coach**: Continuous chat sessions tailored to tech career path guidance.
* **Personalized Skill Roadmaps**: Interactive node graphs for front-end, back-end, full-stack, data science, and DevOps domains.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend Framework** | React 18, Vite, React Router DOM v6 |
| **Styling & Aesthetics** | Tailwind CSS, Custom Design Tokens, Glassmorphism UI |
| **Code Editor** | Monaco Editor (`@monaco-editor/react`) |
| **Real-Time Communication** | Socket.IO Client, WebRTC (`RTCPeerConnection`, `getDisplayMedia`) |
| **Data Visualization & Media** | Recharts, Face-API.js, HTML2Canvas, jsPDF |
| **Backend Runtime** | Node.js, Express.js |
| **Database & ODM** | MongoDB, Mongoose ODM |
| **Real-Time Engine** | Socket.IO Server (HTTP Server Integration) |
| **Authentication** | JSON Web Tokens (JWT), BcryptJS |
| **Parsers & Utilities** | Multer, PDF-Parse, Mammoth (DOCX), Nodemailer |

---

## 📁 Repository Structure

```text
Interview simulation web/
├── client/                     # React Frontend Application
│   ├── src/
│   │   ├── api/                # Axios API Service Modules (peerApi, recruiterApi, etc.)
│   │   ├── components/         # Reusable UI Components & AppShell Layout
│   │   ├── context/            # AuthContext & ThemeContext
│   │   ├── pages/              # Page Views (Dashboard, Battle, Peer, Recruiter, Coach)
│   │   ├── App.jsx             # Main Application Routing
│   │   └── main.jsx            # Frontend Entrypoint
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Node.js Express Backend API
│   ├── src/
│   │   ├── config/             # DB Connection & Env Variables Setup
│   │   ├── controllers/        # Route Controllers (peerController, recruiterController, etc.)
│   │   ├── middlewares/        # Auth Middleware, Rate Limiters, Error Handlers
│   │   ├── models/             # Mongoose Schemas (User, PeerInterview, RecruiterInterview, Battle)
│   │   ├── routes/             # REST Express API Routes
│   │   ├── sockets/            # Socket.IO Event Handlers (battleSocket, peerSocket, recruiterSocket)
│   │   ├── services/           # AI Engine Services & Cron Jobs
│   │   └── index.js            # Server Initialization & Socket Mount
│   └── package.json
│
└── package.json                # Root Workspace Package Configuration
```

---

## 🔌 Core API Endpoints

| Category | Endpoint | Method | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `/api/auth/login` | `POST` | Authenticate user & return JWT token |
| **Auth** | `/api/auth/register` | `POST` | Register candidate or recruiter account |
| **Interviews** | `/api/interviews/setup` | `POST` | Initialize AI Mock Interview session |
| **Code Battle** | `/api/code/battle/match` | `POST` | Find or create 1v1 battle room |
| **Peer Mock** | `/api/peer/candidates` | `GET` | Search candidate profiles by skill/domain |
| **Peer Mock** | `/api/peer/invite` | `POST` | Send interview invitation to candidate |
| **Peer Mock** | `/api/peer/room/:roomId` | `GET` | Join private peer interview room |
| **Recruiter** | `/api/recruiter/schedule` | `POST` | Schedule live recruiter interview |
| **Recruiter** | `/api/recruiter/interviews` | `GET` | List recruiter scheduled interviews |
| **Recruiter** | `/api/recruiter/room/:roomId/score` | `POST` | Submit candidate scores & generate evaluation |

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18.x or higher)
* **MongoDB** (Local instance or MongoDB Atlas cluster)
* **npm** (v9.x or higher)

### 1. Installation
Clone the repository and install all workspace dependencies from the root:
```bash
cd "Interview simulation web"
npm install
```

### 2. Environment Setup
Create a `.env` file in the `server/` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/interview-simulation
JWT_SECRET=your_super_secret_jwt_key
CLIENT_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key
```

Create a `.env` file in the `client/` directory:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Launch Development Servers
Run the full application (client + server concurrently) using:
```bash
npm run dev
```

- **Frontend Client**: Access at `http://localhost:5173`
- **Backend API**: Access at `http://localhost:5000`

---

## 📄 License
This project is proprietary and maintained for technical interview simulation and recruitment purposes.
