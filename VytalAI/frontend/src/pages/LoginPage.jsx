import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Stethoscope, Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const ROLE_HINTS = {
  admin:   { label: "Admin",   placeholder: "admin@vytalai.com",             color: "from-rose-500 to-orange-500" },
  doctor:  { label: "Doctor",  placeholder: "doctor@hospital.com",           color: "from-blue-500 to-cyan-500"  },
  patient: { label: "Patient", placeholder: "yourname.1234@patient.vytalai",  color: "from-emerald-500 to-teal-500" },
};

export default function LoginPage() {
  const { login }    = useAuth();
  const navigate     = useNavigate();
  const [role,       setRole]    = useState("doctor");
  const [email,      setEmail]   = useState("");
  const [password,   setPassword] = useState("");
  const [showPwd,    setShowPwd] = useState(false);
  const [loading,    setLoading] = useState(false);
  const [error,      setError]   = useState("");
  const hint = ROLE_HINTS[role];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user, firstLogin } = await login(email, password);

      // Role-based routing
      if (user.role === "patient") {
        if (firstLogin) navigate("/change-password");
        else            navigate("/patient-portal");
      } else if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/doctor");
      }
    } catch (err) {
      setError(err.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex-col items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-500/15 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center shadow-2xl shadow-cyan-500/40">
            <Stethoscope size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-white mb-4">VytalAI</h1>
          <p className="text-slate-400 text-lg max-w-sm">AI-powered patient registration. Speak naturally, get registered instantly.</p>
          <div className="mt-12 grid gap-3 text-left">
            {Object.entries(ROLE_HINTS).map(([r, h]) => (
              <div key={r} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <p className="text-white font-semibold text-sm">{h.label}</p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {r === "admin" ? "Full system access" : r === "doctor" ? "Manage patient cases" : "View personal records"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center">
              <Stethoscope size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">VytalAI</span>
          </div>

          <h2 className="text-3xl font-black text-slate-900 mb-2">Welcome back</h2>
          <p className="text-slate-500 mb-8">Sign in to access your dashboard</p>

          {/* Role selector */}
          <div className="flex rounded-xl border border-slate-200 p-1 mb-6 bg-slate-50">
            {Object.entries(ROLE_HINTS).map(([r, h]) => (
              <button key={r} type="button"
                onClick={() => { setRole(r); setEmail(""); setError(""); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  role === r ? `bg-gradient-to-r ${h.color} text-white shadow-md` : "text-slate-500 hover:text-slate-800"
                }`}>
                {h.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
              <AlertCircle size={16} className="flex-shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder={hint.placeholder}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-800 placeholder-slate-400 transition" />
              {role === "patient" && (
                <p className="text-xs text-slate-400 mt-1.5">Format: name.1234@patient.vytalai (shown after voice call)</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <input type={showPwd ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={role === "patient" ? "Your contact number (temporary)" : "Enter password"}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-800 placeholder-slate-400 transition" />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-60 shadow-lg shadow-indigo-500/30">
              {loading
                ? <span className="animate-spin rounded-full w-5 h-5 border-2 border-white border-t-transparent" />
                : <><LogIn size={18} /> Sign In</>}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Are you a doctor?{" "}
            <Link to="/signup" className="text-indigo-600 font-semibold hover:underline">Create an account</Link>
          </p>
          <p className="text-center text-slate-500 text-sm mt-2">
            Are you a patient?{" "}
            <Link to="/register" className="text-emerald-600 font-semibold hover:underline">Register via Voice</Link>
          </p>
          <p className="text-center mt-3">
            <Link to="/" className="text-slate-400 text-sm hover:text-slate-600">← Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
