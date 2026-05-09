"""
FlexiSpace — Chat Router
WebSocket real-time chat + REST history/read endpoints.
Includes safety filters (profanity, phone numbers, payment links).
"""

import json
import logging
import re
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel
from sqlalchemy import select, and_, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.security import decode_token
from app.database import get_db, async_session
from app.models.booking import Booking
from app.models.chat import ChatMessage, MessageType
from app.models.listing import Space
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])


# ── Safety Filters ────────────────────────────────────────────

PROFANITY_LIST = {"fuck", "shit", "bitch", "asshole", "bastard", "damn", "crap"}

PAYMENT_KEYWORDS = {"gpay", "paytm", "phonepe", "google pay", "upi:", "bhim", "neft", "imps"}

PHONE_REGEX = re.compile(r"\b[6-9]\d{9}\b")


def sanitize_message(content: str) -> tuple[str, list[str]]:
    """Sanitize message content. Returns (cleaned_content, warnings)."""
    warnings = []
    cleaned = content

    # Phone number detection
    if PHONE_REGEX.search(cleaned):
        cleaned = PHONE_REGEX.sub("[CONTACT REMOVED]", cleaned)
        warnings.append("Phone numbers are not allowed in chat for your safety.")

    # Payment link detection
    content_lower = cleaned.lower()
    for kw in PAYMENT_KEYWORDS:
        if kw in content_lower:
            warnings.append("⚠ External payment links detected. Please use FlexiSpace's payment system.")
            break

    # Basic profanity filter
    words = cleaned.split()
    for i, word in enumerate(words):
        if word.lower().strip(".,!?") in PROFANITY_LIST:
            words[i] = "***"
    cleaned = " ".join(words)

    return cleaned, warnings


# ── WebSocket Connection Manager ──────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.rooms: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, booking_id: str, websocket: WebSocket):
        await websocket.accept()
        self.rooms[booking_id].append(websocket)

    def disconnect(self, booking_id: str, websocket: WebSocket):
        if websocket in self.rooms[booking_id]:
            self.rooms[booking_id].remove(websocket)
        if not self.rooms[booking_id]:
            del self.rooms[booking_id]

    async def broadcast(self, booking_id: str, message: dict, exclude: WebSocket | None = None):
        dead = []
        for ws in self.rooms.get(booking_id, []):
            if ws == exclude:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(booking_id, ws)


manager = ConnectionManager()


# ── WebSocket Endpoint ────────────────────────────────────────

@router.websocket("/ws/chat/{booking_id}")
async def websocket_chat(
    websocket: WebSocket,
    booking_id: str,
    token: str = Query(...),
):
    """Real-time chat via WebSocket. Authenticate via JWT token in query params."""
    # Verify JWT
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001)
            return
    except Exception:
        await websocket.close(code=4001)
        return

    # Verify user has access to this booking
    async with async_session() as db:
        result = await db.execute(select(Booking).where(Booking.id == booking_id))
        booking = result.scalar_one_or_none()
        if not booking:
            await websocket.close(code=4004)
            return
        # Check renter or host of the space
        space_result = await db.execute(select(Space).where(Space.id == booking.space_id))
        space = space_result.scalar_one_or_none()
        if str(booking.renter_id) != user_id and (not space or str(space.host_id) != user_id):
            await websocket.close(code=4003)
            return

    # Connect
    await manager.connect(booking_id, websocket)
    logger.info(f"WebSocket connected: user={user_id} booking={booking_id}")

    try:
        while True:
            data = await websocket.receive_json()
            content = data.get("content", "").strip()
            msg_type = data.get("type", "TEXT")

            if not content:
                continue

            # Sanitize
            cleaned, warnings = sanitize_message(content)

            # Save to DB
            async with async_session() as db:
                try:
                    mt = MessageType(msg_type)
                except ValueError:
                    mt = MessageType.TEXT

                msg = ChatMessage(
                    booking_id=booking_id,
                    sender_id=user_id,
                    content=cleaned,
                    message_type=mt,
                    file_url=data.get("file_url"),
                )
                db.add(msg)
                await db.commit()
                await db.refresh(msg)

                broadcast_data = {
                    "id": str(msg.id),
                    "booking_id": booking_id,
                    "sender_id": user_id,
                    "content": cleaned,
                    "type": mt.value,
                    "file_url": msg.file_url,
                    "is_read": False,
                    "sent_at": msg.sent_at.isoformat(),
                    "warnings": warnings,
                }

            # Broadcast to all in room
            await manager.broadcast(booking_id, broadcast_data)

    except WebSocketDisconnect:
        manager.disconnect(booking_id, websocket)
        logger.info(f"WebSocket disconnected: user={user_id} booking={booking_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(booking_id, websocket)


# ── REST Schemas ──────────────────────────────────────────────

class ChatMessageResponse(BaseModel):
    id: UUID
    booking_id: UUID
    sender_id: UUID
    content: str
    type: str
    file_url: Optional[str] = None
    is_read: bool
    sent_at: datetime

    model_config = {"from_attributes": True}


# ── GET /chat/{booking_id}/history ────────────────────────────
@router.get(
    "/{booking_id}/history",
    response_model=list[ChatMessageResponse],
    summary="Get chat history for a booking",
)
async def get_chat_history(
    booking_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify access
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    space_result = await db.execute(select(Space).where(Space.id == booking.space_id))
    space = space_result.scalar_one_or_none()
    if booking.renter_id != current_user.id and (not space or space.host_id != current_user.id):
        raise HTTPException(status_code=403, detail="Access denied.")

    stmt = (
        select(ChatMessage)
        .where(ChatMessage.booking_id == booking_id)
        .order_by(ChatMessage.sent_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    messages = list(result.scalars().all())
    messages.reverse()  # Return in chronological order

    return [
        ChatMessageResponse(
            id=m.id, booking_id=m.booking_id, sender_id=m.sender_id,
            content=m.content, type=m.message_type.value if hasattr(m.message_type, 'value') else m.message_type,
            file_url=m.file_url, is_read=m.is_read, sent_at=m.sent_at,
        )
        for m in messages
    ]


# ── POST /chat/{booking_id}/read ─────────────────────────────
@router.post(
    "/{booking_id}/read",
    summary="Mark all messages as read",
)
async def mark_as_read(
    booking_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(ChatMessage)
        .where(
            and_(
                ChatMessage.booking_id == booking_id,
                ChatMessage.sender_id != current_user.id,
                ChatMessage.is_read == False,
            )
        )
        .values(is_read=True)
    )
    await db.flush()
    return {"status": "ok"}
