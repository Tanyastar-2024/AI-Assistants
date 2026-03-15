import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Arena from './pages/Arena';
import BombDefusal from './pages/BombDefusal';

// import UploadLecture from './UploadLecture';
// <UploadLecture onComplete={({ summary, flashcards, quizItems }) => {
//   // save to your app state
// }} />

// In App.jsx (React Router example)
import UploadLecture from './pages/UploadLecture';
import MyLectures from './pages/MyLectures';
import LectureDetail from './pages/LectureDetail';
import Flashcards from './pages/Flashcards';
import Settings from './pages/Settings';
import Leaderboard from './pages/Leaderboard';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* If they go to the root URL, redirect them to the login page for now */}
          <Route path="/" element={<Navigate to="/login" />} />

          {/* Public routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><UploadLecture /></ProtectedRoute>} />
          <Route path="/lectures" element={<ProtectedRoute><MyLectures /></ProtectedRoute>} />
          <Route path="/lecture/:id" element={<ProtectedRoute><LectureDetail /></ProtectedRoute>} />
          <Route path="/flashcards" element={<ProtectedRoute><Flashcards /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/arena" element={<ProtectedRoute><Arena /></ProtectedRoute>} />
          <Route path="/bomb" element={<ProtectedRoute><BombDefusal /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;