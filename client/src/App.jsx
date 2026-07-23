import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminPage from './pages/AdminPage';
import CareerRecommendationPage from './pages/CareerRecommendationPage';
import CoachPage from './pages/CoachPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import InterviewSetupPage from './pages/InterviewSetupPage';
import LiveInterviewPage from './pages/LiveInterviewPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import RegisterPage from './pages/RegisterPage';
import ReportPage from './pages/ReportPage';
import ResumeUploadPage from './pages/ResumeUploadPage';
import RoadmapDetailPage from './pages/RoadmapDetailPage';
import RoadmapPage from './pages/RoadmapPage';
import SchedulePage from './pages/SchedulePage';
import BattleLobbyPage from './pages/BattleLobbyPage';
import BattleArenaPage from './pages/BattleArenaPage';
import PeerCandidatesPage from './pages/PeerCandidatesPage';
import PeerInterviewRoomPage from './pages/PeerInterviewRoomPage';
import PeerHistoryPage from './pages/PeerHistoryPage';
import RecruiterDashboardPage from './pages/RecruiterDashboardPage';
import RecruiterRoomPage from './pages/RecruiterRoomPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/setup"
        element={
          <ProtectedRoute>
            <InterviewSetupPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/schedule"
        element={
          <ProtectedRoute>
            <SchedulePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interview/:id"
        element={
          <ProtectedRoute>
            <LiveInterviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/:id"
        element={
          <ProtectedRoute>
            <ReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/career/:id"
        element={
          <ProtectedRoute>
            <CareerRecommendationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coach"
        element={
          <ProtectedRoute>
            <CoachPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/resumes"
        element={
          <ProtectedRoute>
            <ResumeUploadPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AdminPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/roadmap"
        element={
          <ProtectedRoute>
            <RoadmapPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/roadmap/:id"
        element={
          <ProtectedRoute>
            <RoadmapDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/battle"
        element={
          <ProtectedRoute>
            <BattleLobbyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/battle/:id"
        element={
          <ProtectedRoute>
            <BattleArenaPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/peer"
        element={
          <ProtectedRoute>
            <PeerCandidatesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/peer/room/:roomId"
        element={
          <ProtectedRoute>
            <PeerInterviewRoomPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/peer/history"
        element={
          <ProtectedRoute>
            <PeerHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recruiter"
        element={
          <ProtectedRoute>
            <RecruiterDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recruiter/room/:roomId"
        element={
          <ProtectedRoute>
            <RecruiterRoomPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
