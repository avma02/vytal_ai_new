"""Admin routes — hospital-wide management, strictly role=admin only."""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from config.settings import PATIENTS_COLLECTION, USERS_COLLECTION
from database.connection import get_db
from middleware.auth import require_role
from routes.websocket import manager
from services.patient_service import (
    get_all_patients,
    get_pending_patients,
    assign_doctor_to_patient,
    get_patient_by_id,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin"])


class AssignDoctorBody(BaseModel):
    patient_id: str
    doctor_id:  str


# ---------------------------------------------------------------------------
# GET /admin/patients — all patients (paginated)
# ---------------------------------------------------------------------------
@router.get("/patients")
async def all_patients(
    limit: int = Query(default=50, le=500),
    _=Depends(require_role("admin")),
    db=Depends(get_db),
):
    patients = await get_all_patients(db, limit)
    return {"status": "success", "count": len(patients), "patients": patients}


# ---------------------------------------------------------------------------
# GET /admin/pending-cases — not yet assigned to a doctor
# ---------------------------------------------------------------------------
@router.get("/pending-cases")
async def pending_cases(
    _=Depends(require_role("admin")),
    db=Depends(get_db),
):
    patients = await get_pending_patients(db)
    return {"status": "success", "count": len(patients), "patients": patients}


# ---------------------------------------------------------------------------
# GET /admin/doctors — all doctor accounts
# ---------------------------------------------------------------------------
@router.get("/doctors")
async def all_doctors(
    _=Depends(require_role("admin")),
    db=Depends(get_db),
):
    doctors = []
    async for d in db[USERS_COLLECTION].find({"role": "doctor"}):
        doctors.append({
            "_id":       str(d["_id"]),
            "full_name": d.get("full_name", ""),
            "email":     d.get("email", ""),
            "specialty": d.get("specialty"),
            "is_active": d.get("is_active", True),
            "created_at": d.get("created_at", "").isoformat() if d.get("created_at") else "",
        })
    return {"status": "success", "count": len(doctors), "doctors": doctors}


# ---------------------------------------------------------------------------
# PUT /admin/patient/:id/assign-doctor  — hard-link doctor to patient
# ---------------------------------------------------------------------------
@router.put("/patient/{patient_id}/assign-doctor")
async def assign_doctor(
    patient_id: str,
    body: AssignDoctorBody,
    _=Depends(require_role("admin")),
    db=Depends(get_db),
):
    if patient_id != body.patient_id:
        raise HTTPException(status_code=400, detail="patient_id mismatch.")

    # Verify doctor exists
    from bson import ObjectId
    try:
        doctor = await db[USERS_COLLECTION].find_one({
            "_id": ObjectId(body.doctor_id), "role": "doctor"
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid doctor_id format.")

    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    ok = await assign_doctor_to_patient(
        db, patient_id, body.doctor_id,
        doctor.get("full_name", "Doctor")
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Assignment failed.")

    logger.info(f"👩‍⚕️ Doctor {doctor['email']} assigned to patient {patient_id}")
    # Live-notify that doctor's open dashboard (if any)
    await manager.send_to_user(body.doctor_id, {"type": "patient_assigned", "patient_id": patient_id})
    return {
        "status":      "success",
        "message":     f"Patient assigned to Dr. {doctor.get('full_name')}",
        "doctor_name": doctor.get("full_name"),
    }


# ---------------------------------------------------------------------------
# GET /admin/stats — full system overview
# ---------------------------------------------------------------------------
@router.get("/stats")
async def admin_stats(
    _=Depends(require_role("admin")),
    db=Depends(get_db),
):
    total_patients  = await db[PATIENTS_COLLECTION].count_documents({})
    total_doctors   = await db[USERS_COLLECTION].count_documents({"role": "doctor"})
    total_patients_users = await db[USERS_COLLECTION].count_documents({"role": "patient"})
    pending         = await db[PATIENTS_COLLECTION].count_documents(
        {"assigned_doctor_id": {"$exists": False}}
    )
    admitted        = await db[PATIENTS_COLLECTION].count_documents({"status": "admitted"})
    discharged      = await db[PATIENTS_COLLECTION].count_documents({"status": "discharged"})

    return {
        "total_patients":       total_patients,
        "total_doctors":        total_doctors,
        "total_patient_users":  total_patients_users,
        "pending_assignment":   pending,
        "admitted":             admitted,
        "discharged":           discharged,
    }
