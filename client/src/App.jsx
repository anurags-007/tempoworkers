import React, { useState, useEffect, Suspense, lazy } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ProfileSetup from "./pages/ProfileSetup";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import HowItWorks from "./pages/HowItWorks";
import useSocket from "./hooks/useSocket";

const WorkerDashboard = lazy(() => import("./pages/WorkerDashboard"));
const EmployerDashboard = lazy(() => import("./pages/EmployerDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

const App = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Initialize user from localStorage on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUser(JSON.parse(storedUser));
      }
    } catch {
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>}>
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
              <WorkerDashboard user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employer-dashboard"
          element={
            <ProtectedRoute user={user} role="employer">
              <EmployerDashboard user={user} onLogout={handleLogout} />
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
    </Suspense>
  );
};

export default App;
