/**
 * PatientPortalPage — Patient's personal dashboard.
 *
 * Shows:
 *   - Registration status timeline
 *   - Personal info (read-only) with "Edit Details" toggle
 *   - Inline editable form (PatientRegistrationForm) when in edit mode
 *   - Prescriptions & Reports placeholders
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut, User, Phone, MapPin, Calendar, Stethoscope,
  Clock, FileText, AlertCircle, Loader, Edit3, X, CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { patientApi } from "../services/api";
import PatientRegistrationForm from "../components/PatientRegistrationForm";

const TIMELINE = [
  { key: "registered",  label: "Registered",     desc: "Voice registration completed" },
  { key: "scheduled",   label: "Appointment Set", desc: "Appointment has been scheduled" },
  { key: "visited",     label: "Visit Complete",  desc: "Patient has been seen by doctor" },
];

function InfoCard({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
      <div className="text-indigo-500 mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-sm text-slate-800 font-medium">
          {value || <span className="text-slate-400 italic">Not provided</span>}
        </p>
      </div>
    </div>
  );
}

export default function PatientPortalPage() {
  const { user, logout }    = useAuth();
  const navigate            = useNavigate();
  const [record,    setRecord]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  // Edit mode state
  const [editing,      setEditing]      = useState(false);
  const [saveLoading,  setSaveLoading]  = useState(false);
  const [saveError,    setSaveError]    = useState("");
  const [saveSuccess,  setSaveSuccess]  = useState(false);

  const fetchRecord = () => {
    setLoading(true);
    setError("");
    patientApi.myRecord()
      .then((d) => setRecord(d.patient))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRecord(); }, []);

  const handleLogout = () => { logout(); navigate("/"); };

  const handleSave = async (formData) => {
    setSaveLoading(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      const res = await patientApi.updateMyRecord(formData);
      setRecord(res.patient);      // update in-place from server response
      setSaveSuccess(true);
      setEditing(false);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      setSaveError(err.message || "Failed to update. Please try again.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setSaveError("");
  };

  const currentStep = record?.status === "visited"  ? 2
                    : record?.status === "scheduled" ? 1
                    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center">
            <Stethoscope size={18} className="text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-lg">VytalAI</span>
            <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              Patient Portal
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-white text-sm font-semibold">{user?.full_name}</p>
            <p className="text-slate-400 text-xs">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">

        {/* ── Welcome ──────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">
            Welcome, {user?.full_name?.split(" ")[0]} 👋
          </h1>
          <p className="text-slate-400">Here's your medical registration summary.</p>
        </div>

        {/* ── Global save success toast ────────────────────────────────────── */}
        {saveSuccess && (
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30
                          text-emerald-400 p-4 rounded-2xl mb-6 animate-fade-in">
            <CheckCircle2 size={20} />
            <p className="font-semibold text-sm">Your details have been updated successfully!</p>
          </div>
        )}

        {/* ── Loading ──────────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader size={32} className="text-cyan-400 animate-spin" />
          </div>
        )}

        {/* ── Fetch error ──────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-400 p-5 rounded-2xl">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && record && (
          <div className="space-y-6">

            {/* ── Status Timeline ──────────────────────────────────────────── */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur">
              <h2 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                <Clock size={20} className="text-cyan-400" /> Registration Status
              </h2>
              <div className="flex items-start gap-0">
                {TIMELINE.map((step, i) => (
                  <div key={step.key} className="flex-1 flex flex-col items-center text-center">
                    <div className="flex items-center w-full">
                      {i > 0 && (
                        <div className={`flex-1 h-0.5 ${i <= currentStep ? "bg-cyan-500" : "bg-white/10"}`} />
                      )}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm
                        ${i < currentStep  ? "bg-cyan-500 text-white" :
                          i === currentStep ? "bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400" :
                                              "bg-white/5 border border-white/10 text-slate-500"}`}>
                        {i < currentStep ? "✓" : i + 1}
                      </div>
                      {i < TIMELINE.length - 1 && (
                        <div className={`flex-1 h-0.5 ${i < currentStep ? "bg-cyan-500" : "bg-white/10"}`} />
                      )}
                    </div>
                    <p className={`text-xs font-semibold mt-2 ${i <= currentStep ? "text-white" : "text-slate-500"}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Personal Info (view / edit) ──────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Card header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
                <h2 className="text-slate-900 font-bold text-lg flex items-center gap-2">
                  <User size={20} className="text-indigo-600" /> Personal Information
                </h2>
                {!editing ? (
                  <button
                    id="portal-edit-btn"
                    onClick={() => { setEditing(true); setSaveError(""); }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100
                               text-indigo-600 rounded-xl text-sm font-semibold transition-colors"
                  >
                    <Edit3 size={15} /> Edit Details
                  </button>
                ) : (
                  <button
                    id="portal-cancel-btn"
                    onClick={handleCancelEdit}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200
                               text-slate-600 rounded-xl text-sm font-semibold transition-colors"
                  >
                    <X size={15} /> Cancel
                  </button>
                )}
              </div>

              <div className="p-6">
                {/* ── Read-only view ──────────────────────────────────────── */}
                {!editing && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoCard icon={<User size={16} />}     label="Full Name"  value={record.name}    />
                    <InfoCard icon={<User size={16} />}     label="Age"        value={record.age}     />
                    <InfoCard icon={<User size={16} />}     label="Gender"     value={record.gender}  />
                    <InfoCard icon={<Phone size={16} />}    label="Contact"    value={record.contact} />
                    <div className="sm:col-span-2">
                      <InfoCard icon={<MapPin size={16} />} label="Address"    value={record.address} />
                    </div>
                  </div>
                )}

                {/* ── Edit form ────────────────────────────────────────────── */}
                {editing && (
                  <div>
                    {saveError && (
                      <div className="flex items-start gap-3 bg-red-50 border border-red-200
                                      text-red-700 p-4 rounded-xl mb-5 text-sm">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <p>{saveError}</p>
                      </div>
                    )}
                    <PatientRegistrationForm
                      initialData={record}
                      onSubmit={handleSave}
                      loading={saveLoading}
                      submitLabel="Save Changes"
                      showPassword={false}
                      mode="edit"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Visit Info ───────────────────────────────────────────────── */}
            {!editing && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-slate-900 font-bold text-lg mb-5 flex items-center gap-2">
                  <FileText size={20} className="text-indigo-600" /> Visit Details
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoCard icon={<Stethoscope size={16} />} label="Reason for Visit"
                    value={record.reason} />
                  <InfoCard icon={<Stethoscope size={16} />} label="Assigned Doctor"
                    value={record.assigned_doctor_name || "Pending Assignment"} />
                  <InfoCard icon={<Calendar size={16} />}    label="Appointment Preference"
                    value={record.appointmentPreference} />
                  <InfoCard icon={<Phone size={16} />}       label="Emergency Contact"
                    value={record.emergencyContact} />
                </div>
              </div>
            )}

            {/* ── Medical History ──────────────────────────────────────────── */}
            {!editing && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-slate-900 font-bold text-lg mb-4 flex items-center gap-2">
                  <FileText size={20} className="text-indigo-600" /> Medical History
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {record.medicalHistory || (
                    <span className="text-slate-400 italic">No prior medical history on record.</span>
                  )}
                </p>
              </div>
            )}

            {/* ── Prescriptions / Reports ──────────────────────────────────── */}
            {!editing && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {["Prescriptions", "Reports"].map((section) => (
                  <div key={section}
                    className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center backdrop-blur">
                    <FileText size={32} className="text-slate-500 mx-auto mb-3" />
                    <p className="text-white font-semibold mb-1">{section}</p>
                    <p className="text-slate-400 text-sm">
                      No {section.toLowerCase()} yet. Check back after your visit.
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* ── Footer timestamp ─────────────────────────────────────────── */}
            {!editing && (
              <p className="text-center text-slate-500 text-xs">
                Registered{record.registrationMethod === "manual" ? " via manual form" : " via AI voice"} on{" "}
                {record.createdAt ? new Date(record.createdAt).toLocaleString() : "—"}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
