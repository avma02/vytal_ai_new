"""Doctor routes — clinical management, strictly role=doctor only."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from database.connection import get_db
from middleware.auth import require_role
from services.patient_service import (
    get_patients_for_doctor,
    get_patient_by_id,
    add_prescription,
    add_report,
    update_patient_status,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/doctor", tags=["Doctor"])

VALID_STATUSES = {"registered", "admitted", "under observation", "discharged"}


class PrescriptionBody(BaseModel):
    patient_id:   str
    medicines:    str
    dosage:       Optional[str] = None
    instructions: Optional[str] = None


class ReportBody(BaseModel):
    patient_id: str
    title:      str
    findings:   str


class StatusBody(BaseModel):
    patient_id: str
    status:     str


# ---------------------------------------------------------------------------
# GET /doctor/patients — only patients assigned to this doctor
# ---------------------------------------------------------------------------
@router.get("/patients")
async def my_patients(
    current_doctor=Depends(require_role("doctor")),
    db=Depends(get_db),
):
    doctor_id = str(current_doctor["_id"])
    patients = await get_patients_for_doctor(db, doctor_id)
    return {"status": "success", "count": len(patients), "patients": patients}


# ---------------------------------------------------------------------------
# GET /doctor/patient/:id — full record (must be assigned to this doctor)
# ---------------------------------------------------------------------------
@router.get("/patient/{patient_id}")
async def get_patient_detail(
    patient_id: str,
    current_doctor=Depends(require_role("doctor")),
    db=Depends(get_db),
):
    patient = await get_patient_by_id(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    doctor_id = str(current_doctor["_id"])
    if patient.get("assigned_doctor_id") != doctor_id:
        raise HTTPException(status_code=403, detail="This patient is not assigned to you.")

    return {"status": "success", "patient": patient}


# ---------------------------------------------------------------------------
# POST /doctor/prescription
# ---------------------------------------------------------------------------
@router.post("/prescription")
async def add_patient_prescription(
    body: PrescriptionBody,
    current_doctor=Depends(require_role("doctor")),
    db=Depends(get_db),
):
    patient = await get_patient_by_id(db, body.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    doctor_id = str(current_doctor["_id"])
    if patient.get("assigned_doctor_id") != doctor_id:
        raise HTTPException(status_code=403, detail="Not your patient.")

    ok = await add_prescription(
        db, body.patient_id, doctor_id,
        current_doctor.get("full_name", "Doctor"),
        {"medicines": body.medicines, "dosage": body.dosage, "instructions": body.instructions},
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to save prescription.")

    logger.info(f"💊 Prescription added to patient {body.patient_id} by {current_doctor['email']}")
    return {"status": "success", "message": "Prescription added."}


# ---------------------------------------------------------------------------
# PUT /doctor/patient-status
# ---------------------------------------------------------------------------
@router.put("/patient-status")
async def set_patient_status(
    body: StatusBody,
    current_doctor=Depends(require_role("doctor")),
    db=Depends(get_db),
):
    if body.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}"
        )

    patient = await get_patient_by_id(db, body.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    doctor_id = str(current_doctor["_id"])
    if patient.get("assigned_doctor_id") != doctor_id:
        raise HTTPException(status_code=403, detail="Not your patient.")

    ok = await update_patient_status(db, body.patient_id, body.status)
    if not ok:
        raise HTTPException(status_code=500, detail="Status update failed.")

    logger.info(f"🔄 Status → {body.status} | patient {body.patient_id}")
    return {"status": "success", "message": f"Status updated to '{body.status}'."}


# ---------------------------------------------------------------------------
# PUT /doctor/report
# ---------------------------------------------------------------------------
@router.put("/report")
async def add_patient_report(
    body: ReportBody,
    current_doctor=Depends(require_role("doctor")),
    db=Depends(get_db),
):
    patient = await get_patient_by_id(db, body.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    doctor_id = str(current_doctor["_id"])
    if patient.get("assigned_doctor_id") != doctor_id:
        raise HTTPException(status_code=403, detail="Not your patient.")

    ok = await add_report(
        db, body.patient_id, doctor_id,
        current_doctor.get("full_name", "Doctor"),
        {"title": body.title, "findings": body.findings},
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to save report.")

    logger.info(f"📋 Report added to patient {body.patient_id}")
    return {"status": "success", "message": "Report added."}
