"""
FlexiSpace — Booking Model
Booking records with pricing breakdown. No payment gateway — confirmed instantly.
"""

import enum
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class BookingStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    renter_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    space_id = Column(
        UUID(as_uuid=True),
        ForeignKey("spaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Schedule
    start_datetime = Column(DateTime(timezone=True), nullable=False)
    end_datetime = Column(DateTime(timezone=True), nullable=False)
    capacity_requested = Column(Integer, nullable=True)

    # Event details
    event_name = Column(String(255), nullable=True)
    event_description = Column(Text, nullable=True)
    special_requirements = Column(Text, nullable=True)

    # Status
    status = Column(
        Enum(BookingStatus, name="booking_status_enum", create_type=True),
        nullable=False,
        default=BookingStatus.CONFIRMED,
    )

    # Pricing (Decimal for accuracy)
    base_amount = Column(Numeric(12, 2), nullable=False)
    platform_fee = Column(Numeric(12, 2), nullable=False)
    gst_amount = Column(Numeric(12, 2), nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    renter = relationship("User", backref="bookings", foreign_keys=[renter_id])
    space = relationship("Space", backref="bookings")

    def __repr__(self) -> str:
        return f"<Booking id={self.id} status={self.status}>"
