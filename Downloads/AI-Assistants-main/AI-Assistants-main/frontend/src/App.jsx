import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// import UploadLecture from './UploadLecture';
// <UploadLecture onComplete={({ summary, flashcards, quizItems }) => {
//   // save to your app state
// }} />

// In App.jsx (React Router example)
import UploadLecture from './pages/UploadLecture';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* If they go to the root URL, redirect them to the login page for now */}
        <Route path="/" element={<Navigate to="/login" />} />
        
        {/* The actual routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<UploadLecture />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;