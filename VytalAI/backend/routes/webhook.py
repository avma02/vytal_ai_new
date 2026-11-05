"""ElevenLabs post-call webhook — verified, saved, account created, pushed live."""
import hashlib
import hmac
import json
import logging
import time
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Request

from config.settings import ELEVENLABS_WEBHOOK_SECRET
from database.connection import get_db
from services.patient_service import save_patient_record, create_patient_account
from routes.websocket import manager

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Webhooks"])

SIGNATURE_TOLERANCE_SECS = 30 * 60


def verify_signature(raw_body: bytes, header: Optional[str]) -> bool:
    """
    Verify the `ElevenLabs-Signature` header: "t=<unix ts>,v0=<hex hmac>"
    where hmac = HMAC-SHA256(secret, f"{t}.{raw_body}").
    """
    if not header:
        return False
    try:
        parts = dict(p.split("=", 1) for p in header.split(","))
        ts, sig = parts["t"], parts["v0"]
        if abs(time.time() - int(ts)) > SIGNATURE_TOLERANCE_SECS:
            return False
    except (KeyError, ValueError):
        return False
    expected = hmac.new(
        ELEVENLABS_WEBHOOK_SECRET.encode(), f"{ts}.".encode() + raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, sig)


def _value(results: dict, *keys: str) -> str:
    """First non-empty `.value` among possible field names (ElevenLabs may add trailing spaces)."""
    for k in keys:
        v = (results.get(k) or {}).get("value")
        if v not in (None, ""):
            return v
    return ""


@router.post("/webhook/elevenlabs")
async def receive_elevenlabs_webhook(request: Request):
    """
    STEP 0 → Verify signature (when ELEVENLABS_WEBHOOK_SECRET is configured)
    STEP 1 → Receive payload
    STEP 2 → Extract data_collection_results
    STEP 3 → Save patient record to MongoDB
    STEP 4 → Auto-create patient user account
    STEP 5 → Push to admins + (only) the caller's own browser session
    """
    raw = await request.body()

    if ELEVENLABS_WEBHOOK_SECRET:
        if not verify_signature(raw, request.headers.get("elevenlabs-signature")):
            logger.warning("🚫 Webhook rejected: bad or missing signature")
            raise HTTPException(status_code=401, detail="Invalid webhook signature.")
    else:
        logger.warning("⚠️  ELEVENLABS_WEBHOOK_SECRET not set — webhook is unauthenticated")

    try:
        payload = json.loads(raw or b"{}")
        data = payload.get("data", {}) or {}
        conv_id = data.get("conversation_id", "N/A")
        logger.info(f"📡 STEP 1 | Webhook received | conversation_id: {conv_id}")

        # The browser passes a random session id as a dynamic variable on the widget;
        # ElevenLabs echoes it back here so we can deliver the result to that browser only.
        session_id = (
            (data.get("conversation_initiation_client_data") or {})
            .get("dynamic_variables", {})
            .get("session_id")
        )

        results = (data.get("analysis") or {}).get("data_collection_results")
        if not results:
            logger.info("ℹ️  STEP 2 | No data_collection_results — nothing to save")
            return {"status": "success", "message": "Webhook received (no structured data)"}

        now = datetime.utcnow()
        patient_record = {
            "name":    _value(results, "Name"),
            "age":     _value(results, "Age"),
            "gender":  _value(results, "Gender"),
            "contact": _value(results, "Contact"),
            "address": _value(results, "Address", "Address "),
            "reason":                _value(results, "Reason"),
            "medicalHistory":        _value(results, "Previous Medical History"),
            "emergencyContact":      _value(results, "Emergency Contact"),
            "appointmentPreference": _value(results, "Appointment Preference"),
            "conversationId":    conv_id,
            "transcript":        data.get("transcript", []),
            "transcriptSummary": (data.get("analysis") or {}).get("transcript_summary", ""),
            "callDuration":      (data.get("metadata") or {}).get("call_duration_secs"),
            "createdAt":         now,
            "status":            "registered",
            "registrationMethod": "voice",
        }

        db = get_db()
        patient_db_id = await save_patient_record(db, patient_record)
        credentials = await create_patient_account(db, patient_record, patient_db_id)
        logger.info(
            f"✅ STEP 4 | Account {'existed' if credentials['already_existed'] else 'created'} "
            f"| {credentials['email']}"
        )

        ws_patient = {
            **{k: v for k, v in patient_record.items() if k != "_id"},
            "createdAt": now.isoformat(),
            "_id": patient_db_id,
        }
        event = {
            "type": "new_patient",
            "patient": ws_patient,
            "credentials": {"email": credentials["email"], "isNew": not credentials["already_existed"]},
        }
        admins = await manager.send_to_admins(event)
        caller = await manager.send_to_session(session_id, event) if session_id else 0
        logger.info(f"✅ STEP 5 | Pushed to {admins} admin(s), {caller} caller session(s)")

        return {"status": "success", "message": "Patient registered"}

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"❌ Webhook error: {exc}", exc_info=True)
        # Return 500 so ElevenLabs retries instead of silently losing the registration
        raise HTTPException(status_code=500, detail="Webhook processing failed.")
