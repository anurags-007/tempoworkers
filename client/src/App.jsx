import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import WorkerDashboard from "./pages/WorkerDashboard";
import EmployerDashboard from "./pages/EmployerDashboard";
import ProfileSetup from "./pages/ProfileSetup";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import HowItWorks from "./pages/HowItWorks";
import AdminDashboard from "./pages/AdminDashboard";
import useSocket from "./hooks/useSocket";

const App = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Initialize user from localStorage on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
  }, []);

  // Connect Socket.io for real-time notifications
  useSocket(user);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    navigate("/");
  };

  const handleProfileSaved = (updatedUser) => {
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
    navigate(`/${updatedUser.role}-dashboard`);
  };

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/login" element={<Login setUser={setUser} />} />
      <Route
        path="/profile-setup"
        element={
          <ProtectedRoute user={user}>
            <ProfileSetup user={user} onSave={handleProfileSaved} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/worker-dashboard"
        element={
          <ProtectedRoute user={user} role="worker">
            <WorkerDashboard user={user} setUser={setUser} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/employer-dashboard"
        element={
          <ProtectedRoute user={user} role="employer">
            <EmployerDashboard user={user} setUser={setUser} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin"
        element={
          <ProtectedRoute user={user} role="admin">
            <AdminDashboard user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
