"""
End-to-end API tests against an in-memory MongoDB (mongomock-motor).

    pip install -r requirements-dev.txt
    pytest -q
"""
import hashlib
import hmac
import json
import time

import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient
from starlette.websockets import WebSocketDisconnect

import database.connection as conn
from routes import webhook as webhook_module

ADMIN = ("admin@vytalai.com", "Admin@VytalAI123")


@pytest.fixture()
def client(monkeypatch):
    # Swap the real Mongo client for an in-memory one before the app's lifespan runs
    monkeypatch.setattr(conn, "AsyncIOMotorClient", AsyncMongoMockClient)
    from main import app
    with TestClient(app) as c:
        yield c


def login(c, email, password):
    r = c.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def make_doctor(c, email="dr.who@hospital.com", name="Dr Who"):
    r = c.post("/auth/signup/doctor", json={"email": email, "password": "secret1", "full_name": name})
    assert r.status_code == 201, r.text
    return login(c, email, "secret1")


def voice_payload(name="Asha Rao", contact="9876543210", session_id=None, conv="conv_1"):
    data = {
        "conversation_id": conv,
        "transcript": [{"role": "agent", "message": "hi"}],
        "analysis": {
            "transcript_summary": "Fever for two days",
            "data_collection_results": {
                "Name": {"value": name}, "Age": {"value": "34"}, "Gender": {"value": "Female"},
                "Contact": {"value": contact}, "Address ": {"value": "Indore"},
                "Reason": {"value": "Fever"},
            },
        },
        "metadata": {"call_duration_secs": 61},
    }
    if session_id:
        data["conversation_initiation_client_data"] = {"dynamic_variables": {"session_id": session_id}}
    return {"type": "post_call_transcription", "data": data}


# ---------------------------------------------------------------------------
def test_health_and_admin_login(client):
    assert client.get("/health").json() == {"status": "ok"}
    tok = login(client, *ADMIN)
    r = client.get("/admin/stats", headers=auth(tok))
    assert r.status_code == 200 and r.json()["total_patients"] == 0


def test_login_is_case_insensitive_on_email(client):
    login(client, "Admin@VytalAI.com", ADMIN[1])


def test_wrong_password_rejected(client):
    assert client.post("/auth/login", json={"email": ADMIN[0], "password": "nope"}).status_code == 401


def test_patient_manual_signup_forces_password_change(client):
    r = client.post("/auth/signup/patient", json={
        "name": "Ravi Kumar", "age": "40", "gender": "Male", "contact": "9000012345"})
    assert r.status_code == 201
    creds = r.json()
    assert creds["email"] == "ravikumar.2345@patient.vytalai"
    login_res = client.post("/auth/login", json={"email": creds["email"], "password": creds["password"]})
    assert login_res.json()["first_login"] is True


def test_doctor_cannot_list_all_patients(client):
    doc = make_doctor(client)
    assert client.get("/api/patients", headers=auth(doc)).status_code == 403
    assert client.get("/doctor/patients", headers=auth(doc)).json()["count"] == 0


def test_doctor_invite_code_enforced(client, monkeypatch):
    from routes import auth as auth_routes
    monkeypatch.setattr(auth_routes, "DOCTOR_SIGNUP_CODE", "HOSP-2026")
    body = {"email": "x@h.com", "password": "secret1", "full_name": "X"}
    assert client.post("/auth/signup/doctor", json=body).status_code == 403
    assert client.post("/auth/signup/doctor", json={**body, "invite_code": "HOSP-2026"}).status_code == 201


def test_webhook_creates_patient_and_account(client):
    r = client.post("/webhook/elevenlabs", json=voice_payload())
    assert r.status_code == 200 and r.json()["status"] == "success"
    admin = login(client, *ADMIN)
    pts = client.get("/admin/patients", headers=auth(admin)).json()["patients"]
    assert len(pts) == 1 and pts[0]["name"] == "Asha Rao" and pts[0]["address"] == "Indore"
    # auto-created patient can log in with phone number as the temporary password
    login(client, "asharao.3210@patient.vytalai", "9876543210")


def test_unauthenticated_endpoints_are_gone(client):
    assert client.get("/api/get-latest-webhook").status_code == 404


def test_webhook_signature_enforced_when_secret_set(client, monkeypatch):
    monkeypatch.setattr(webhook_module, "ELEVENLABS_WEBHOOK_SECRET", "whsec_test")
    body = json.dumps(voice_payload()).encode()
    assert client.post("/webhook/elevenlabs", content=body).status_code == 401

    ts = str(int(time.time()))
    sig = hmac.new(b"whsec_test", f"{ts}.".encode() + body, hashlib.sha256).hexdigest()
    ok = client.post("/webhook/elevenlabs", content=body,
                     headers={"ElevenLabs-Signature": f"t={ts},v0={sig}"})
    assert ok.status_code == 200

    stale = str(int(time.time()) - 3 * 3600)
    sig2 = hmac.new(b"whsec_test", f"{stale}.".encode() + body, hashlib.sha256).hexdigest()
    assert client.post("/webhook/elevenlabs", content=body,
                       headers={"ElevenLabs-Signature": f"t={stale},v0={sig2}"}).status_code == 401


def test_assign_then_doctor_workflow(client):
    client.post("/webhook/elevenlabs", json=voice_payload())
    admin = login(client, *ADMIN)
    doc = make_doctor(client)

    patient_id = client.get("/admin/pending-cases", headers=auth(admin)).json()["patients"][0]["_id"]
    doctor_id = client.get("/admin/doctors", headers=auth(admin)).json()["doctors"][0]["_id"]

    # doctor can't touch an unassigned patient
    r = client.post("/doctor/prescription", headers=auth(doc),
                    json={"patient_id": patient_id, "medicines": "Paracetamol"})
    assert r.status_code == 403

    assign = lambda: client.put(f"/admin/patient/{patient_id}/assign-doctor", headers=auth(admin),
                                json={"patient_id": patient_id, "doctor_id": doctor_id})
    assert assign().status_code == 200
    assert assign().status_code == 200          # re-assigning the same doctor must not 500

    assert client.post("/doctor/prescription", headers=auth(doc),
                       json={"patient_id": patient_id, "medicines": "Paracetamol 500mg"}).status_code == 200
    for _ in range(2):                           # same status twice must not 500
        assert client.put("/doctor/patient-status", headers=auth(doc),
                          json={"patient_id": patient_id, "status": "admitted"}).status_code == 200
    assert client.put("/doctor/patient-status", headers=auth(doc),
                      json={"patient_id": patient_id, "status": "bogus"}).status_code == 400

    detail = client.get(f"/doctor/patient/{patient_id}", headers=auth(doc)).json()["patient"]
    assert detail["status"] == "admitted" and len(detail["prescriptions"]) == 1


def test_patient_can_only_edit_own_record(client):
    r = client.post("/auth/signup/patient", json={
        "name": "Mina Shah", "age": "29", "gender": "Female", "contact": "9111122222"}).json()
    tok = login(client, r["email"], r["password"])
    up = client.patch("/api/my-record", headers=auth(tok), json={"address": "Bhopal", "status": "discharged"})
    assert up.status_code == 200
    rec = up.json()["patient"]
    assert rec["address"] == "Bhopal" and rec["status"] == "registered"   # clinical field ignored
    assert client.get("/admin/patients", headers=auth(tok)).status_code == 403


# ---------------------------- WebSocket access rules ----------------------------
def test_ws_refuses_anonymous_and_bad_tokens(client):
    for url in ("/ws/updates", "/ws/updates?token=garbage", "/ws/updates?session=short"):
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(url) as ws:
                ws.receive_json()


def test_ws_patient_token_refused(client):
    r = client.post("/auth/signup/patient", json={
        "name": "Pat Ient", "age": "50", "gender": "Male", "contact": "9222233333"}).json()
    tok = login(client, r["email"], r["password"])
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"/ws/updates?token={tok}") as ws:
            ws.receive_json()


def test_ws_registration_only_reaches_admin_and_own_session(client):
    admin = login(client, *ADMIN)
    mine, other = "s" + "a" * 20, "s" + "b" * 20
    with client.websocket_connect(f"/ws/updates?token={admin}") as ws_admin, \
         client.websocket_connect(f"/ws/updates?session={mine}") as ws_mine, \
         client.websocket_connect(f"/ws/updates?session={other}") as ws_other:
        for w in (ws_admin, ws_mine, ws_other):
            assert w.receive_json()["type"] == "connected"

        client.post("/webhook/elevenlabs", json=voice_payload(session_id=mine))

        assert ws_admin.receive_json()["patient"]["name"] == "Asha Rao"
        assert ws_mine.receive_json()["patient"]["name"] == "Asha Rao"

        # `other` must have received nothing: prove it by sending a ping and getting only the pong
        ws_other.send_text("ping")
        assert ws_other.receive_text() == "pong"


def test_ws_doctor_notified_on_assignment(client):
    client.post("/webhook/elevenlabs", json=voice_payload())
    admin = login(client, *ADMIN)
    doc = make_doctor(client)
    pid = client.get("/admin/pending-cases", headers=auth(admin)).json()["patients"][0]["_id"]
    did = client.get("/admin/doctors", headers=auth(admin)).json()["doctors"][0]["_id"]
    with client.websocket_connect(f"/ws/updates?token={doc}") as ws:
        assert ws.receive_json()["type"] == "connected"
        client.put(f"/admin/patient/{pid}/assign-doctor", headers=auth(admin),
                   json={"patient_id": pid, "doctor_id": did})
        assert ws.receive_json() == {"type": "patient_assigned", "patient_id": pid}
