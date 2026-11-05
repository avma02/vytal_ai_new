import React from "react";
import { Link } from "react-router-dom";
import {
  Mic, Zap, Shield, ChevronRight, ArrowRight,
  Brain, Clock, Users, Activity, Stethoscope,
} from "lucide-react";
import Navbar from "../components/Navbar";

/* ── Feature cards ───────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: <Mic size={28} />,
    color: "from-cyan-400 to-cyan-600",
    glow: "shadow-cyan-500/30",
    title: "AI Voice Registration",
    description:
      "Patients speak naturally with the AI. It collects all 10 required fields — name, age, symptoms, and more — in a single fluent conversation.",
  },
  {
    icon: <Zap size={28} />,
    color: "from-violet-400 to-violet-600",
    glow: "shadow-violet-500/30",
    title: "Real-Time Dashboard",
    description:
      "No page refresh needed. The moment a call ends, patient data appears on the doctor's dashboard via live WebSocket — zero delay.",
  },
  {
    icon: <Shield size={28} />,
    color: "from-emerald-400 to-emerald-600",
    glow: "shadow-emerald-500/30",
    title: "Secure & Role-Based",
    description:
      "JWT authentication with strict RBAC. Admins, doctors, and patients each see only what they're permitted to — nothing more.",
  },
];

/* ── Steps ───────────────────────────────────────────────────────────────── */
const STEPS = [
  {
    num: "01",
    title: "Patient Speaks",
    description: "Patient interacts with the AI voice agent. No forms, no typing — just a natural conversation.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    num: "02",
    title: "AI Extracts Data",
    description: "ElevenLabs AI captures name, age, reason for visit, emergency contact and more — structured automatically.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    num: "03",
    title: "Instant Update",
    description: "Data saves to MongoDB and pushes to every connected dashboard in real-time via WebSocket.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
];

/* ── Stats ───────────────────────────────────────────────────────────────── */
const STATS = [
  { label: "Avg. Registration Time", value: "< 3 min", icon: <Clock size={18} /> },
  { label: "Fields Captured",        value: "10",       icon: <Brain size={18} /> },
  { label: "User Roles Supported",   value: "3",        icon: <Users size={18} /> },
  { label: "Real-time Latency",      value: "< 1s",     icon: <Activity size={18} /> },
];

/* ───────────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-slate-950">
        {/* Animated background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-blob" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-violet-500/15 rounded-full blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl animate-blob animation-delay-4000" />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "50px 50px" }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left — text */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-4 py-2 rounded-full text-sm font-semibold mb-8 animate-float">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              Powered by ElevenLabs AI
            </div>

            <h1 className="text-5xl lg:text-7xl font-black text-white leading-tight mb-6 tracking-tight">
              Patient&nbsp;Registration,{" "}
              <span className="gradient-text">Reimagined.</span>
            </h1>

            <p className="text-lg text-slate-400 leading-relaxed mb-10 max-w-xl">
              Patients simply <span className="text-white font-semibold">speak</span> — our
              AI captures every detail, saves to your database, and updates the doctor's
              dashboard <span className="text-white font-semibold">instantly</span>.
              No clipboards. No typing. No waiting.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/register"
                className="btn-glow flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white rounded-xl font-bold text-lg"
              >
                <Mic size={22} />
                Register as Patient
              </Link>
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 px-8 py-4 border-2 border-white/20 text-white rounded-xl font-semibold text-lg hover:bg-white/10 transition-colors"
              >
                Staff Login
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>

          {/* Right — visual */}
          <div className="flex justify-center items-center">
            <div className="relative w-full max-w-md">
              {/* Central icon */}
              <div className="w-36 h-36 mx-auto rounded-full bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-cyan-500/40 animate-float">
                <Mic size={64} className="text-white" />
              </div>

              {/* Floating data cards */}
              <div className="absolute -top-4 -left-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl p-3 text-white text-sm shadow-xl animate-float" style={{ animationDelay: "0.5s" }}>
                <p className="text-xs text-slate-400 mb-1">Patient Name</p>
                <p className="font-semibold">Raj Sharma</p>
              </div>

              <div className="absolute -top-4 -right-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl p-3 text-white text-sm shadow-xl animate-float" style={{ animationDelay: "1s" }}>
                <p className="text-xs text-slate-400 mb-1">Reason</p>
                <p className="font-semibold">Fever & Cough</p>
              </div>

              <div className="absolute -bottom-6 left-0 right-0 mx-4 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 backdrop-blur border border-white/20 rounded-xl p-3 text-white text-sm shadow-xl">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-slate-300">Saved to MongoDB · WebSocket broadcast sent</span>
                </div>
              </div>

              {/* Glow rings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 rounded-full border border-cyan-500/20 animate-ping" style={{ animationDuration: "3s" }} />
                <div className="absolute w-64 h-64 rounded-full border border-violet-500/10 animate-ping" style={{ animationDuration: "4s", animationDelay: "1s" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500 animate-bounce">
          <span className="text-xs">Scroll to explore</span>
          <div className="w-5 h-8 border-2 border-slate-600 rounded-full flex items-start justify-center pt-1">
            <div className="w-1 h-2 bg-slate-500 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* ── STATS BAR ─────────────────────────────────────────────────────── */}
      <section className="bg-slate-900 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="flex items-center justify-center gap-2 text-cyan-400 mb-1">
                {s.icon}
                <span className="text-3xl font-black text-white">{s.value}</span>
              </div>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-cyan-600 font-semibold text-sm uppercase tracking-widest mb-3">Why VytalAI</p>
            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-4">
              Everything a Modern Clinic Needs
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">
              Built for speed, accuracy, and compliance — so your staff can focus on patients, not paperwork.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="card-hover group bg-white border border-slate-100 rounded-2xl p-8 shadow-sm hover:shadow-xl">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white mb-6 shadow-lg ${f.glow}`}>
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{f.title}</h3>
                <p className="text-slate-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-violet-600 font-semibold text-sm uppercase tracking-widest mb-3">The Process</p>
            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-4">
              Three Steps. Zero Friction.
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-lg">
              From spoken words to structured database record in under 3 minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-16 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-cyan-300 to-violet-300 z-0" />

            {STEPS.map((step, i) => (
              <div key={step.num} className="relative z-10 text-center card-hover">
                <div className={`w-32 h-32 rounded-full ${step.bg} border-2 border-current mx-auto flex items-center justify-center mb-6`}
                     style={{ borderColor: "currentColor" }}>
                  <span className={`text-5xl font-black ${step.color}`}>{step.num}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ─────────────────────────────────────────────────────────── */}
      <section id="about" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-cyan-600 font-semibold text-sm uppercase tracking-widest mb-3">About VytalAI</p>
            <h2 className="text-4xl font-black text-slate-900 mb-6 leading-tight">
              Designed for hospitals that can't afford to slow down
            </h2>
            <p className="text-slate-500 leading-relaxed mb-6">
              Traditional patient registration wastes 15–25 minutes per patient on paperwork.
              VytalAI replaces clipboards and forms with a 2-minute AI-guided voice call — then
              instantly delivers structured, searchable records to every doctor on the team.
            </p>
            <p className="text-slate-500 leading-relaxed mb-8">
              Built with <span className="text-slate-800 font-semibold">FastAPI + MongoDB</span> on the
              backend and <span className="text-slate-800 font-semibold">React + WebSocket</span> on
              the front — engineered for reliability at scale.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
            >
              Get Started <ArrowRight size={18} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: <Stethoscope size={24} />, label: "Doctors", desc: "Access real-time registrations" },
              { icon: <Users size={24} />,       label: "Patients", desc: "Get an account auto-created" },
              { icon: <Shield size={24} />,      label: "Secure",   desc: "JWT + RBAC on every route" },
              { icon: <Activity size={24} />,    label: "Live",     desc: "WebSocket, no polling" },
            ].map((c) => (
              <div key={c.label} className="card-hover bg-slate-50 border border-slate-100 rounded-xl p-5">
                <div className="text-cyan-600 mb-3">{c.icon}</div>
                <p className="font-bold text-slate-900 mb-1">{c.label}</p>
                <p className="text-xs text-slate-500">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center px-6">
          <h2 className="text-4xl font-black text-white mb-4">
            Ready to modernize your clinic?
          </h2>
          <p className="text-slate-400 text-lg mb-10">
            Sign in as Admin or Doctor to access the live dashboard. Patients get accounts automatically.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login"
              className="btn-glow px-8 py-4 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white rounded-xl font-bold text-lg">
              Sign In
            </Link>
            <Link to="/signup"
              className="px-8 py-4 border-2 border-white/20 text-white rounded-xl font-semibold text-lg hover:bg-white/10 transition-colors">
              Register as Doctor
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center">
              <Stethoscope size={16} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg">VytalAI</span>
          </div>
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} VytalAI. AI-Powered Patient Registration.
          </p>
          <div className="flex items-center gap-6">
            <Link to="/login"  className="text-slate-400 hover:text-white text-sm transition-colors">Sign In</Link>
            <Link to="/signup" className="text-slate-400 hover:text-white text-sm transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
