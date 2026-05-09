"""
FlexiSpace — Vendor Models
Vendor profiles, services, and gig request (RFQ) system.
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


# ── Enums ─────────────────────────────────────────────────────

class VendorType(str, enum.Enum):
    CATERING = "CATERING"
    AV_TECH = "AV_TECH"
    SECURITY = "SECURITY"
    DECOR = "DECOR"
    PHOTOGRAPHY = "PHOTOGRAPHY"
    CLEANING = "CLEANING"
    OTHER = "OTHER"


class PriceUnit(str, enum.Enum):
    PER_PERSON = "PER_PERSON"
    FIXED = "FIXED"
    HOURLY = "HOURLY"


class RFQStatus(str, enum.Enum):
    SENT = "SENT"
    VIEWED = "VIEWED"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    COUNTERED = "COUNTERED"


# ── Vendor Model ──────────────────────────────────────────────

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    business_name = Column(String(255), nullable=False)
    vendor_type = Column(
        Enum(VendorType, name="vendor_type_enum", create_type=True),
        nullable=False,
    )
    description = Column(Text, nullable=True)
    service_cities = Column(JSONB, default=list, nullable=False)

    # Pricing range
    min_price = Column(Float, nullable=True)
    max_price = Column(Float, nullable=True)
    price_unit = Column(
        Enum(PriceUnit, name="price_unit_enum", create_type=True),
        nullable=False,
        default=PriceUnit.FIXED,
    )

    # Ratings
    rating_avg = Column(Float, default=0.0, nullable=False)
    review_count = Column(Integer, default=0, nullable=False)

    # Media
    portfolio_urls = Column(JSONB, default=list, nullable=False)

    # Status
    is_verified = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user = relationship("User", backref="vendor_profile")
    services = relationship("VendorService", back_populates="vendor", cascade="all, delete-orphan")
    gig_requests = relationship("GigRequest", back_populates="vendor", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Vendor id={self.id} name={self.business_name}>"


# ── Vendor Service Model ─────────────────────────────────────

class VendorService(Base):
    __tablename__ = "vendor_services"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    vendor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vendors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    service_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=True)
    unit = Column(String(50), nullable=True)
    photo_url = Column(Text, nullable=True)

    vendor = relationship("Vendor", back_populates="services")

    def __repr__(self) -> str:
        return f"<VendorService id={self.id} name={self.service_name}>"


# ── Gig Request (RFQ) Model ──────────────────────────────────

class GigRequest(Base):
    __tablename__ = "gig_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    booking_id = Column(
        UUID(as_uuid=True),
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    vendor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vendors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    renter_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # AI-generated message
    message = Column(Text, nullable=True)

    # Status
    status = Column(
        Enum(RFQStatus, name="rfq_status_enum", create_type=True),
        nullable=False,
        default=RFQStatus.SENT,
    )

    # Vendor response
    vendor_quoted_price = Column(Numeric(12, 2), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    vendor = relationship("Vendor", back_populates="gig_requests")
    booking = relationship("Booking", backref="gig_requests")
    renter = relationship("User", backref="sent_rfqs", foreign_keys=[renter_id])

    def __repr__(self) -> str:
        return f"<GigRequest id={self.id} status={self.status}>"
