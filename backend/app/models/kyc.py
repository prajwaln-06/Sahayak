"""
FlexiSpace — KYC Document Model
Stores identity verification documents and OCR extraction results.
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


# ── Enums ─────────────────────────────────────────────────────

class DocType(str, enum.Enum):
    AADHAAR = "AADHAAR"
    PASSPORT = "PASSPORT"
    PAN = "PAN"


class KYCDocStatus(str, enum.Enum):
    PENDING = "PENDING"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


# ── KYC Document Model ───────────────────────────────────────

class KYCDocument(Base):
    __tablename__ = "kyc_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Document type & images
    doc_type = Column(
        Enum(DocType, name="doc_type_enum", create_type=True),
        nullable=False,
    )
    front_url = Column(Text, nullable=False)
    back_url = Column(Text, nullable=True)

    # OCR extraction results
    extracted_name = Column(String(255), nullable=True)
    extracted_dob = Column(String(50), nullable=True)
    extracted_id_number = Column(String(100), nullable=True)
    ocr_confidence = Column(Float, nullable=True)

    # Review status
    status = Column(
        Enum(KYCDocStatus, name="kyc_doc_status_enum", create_type=True),
        default=KYCDocStatus.PENDING,
        nullable=False,
    )
    rejection_reason = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user = relationship("User", backref="kyc_documents")

    def __repr__(self) -> str:
        return f"<KYCDocument id={self.id} user={self.user_id} status={self.status}>"
