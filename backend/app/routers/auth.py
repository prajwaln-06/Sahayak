"""
FlexiSpace — Auth Router
All authentication endpoints: OTP, email verification, JWT refresh, profile, host.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    MessageResponse,
    RefreshTokenRequest,
    SendEmailVerificationRequest,
    SendOTPRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
    VerifyOTPRequest,
)
from app.services import auth_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── POST /auth/send-otp ──────────────────────────────────────
@router.post(
    "/send-otp",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Send OTP to phone number",
)
async def send_otp(
    body: SendOTPRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send a 6-digit OTP to the provided phone number via Twilio SMS."""
    try:
        result = await auth_service.send_otp(db, body.phone)
        return result
    except Exception as e:
        logger.error(f"send_otp error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ── POST /auth/verify-otp ────────────────────────────────────
@router.post(
    "/verify-otp",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify OTP and get JWT tokens",
)
async def verify_otp(
    body: VerifyOTPRequest,
    db: AsyncSession = Depends(get_db),
):
    """Validate the 6-digit OTP and return access + refresh JWT tokens."""
    try:
        result = await auth_service.verify_otp_and_login(db, body.phone, body.otp)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"verify_otp error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OTP verification failed. Please try again.",
        )


# ── POST /auth/send-email-verification ───────────────────────
@router.post(
    "/send-email-verification",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Send email verification link (requires auth)",
)
async def send_email_verification(
    body: SendEmailVerificationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a verification link to the provided email. Requires authentication."""
    try:
        result = await auth_service.initiate_email_verification(db, current_user, body.email)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"send_email_verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ── GET /auth/verify-email ───────────────────────────────────
@router.get(
    "/verify-email",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify email via token link",
)
async def verify_email(
    token: str = Query(..., description="Email verification JWT token"),
    db: AsyncSession = Depends(get_db),
):
    """Clicked from the verification email — marks the user's email as verified."""
    try:
        result = await auth_service.confirm_email_verification(db, token)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"verify_email error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email verification failed.",
        )


# ── GET /auth/me ──────────────────────────────────────────────
@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user profile",
)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return current_user


# ── POST /auth/refresh ───────────────────────────────────────
@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Refresh access token",
)
async def refresh_token(
    body: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Exchange a valid refresh token for a new access + refresh token pair."""
    try:
        result = await auth_service.refresh_access_token(db, body.refresh_token)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"refresh_token error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed.",
        )


# ── POST /auth/update-profile ────────────────────────────────
@router.post(
    "/update-profile",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update user profile",
)
async def update_profile(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the authenticated user's full_name and/or profile_photo_url."""
    try:
        user = await auth_service.update_user_profile(
            db,
            current_user,
            full_name=body.full_name,
            profile_photo_url=body.profile_photo_url,
        )
        return user
    except Exception as e:
        logger.error(f"update_profile error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Profile update failed.",
        )


# ── POST /auth/become-host ───────────────────────────────────
@router.post(
    "/become-host",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Become a host (requires phone + email verified)",
)
async def become_host(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Promote the current user to host. Requires both phone and email verified."""
    try:
        user = await auth_service.become_host(db, current_user)
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"become_host error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upgrade to host.",
        )


# ── POST /auth/banking-details ───────────────────────────────
@router.post(
    "/banking-details",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Save UPI / bank payout details",
)
async def save_banking_details(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save the user's UPI ID, bank account, and IFSC code."""
    try:
        if "upi_id" in body:
            current_user.upi_id = body["upi_id"]
        if "bank_account" in body:
            current_user.bank_account = body["bank_account"]
        if "ifsc" in body:
            current_user.ifsc = body["ifsc"]
        await db.flush()
        await db.refresh(current_user)
        return current_user
    except Exception as e:
        logger.error(f"banking_details error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save banking details.",
        )
