/**
 * api.js — Centralised fetch wrapper.
 * Automatically attaches JWT Bearer token from localStorage.
 */

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");
const BASE_URL = API_BASE_URL;

async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem("vytalai_token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {}),
  };
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...opts,
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new Error("Cannot reach the VytalAI server. Check your connection and try again.");
  }
  // Expired / revoked session → clear it and send the user to the login page
  if (response.status === 401 && token && !path.startsWith("/auth/login") && !opts.headers?.Authorization) {
    localStorage.removeItem("vytalai_token");
    localStorage.removeItem("vytalai_user");
    if (window.location.pathname !== "/login") window.location.assign("/login");
    throw new Error("Your session has expired. Please sign in again.");
  }
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    // FastAPI validation errors come back as a list of {msg, loc}
    const detail = Array.isArray(err.detail)
      ? err.detail.map((d) => d.msg).join("; ")
      : err.detail;
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const authApi = {
  login:          (email, password) =>
    apiFetch("/auth/login", { method: "POST", body: { email, password } }),
  doctorSignup:   (data) =>
    apiFetch("/auth/signup/doctor", { method: "POST", body: data }),
  me:             () => apiFetch("/auth/me"),
  changePassword: (old_password, new_password) =>
    apiFetch("/auth/change-password", { method: "POST", body: { old_password, new_password } }),
};

// ---------------------------------------------------------------------------
// Patient (own record)
// ---------------------------------------------------------------------------
export const patientApi = {
  myRecord:       ()      => apiFetch("/api/my-record"),
  // `token` lets the post-voice-call form authenticate before the patient has logged in
  updateMyRecord: (data, token) =>
    apiFetch("/api/my-record", {
      method: "PATCH", body: data,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  stats:          ()      => apiFetch("/api/stats"),
  // Keep generic list for legacy compat
  list:           (limit = 50) => apiFetch(`/api/patients?limit=${limit}`),
  // Manual patient self-registration (no auth required)
  signup:         (data)  => apiFetch("/auth/signup/patient", { method: "POST", body: data }),
};


// ---------------------------------------------------------------------------
// Doctor
// ---------------------------------------------------------------------------
export const doctorApi = {
  myPatients:   ()           => apiFetch("/doctor/patients"),
  getPatient:   (id)         => apiFetch(`/doctor/patient/${id}`),
  addPrescription: (data)    => apiFetch("/doctor/prescription",   { method: "POST", body: data }),
  updateStatus:    (data)    => apiFetch("/doctor/patient-status", { method: "PUT",  body: data }),
  addReport:       (data)    => apiFetch("/doctor/report",         { method: "PUT",  body: data }),
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export const adminApi = {
  allPatients:  (limit = 100) => apiFetch(`/admin/patients?limit=${limit}`),
  pendingCases: ()             => apiFetch("/admin/pending-cases"),
  allDoctors:   ()             => apiFetch("/admin/doctors"),
  stats:        ()             => apiFetch("/admin/stats"),
  assignDoctor: (patient_id, doctor_id) =>
    apiFetch(`/admin/patient/${patient_id}/assign-doctor`, {
      method: "PUT", body: { patient_id, doctor_id },
    }),
};

export default apiFetch;
