/**
 * VoiceRegisterPage — PUBLIC page.
 *
 * Tab 1: Voice Registration (existing flow + live form post-call)
 *   - Patient speaks with ElevenLabs agent
 *   - After call ends, WS fires → form pre-fills with AI data
 *   - Patient can edit & save via PATCH /api/my-record
 *   - Credential card shown after save (or after WS if no edit needed)
 *
 * Tab 2: Manual Sign Up
 *   - Patient fills a standard form
 *   - POST /auth/signup/patient
 *   - Credential card shown on success
 */
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Mic, MicOff, ArrowLeft, Copy, CheckCircle, KeyRound,
  User, ClipboardList, Loader2, AlertCircle, Edit3,
} from "lucide-react";
import { useWebSocket } from "../hooks/useWebSocket";
import { authApi, patientApi } from "../services/api";
import PatientRegistrationForm from "../components/PatientRegistrationForm";

// Set VITE_ELEVENLABS_AGENT_ID to YOUR ElevenLabs agent. No fallback on purpose:
// a default would send patient calls to someone else's agent.
const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID || "";

// Random per-browser id. The backend uses it to deliver the call result to THIS
// browser only (it must match /^[A-Za-z0-9_-]{16,128}$/).
function makeSessionId() {
  const rnd = () =>
    (globalThis.crypto?.randomUUID?.() ?? `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`)
      .replace(/-/g, "");
  return `s${rnd()}${rnd()}`.slice(0, 64);
}

// ─── Credential Card ────────────────────────────────────────────────────────
function CredentialCard({ credentials, note }) {
  const [copied, setCopied] = useState({ email: false, pass: false });

  const copy = async (text, key) => {
    await navigator.clipboard.writeText(text);
    setCopied((c) => ({ ...c, [key]: true }));
    setTimeout(() => setCopied((c) => ({ ...c, [key]: false })), 2000);
  };

  return (
    <div className="animate-float">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-6 text-center">
          <CheckCircle size={48} className="text-white mx-auto mb-3" />
          <h2 className="text-2xl font-black text-white">Registration Complete!</h2>
          <p className="text-emerald-100 mt-1">
            Welcome, {credentials.name}. Note down your login credentials.
          </p>
        </div>

        <div className="p-8 space-y-4">
          {/* Username */}
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              <User size={12} /> Your Username (Email)
            </label>
            <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3">
              <span className="flex-1 font-mono text-slate-800 text-sm font-semibold">
                {credentials.email}
              </span>
              <button onClick={() => copy(credentials.email, "email")}
                className="text-slate-400 hover:text-indigo-600 transition-colors">
                {copied.email ? <CheckCircle size={18} className="text-green-500" /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              <KeyRound size={12} /> Your Temporary Password
            </label>
            <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3">
              <span className="flex-1 font-mono text-slate-800 text-sm font-semibold">
                {credentials.password}
              </span>
              <button onClick={() => copy(credentials.password, "pass")}
                className="text-slate-400 hover:text-indigo-600 transition-colors">
                {copied.pass ? <CheckCircle size={18} className="text-green-500" /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          {note && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-sky-800 text-sm">{note}</div>
          )}

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-amber-800 text-sm font-semibold mb-1">⚠️ Important</p>
            <ul className="text-amber-700 text-sm space-y-1 list-disc list-inside">
              <li>Write down or copy these credentials now</li>
              <li>You will be asked to change your password on first login</li>
              <li>Your username is auto-generated from your name and phone number</li>
            </ul>
          </div>

          <Link to="/login"
            className="block w-full text-center py-4 bg-gradient-to-r from-indigo-600 to-purple-600
                       text-white rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700
                       transition-all shadow-lg shadow-indigo-500/30">
            → Log In Now
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Manual Signup Tab ───────────────────────────────────────────────────────
function ManualSignupTab() {
  const [credentials, setCredentials] = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError("");
    try {
      const res = await patientApi.signup(formData);
      setCredentials({ email: res.email, password: res.password, name: res.name });
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (credentials) return <CredentialCard credentials={credentials} />;

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <ClipboardList size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Manual Sign Up</h2>
            <p className="text-indigo-200 text-sm">Fill in your details to create an account</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-5 text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <PatientRegistrationForm
          onSubmit={handleSubmit}
          loading={loading}
          submitLabel="Create My Account"
          showPassword={true}
          mode="signup"
        />
      </div>
    </div>
  );
}

// ─── Voice Registration Tab ──────────────────────────────────────────────────
function VoiceTab() {
  const [showWidget,   setShowWidget]   = useState(false);
  const [credentials,  setCredentials]  = useState(null);
  const [patientData,  setPatientData]  = useState(null); // voice WS data
  const [editLoading,  setEditLoading]  = useState(false);
  const [editError,    setEditError]    = useState("");
  const [editSuccess,  setEditSuccess]  = useState(false);
  const [saveNote,     setSaveNote]     = useState("");
  const [endedCall,    setEndedCall]    = useState(false);
  const [sessionId]                     = useState(makeSessionId);
  const { latestPatient, wsConnected }  = useWebSocket({ sessionId });

  // ── ElevenLabs SDK ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!document.querySelector('script[src*="elevenlabs"]')) {
      const s = document.createElement("script");
      s.src   = "https://unpkg.com/@elevenlabs/convai-widget-embed";
      s.async = true;
      s.type  = "text/javascript";
      document.body.appendChild(s);
    }
  }, []);

  // ── Mount ElevenLabs widget ─────────────────────────────────────────────
  useEffect(() => {
    if (!showWidget) {
      document.querySelectorAll("elevenlabs-convai").forEach((w) => w.remove());
      return;
    }
    const mount = () => {
      if (document.querySelector("elevenlabs-convai")) return;
      const container = document.getElementById("vr-widget-container");
      if (!container) return;

      const widget = document.createElement("elevenlabs-convai");
      widget.setAttribute("agent-id", AGENT_ID);
      // Echoed back by ElevenLabs in the post-call webhook so the result reaches only this browser
      widget.setAttribute("dynamic-variables", JSON.stringify({ session_id: sessionId }));
      Object.assign(widget.style, {
        position: "relative", width: "100%", height: "100%",
        minHeight: "420px", display: "block",
        bottom: "auto", left: "auto", right: "auto", top: "auto",
        transform: "none", zIndex: "1",
      });

      const guard = new MutationObserver(() => {
        if (["fixed", "absolute"].includes(widget.style.position)) {
          Object.assign(widget.style, {
            position: "relative", bottom: "auto", left: "auto",
            right: "auto", top: "auto", transform: "none",
          });
        }
      });
      guard.observe(widget, { attributes: true, attributeFilter: ["style"] });
      container.innerHTML = "";
      container.appendChild(widget);
    };
    const t = setTimeout(mount, 150);
    return () => clearTimeout(t);
  }, [showWidget, sessionId]);

  // ── WS fires after call ends → pre-fill form ────────────────────────────
  useEffect(() => {
    if (!latestPatient) return;
    setPatientData(latestPatient);
    setShowWidget(false);
    // Derive credentials (matches backend logic) for display later
    const name    = String(latestPatient.name || "patient").toLowerCase().replace(/\s+/g, "");
    const contact = String(latestPatient.contact || "");
    const last4   = contact.length >= 4 ? contact.slice(-4) : contact;
    setCredentials({
      email:    `${name}.${last4}@patient.vytalai`,
      password: contact || "VytalAI@Patient",
      name:     latestPatient.name,
    });
  }, [latestPatient]);

  // ── Patient confirms / edits voice data ─────────────────────────────────
  // The webhook already created the account with predictable credentials, so we
  // sign in with them just long enough to authenticate the edit, then discard the token.
  const handleEditSave = async (formData) => {
    setEditLoading(true);
    setEditError("");
    setEditSuccess(false);
    setSaveNote("");
    try {
      const { access_token } = await authApi.login(credentials.email, credentials.password);
      await patientApi.updateMyRecord(formData, access_token);
    } catch (err) {
      setSaveNote(
        `We couldn't apply your edits (${err.message}). Your original details are safely ` +
        "registered — you can correct them from your patient portal after logging in."
      );
    } finally {
      setEditLoading(false);
      setEditSuccess(true);
    }
  };

  // ── Credential card after voice complete ────────────────────────────────
  if (credentials && !patientData) {
    return <CredentialCard credentials={credentials} />;
  }

  // ── Post-call: editable form pre-filled with voice data ─────────────────
  if (patientData) {
    if (editSuccess) return <CredentialCard credentials={credentials} note={saveNote || "Your details have been saved."} />;

    return (
      <div className="space-y-4">
        {/* Info banner */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex gap-3">
          <CheckCircle size={22} className="text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-white font-semibold text-sm">Voice registration processed!</p>
            <p className="text-slate-400 text-xs mt-0.5">
              We've pre-filled the form below with data collected from your call.
              Review, correct any mistakes, and click Save.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-500 to-indigo-600 px-8 py-5 flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Edit3 size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Review Your Details</h2>
              <p className="text-indigo-200 text-xs">Edit any field and click Save to confirm</p>
            </div>
          </div>

          <div className="p-6">
            {editError && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-5 text-sm">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p>{editError}</p>
              </div>
            )}
            <PatientRegistrationForm
              initialData={patientData}
              onSubmit={handleEditSave}
              loading={editLoading}
              submitLabel="Confirm & Save"
              showPassword={false}
              mode="edit"
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Pre-call screen ──────────────────────────────────────────────────────
  if (!showWidget) {
    return (
      <div className="text-center">
        {/* Animated mic */}
        <div className="relative w-44 h-44 mx-auto mb-10">
          <div className="absolute inset-0 bg-cyan-500/20 rounded-full animate-ping"
            style={{ animationDuration: "2s" }} />
          <div className="absolute inset-4 bg-cyan-500/10 rounded-full animate-ping"
            style={{ animationDuration: "2s", animationDelay: "0.5s" }} />
          <div className="relative w-full h-full bg-gradient-to-br from-cyan-500 to-indigo-600
                          rounded-full flex items-center justify-center shadow-2xl shadow-cyan-500/40">
            <Mic size={64} className="text-white" />
          </div>
        </div>

        <h2 className="text-4xl font-black text-white mb-4">Register via Voice</h2>
        <p className="text-slate-400 text-lg mb-3 max-w-md mx-auto">
          Click below and speak with our AI assistant. It will collect your details
          and create your account automatically.
        </p>
        <p className="text-slate-500 text-sm mb-10">
          No forms. No typing. Just speak naturally.
        </p>
        {endedCall && (
          <div className="max-w-md mx-auto mb-8 bg-sky-500/10 border border-sky-500/30 rounded-2xl p-4 text-left">
            <p className="text-sky-300 text-sm font-semibold mb-1">Processing your registration…</p>
            <p className="text-slate-400 text-xs">
              Your details will appear here in a few seconds. If nothing shows up within a minute,
              switch to the “Manual Sign Up” tab.
            </p>
          </div>
        )}
        {!AGENT_ID && (
          <p className="max-w-md mx-auto mb-6 text-amber-300 text-sm bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
            Voice registration isn’t configured yet. Please use “Manual Sign Up”.
          </p>
        )}
        <button
          id="vr-start-btn"
          disabled={!AGENT_ID}
          onClick={() => { setEndedCall(false); setShowWidget(true); }}
          className="px-10 py-5 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white rounded-2xl
                     font-black text-xl flex items-center gap-3 mx-auto shadow-2xl shadow-cyan-500/40
                     hover:from-cyan-600 hover:to-indigo-700 transition-all hover:-translate-y-1
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          <Mic size={26} /> Start Voice Registration
        </button>
      </div>
    );
  }

  // ── Active call ──────────────────────────────────────────────────────────
  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Voice Registration Active</h2>
        <p className="text-slate-400 text-sm">Speak clearly. The AI will guide you.</p>
      </div>

      <div className="bg-white/5 border border-white/10 backdrop-blur rounded-2xl overflow-hidden">
        <div className="bg-indigo-500/10 border-b border-white/10 px-4 py-3 flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm text-slate-300 font-medium">Recording in progress…</span>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? "bg-green-400 animate-pulse" : "bg-slate-600"}`} />
            {wsConnected ? "Live" : "Connecting…"}
          </span>
        </div>
        <div id="vr-widget-container"
          className="w-full min-h-[420px] flex items-center justify-center">
          <div className="text-center text-slate-500">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500 mx-auto mb-3" />
            <p className="text-sm">Connecting to AI agent…</p>
          </div>
        </div>
      </div>

      <button
        id="vr-end-btn"
        onClick={() => { setShowWidget(false); setEndedCall(true); }}
        className="mt-4 w-full py-4 bg-red-500/90 hover:bg-red-600 text-white rounded-xl font-bold
                   flex items-center justify-center gap-2 transition-colors"
      >
        <MicOff size={18} /> End Call
      </button>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
const TABS = [
  { id: "voice",  label: "Voice Registration", icon: <Mic size={16} /> },
  { id: "manual", label: "Manual Sign Up",     icon: <ClipboardList size={16} /> },
];

export default function VoiceRegisterPage() {
  const [activeTab, setActiveTab] = useState("voice");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex flex-col">
      {/* Top bar */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/10">
        <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <p className="text-xs text-slate-500">
          Already registered?{" "}
          <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold">Sign In</Link>
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center px-6 py-10">
        <div className="w-full max-w-xl">

          {/* Page header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-white mb-2">Patient Registration</h1>
            <p className="text-slate-400">Choose how you'd like to register</p>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 mb-8 gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                  text-sm font-semibold transition-all duration-200
                  ${activeTab === tab.id
                    ? "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "voice"  && <VoiceTab />}
          {activeTab === "manual" && <ManualSignupTab />}

        </div>
      </div>
    </div>
  );
}
