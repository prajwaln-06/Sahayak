"""
FlexiSpace — KYC Background Tasks
In production: runs via Celery with Redis broker.
For hackathon/demo: called directly as async functions.
"""

import logging
from uuid import UUID

from app.database import async_session
from app.services.kyc_service import process_kyc_ocr

logger = logging.getLogger(__name__)


async def process_kyc_document(kyc_id: str) -> None:
    """
    Background task to process a KYC document:
    1. Download image from Cloudinary (via URL)
    2. Call Google Vision API for OCR
    3. Parse extracted text for name, DOB, ID number
    4. Update KYCDocument with results + confidence score
    5. Auto-reject if confidence < 0.5, else mark UNDER_REVIEW

    In production, this would be a Celery task:
        @celery_app.task
        def process_kyc_document(kyc_id: str):
            ...

    For the hackathon, we call it directly after upload.
    """
    logger.info(f"Processing KYC document: {kyc_id}")

    try:
        async with async_session() as db:
            doc = await process_kyc_ocr(db, UUID(kyc_id))
            await db.commit()
            logger.info(f"KYC {kyc_id} processed — status: {doc.status}, confidence: {doc.ocr_confidence}")
    except Exception as e:
        logger.error(f"KYC task failed for {kyc_id}: {e}")
        raise
