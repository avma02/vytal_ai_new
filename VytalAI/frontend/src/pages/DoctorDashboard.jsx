/**
 * DoctorDashboard — clinical workspace for assigned patients.
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Stethoscope, LogOut, RefreshCw, User, ChevronDown, ChevronUp,
  Plus, FileText, Activity, Users, Bell,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { doctorApi } from "../services/api";
import { useWebSocket } from "../hooks/useWebSocket";

const STATUS_OPTIONS = ["registered", "admitted", "under observation", "discharged"];
const STATUS_STYLES = {
  registered:          "bg-blue-100 text-blue-700 border-blue-200",
  admitted:            "bg-amber-100 text-amber-700 border-amber-200",
  "under observation": "bg-purple-100 text-purple-700 border-purple-200",
  discharged:          "bg-green-100 text-green-700 border-green-200",
};

function Section({ title, icon, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left">
        <span className="flex items-center gap-2 font-bold text-slate-700 text-sm">{icon}{title}</span>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

function PatientCard({ patient, doctors, onRefresh }) {
  const [saving,      setSaving]      = useState(false);
  const [statusVal,   setStatusVal]   = useState(patient.status || "registered");
  const [rxMeds,      setRxMeds]      = useState("");
  const [rxDose,      setRxDose]      = useState("");
  const [rxNote,      setRxNote]      = useState("");
  const [rpTitle,     setRpTitle]     = useState("");
  const [rpFindings,  setRpFindings]  = useState("");
  const [msg,         setMsg]         = useState("");
  const [err,         setErr]         = useState("");

  const flash = (m, e = false) => {
    if (e) setErr(m); else setMsg(m);
    setTimeout(() => { setMsg(""); setErr(""); }, 3000);
  };

  const submitStatus = async () => {
    setSaving(true);
    try {
      await doctorApi.updateStatus({ patient_id: patient._id, status: statusVal });
      flash(`✅ Status updated to "${statusVal}"`);
      onRefresh();
    } catch (e) { flash(e.message, true); } finally { setSaving(false); }
  };

  const submitRx = async (e) => {
    e.preventDefault();
    if (!rxMeds.trim()) { flash("Enter at least medicine name.", true); return; }
    setSaving(true);
    try {
      await doctorApi.addPrescription({ patient_id: patient._id, medicines: rxMeds, dosage: rxDose, instructions: rxNote });
      flash("✅ Prescription saved.");
      setRxMeds(""); setRxDose(""); setRxNote("");
      onRefresh();
    } catch (e) { flash(e.message, true); } finally { setSaving(false); }
  };

  const submitReport = async (e) => {
    e.preventDefault();
    if (!rpTitle.trim() || !rpFindings.trim()) { flash("Fill title and findings.", true); return; }
    setSaving(true);
    try {
      await doctorApi.addReport({ patient_id: patient._id, title: rpTitle, findings: rpFindings });
      flash("✅ Report saved.");
      setRpTitle(""); setRpFindings("");
      onRefresh();
    } catch (e) { flash(e.message, true); } finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Patient header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-100 px-6 py-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-black text-lg">
              {patient.name?.charAt(0) || "P"}
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg">{patient.name}</h3>
              <p className="text-slate-500 text-sm">{patient.age} yrs • {patient.gender} • {patient.contact}</p>
            </div>
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${STATUS_STYLES[patient.status] || STATUS_STYLES.registered}`}>
            {patient.status || "registered"}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Feedback */}
        {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg text-sm font-medium">{msg}</div>}
        {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm font-medium">{err}</div>}

        {/* Patient info */}
        <Section title="Patient Details" icon={<User size={15} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              ["Reason",    patient.reason],
              ["Address",   patient.address],
              ["Emergency", patient.emergencyContact],
              ["Appointment", patient.appointmentPreference],
              ["Medical History", patient.medicalHistory],
            ].filter(([,v]) => v).map(([k,v]) => (
              <div key={k} className="bg-slate-50 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-0.5">{k}</p>
                <p className="text-slate-700 font-medium">{v}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Update status */}
        <Section title="Update Status" icon={<Activity size={15} />}>
          <div className="flex items-center gap-3 flex-wrap">
            <select value={statusVal} onChange={(e) => setStatusVal(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <button onClick={submitStatus} disabled={saving}
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold text-sm hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-60">
              {saving ? "Saving…" : "Update Status"}
            </button>
          </div>
        </Section>

        {/* Add prescription */}
        <Section title={`Prescriptions (${patient.prescriptions?.length || 0})`} icon={<Plus size={15} />}>
          {/* Existing */}
          {patient.prescriptions?.length > 0 && (
            <div className="space-y-2 mb-4">
              {patient.prescriptions.map((rx) => (
                <div key={rx._id} className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 text-sm">
                  <p className="font-semibold text-indigo-800">{rx.medicines}</p>
                  {rx.dosage && <p className="text-indigo-600 text-xs mt-0.5">Dosage: {rx.dosage}</p>}
                  {rx.instructions && <p className="text-slate-500 text-xs mt-0.5">{rx.instructions}</p>}
                  <p className="text-slate-400 text-xs mt-1">By {rx.doctor_name} · {new Date(rx.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
          {/* New */}
          <form onSubmit={submitRx} className="space-y-3">
            <input value={rxMeds} onChange={(e) => setRxMeds(e.target.value)}
              placeholder="Medicines *" required
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <input value={rxDose} onChange={(e) => setRxDose(e.target.value)}
              placeholder="Dosage (e.g. 500mg twice daily)"
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <textarea value={rxNote} onChange={(e) => setRxNote(e.target.value)}
              placeholder="Instructions / Notes" rows={2}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-semibold text-sm hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60">
              Add Prescription
            </button>
          </form>
        </Section>

        {/* Reports */}
        <Section title={`Reports (${patient.reports?.length || 0})`} icon={<FileText size={15} />}>
          {patient.reports?.length > 0 && (
            <div className="space-y-2 mb-4">
              {patient.reports.map((r) => (
                <div key={r._id} className="bg-purple-50 border border-purple-100 rounded-lg px-4 py-3 text-sm">
                  <p className="font-semibold text-purple-800">{r.title}</p>
                  <p className="text-slate-600 text-xs mt-1">{r.findings}</p>
                  <p className="text-slate-400 text-xs mt-1">By {r.doctor_name} · {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={submitReport} className="space-y-3">
            <input value={rpTitle} onChange={(e) => setRpTitle(e.target.value)}
              placeholder="Report Title *" required
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
            <textarea value={rpFindings} onChange={(e) => setRpFindings(e.target.value)}
              placeholder="Findings / Observations *" rows={3} required
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-violet-700 text-white rounded-lg font-semibold text-sm hover:from-purple-700 hover:to-violet-800 disabled:opacity-60">
              Add Report
            </button>
          </form>
        </Section>
      </div>
    </div>
  );
}

export default function DoctorDashboard() {
  const { user, logout }               = useAuth();
  const navigate                       = useNavigate();
  const { assignedCount, wsConnected } = useWebSocket();
  const [patients,  setPatients]       = useState([]);
  const [loading,   setLoading]        = useState(false);
  const [newBadge,  setNewBadge]       = useState(false);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await doctorApi.myPatients();
      setPatients(res.patients || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  // An admin just assigned a patient to this doctor → refresh the list
  useEffect(() => {
    if (!assignedCount) return;
    setNewBadge(true);
    loadPatients();
  }, [assignedCount, loadPatients]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Stethoscope size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-black text-xl text-slate-900">Doctor Dashboard</h1>
              <p className="text-xs text-slate-400">
                {user?.specialty ? `${user.specialty} · ` : ""}VytalAI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {newBadge && (
              <button onClick={() => { setNewBadge(false); loadPatients(); }}
                className="flex items-center gap-2 bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-200 transition-colors">
                <Bell size={13} className="animate-bounce" /> New patient assigned
              </button>
            )}
            <div className={`flex items-center gap-1.5 text-xs ${wsConnected ? "text-emerald-600" : "text-slate-400"}`}>
              <span className={`w-2 h-2 rounded-full ${wsConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
              Live
            </div>
            <button onClick={loadPatients} disabled={loading}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                {user?.full_name?.charAt(0) || "D"}
              </div>
              <span className="text-sm font-semibold text-slate-700 hidden sm:block">{user?.full_name}</span>
            </div>
            <button onClick={() => { logout(); navigate("/"); }}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Quick stat bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-indigo-100 p-5 shadow-sm">
            <Users size={20} className="text-indigo-600 mb-2" />
            <p className="text-2xl font-black text-slate-900">{patients.length}</p>
            <p className="text-xs text-slate-500 font-medium">My Patients</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-100 p-5 shadow-sm">
            <Activity size={20} className="text-amber-600 mb-2" />
            <p className="text-2xl font-black text-slate-900">
              {patients.filter((p) => p.status === "admitted" || p.status === "under observation").length}
            </p>
            <p className="text-xs text-slate-500 font-medium">Active Cases</p>
          </div>
          <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm">
            <FileText size={20} className="text-emerald-600 mb-2" />
            <p className="text-2xl font-black text-slate-900">
              {patients.reduce((s, p) => s + (p.prescriptions?.length || 0), 0)}
            </p>
            <p className="text-xs text-slate-500 font-medium">Prescriptions Issued</p>
          </div>
        </div>

        {/* Patients */}
        <h2 className="font-black text-slate-900 text-xl mb-4">My Patients</h2>
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          </div>
        ) : patients.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center shadow-sm">
            <Users size={48} className="text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-600 mb-2">No patients assigned yet</h3>
            <p className="text-slate-400 text-sm">The admin will assign patients to you after voice registration.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {patients.map((p) => (
              <PatientCard key={p._id} patient={p} onRefresh={loadPatients} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
