"""Central settings — reads all environment variables in one place."""
from dotenv import load_dotenv
import os

load_dotenv()


def _csv(name: str, default: str = "") -> list[str]:
    return [v.strip().rstrip("/") for v in os.getenv(name, default).split(",") if v.strip()]


# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------
ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").lower()
IS_PRODUCTION: bool = ENVIRONMENT == "production"

# ---------------------------------------------------------------------------
# MongoDB
# ---------------------------------------------------------------------------
MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME: str = os.getenv("DB_NAME", "vytalai")
PATIENTS_COLLECTION: str = "patient_registrations"
USERS_COLLECTION: str = "users"

# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------
_DEFAULT_JWT_SECRET = "change-this-in-production-please"
JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", _DEFAULT_JWT_SECRET)
JWT_ALGORITHM: str = "HS256"
JWT_EXPIRE_HOURS: int = int(os.getenv("JWT_EXPIRE_HOURS", "8"))

# ---------------------------------------------------------------------------
# Default Admin (seeded on first startup)
# ---------------------------------------------------------------------------
_DEFAULT_ADMIN_PASSWORD = "Admin@VytalAI123"
ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@vytalai.com").strip().lower()
ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", _DEFAULT_ADMIN_PASSWORD)
ADMIN_FULL_NAME: str = os.getenv("ADMIN_FULL_NAME", "System Administrator")

# ---------------------------------------------------------------------------
# CORS — comma-separated list of allowed frontend origins
#   e.g. FRONTEND_ORIGINS=https://vytalai.vercel.app,https://www.vytalai.com
# ---------------------------------------------------------------------------
FRONTEND_ORIGINS: list[str] = _csv(
    "FRONTEND_ORIGINS", "http://localhost:5173,http://localhost:3000"
)

# ---------------------------------------------------------------------------
# ElevenLabs webhook signing secret (optional but strongly recommended).
# When set, every request to /webhook/elevenlabs must carry a valid
# `ElevenLabs-Signature` header.
# ---------------------------------------------------------------------------
ELEVENLABS_WEBHOOK_SECRET: str = os.getenv("ELEVENLABS_WEBHOOK_SECRET", "")

# ---------------------------------------------------------------------------
# Doctor sign-up invite code (optional). If set, doctors must supply it.
# ---------------------------------------------------------------------------
DOCTOR_SIGNUP_CODE: str = os.getenv("DOCTOR_SIGNUP_CODE", "")


def validate_production_settings() -> None:
    """Refuse to boot in production with insecure defaults."""
    if not IS_PRODUCTION:
        return
    problems = []
    if JWT_SECRET_KEY == _DEFAULT_JWT_SECRET or len(JWT_SECRET_KEY) < 32:
        problems.append("JWT_SECRET_KEY must be set to a random string of 32+ characters")
    if ADMIN_PASSWORD == _DEFAULT_ADMIN_PASSWORD:
        problems.append("ADMIN_PASSWORD must be changed from the default")
    if MONGO_URI.startswith("mongodb://localhost"):
        problems.append("MONGO_URI points at localhost (use MongoDB Atlas or another hosted DB)")
    if problems:
        raise RuntimeError("Insecure production configuration: " + "; ".join(problems))
