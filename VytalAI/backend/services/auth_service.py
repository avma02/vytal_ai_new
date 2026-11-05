"""Auth service — password hashing (bcrypt), JWT, admin seeding."""
import logging
from datetime import datetime, timedelta

import bcrypt
from jose import JWTError, jwt

from config.settings import (
    JWT_SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRE_HOURS,
    ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULL_NAME,
    USERS_COLLECTION,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Password hashing — bcrypt directly (no passlib dependency)
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------

def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Raises jose.JWTError on invalid / expired token."""
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])


# ---------------------------------------------------------------------------
# Admin seeding — runs once at startup
# ---------------------------------------------------------------------------

async def seed_admin(db) -> None:
    users = db[USERS_COLLECTION]
    existing = await users.find_one({"email": ADMIN_EMAIL})

    if existing:
        logger.info(f"🔐 Admin exists: {ADMIN_EMAIL}")
        return

    await users.insert_one({
        "email":           ADMIN_EMAIL,
        "hashed_password": hash_password(ADMIN_PASSWORD),
        "full_name":       ADMIN_FULL_NAME,
        "role":            "admin",
        "is_active":       True,
        "created_at":      datetime.utcnow(),
    })
    logger.info(f"🔐 Admin seeded: {ADMIN_EMAIL}")
    logger.warning("   Change ADMIN_PASSWORD in .env before deploying!")
