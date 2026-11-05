/**
 * ProtectedRoute — redirects unauthenticated or wrong-role users.
 */
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * @param {string[]} roles  - Allowed roles. Empty = any authenticated user.
 */
export default function ProtectedRoute({ children, roles = [] }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !roles.includes(user?.role)) {
    // Redirect to the correct home for their role
    const home = { patient: "/patient-portal", doctor: "/doctor", admin: "/admin" };
    return <Navigate to={home[user?.role] || "/login"} replace />;
  }

  return children;
}
