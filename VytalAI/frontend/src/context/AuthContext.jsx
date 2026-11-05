/**
 * AuthContext — handles login, logout, first_login redirect.
 */
import React, { createContext, useContext, useState } from "react";
import { authApi } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("vytalai_user")) || null; }
    catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem("vytalai_token") || null);

  /**
   * Login and return { user, firstLogin } so the caller can redirect.
   */
  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    localStorage.setItem("vytalai_token", data.access_token);
    localStorage.setItem("vytalai_user", JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return { user: data.user, firstLogin: data.first_login };
  };

  const logout = () => {
    localStorage.removeItem("vytalai_token");
    localStorage.removeItem("vytalai_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
}
