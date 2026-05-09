"""
FlexiSpace — Auth Service
Core business logic for OTP generation, verification, user management.
"""

import logging
import secrets
import json
from datetime import datetime, timedelta, timezone
from uuid import UUID
from pathlib import Path

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    create_email_verification_token,
    hash_otp,
    verify_otp,
    verify_refresh_token,
    verify_email_token,
)
from app.models.user import User, OTPToken
from app.services.twilio_service import send_otp_sms
from app.services.email_service import send_email_verification

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Constants ─────────────────────────────────────────────────
OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 5
OTP_MAX_ATTEMPTS = 3
_DEBUG_LOG_PATH = Path(__file__).resolve().parents[3] / "debug-cfe79d.log"


def _debug_log(run_id: str, hypothesis_id: str, location: str, message: str, data: dict) -> None:
    try:
        payload = {
            "sessionId": "cfe79d",
            "runId": run_id,
            "hypothesisId": hypothesis_id,
            "location": location,
            "message": message,
            "data": data,
            "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
        }
        with _DEBUG_LOG_PATH.open("a", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=True) + "\n")
    except Exception:
        pass


def _generate_otp() -> str:
    """Generate a cryptographically secure 6-digit OTP."""
    return "".join(str(secrets.randbelow(10)) for _ in range(OTP_LENGTH))


# ── Send OTP ──────────────────────────────────────────────────

async def send_otp(db: AsyncSession, phone: str) -> dict:
    """
    1. Find or create the user by phone.
    2. Generate a 6-digit OTP, hash it, store in DB.
    3. Send via Twilio SMS.
    Returns {"message": "..."} on success, raises on failure.
    """
    # Find or create user
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(phone=phone, is_phone_verified=False)
        db.add(user)
        await db.flush()
        logger.info(f"Created new user for phone {phone}")

    # Invalidate any existing unused OTP tokens for this user
    existing = await db.execute(
        select(OTPToken).where(
            and_(
                OTPToken.user_id == user.id,
                OTPToken.is_used == False,
            )
        )
    )
    for old_token in existing.scalars().all():
        old_token.is_used = True

    # Generate new OTP
    plain_otp = _generate_otp()
    if settings.node_env == "development":
        plain_otp = "123456"
        _debug_log(
            "baseline",
            "H6",
            "auth_service.py:send_otp:dev_otp",
            "development OTP override active",
            {"phone_suffix": phone[-4:] if phone else None},
        )
    hashed = hash_otp(plain_otp)

    otp_token = OTPToken(
        user_id=user.id,
        otp_code=hashed,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES),
        attempts=0,
        is_used=False,
    )
    db.add(otp_token)
    await db.flush()

    # Send SMS
    sms_sent = await send_otp_sms(phone, plain_otp)
    if not sms_sent:
        _debug_log(
            "baseline",
            "H6",
            "auth_service.py:send_otp:sms_failed",
            "Twilio OTP send failed",
            {"phone_suffix": phone[-4:] if phone else None, "env": settings.node_env},
        )
        if settings.node_env != "development":
            raise Exception("Failed to send OTP via SMS. Please try again.")
        logger.warning(f"Twilio SMS failed in development mode. Use OTP {plain_otp} for {phone}.")
    else:
        _debug_log(
            "baseline",
            "H6",
            "auth_service.py:send_otp:sms_sent",
            "Twilio OTP send succeeded",
            {"phone_suffix": phone[-4:] if phone else None},
        )

    logger.info(f"OTP sent to {phone}")
    return {"message": "OTP sent successfully. Valid for 5 minutes."}


# ── Verify OTP ────────────────────────────────────────────────

async def verify_otp_and_login(db: AsyncSession, phone: str, otp: str) -> dict:
    """
    1. Look up the user by phone.
    2. Find the latest unused, non-expired OTP token.
    3. Verify the OTP hash, enforce max attempts.
    4. Return access + refresh JWT tokens.
    """
    # Find user
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()

    if user is None:
        raise ValueError("No account found for this phone number. Send OTP first.")

    # Find latest valid OTP token
    result = await db.execute(
        select(OTPToken)
        .where(
            and_(
                OTPToken.user_id == user.id,
                OTPToken.is_used == False,
                OTPToken.expires_at > datetime.now(timezone.utc),
            )
        )
        .order_by(OTPToken.created_at.desc())
        .limit(1)
    )
    otp_token = result.scalar_one_or_none()

    if otp_token is None:
        raise ValueError("OTP has expired or was already used. Please request a new one.")

    # Check max attempts
    if otp_token.attempts >= OTP_MAX_ATTEMPTS:
        otp_token.is_used = True
        await db.flush()
        raise ValueError("Maximum OTP attempts exceeded. Please request a new code.")

    # Increment attempts
    otp_token.attempts += 1

    # Verify OTP
    if not verify_otp(otp, otp_token.otp_code):
        remaining = OTP_MAX_ATTEMPTS - otp_token.attempts
        await db.flush()
        raise ValueError(
            f"Invalid OTP code. {remaining} attempt(s) remaining."
        )

    # Mark OTP as used & verify phone
    otp_token.is_used = True
    user.is_phone_verified = True
    await db.flush()

    # Generate tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    logger.info(f"User {user.id} authenticated via OTP")
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


# ── Refresh Token ─────────────────────────────────────────────

async def refresh_access_token(db: AsyncSession, refresh_token_str: str) -> dict:
    """Validate refresh token and issue a new access token."""
    user_id_str = verify_refresh_token(refresh_token_str)
    if user_id_str is None:
        raise ValueError("Invalid or expired refresh token.")

    user_id = UUID(user_id_str)
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise ValueError("User account not found.")

    new_access = create_access_token(user.id)
    new_refresh = create_refresh_token(user.id)

    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
    }


# ── Email Verification ───────────────────────────────────────

async def initiate_email_verification(db: AsyncSession, user: User, email: str) -> dict:
    """
    Set the user's email (if not already set) and send a verification link.
    """
    # Check if email is already taken by another user
    result = await db.execute(
        select(User).where(and_(User.email == email, User.id != user.id))
    )
    if result.scalar_one_or_none() is not None:
        raise ValueError("This email is already associated with another account.")

    user.email = email
    user.is_email_verified = False
    await db.flush()

    token = create_email_verification_token(user.id, email)
    verification_url = f"{settings.frontend_url}/auth/verify-email?token={token}"

    sent = await send_email_verification(
        to_email=email,
        verification_url=verification_url,
        user_name=user.full_name,
    )
    if not sent:
        raise Exception("Failed to send verification email. Please try again.")

    return {"message": f"Verification email sent to {email}."}


async def confirm_email_verification(db: AsyncSession, token: str) -> dict:
    """Verify the email token and mark the user's email as verified."""
    data = verify_email_token(token)
    if data is None:
        raise ValueError("Invalid or expired email verification link.")

    user_id = UUID(data["user_id"])
    email = data["email"]

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise ValueError("User account not found.")

    if user.email != email:
        raise ValueError("Email mismatch. Please request a new verification link.")

    user.is_email_verified = True
    await db.flush()

    logger.info(f"Email verified for user {user.id}: {email}")
    return {"message": "Email verified successfully."}


# ── Profile Update ────────────────────────────────────────────

async def update_user_profile(
    db: AsyncSession,
    user: User,
    full_name: str | None = None,
    profile_photo_url: str | None = None,
) -> User:
    """Update the user's profile fields."""
    if full_name is not None:
        user.full_name = full_name
    if profile_photo_url is not None:
        user.profile_photo_url = profile_photo_url
    await db.flush()
    await db.refresh(user)
    return user


# ── Become Host ───────────────────────────────────────────────

async def become_host(db: AsyncSession, user: User) -> User:
    """
    Promote a user to host role.
    Requires both phone and email to be verified.
    """
    if not user.is_phone_verified:
        raise ValueError("Phone number must be verified before becoming a host.")
    if not user.is_email_verified:
        raise ValueError("Email must be verified before becoming a host.")
    if user.is_host:
        raise ValueError("You are already registered as a host.")

    user.is_host = True
    await db.flush()
    await db.refresh(user)
    logger.info(f"User {user.id} promoted to host")
    return user
