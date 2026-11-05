"""Auth routes — login (all roles), doctor self-signup, patient self-signup, profile, change-password."""
import hmac
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from config.settings import USERS_COLLECTION, DOCTOR_SIGNUP_CODE
from database.connection import get_db
from middleware.auth import get_current_user
from models.user import Token, UserCreate, UserLogin, UserResponse
from services.auth_service import (
    create_access_token,
    hash_password,
    verify_password,
)
from services.patient_service import save_patient_record

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


class ChangePasswordBody(BaseModel):
    old_password: str
    new_password: str


class PatientSignupBody(BaseModel):
    """Manual patient self-registration payload."""
    name: str
    age: str
    gender: str
    contact: str
    address: Optional[str] = ""
    reason: Optional[str] = ""
    medicalHistory: Optional[str] = ""
    emergencyContact: Optional[str] = ""
    appointmentPreference: Optional[str] = ""
    password: Optional[str] = None   # if omitted → defaults to contact number


# ---------------------------------------------------------------------------
# Login — works for Admin, Doctor, and Patient
# ---------------------------------------------------------------------------
@router.post("/login")
async def login(body: UserLogin, db=Depends(get_db)):
    email = body.email.strip().lower()
    user = await db[USERS_COLLECTION].find_one({"email": email})

    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled.")

    token = create_access_token({"sub": user["email"], "role": user["role"]})
    logger.info(f"🔑 Login: {user['email']} ({user['role']})")

    return {
        "access_token": token,
        "token_type":   "bearer",
        "first_login":  user.get("first_login", False),   # ← frontend uses this to redirect
        "user": {
            "email":     user["email"],
            "full_name": user.get("full_name", ""),
            "role":      user["role"],
            "specialty": user.get("specialty"),
        },
    }


# ---------------------------------------------------------------------------
# Doctor self-registration
# ---------------------------------------------------------------------------
@router.post("/signup/doctor", status_code=status.HTTP_201_CREATED)
async def doctor_signup(body: UserCreate, db=Depends(get_db)):
    """Doctors can create their own account. Admins are seeded at startup."""
    if DOCTOR_SIGNUP_CODE and not hmac.compare_digest(
        (body.invite_code or "").encode(), DOCTOR_SIGNUP_CODE.encode()
    ):
        raise HTTPException(status_code=403, detail="Invalid or missing invite code.")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    email = body.email.strip().lower()
    existing = await db[USERS_COLLECTION].find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")

    user_doc = {
        "email":           email,
        "hashed_password": hash_password(body.password),
        "full_name":       body.full_name,
        "role":            "doctor",
        "specialty":       body.specialty,
        "is_active":       True,
        "first_login":     False,
        "created_at":      datetime.utcnow(),
    }
    await db[USERS_COLLECTION].insert_one(user_doc)
    logger.info(f"👨‍⚕️ Doctor registered: {email}")
    return {"message": "Doctor account created. Please log in."}


# ---------------------------------------------------------------------------
# Patient self-registration (manual form — no voice agent required)
# ---------------------------------------------------------------------------
@router.post("/signup/patient", status_code=status.HTTP_201_CREATED)
async def patient_signup(body: PatientSignupBody, db=Depends(get_db)):
    """
    Manual patient registration — mirrors the webhook pipeline schema.
    Creates:
      1. A patient_registrations document
      2. A users document with role='patient', first_login=True
    Returns generated credentials so the UI can display them.
    """
    # --- Validate ---
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Name is required.")
    if not body.contact.strip():
        raise HTTPException(status_code=400, detail="Contact number is required.")
    if len(body.contact.strip()) < 10:
        raise HTTPException(status_code=400, detail="Contact must be at least 10 digits.")
    if not body.age.strip():
        raise HTTPException(status_code=400, detail="Age is required.")

    # --- Derive credentials (same formula as webhook) ---
    contact  = body.contact.strip()
    name     = body.name.strip().lower().replace(" ", "")
    last4    = contact[-4:] if len(contact) >= 4 else contact
    email    = f"{name}.{last4}@patient.vytalai"
    password = (body.password.strip() if body.password and body.password.strip()
                else contact)

    # --- Duplicate guard ---
    existing = await db[USERS_COLLECTION].find_one({"email": email})
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"An account for this name + contact already exists. Email: {email}",
        )

    # --- Build patient record (matches webhook schema) ---
    patient_record = {
        "name":                  body.name.strip(),
        "age":                   body.age.strip(),
        "gender":                body.gender.strip(),
        "contact":               contact,
        "address":               body.address or "",
        "reason":                body.reason or "",
        "medicalHistory":        body.medicalHistory or "",
        "emergencyContact":      body.emergencyContact or "",
        "appointmentPreference": body.appointmentPreference or "",
        "conversationId":        None,
        "transcript":            [],
        "transcriptSummary":     "",
        "callDuration":          None,
        "createdAt":             datetime.utcnow(),
        "status":                "registered",
        "registrationMethod":    "manual",   # differentiates from voice
    }

    # --- Persist patient record ---
    patient_db_id = await save_patient_record(db, patient_record)
    logger.info(f"📋 Manual patient record created | _id: {patient_db_id}")

    # --- Create user account ---
    user_doc = {
        "email":             email,
        "hashed_password":   hash_password(password),
        "full_name":         body.name.strip(),
        "role":              "patient",
        "is_active":         True,
        "first_login":       True,
        "patient_record_id": patient_db_id,
        "created_at":        datetime.utcnow(),
    }
    await db[USERS_COLLECTION].insert_one(user_doc)
    logger.info(f"👤 Manual patient account created | email: {email}")

    return {
        "message":  "Patient account created successfully.",
        "email":    email,
        "password": password,
        "name":     body.name.strip(),
    }


# ---------------------------------------------------------------------------
# Change password (patient forced first-login reset, anyone can call it)
# ---------------------------------------------------------------------------
@router.post("/change-password")
async def change_password(
    body: ChangePasswordBody,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    if not verify_password(body.old_password, current_user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")

    await db[USERS_COLLECTION].update_one(
        {"email": current_user["email"]},
        {"$set": {
            "hashed_password": hash_password(body.new_password),
            "first_login":     False,              # clear the flag
        }}
    )
    logger.info(f"🔐 Password changed: {current_user['email']}")
    return {"message": "Password updated successfully."}


# ---------------------------------------------------------------------------
# Current user profile
# ---------------------------------------------------------------------------
@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        email=current_user["email"],
        full_name=current_user.get("full_name", ""),
        role=current_user["role"],
        specialty=current_user.get("specialty"),
    )

