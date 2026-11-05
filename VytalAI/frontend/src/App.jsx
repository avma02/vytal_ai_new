import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider }        from "./context/AuthContext";
import ProtectedRoute          from "./components/ProtectedRoute";
import LandingPage             from "./pages/LandingPage";
import LoginPage               from "./pages/LoginPage";
import DoctorSignupPage        from "./pages/DoctorSignupPage";
import VoiceRegisterPage       from "./pages/VoiceRegisterPage";
import ChangePasswordPage      from "./pages/ChangePasswordPage";
import AdminDashboard          from "./pages/AdminDashboard";
import DoctorDashboard         from "./pages/DoctorDashboard";
import PatientPortalPage       from "./pages/PatientPortalPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/"         element={<LandingPage />} />
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/signup"   element={<DoctorSignupPage />} />
          <Route path="/register" element={<VoiceRegisterPage />} />

          {/* First-login password reset (any authenticated user) */}
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />

          {/* Admin only */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Doctor only */}
          <Route
            path="/doctor"
            element={
              <ProtectedRoute roles={["doctor"]}>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />

          {/* Patient only */}
          <Route
            path="/patient-portal"
            element={
              <ProtectedRoute roles={["patient"]}>
                <PatientPortalPage />
              </ProtectedRoute>
            }
          />

          {/* Legacy redirect */}
          <Route path="/dashboard" element={<Navigate to="/admin" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
