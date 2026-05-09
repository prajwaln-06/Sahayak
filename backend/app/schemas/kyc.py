"""
FlexiSpace — KYC Pydantic Schemas
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Requests ──────────────────────────────────────────────────

class KYCUploadRequest(BaseModel):
    doc_type: str = Field(..., description="AADHAAR, PASSPORT, or PAN")


class BankingDetailsRequest(BaseModel):
    upi_id: Optional[str] = Field(None, max_length=100, description="UPI ID e.g. user@upi")
    bank_account: Optional[str] = Field(None, max_length=50, description="Bank account number")
    ifsc: Optional[str] = Field(None, max_length=20, description="IFSC code")


# ── Responses ─────────────────────────────────────────────────

class KYCStatusResponse(BaseModel):
    id: UUID
    user_id: UUID
    doc_type: str
    front_url: str
    back_url: Optional[str] = None
    extracted_name: Optional[str] = None
    extracted_dob: Optional[str] = None
    extracted_id_number: Optional[str] = None
    ocr_confidence: Optional[float] = None
    status: str
    rejection_reason: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class KYCListResponse(BaseModel):
    documents: list[KYCStatusResponse]


class BankingDetailsResponse(BaseModel):
    upi_id: Optional[str] = None
    bank_account: Optional[str] = None
    ifsc: Optional[str] = None
    message: str
