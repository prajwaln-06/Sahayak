"""
FlexiSpace — KYC Router
Endpoints for KYC document upload, status check, and admin shortcuts.
"""

import asyncio
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.kyc import KYCListResponse, KYCStatusResponse
from app.schemas.auth import MessageResponse, UserResponse
from app.services import kyc_service, storage_service
from app.tasks.kyc_tasks import process_kyc_document

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/kyc", tags=["KYC Verification"])


# ── POST /kyc/upload ──────────────────────────────────────────
@router.post(
    "/upload",
    response_model=KYCStatusResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload KYC document (front + optional back)",
)
async def upload_kyc(
    doc_type: str = Form(..., description="AADHAAR, PASSPORT, or PAN"),
    front: UploadFile = File(..., description="Front of the document"),
    back: UploadFile | None = File(None, description="Back of the document (optional)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload identity document images, trigger OCR processing."""
    try:
        # Upload front image to Cloudinary
        front_bytes = await front.read()
        front_result = await storage_service.upload_image(
            front_bytes, folder=f"flexispace/kyc/{current_user.id}"
        )
        front_url = front_result["secure_url"]

        # Upload back image if provided
        back_url = None
        if back:
            back_bytes = await back.read()
            back_result = await storage_service.upload_image(
                back_bytes, folder=f"flexispace/kyc/{current_user.id}"
            )
            back_url = back_result["secure_url"]

        # Create KYC record
        doc = await kyc_service.upload_kyc_document(
            db, current_user, doc_type, front_url, back_url
        )

        # Trigger OCR processing (async in background for hackathon)
        asyncio.create_task(process_kyc_document(str(doc.id)))

        return doc

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"KYC upload error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="KYC document upload failed.",
        )


# ── GET /kyc/status ───────────────────────────────────────────
@router.get(
    "/status",
    response_model=KYCListResponse,
    summary="Get your KYC verification status",
)
async def get_kyc_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    docs = await kyc_service.get_user_kyc_documents(db, current_user.id)
    return KYCListResponse(documents=docs)


# ── POST /kyc/admin/approve/{user_id} ────────────────────────
@router.post(
    "/admin/approve/{user_id}",
    response_model=UserResponse,
    summary="[DEMO] Admin shortcut: approve KYC instantly",
)
async def admin_approve_kyc(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Hackathon shortcut — immediately approve a user's KYC."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required.")
    try:
        user = await kyc_service.admin_approve_kyc(db, user_id)
        return user
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── POST /admin/make-host/{user_id} ──────────────────────────
@router.post(
    "/admin/make-host/{user_id}",
    response_model=UserResponse,
    summary="[DEMO] Admin shortcut: make user a host + approve KYC",
)
async def admin_make_host(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Demo operator shortcut — set is_host=True and KYC=APPROVED."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required.")
    try:
        user = await kyc_service.admin_make_host(db, user_id)
        return user
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
