/**
 * ChangePasswordPage — forced on patient's first login.
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { authApi } from "../services/api";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [oldPwd,  setOldPwd]  = useState("");
  const [newPwd,  setNewPwd]  = useState("");
  const [confirm, setConfirm] = useState("");
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [done,    setDone]    = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPwd !== confirm)         { setError("New passwords don't match."); return; }
    if (newPwd.length < 6)          { setError("New password must be at least 6 characters."); return; }
    if (newPwd === oldPwd)          { setError("New password must differ from old password."); return; }

    setLoading(true);
    try {
      await authApi.changePassword(oldPwd, newPwd);
      setDone(true);
      setTimeout(() => navigate("/patient-portal"), 2000);
    } catch (err) {
      setError(err.message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-indigo-950 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-10 text-center max-w-sm w-full shadow-2xl">
          <CheckCircle size={56} className="text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-900 mb-2">Password Changed!</h2>
          <p className="text-slate-500">Redirecting to your portal…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl animate-blob pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-500/15 rounded-full blur-3xl animate-blob animation-delay-2000 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <KeyRound size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">Set Your Password</h1>
            <p className="text-slate-500 text-sm mt-2">
              You're logging in for the first time. Please change your temporary password.
            </p>
          </div>

          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-blue-700 text-sm">
              <strong>Temporary password</strong> = your registered phone number.<br />
              Use that as your current password below.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm">
              <AlertCircle size={16} className="flex-shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Current (Temporary) Password</label>
              <input type="password" required value={oldPwd} onChange={(e) => setOldPwd(e.target.value)}
                placeholder="Your phone number"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-800 placeholder-slate-400 transition" />
            </div>

            {/* New password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
              <div className="relative">
                <input type={show ? "text" : "password"} required value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-800 placeholder-slate-400 transition" />
                <button type="button" onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
              <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-800 placeholder-slate-400 transition" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-60 shadow-lg shadow-amber-500/30 mt-2">
              {loading
                ? <span className="animate-spin rounded-full w-5 h-5 border-2 border-white border-t-transparent" />
                : <><KeyRound size={18} /> Set New Password</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
