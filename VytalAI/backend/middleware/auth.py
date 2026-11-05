"""Auth middleware — FastAPI dependencies for JWT validation and RBAC."""
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError

from services.auth_service import decode_access_token
from database.connection import get_db
from config.settings import USERS_COLLECTION

logger = logging.getLogger(__name__)

_bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db=Depends(get_db),
) -> dict:
    """Extract and validate JWT; return the user document from MongoDB."""
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(credentials.credentials)
        email: str = payload.get("sub")
        if not email:
            raise exc
    except JWTError:
        raise exc

    user = await db[USERS_COLLECTION].find_one({"email": email})
    if not user or not user.get("is_active", True):
        raise exc

    return user


def require_role(*roles: str):
    """
    Dependency factory — verifies the authenticated user has one of the
    given roles. Usage:

        @router.get("/admin-only")
        async def admin_view(user=Depends(require_role("admin"))):
            ...
    """
    async def _check(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(roles)}.",
            )
        return current_user
    return _check
