"""Pydantic models for User — registration, login, and response shapes."""
from pydantic import BaseModel
from typing import Optional


class UserCreate(BaseModel):
    """Used for doctor self-registration."""
    email: str
    password: str
    full_name: str
    specialty: Optional[str] = None   # e.g. "Cardiology"
    invite_code: Optional[str] = None # required only if DOCTOR_SIGNUP_CODE is set


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    """Safe user representation returned to the client (no password)."""
    email: str
    full_name: str
    role: str                          # "admin" | "doctor" | "patient"
    specialty: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
