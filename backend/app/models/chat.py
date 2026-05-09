"""
FlexiSpace — Chat Model
Real-time messaging between renters and hosts per booking.
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class MessageType(str, enum.Enum):
    TEXT = "TEXT"
    IMAGE = "IMAGE"
    FILE = "FILE"


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    booking_id = Column(
        UUID(as_uuid=True),
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    content = Column(Text, nullable=False)
    message_type = Column(
        Enum(MessageType, name="message_type_enum", create_type=True),
        nullable=False,
        default=MessageType.TEXT,
    )
    file_url = Column(Text, nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    sent_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    sender = relationship("User", backref="chat_messages")
    booking = relationship("Booking", backref="messages")

    def __repr__(self) -> str:
        return f"<ChatMessage id={self.id} booking={self.booking_id}>"
