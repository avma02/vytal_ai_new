"""MongoDB connection management with FastAPI lifespan."""
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from config.settings import MONGO_URI, DB_NAME, USERS_COLLECTION, PATIENTS_COLLECTION

logger = logging.getLogger(__name__)

_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


def get_db() -> AsyncIOMotorDatabase:
    """FastAPI dependency — returns the active database instance."""
    if _db is None:
        raise HTTPException(status_code=503, detail="Database not available.")
    return _db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: connect to MongoDB and seed admin. Shutdown: close client."""
    global _client, _db

    # ── Startup ──────────────────────────────────────────────────────────────
    try:
        _client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        await _client.admin.command("ping")
        _db = _client[DB_NAME]

        logger.info("✅ MongoDB connected")
        logger.info(f"📁 Database: {DB_NAME}")

        # Indexes (idempotent). Unique email prevents duplicate accounts under race conditions.
        try:
            await _db[USERS_COLLECTION].create_index("email", unique=True)
            await _db[PATIENTS_COLLECTION].create_index("conversationId")
            await _db[PATIENTS_COLLECTION].create_index("assigned_doctor_id")
        except Exception as idx_exc:
            logger.warning(f"Index creation skipped: {idx_exc}")

        # Seed default admin account on first run
        from services.auth_service import seed_admin
        await seed_admin(_db)

    except Exception as exc:
        logger.error(f"❌ MongoDB connection failed: {exc}")
        _client = None
        _db = None

    yield  # ← application runs here

    # ── Shutdown ─────────────────────────────────────────────────────────────
    if _client:
        _client.close()
        logger.info("👋 MongoDB connection closed")
