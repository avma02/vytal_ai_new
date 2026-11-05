import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Stethoscope, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle } from "lucide-react";
import { authApi } from "../services/api";

const SPECIALTIES = [
  "General Medicine", "Cardiology", "Pediatrics", "Orthopedics",
  "Dermatology", "Neurology", "Gynecology", "ENT", "Ophthalmology", "Psychiatry", "Other",
];

export default function DoctorSignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "", email: "", specialty: "", password: "", confirm: "", invite_code: "",
  });
  const [showPwd,   setShowPwd]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (form.password.length < 6)       { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    try {
      await authApi.doctorSignup({
        full_name: form.full_name,
        email:     form.email,
        password:  form.password,
        specialty: form.specialty || null,
        invite_code: form.invite_code || null,
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-indigo-950 p-6">
        <div className="bg-white rounded-2xl p-10 text-center max-w-sm w-full shadow-2xl">
          <CheckCircle size={56} className="text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-900 mb-2">Account Created!</h2>
          <p className="text-slate-500 mb-4">Your doctor account is ready. Redirecting to login…</p>
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl animate-blob pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-500/15 rounded-full blur-3xl animate-blob animation-delay-2000 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Stethoscope size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">Register as Doctor</h1>
            <p className="text-slate-500 text-sm mt-1">Create your VytalAI doctor account</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
              <input
                type="text" required value={form.full_name} onChange={update("full_name")}
                placeholder="Dr. Aisha Patel"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-800 placeholder-slate-400 transition"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <input
                type="email" required value={form.email} onChange={update("email")}
                placeholder="doctor@hospital.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-800 placeholder-slate-400 transition"
              />
            </div>

            {/* Specialty */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Specialty <span className="text-slate-400 font-normal">(optional)</span></label>
              <select
                value={form.specialty} onChange={update("specialty")}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-800 bg-white transition"
              >
                <option value="">Select specialty…</option>
                {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"} required value={form.password} onChange={update("password")}
                  placeholder="Min. 6 characters"
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-800 placeholder-slate-400 transition"
                />
                <button type="button" onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm Password</label>
              <input
                type="password" required value={form.confirm} onChange={update("confirm")}
                placeholder="Repeat password"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-800 placeholder-slate-400 transition"
              />
            </div>

            {/* Invite code (only enforced when the server sets DOCTOR_SIGNUP_CODE) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Invite Code <span className="text-slate-400 font-normal">(if your hospital gave you one)</span></label>
              <input
                type="text" value={form.invite_code} onChange={update("invite_code")}
                placeholder="Invite code"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-800 placeholder-slate-400 transition"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-60 shadow-lg shadow-blue-500/30 mt-2"
            >
              {loading
                ? <span className="animate-spin rounded-full w-5 h-5 border-2 border-white border-t-transparent" />
                : <><UserPlus size={18} /> Create Doctor Account</>
              }
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Already registered?{" "}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">Sign in</Link>
          </p>
          <p className="text-center mt-2">
            <Link to="/" className="text-slate-400 text-sm hover:text-slate-600">← Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
