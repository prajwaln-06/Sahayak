"""
FlexiSpace — Listing Models
Space and Availability SQLAlchemy ORM models.
"""

import enum
import uuid
from datetime import datetime, timezone, date

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from pgvector.sqlalchemy import Vector
from sqlalchemy.orm import relationship

from app.database import Base


# ── Enums ─────────────────────────────────────────────────────

class SpaceType(str, enum.Enum):
    CONFERENCE_ROOM = "CONFERENCE_ROOM"
    STUDIO = "STUDIO"
    ROOFTOP = "ROOFTOP"
    GARDEN = "GARDEN"
    GALLERY = "GALLERY"
    RESTAURANT = "RESTAURANT"
    WAREHOUSE = "WAREHOUSE"
    OTHER = "OTHER"


# ── Space Model ──────────────────────────────────────────────

class Space(Base):
    __tablename__ = "spaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    host_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Basic info
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    space_type = Column(
        Enum(SpaceType, name="space_type_enum", create_type=True),
        nullable=False,
    )

    # Location
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False, index=True)
    neighbourhood = Column(String(100), nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)

    # Capacity
    capacity_standing = Column(Integer, nullable=True)
    capacity_seated = Column(Integer, nullable=True)

    # Amenities & Rules (JSONB)
    amenities = Column(JSONB, default=list, nullable=False)
    rules = Column(JSONB, default=dict, nullable=True)

    # Pricing
    base_price_hourly = Column(Float, nullable=False)
    base_price_daily = Column(Float, nullable=True)
    weekend_multiplier = Column(Float, default=1.3, nullable=False)
    surge_enabled = Column(Boolean, default=False, nullable=False)
    surge_multiplier = Column(Float, default=1.5, nullable=False)
    min_booking_hours = Column(Integer, default=1, nullable=False)

    # Booking config
    instant_book = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Media
    is_3d_generated = Column(Boolean, default=False, nullable=False)
    thumbnail_url = Column(Text, nullable=True)
    photo_urls = Column(JSONB, default=list, nullable=False)
    video_url = Column(Text, nullable=True)
    mesh_url = Column(Text, nullable=True)

    # Ratings
    rating_avg = Column(Float, default=0.0, nullable=False)
    review_count = Column(Integer, default=0, nullable=False)

    # Vector embedding (Gemini text-embedding-004: 768 dimensions)
    embedding = Column(Vector(768), nullable=True)

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
    host = relationship("User", backref="spaces")
    availability_blocks = relationship(
        "Availability", back_populates="space", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Space id={self.id} title={self.title}>"


# ── Availability Model ───────────────────────────────────────

class Availability(Base):
    __tablename__ = "availability_blocks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    space_id = Column(
        UUID(as_uuid=True),
        ForeignKey("spaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    blocked_date = Column(Date, nullable=False)
    reason = Column(String(255), nullable=True)

    # Relationships
    space = relationship("Space", back_populates="availability_blocks")

    # Unique constraint: one block per space per date
    __table_args__ = (
        {"sqlite_autoincrement": False},
    )

    def __repr__(self) -> str:
        return f"<Availability space={self.space_id} date={self.blocked_date}>"
