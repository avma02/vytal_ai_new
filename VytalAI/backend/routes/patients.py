"""Patient routes — protected by JWT + RBAC."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from config.settings import PATIENTS_COLLECTION, USERS_COLLECTION
from database.connection import get_db
from middleware.auth import require_role, get_current_user
from services.patient_service import (
    get_all_patients,
    get_patient_by_conversation_id,
    get_patient_by_record_id,
    update_patient_personal_info,
)

router = APIRouter(prefix="/api", tags=["Patients"])


class PatientUpdateBody(BaseModel):
    """Editable patient fields (all optional for partial updates)."""
    name:                  Optional[str] = None
    age:                   Optional[str] = None
    gender:                Optional[str] = None
    contact:               Optional[str] = None
    address:               Optional[str] = None
    reason:                Optional[str] = None
    medicalHistory:        Optional[str] = None
    emergencyContact:      Optional[str] = None
    appointmentPreference: Optional[str] = None


# ---------------------------------------------------------------------------
# Admin only — full patient list (doctors use /doctor/patients: assigned only)
# ---------------------------------------------------------------------------
@router.get("/patients")
async def list_patients(
    limit: int = Query(default=50, le=500),
    current_user=Depends(require_role("admin")),
    db=Depends(get_db),
):
    patients = await get_all_patients(db, limit)
    return {"status": "success", "count": len(patients), "patients": patients}


@router.get("/patients/{conversation_id}")
async def get_patient(
    conversation_id: str,
    current_user=Depends(require_role("admin")),
    db=Depends(get_db),
):
    patient = await get_patient_by_conversation_id(db, conversation_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    return {"status": "success", "patient": patient}


# ---------------------------------------------------------------------------
# Patient — view their own record only
# ---------------------------------------------------------------------------
@router.get("/my-record")
async def get_my_record(
    current_user=Depends(require_role("patient")),
    db=Depends(get_db),
):
    """Patient portal: returns the registration record linked to this account."""
    record_id = current_user.get("patient_record_id")
    if not record_id:
        raise HTTPException(status_code=404, detail="No linked patient record found.")

    patient = await get_patient_by_record_id(db, record_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found.")
    return {"status": "success", "patient": patient}


# ---------------------------------------------------------------------------
# Patient — update their own personal info
# ---------------------------------------------------------------------------
@router.patch("/my-record")
async def update_my_record(
    body: PatientUpdateBody,
    current_user=Depends(require_role("patient")),
    db=Depends(get_db),
):
    """
    Patient self-update: only whitelisted personal fields can be changed.
    Clinical fields (prescriptions, reports, status, assigned_doctor) are
    read-only from the patient's perspective.
    """
    record_id = current_user.get("patient_record_id")
    if not record_id:
        raise HTTPException(status_code=404, detail="No linked patient record found.")

    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update.")

    updated = await update_patient_personal_info(
        db,
        patient_id=record_id,
        updates=updates,
        user_email=current_user.get("email"),
    )
    if not updated:
        raise HTTPException(
            status_code=400,
            detail="No valid fields to update, or record not found.",
        )

    return {"status": "success", "patient": updated}


# ---------------------------------------------------------------------------
# Stats — admin + doctor
# ---------------------------------------------------------------------------
@router.get("/stats")
async def get_stats(
    current_user=Depends(require_role("admin", "doctor")),
    db=Depends(get_db),
):
    total_patients = await db[PATIENTS_COLLECTION].count_documents({})
    total_users    = await db[USERS_COLLECTION].count_documents({})
    doctors        = await db[USERS_COLLECTION].count_documents({"role": "doctor"})
    return {
        "database":       "connected",
        "total_patients": total_patients,
        "total_users":    total_users,
        "total_doctors":  doctors,
    }
