"""
WebSocket manager + endpoint.

Security model (patient data is sensitive, so nothing is broadcast blindly):

  * Staff (admin / doctor) connect with  /ws/updates?token=<JWT>
      - admin   → receives every `new_patient` event
      - doctor  → receives only `patient_assigned` events addressed to them
  * The public voice-registration page connects with
        /ws/updates?session=<random id>
      and receives ONLY the registration that came from its own voice call
      (matched via the `session_id` dynamic variable passed to ElevenLabs).
  * A connection with neither a valid token nor a session id is refused.
"""
import logging
import re
from dataclasses import dataclass, field
from typing import List, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError

from config.settings import USERS_COLLECTION

logger = logging.getLogger(__name__)
router = APIRouter(tags=["WebSocket"])

_SESSION_RE = re.compile(r"^[A-Za-z0-9_-]{16,128}$")


@dataclass
class Client:
    ws: WebSocket
    role: str                      # "admin" | "doctor" | "public"
    user_id: Optional[str] = None  # str(user _id) for staff
    session_id: Optional[str] = None


@dataclass
class ConnectionManager:
    clients: List[Client] = field(default_factory=list)

    async def connect(self, client: Client) -> None:
        await client.ws.accept()
        self.clients.append(client)
        logger.info(f"🔌 WS connected ({client.role}) | total: {len(self.clients)}")

    def disconnect(self, client: Client) -> None:
        if client in self.clients:
            self.clients.remove(client)
        logger.info(f"🔌 WS disconnected ({client.role}) | total: {len(self.clients)}")

    async def _send(self, targets: List[Client], message: dict) -> int:
        dead: List[Client] = []
        sent = 0
        for c in list(targets):
            try:
                await c.ws.send_json(message)
                sent += 1
            except Exception:
                dead.append(c)
        for c in dead:
            self.disconnect(c)
        return sent

    async def send_to_admins(self, message: dict) -> int:
        return await self._send([c for c in self.clients if c.role == "admin"], message)

    async def send_to_session(self, session_id: str, message: dict) -> int:
        return await self._send(
            [c for c in self.clients if c.role == "public" and c.session_id == session_id],
            message,
        )

    async def send_to_user(self, user_id: str, message: dict) -> int:
        return await self._send([c for c in self.clients if c.user_id == user_id], message)

    @property
    def connection_count(self) -> int:
        return len(self.clients)


# Singleton shared across the application
manager = ConnectionManager()


async def _authenticate_staff(token: str) -> Optional[Client]:
    """Validate a JWT and return a staff Client (admin/doctor) or None."""
    from database.connection import _db  # late import: db is created in lifespan
    from services.auth_service import decode_access_token

    if _db is None:
        return None
    try:
        payload = decode_access_token(token)
    except JWTError:
        return None
    email = payload.get("sub")
    if not email:
        return None
    user = await _db[USERS_COLLECTION].find_one({"email": email})
    if not user or not user.get("is_active", True):
        return None
    if user.get("role") not in ("admin", "doctor"):
        return None
    return Client(ws=None, role=user["role"], user_id=str(user["_id"]))  # ws set by caller


@router.websocket("/ws/updates")
async def websocket_endpoint(websocket: WebSocket):
    token = websocket.query_params.get("token")
    session = websocket.query_params.get("session")

    client: Optional[Client] = None
    if token:
        client = await _authenticate_staff(token)
    elif session and _SESSION_RE.match(session):
        client = Client(ws=None, role="public", session_id=session)

    if client is None:
        # Must accept before closing with a custom code on some servers; 1008 = policy violation
        await websocket.close(code=1008)
        return
    client.ws = websocket

    await manager.connect(client)
    try:
        await websocket.send_json({"type": "connected", "role": client.role})
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(client)
