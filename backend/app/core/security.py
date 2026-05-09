"""
FlexiSpace — Security Utilities
JWT creation/verification and OTP hashing via bcrypt.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import get_settings

settings = get_settings()

# ── Password / OTP Hashing ────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_otp(otp: str) -> str:
    """Hash a 6-digit OTP code with bcrypt."""
    return pwd_context.hash(otp)


def verify_otp(plain_otp: str, hashed_otp: str) -> bool:
    """Verify a plain OTP against its bcrypt hash."""
    return pwd_context.verify(plain_otp, hashed_otp)


# ── JWT Token Creation ────────────────────────────────────────

def create_access_token(user_id: UUID, extra_claims: Optional[dict] = None) -> str:
    """Create a JWT access token (7-day expiry by default)."""
    expire = datetime.now(timezone.utc) + timedelta(days=settings.access_token_expire_days)
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: UUID) -> str:
    """Create a JWT refresh token (30-day expiry by default)."""
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "type": "refresh",
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_email_verification_token(user_id: UUID, email: str) -> str:
    """Create a short-lived JWT for email verification (24h)."""
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
        "type": "email_verification",
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


# ── JWT Token Verification ────────────────────────────────────

def decode_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT token.
    Returns the payload dict on success, None on any failure.
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except JWTError:
        return None


def verify_access_token(token: str) -> Optional[str]:
    """
    Verify an access token and return the user_id (sub) string.
    Returns None if invalid or expired.
    """
    payload = decode_token(token)
    if payload is None:
        return None
    if payload.get("type") != "access":
        return None
    return payload.get("sub")


def verify_refresh_token(token: str) -> Optional[str]:
    """
    Verify a refresh token and return the user_id (sub) string.
    Returns None if invalid or expired.
    """
    payload = decode_token(token)
    if payload is None:
        return None
    if payload.get("type") != "refresh":
        return None
    return payload.get("sub")


def verify_email_token(token: str) -> Optional[dict]:
    """
    Verify an email-verification token.
    Returns {"user_id": ..., "email": ...} or None.
    """
    payload = decode_token(token)
    if payload is None:
        return None
    if payload.get("type") != "email_verification":
        return None
    user_id = payload.get("sub")
    email = payload.get("email")
    if not user_id or not email:
        return None
    return {"user_id": user_id, "email": email}
