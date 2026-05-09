"""
FlexiSpace — Bookings Router
Create, view, and cancel bookings. No payment gateway — confirmed instantly.
"""

import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, and_, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.booking import Booking, BookingStatus
from app.models.listing import Space, Availability
from app.models.user import User
from app.services import pricing_service
from app.services.whatsapp_service import send_booking_confirmation

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bookings", tags=["Bookings"])


# ── Schemas ───────────────────────────────────────────────────

class CreateBookingRequest(BaseModel):
    space_id: UUID
    start_datetime: datetime
    end_datetime: datetime
    capacity_requested: Optional[int] = None
    event_name: Optional[str] = None
    event_description: Optional[str] = None
    special_requirements: Optional[str] = None


class BookingResponse(BaseModel):
    id: UUID
    renter_id: UUID
    space_id: UUID
    start_datetime: datetime
    end_datetime: datetime
    capacity_requested: Optional[int] = None
    event_name: Optional[str] = None
    event_description: Optional[str] = None
    special_requirements: Optional[str] = None
    status: str
    base_amount: float
    platform_fee: float
    gst_amount: float
    total_amount: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BookingListResponse(BaseModel):
    bookings: list[BookingResponse]
    total: int


# ── POST /bookings/ ──────────────────────────────────────────
@router.post(
    "/",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a booking (confirmed instantly, no payment)",
)
async def create_booking(
    body: CreateBookingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 1. Fetch space
    result = await db.execute(select(Space).where(Space.id == body.space_id))
    space = result.scalar_one_or_none()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found.")
    if not space.is_active:
        raise HTTPException(status_code=400, detail="This space is not available.")

    # 2. Check date not blocked
    blocked = await db.execute(
        select(Availability).where(
            and_(
                Availability.space_id == space.id,
                Availability.blocked_date == body.start_datetime.date(),
            )
        )
    )
    if blocked.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="This date is blocked by the host.")

    # 3. Check no overlapping bookings
    overlap = await db.execute(
        select(Booking).where(
            and_(
                Booking.space_id == space.id,
                Booking.status == BookingStatus.CONFIRMED,
                Booking.start_datetime < body.end_datetime,
                Booking.end_datetime > body.start_datetime,
            )
        )
    )
    if overlap.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="This time slot is already booked.")

    # 4. Calculate pricing
    pricing = pricing_service.calculate_price(
        base_price_hourly=space.base_price_hourly,
        start_dt=body.start_datetime,
        end_dt=body.end_datetime,
        weekend_multiplier=space.weekend_multiplier,
        surge_enabled=space.surge_enabled,
        surge_multiplier=space.surge_multiplier,
    )

    # 5. Create booking (confirmed instantly)
    booking = Booking(
        renter_id=current_user.id,
        space_id=space.id,
        start_datetime=body.start_datetime,
        end_datetime=body.end_datetime,
        capacity_requested=body.capacity_requested,
        event_name=body.event_name,
        event_description=body.event_description,
        special_requirements=body.special_requirements,
        status=BookingStatus.CONFIRMED,
        base_amount=pricing["base_price"],
        platform_fee=pricing["platform_fee"],
        gst_amount=pricing["gst"],
        total_amount=pricing["total"],
    )
    db.add(booking)
    await db.flush()
    await db.refresh(booking)

    # 6. Send WhatsApp confirmation (fire-and-forget)
    try:
        await send_booking_confirmation(current_user.phone, booking, space)
    except Exception as e:
        logger.warning(f"WhatsApp notification failed: {e}")

    logger.info(f"Booking created: {booking.id} by {current_user.id}")
    return booking


# ── GET /bookings/my ──────────────────────────────────────────
@router.get(
    "/my",
    response_model=BookingListResponse,
    summary="My bookings (as renter)",
)
async def my_bookings(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Booking).where(Booking.renter_id == current_user.id)
    if status_filter:
        try:
            stmt = stmt.where(Booking.status == BookingStatus(status_filter))
        except ValueError:
            pass

    count_result = await db.execute(select(func.count()).select_from(stmt.subquery()))
    total = count_result.scalar() or 0

    stmt = stmt.order_by(Booking.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    bookings = list(result.scalars().all())
    return BookingListResponse(bookings=bookings, total=total)


# ── GET /bookings/host ────────────────────────────────────────
@router.get(
    "/host",
    response_model=BookingListResponse,
    summary="Incoming bookings for host's spaces",
)
async def host_bookings(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.is_host:
        raise HTTPException(status_code=403, detail="Host access required.")

    space_ids_stmt = select(Space.id).where(Space.host_id == current_user.id)
    stmt = select(Booking).where(Booking.space_id.in_(space_ids_stmt))

    count_result = await db.execute(select(func.count()).select_from(stmt.subquery()))
    total = count_result.scalar() or 0

    stmt = stmt.order_by(Booking.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    bookings = list(result.scalars().all())
    return BookingListResponse(bookings=bookings, total=total)


# ── GET /bookings/{id} ───────────────────────────────────────
@router.get(
    "/{booking_id}",
    response_model=BookingResponse,
    summary="Booking detail",
)
async def get_booking(
    booking_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if booking.renter_id != current_user.id and not current_user.is_admin:
        # Also allow the host of the space to view
        space = await db.execute(select(Space).where(Space.id == booking.space_id))
        space_obj = space.scalar_one_or_none()
        if not space_obj or space_obj.host_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied.")
    return booking


# ── POST /bookings/{id}/cancel ────────────────────────────────
@router.post(
    "/{booking_id}/cancel",
    response_model=BookingResponse,
    summary="Cancel a booking",
)
async def cancel_booking(
    booking_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if booking.renter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the renter can cancel.")
    if booking.status == BookingStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Already cancelled.")

    booking.status = BookingStatus.CANCELLED
    await db.flush()
    await db.refresh(booking)

    # WhatsApp notification
    try:
        from app.services.twilio_service import send_whatsapp
        await send_whatsapp(
            current_user.phone,
            f"❌ Booking Cancelled\n\n"
            f"Booking ID: {booking.id}\n"
            f"Refund will be processed if applicable.\n\n"
            f"FlexiSpace",
        )
    except Exception as e:
        logger.warning(f"Cancel WhatsApp notification failed: {e}")

    return booking
