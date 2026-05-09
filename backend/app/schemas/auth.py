"""
FlexiSpace — Auth Pydantic Schemas
Request and response models for all authentication endpoints.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ── Requests ──────────────────────────────────────────────────

class SendOTPRequest(BaseModel):
    phone: str = Field(
        ...,
        min_length=10,
        max_length=15,
        description="Phone number with country code, e.g. +919876543210",
        examples=["+919876543210"],
    )


class VerifyOTPRequest(BaseModel):
    phone: str = Field(
        ...,
        min_length=10,
        max_length=15,
        description="Phone number used during OTP send",
    )
    otp: str = Field(
        ...,
        min_length=6,
        max_length=6,
        description="6-digit OTP code",
        examples=["123456"],
    )


class SendEmailVerificationRequest(BaseModel):
    email: EmailStr = Field(
        ...,
        description="Email address to verify",
        examples=["user@example.com"],
    )


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255,
        description="User's full name",
    )
    profile_photo_url: Optional[str] = Field(
        None,
        description="Cloudinary URL for the profile photo",
    )


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(
        ...,
        description="Refresh token obtained during login",
    )


# ── Responses ─────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: UUID
    phone: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    is_phone_verified: bool
    is_email_verified: bool
    is_host: bool
    is_admin: bool
    trust_score: float
    kyc_status: str
    profile_photo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None
