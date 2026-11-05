/**
 * AdminDashboard — complete hospital overview with doctor assignment.
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Stethoscope, ClipboardList, Activity, LogOut,
  RefreshCw, UserCheck, Download, Clock, AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { adminApi } from "../services/api";
import { useWebSocket } from "../hooks/useWebSocket";

const STATUS_COLORS = {
  registered:        "bg-blue-100 text-blue-700",
  admitted:          "bg-amber-100 text-amber-700",
  "under observation": "bg-purple-100 text-purple-700",
  discharged:        "bg-green-100 text-green-700",
};

function StatCard({ icon, label, value, color }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border p-6 ${color}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="p-2.5 rounded-xl bg-current/10">{icon}</span>
      </div>
      <p className="text-3xl font-black text-slate-900 mb-1">{value ?? "—"}</p>
      <p className="text-sm text-slate-500 font-medium">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout }                 = useAuth();
  const navigate                         = useNavigate();
  const { latestPatient, wsConnected }   = useWebSocket();

  const [tab,           setTab]          = useState("patients");
  const [stats,         setStats]        = useState(null);
  const [patients,      setPatients]     = useState([]);
  const [doctors,       setDoctors]      = useState([]);
  const [pending,       setPending]      = useState([]);
  const [loading,       setLoading]      = useState(false);
  const [assigningId,   setAssigningId]  = useState(null);   // patient _id being assigned
  const [selectedDoc,   setSelectedDoc]  = useState({});     // { [patientId]: doctorId }
  const [assignMsg,     setAssignMsg]    = useState({});      // { [patientId]: message }
  const [newCount,      setNewCount]     = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, patientsRes, doctorsRes, pendingRes] = await Promise.all([
        adminApi.stats(),
        adminApi.allPatients(200),
        adminApi.allDoctors(),
        adminApi.pendingCases(),
      ]);
      setStats(statsRes);
      setPatients(patientsRes.patients || []);
      setDoctors(doctorsRes.doctors || []);
      setPending(pendingRes.patients || []);
    } catch (err) {
      console.error("Admin load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // New patient via WebSocket
  useEffect(() => {
    if (!latestPatient) return;
    setNewCount((n) => n + 1);
    setPatients((prev) => [latestPatient, ...prev]);
    setPending((prev) => [latestPatient, ...prev]);
    setStats((s) => s ? { ...s, total_patients: (s.total_patients || 0) + 1, pending_assignment: (s.pending_assignment || 0) + 1 } : s);
  }, [latestPatient]);

  const handleAssign = async (patientId) => {
    const doctorId = selectedDoc[patientId];
    if (!doctorId) { setAssignMsg((m) => ({ ...m, [patientId]: "Select a doctor first." })); return; }
    setAssigningId(patientId);
    try {
      const res = await adminApi.assignDoctor(patientId, doctorId);
      setAssignMsg((m) => ({ ...m, [patientId]: `✅ ${res.doctor_name}` }));
      // Update local state
      const drName = res.doctor_name;
      const updater = (list) => list.map((p) =>
        p._id === patientId ? { ...p, assigned_doctor_id: doctorId, assigned_doctor_name: drName } : p
      );
      setPatients(updater);
      setPending((prev) => prev.filter((p) => p._id !== patientId));
      setStats((s) => s ? { ...s, pending_assignment: Math.max(0, (s.pending_assignment || 1) - 1) } : s);
    } catch (err) {
      setAssignMsg((m) => ({ ...m, [patientId]: `❌ ${err.message}` }));
    } finally {
      setAssigningId(null);
    }
  };

  const downloadCSV = () => {
    if (!patients.length) return;
    const headers = ["Name","Age","Gender","Contact","Reason","Status","Assigned Doctor","Date"];
    const rows = patients.map((p) => [
      p.name, p.age, p.gender, p.contact, p.reason, p.status,
      p.assigned_doctor_name || "Unassigned",
      p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "",
    ].map((f) => `"${String(f ?? "").replace(/"/g, '""')}"`));
    const blob = new Blob([[headers.join(","), ...rows.map((r) => r.join(","))].join("\n")], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "VytalAI_Patients.csv", style: "display:none" });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const TABS = [
    { key: "patients", label: "All Patients",    icon: <Users size={16} /> },
    { key: "pending",  label: `Pending (${stats?.pending_assignment ?? 0})`, icon: <Clock size={16} /> },
    { key: "doctors",  label: "Doctors",          icon: <Stethoscope size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
              <Activity size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-black text-xl text-slate-900">Admin Dashboard</h1>
              <p className="text-xs text-slate-400">VytalAI Hospital Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {newCount > 0 && (
              <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full animate-pulse">
                +{newCount} new
              </span>
            )}
            <div className={`flex items-center gap-1.5 text-xs ${wsConnected ? "text-emerald-600" : "text-slate-400"}`}>
              <span className={`w-2 h-2 rounded-full ${wsConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
              Live
            </div>
            <button onClick={loadData} disabled={loading}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={downloadCSV}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-semibold">
              <Download size={15} /> Export CSV
            </button>
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                {user?.full_name?.charAt(0) || "A"}
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Users size={20} className="text-blue-600" />}     label="Total Patients"    value={stats?.total_patients}    color="border-blue-100" />
          <StatCard icon={<Stethoscope size={20} className="text-violet-600" />} label="Doctors"      value={stats?.total_doctors}     color="border-violet-100" />
          <StatCard icon={<Clock size={20} className="text-amber-600" />}    label="Pending Assignment" value={stats?.pending_assignment} color="border-amber-100" />
          <StatCard icon={<UserCheck size={20} className="text-emerald-600" />} label="Discharged"   value={stats?.discharged}        color="border-emerald-100" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1.5 mb-6 w-fit shadow-sm">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === t.key ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md" : "text-slate-500 hover:text-slate-800"
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── All Patients ────────────────────────────────────────── */}
        {tab === "patients" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800">All Patients ({patients.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Name","Age","Contact","Reason","Status","Assigned Doctor","Registered"].map((h) => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p, i) => (
                    <tr key={p._id || i} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800">{p.name || "—"}</td>
                      <td className="py-3 px-4 text-slate-600">{p.age || "—"}</td>
                      <td className="py-3 px-4 text-slate-600">{p.contact || "—"}</td>
                      <td className="py-3 px-4 text-slate-600 max-w-[160px] truncate">{p.reason || "—"}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[p.status] || "bg-slate-100 text-slate-600"}`}>
                          {p.status || "registered"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{p.assigned_doctor_name || <span className="text-amber-600 text-xs font-medium">Unassigned</span>}</td>
                      <td className="py-3 px-4 text-slate-400 text-xs">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!patients.length && (
                <p className="text-center text-slate-400 py-12">No patients registered yet.</p>
              )}
            </div>
          </div>
        )}

        {/* ── Pending (Assign Doctor) ─────────────────────────────── */}
        {tab === "pending" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Patients Needing Doctor Assignment ({pending.length})</h2>
              <p className="text-xs text-slate-400 mt-1">Select a doctor and click Assign for each patient.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Patient","Age","Contact","Reason","Assign",""].map((h) => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pending.map((p, i) => (
                    <tr key={p._id || i} className="border-b border-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-800">{p.name || "—"}</td>
                      <td className="py-3 px-4 text-slate-600">{p.age || "—"}</td>
                      <td className="py-3 px-4 text-slate-600">{p.contact || "—"}</td>
                      <td className="py-3 px-4 text-slate-600 max-w-[140px] truncate">{p.reason || "—"}</td>
                      <td className="py-3 px-4">
                        <select
                          value={selectedDoc[p._id] || ""}
                          onChange={(e) => setSelectedDoc((s) => ({ ...s, [p._id]: e.target.value }))}
                          className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
                        >
                          <option value="">— Select Doctor —</option>
                          {doctors.map((d) => (
                            <option key={d._id} value={d._id}>{d.full_name}{d.specialty ? ` (${d.specialty})` : ""}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAssign(p._id)}
                            disabled={assigningId === p._id}
                            className="px-3 py-1.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg text-xs font-bold hover:from-rose-600 hover:to-pink-700 transition-all disabled:opacity-50 flex items-center gap-1"
                          >
                            {assigningId === p._id
                              ? <span className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full" />
                              : <UserCheck size={13} />}
                            Assign
                          </button>
                          {assignMsg[p._id] && (
                            <span className="text-xs text-emerald-600 font-medium">{assignMsg[p._id]}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!pending.length && (
                <div className="text-center py-12">
                  <UserCheck size={40} className="text-emerald-400 mx-auto mb-3" />
                  <p className="text-slate-400">All patients have been assigned a doctor. 🎉</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Doctors ─────────────────────────────────────────────── */}
        {tab === "doctors" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Registered Doctors ({doctors.length})</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {doctors.map((d) => (
                <div key={d._id} className="border border-slate-100 rounded-xl p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-bold">
                      {d.full_name?.charAt(0) || "D"}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{d.full_name}</p>
                      <p className="text-xs text-slate-400">{d.email}</p>
                    </div>
                  </div>
                  {d.specialty && (
                    <span className="text-xs bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full font-medium">
                      {d.specialty}
                    </span>
                  )}
                  <div className={`mt-3 flex items-center gap-1.5 text-xs ${d.is_active ? "text-emerald-600" : "text-slate-400"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${d.is_active ? "bg-emerald-500" : "bg-slate-300"}`} />
                    {d.is_active ? "Active" : "Inactive"}
                  </div>
                </div>
              ))}
              {!doctors.length && (
                <p className="text-slate-400 col-span-3 text-center py-8">No doctors registered yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
