# AI-Driven Interview Simulation System

This project is a comprehensive AI-driven interview simulation platform designed to provide realistic mock interviews, skill assessments, and detailed feedback to users. It features both a frontend client and a backend server operating within a unified monorepo structure.

## 🚀 Tech Stack

### Frontend (Client)
The frontend is a single-page application (SPA) built for high performance and an interactive user experience.

*   **Core Framework**: React 18
*   **Build Tool**: Vite
*   **Routing**: React Router DOM
*   **Styling**: Tailwind CSS
*   **API Communication**: Axios
*   **Key Libraries**:
    *   **Code Editing**: `@monaco-editor/react` (for technical/coding interviews)
    *   **Facial Analysis**: `face-api.js` (for proctoring or expression analysis)
    *   **Data Visualization**: `recharts` (for displaying interview analytics and feedback)
    *   **Media**: `react-player` (for playing back recordings or interview prompts)
    *   **Export**: `html2canvas`, `jspdf` (for generating downloadable reports)
    *   **Dates**: `date-fns`

### Backend (Server)
The backend provides robust APIs, database integration, and AI service orchestrations.

*   **Runtime Environment**: Node.js
*   **Web Framework**: Express.js
*   **Database**: MongoDB (via `mongoose` ODM)
*   **AI Integration**: OpenAI API (`openai`)
*   **Authentication & Security**: 
    *   `jsonwebtoken` (JWT for session management)
    *   `bcryptjs` (password hashing)
    *   `helmet` (HTTP header security)
    *   `cors` (Cross-Origin Resource Sharing)
*   **File Handling & Parsing**:
    *   `multer` (handling multipart/form-data for uploads)
    *   `pdf-parse` (extracting text from PDF resumes)
    *   `mammoth` (extracting text from DOCX resumes)
*   **Validation**: `zod` (schema declaration and validation)
*   **Utilities**:
    *   `node-cron` (scheduled tasks/jobs)
    *   `nodemailer` (email sending capabilities)
    *   `morgan` (HTTP request logging)

### Project Structure & Tooling
*   **Monorepo Management**: `npm workspaces`
*   **Development Server Management**: `concurrently` (runs both client and server dev environments simultaneously)
*   **Environment Variables**: `dotenv`

## 🛠️ Getting Started

### Prerequisites
*   Node.js installed on your machine
*   MongoDB instance (local or Atlas)
*   OpenAI API Key

### Installation

1. Clone the repository and navigate into it:
   ```bash
   cd "Interview simulation web"
   ```

2. Install dependencies for the root, client, and server workspaces:
   ```bash
   npm install
   ```

3. Set up environment variables:
   * Navigate to the `server` directory and create a `.env` file based on `.env.example` (or configure your MongoDB URI, JWT secret, OpenAI keys, etc.).
   * Navigate to the `client` directory and set up any required frontend environment variables (like the backend API URL).

### Running the Application

To start both the frontend and backend development servers concurrently, run the following command from the root directory:

```bash
npm run dev
```

*   The frontend will typically run on `http://localhost:5173`
*   The backend will typically run on `http://localhost:5000` (or as configured in your `.env`)
