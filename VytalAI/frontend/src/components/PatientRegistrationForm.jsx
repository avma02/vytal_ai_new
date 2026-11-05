/**
 * PatientRegistrationForm — Reusable form used by both:
 *   - Manual signup tab (VoiceRegisterPage)
 *   - Edit Details panel (PatientPortalPage)
 *
 * Props:
 *   initialData  {object}   — pre-fill values (from voice WS or existing record)
 *   onSubmit     {fn}       — called with formData on submit
 *   loading      {bool}     — disables submit + shows spinner
 *   submitLabel  {string}   — button text
 *   showPassword {bool}     — whether to show the optional password field (signup only)
 *   mode         {string}   — "signup" | "edit"
 */
import React, { useState, useEffect } from "react";
import {
  User, Phone, MapPin, Stethoscope, Calendar,
  Heart, AlertCircle, Eye, EyeOff, Loader2, Save,
} from "lucide-react";

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
const APPOINTMENT_PREFS = [
  "Morning (9AM–12PM)",
  "Afternoon (12PM–4PM)",
  "Evening (4PM–7PM)",
  "Any time",
];

function Field({ label, icon, error, children }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
        <span className="text-indigo-500">{icon}</span>
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}

const inputCls =
  "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 " +
  "focus:border-transparent transition-all";

export default function PatientRegistrationForm({
  initialData = {},
  onSubmit,
  loading = false,
  submitLabel = "Save",
  showPassword = false,
  mode = "edit",
}) {
  const [form, setForm] = useState({
    name:                  "",
    age:                   "",
    gender:                "",
    contact:               "",
    address:               "",
    reason:                "",
    medicalHistory:        "",
    emergencyContact:      "",
    appointmentPreference: "",
    password:              "",
    ...initialData,
  });
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);

  // Re-populate when initialData changes (voice WS fires after call)
  useEffect(() => {
    if (initialData && Object.keys(initialData).length) {
      setForm((prev) => ({ ...prev, ...initialData }));
    }
  }, [JSON.stringify(initialData)]);

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.name.trim())    errs.name    = "Full name is required.";
    if (!form.age.trim())     errs.age     = "Age is required.";
    if (!form.gender)         errs.gender  = "Please select a gender.";
    if (!form.contact.trim()) errs.contact = "Contact number is required.";
    else if (form.contact.trim().length < 10)
      errs.contact = "Must be at least 10 digits.";
    if (!form.reason.trim())  errs.reason  = "Reason for visit is required.";
    if (showPassword && form.password && form.password.length < 6)
      errs.password = "Password must be at least 6 characters.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = { ...form };
    if (!showPassword) delete payload.password;
    if (!payload.password) delete payload.password; // omit blank
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Row: Name + Age */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full Name" icon={<User size={12} />} error={errors.name}>
          <input
            id="prf-name"
            type="text"
            placeholder="e.g. Rahul Sharma"
            className={inputCls}
            value={form.name}
            onChange={set("name")}
            disabled={loading}
          />
        </Field>

        <Field label="Age" icon={<User size={12} />} error={errors.age}>
          <input
            id="prf-age"
            type="text"
            placeholder="e.g. 28"
            className={inputCls}
            value={form.age}
            onChange={set("age")}
            disabled={loading}
          />
        </Field>
      </div>

      {/* Row: Gender + Contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Gender" icon={<User size={12} />} error={errors.gender}>
          <select
            id="prf-gender"
            className={inputCls}
            value={form.gender}
            onChange={set("gender")}
            disabled={loading}
          >
            <option value="">Select gender…</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </Field>

        <Field label="Contact Number" icon={<Phone size={12} />} error={errors.contact}>
          <input
            id="prf-contact"
            type="tel"
            placeholder="10-digit mobile number"
            className={inputCls}
            value={form.contact}
            onChange={set("contact")}
            disabled={loading}
          />
        </Field>
      </div>

      {/* Address */}
      <Field label="Address" icon={<MapPin size={12} />} error={errors.address}>
        <input
          id="prf-address"
          type="text"
          placeholder="Street, city, state…"
          className={inputCls}
          value={form.address}
          onChange={set("address")}
          disabled={loading}
        />
      </Field>

      {/* Reason for visit */}
      <Field label="Reason for Visit" icon={<Stethoscope size={12} />} error={errors.reason}>
        <input
          id="prf-reason"
          type="text"
          placeholder="e.g. Fever and cough for 3 days"
          className={inputCls}
          value={form.reason}
          onChange={set("reason")}
          disabled={loading}
        />
      </Field>

      {/* Medical History */}
      <Field label="Previous Medical History" icon={<Heart size={12} />} error={errors.medicalHistory}>
        <textarea
          id="prf-history"
          rows={3}
          placeholder="Any past surgeries, chronic conditions, allergies…"
          className={inputCls + " resize-none"}
          value={form.medicalHistory}
          onChange={set("medicalHistory")}
          disabled={loading}
        />
      </Field>

      {/* Row: Emergency contact + Appointment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Emergency Contact" icon={<Phone size={12} />} error={errors.emergencyContact}>
          <input
            id="prf-emergency"
            type="text"
            placeholder="Name & number"
            className={inputCls}
            value={form.emergencyContact}
            onChange={set("emergencyContact")}
            disabled={loading}
          />
        </Field>

        <Field label="Appointment Preference" icon={<Calendar size={12} />} error={errors.appointmentPreference}>
          <select
            id="prf-appt"
            className={inputCls}
            value={form.appointmentPreference}
            onChange={set("appointmentPreference")}
            disabled={loading}
          >
            <option value="">Select preference…</option>
            {APPOINTMENT_PREFS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* Optional Password (signup only) */}
      {showPassword && (
        <Field label="Password (optional)" icon={<Eye size={12} />} error={errors.password}>
          <div className="relative">
            <input
              id="prf-password"
              type={showPass ? "text" : "password"}
              placeholder="Leave blank to use your phone number"
              className={inputCls + " pr-12"}
              value={form.password}
              onChange={set("password")}
              disabled={loading}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onClick={() => setShowPass((p) => !p)}
              tabIndex={-1}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {showPassword && (
            <p className="text-xs text-slate-400 mt-1">
              If blank, your password will be your contact number.
            </p>
          )}
        </Field>
      )}

      {/* Submit */}
      <button
        id="prf-submit"
        type="submit"
        disabled={loading}
        className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl
                   font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30
                   hover:from-indigo-700 hover:to-purple-700 transition-all hover:-translate-y-0.5
                   disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
      >
        {loading ? (
          <><Loader2 size={18} className="animate-spin" /> Processing…</>
        ) : (
          <><Save size={18} /> {submitLabel}</>
        )}
      </button>
    </form>
  );
}
