"""Patient record service — MongoDB CRUD, account creation, and clinical updates."""
import logging
from datetime import datetime
from typing import Optional

from bson import ObjectId

from config.settings import PATIENTS_COLLECTION, USERS_COLLECTION
from services.auth_service import hash_password

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Save new patient record
# ---------------------------------------------------------------------------
async def save_patient_record(db, record: dict) -> str:
    result = await db[PATIENTS_COLLECTION].insert_one(record)
    _id = str(result.inserted_id)
    logger.info(f"💾 Patient record saved | _id: {_id}")
    return _id


# ---------------------------------------------------------------------------
# Auto-create patient user account (called by webhook)
# ---------------------------------------------------------------------------
async def create_patient_account(db, record: dict, patient_db_id: str) -> dict:
    """
    Credentials:
      username (email) → {name}.{last4_contact}@patient.vytalai
      password         → contact number (patient changes on first login)
    Returns dict with credentials + already_existed flag.
    """
    contact  = str(record.get("contact", "")).strip()
    name     = str(record.get("name", "patient")).strip().lower().replace(" ", "")
    last4    = contact[-4:] if len(contact) >= 4 else contact
    email    = f"{name}.{last4}@patient.vytalai"
    password = contact if contact else "VytalAI@Patient"

    existing = await db[USERS_COLLECTION].find_one({"email": email})
    if existing:
        logger.info(f"👤 Patient account already exists: {email}")
        return {"email": email, "password": password, "already_existed": True}

    user_doc = {
        "email":             email,
        "hashed_password":   hash_password(password),
        "full_name":         record.get("name", "Patient"),
        "role":              "patient",
        "is_active":         True,
        "first_login":       True,          # ← forced password reset on first login
        "patient_record_id": patient_db_id,
        "created_at":        datetime.utcnow(),
    }
    await db[USERS_COLLECTION].insert_one(user_doc)
    logger.info(f"👤 Patient account created | email: {email}")
    logger.info(f"🔑 Credentials → email: {email}  password: {password}")
    logger.info("   ⚠️  Patient must change password on first login.")

    return {"email": email, "password": password, "already_existed": False}


# ---------------------------------------------------------------------------
# Read — general queries
# ---------------------------------------------------------------------------
async def get_all_patients(db, limit: int = 50) -> list:
    patients = []
    async for p in db[PATIENTS_COLLECTION].find().sort("createdAt", -1).limit(limit):
        p["_id"] = str(p["_id"])
        if "assigned_doctor_id" in p:
            p["assigned_doctor_id"] = str(p["assigned_doctor_id"])
        patients.append(p)
    return patients


async def get_pending_patients(db, limit: int = 100) -> list:
    """Patients not yet assigned a doctor."""
    patients = []
    async for p in db[PATIENTS_COLLECTION].find(
        {"assigned_doctor_id": {"$exists": False}}
    ).sort("createdAt", -1).limit(limit):
        p["_id"] = str(p["_id"])
        if "assigned_doctor_id" in p:
            p["assigned_doctor_id"] = str(p["assigned_doctor_id"])
        patients.append(p)
    return patients


async def get_patients_for_doctor(db, doctor_id: str) -> list:
    """Patients whose assigned_doctor_id matches this doctor's user _id."""
    patients = []
    try:
        oid = ObjectId(doctor_id)
    except Exception:
        return []
    async for p in db[PATIENTS_COLLECTION].find(
        {"assigned_doctor_id": oid}
    ).sort("createdAt", -1):
        p["_id"] = str(p["_id"])
        p["assigned_doctor_id"] = str(p["assigned_doctor_id"])
        patients.append(p)
    return patients


async def get_patient_by_conversation_id(db, conversation_id: str) -> Optional[dict]:
    p = await db[PATIENTS_COLLECTION].find_one({"conversationId": conversation_id})
    if p:
        p["_id"] = str(p["_id"])
        if "assigned_doctor_id" in p:
            p["assigned_doctor_id"] = str(p["assigned_doctor_id"])
    return p


async def get_patient_by_id(db, patient_id: str) -> Optional[dict]:
    try:
        p = await db[PATIENTS_COLLECTION].find_one({"_id": ObjectId(patient_id)})
        if p:
            p["_id"] = str(p["_id"])
            if "assigned_doctor_id" in p:
                p["assigned_doctor_id"] = str(p["assigned_doctor_id"])
        return p
    except Exception:
        return None


async def get_patient_by_record_id(db, patient_record_id: str) -> Optional[dict]:
    try:
        p = await db[PATIENTS_COLLECTION].find_one({"_id": ObjectId(patient_record_id)})
        if p:
            p["_id"] = str(p["_id"])
            if "assigned_doctor_id" in p:
                p["assigned_doctor_id"] = str(p["assigned_doctor_id"])
        return p
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Admin — assign doctor
# ---------------------------------------------------------------------------
async def assign_doctor_to_patient(db, patient_id: str, doctor_id: str, doctor_name: str) -> bool:
    try:
        result = await db[PATIENTS_COLLECTION].update_one(
            {"_id": ObjectId(patient_id)},
            {"$set": {
                "assigned_doctor_id":   ObjectId(doctor_id),
                "assigned_doctor_name": doctor_name,
                "updatedAt":            datetime.utcnow(),
            }}
        )
        return result.matched_count > 0
    except Exception as e:
        logger.error(f"assign_doctor error: {e}")
        return False


# ---------------------------------------------------------------------------
# Doctor — clinical updates
# ---------------------------------------------------------------------------
async def add_prescription(db, patient_id: str, doctor_id: str, doctor_name: str, prescription: dict) -> bool:
    try:
        entry = {
            "_id":         str(ObjectId()),
            "doctor_id":   doctor_id,
            "doctor_name": doctor_name,
            "medicines":   prescription.get("medicines", ""),
            "dosage":      prescription.get("dosage", ""),
            "instructions": prescription.get("instructions", ""),
            "created_at":  datetime.utcnow().isoformat(),
        }
        result = await db[PATIENTS_COLLECTION].update_one(
            {"_id": ObjectId(patient_id)},
            {"$push": {"prescriptions": entry}, "$set": {"updatedAt": datetime.utcnow()}}
        )
        return result.matched_count > 0
    except Exception as e:
        logger.error(f"add_prescription error: {e}")
        return False


async def add_report(db, patient_id: str, doctor_id: str, doctor_name: str, report: dict) -> bool:
    try:
        entry = {
            "_id":         str(ObjectId()),
            "doctor_id":   doctor_id,
            "doctor_name": doctor_name,
            "title":       report.get("title", ""),
            "findings":    report.get("findings", ""),
            "created_at":  datetime.utcnow().isoformat(),
        }
        result = await db[PATIENTS_COLLECTION].update_one(
            {"_id": ObjectId(patient_id)},
            {"$push": {"reports": entry}, "$set": {"updatedAt": datetime.utcnow()}}
        )
        return result.matched_count > 0
    except Exception as e:
        logger.error(f"add_report error: {e}")
        return False


async def update_patient_status(db, patient_id: str, status: str) -> bool:
    try:
        result = await db[PATIENTS_COLLECTION].update_one(
            {"_id": ObjectId(patient_id)},
            {"$set": {"status": status, "updatedAt": datetime.utcnow()}}
        )
        return result.matched_count > 0
    except Exception as e:
        logger.error(f"update_status error: {e}")
        return False


# ---------------------------------------------------------------------------
# Patient self-update (personal info only)
# ---------------------------------------------------------------------------
_EDITABLE_FIELDS = {
    "name", "age", "gender", "contact", "address",
    "reason", "medicalHistory", "emergencyContact", "appointmentPreference",
}

async def update_patient_personal_info(
    db,
    patient_id: str,
    updates: dict,
    user_email: str | None = None,
) -> Optional[dict]:
    """
    Allow a patient to update their own personal registration fields.
    Clinical / system fields are blocked via the whitelist.
    If `name` changes we also sync `full_name` in the linked user document.
    """
    safe = {k: v for k, v in updates.items() if k in _EDITABLE_FIELDS}
    if not safe:
        return None

    safe["updatedAt"] = datetime.utcnow()

    try:
        result = await db[PATIENTS_COLLECTION].find_one_and_update(
            {"_id": ObjectId(patient_id)},
            {"$set": safe},
            return_document=True,
        )
        if result:
            result["_id"] = str(result["_id"])
            if "assigned_doctor_id" in result:
                result["assigned_doctor_id"] = str(result["assigned_doctor_id"])

        # Sync full_name in the users collection when name changes
        if user_email and "name" in safe:
            await db[USERS_COLLECTION].update_one(
                {"email": user_email},
                {"$set": {"full_name": safe["name"]}},
            )
            logger.info(f"👤 Synced full_name for {user_email} → {safe['name']}")

        return result
    except Exception as e:
        logger.error(f"update_patient_personal_info error: {e}")
        return None
