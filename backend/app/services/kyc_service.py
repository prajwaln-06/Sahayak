"""
FlexiSpace — KYC Service
Business logic for KYC document upload and verification.
"""

import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.kyc import KYCDocument, KYCDocStatus, DocType
from app.models.user import User, KYCStatus
from app.services.ocr_service import extract_text_from_image, parse_document

logger = logging.getLogger(__name__)


# ── Upload KYC Document ──────────────────────────────────────

async def upload_kyc_document(
    db: AsyncSession,
    user: User,
    doc_type_str: str,
    front_url: str,
    back_url: str | None = None,
) -> KYCDocument:
    """Create a KYC document record after images are uploaded to Cloudinary."""
    try:
        doc_type = DocType(doc_type_str)
    except ValueError:
        raise ValueError(f"Invalid doc_type: {doc_type_str}. Use AADHAAR, PASSPORT, or PAN.")

    doc = KYCDocument(
        user_id=user.id,
        doc_type=doc_type,
        front_url=front_url,
        back_url=back_url,
        status=KYCDocStatus.PENDING,
    )
    db.add(doc)

    # Update user KYC status to PENDING
    user.kyc_status = KYCStatus.PENDING
    await db.flush()
    await db.refresh(doc)

    logger.info(f"KYC document {doc.id} created for user {user.id}")
    return doc


# ── Process KYC (OCR) ────────────────────────────────────────

async def process_kyc_ocr(db: AsyncSession, kyc_id: UUID) -> KYCDocument:
    """
    Run OCR on a KYC document and update extracted fields.
    Called asynchronously (or from a Celery task in production).
    """
    result = await db.execute(select(KYCDocument).where(KYCDocument.id == kyc_id))
    doc = result.scalar_one_or_none()

    if not doc:
        raise ValueError(f"KYC document {kyc_id} not found.")

    try:
        # Extract text from front image
        text = await extract_text_from_image(doc.front_url)

        if not text:
            doc.status = KYCDocStatus.REJECTED
            doc.rejection_reason = "No text could be extracted from the image. Please upload a clearer photo."
            doc.ocr_confidence = 0.0
            await db.flush()
            return doc

        # Parse based on document type
        parsed = parse_document(text, doc.doc_type.value)

        doc.extracted_name = parsed.get("name")
        doc.extracted_dob = parsed.get("dob")
        doc.extracted_id_number = parsed.get("id_number")

        # Calculate confidence based on how many fields were extracted
        fields_found = sum(1 for v in parsed.values() if v)
        doc.ocr_confidence = round(fields_found / 3.0, 2)

        # Decide status based on confidence
        if doc.ocr_confidence > 0.85:
            doc.status = KYCDocStatus.UNDER_REVIEW
            logger.info(f"KYC {kyc_id}: High confidence ({doc.ocr_confidence}), sent for review")
        elif doc.ocr_confidence >= 0.5:
            doc.status = KYCDocStatus.UNDER_REVIEW
            logger.info(f"KYC {kyc_id}: Medium confidence ({doc.ocr_confidence}), sent for review")
        else:
            doc.status = KYCDocStatus.REJECTED
            doc.rejection_reason = "Low image quality. Please upload a clearer photo of your document."
            logger.info(f"KYC {kyc_id}: Low confidence ({doc.ocr_confidence}), rejected")

        await db.flush()
        await db.refresh(doc)
        return doc

    except Exception as e:
        logger.error(f"KYC OCR processing failed for {kyc_id}: {e}")
        doc.status = KYCDocStatus.REJECTED
        doc.rejection_reason = f"OCR processing error: {str(e)}"
        await db.flush()
        return doc


# ── Get KYC Status ────────────────────────────────────────────

async def get_user_kyc_documents(db: AsyncSession, user_id: UUID) -> list[KYCDocument]:
    """Get all KYC documents for a user."""
    result = await db.execute(
        select(KYCDocument)
        .where(KYCDocument.user_id == user_id)
        .order_by(KYCDocument.created_at.desc())
    )
    return list(result.scalars().all())


# ── Admin Approve ─────────────────────────────────────────────

async def admin_approve_kyc(db: AsyncSession, user_id: UUID) -> User:
    """
    Shortcut: immediately approve a user's KYC (for demo/hackathon).
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise ValueError("User not found.")

    user.kyc_status = KYCStatus.APPROVED

    # Also approve the latest KYC document if exists
    doc_result = await db.execute(
        select(KYCDocument)
        .where(KYCDocument.user_id == user_id)
        .order_by(KYCDocument.created_at.desc())
        .limit(1)
    )
    doc = doc_result.scalar_one_or_none()
    if doc:
        doc.status = KYCDocStatus.APPROVED
        doc.reviewed_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(user)
    logger.info(f"Admin approved KYC for user {user_id}")
    return user


# ── Admin Make Host ───────────────────────────────────────────

async def admin_make_host(db: AsyncSession, user_id: UUID) -> User:
    """
    Shortcut: set is_host=True and kyc_status=APPROVED for demo purposes.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise ValueError("User not found.")

    user.is_host = True
    user.kyc_status = KYCStatus.APPROVED
    await db.flush()
    await db.refresh(user)
    logger.info(f"Admin made user {user_id} a host")
    return user
