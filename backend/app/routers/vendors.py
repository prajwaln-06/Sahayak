"""
FlexiSpace — Vendors Router
Vendor marketplace, services, and AI-powered RFQ system.
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.booking import Booking
from app.models.listing import Space
from app.models.user import User
from app.models.vendor import (
    GigRequest, RFQStatus, PriceUnit,
    Vendor, VendorService, VendorType,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vendors", tags=["Vendors"])


# ── Schemas ───────────────────────────────────────────────────

class RegisterVendorRequest(BaseModel):
    business_name: str
    vendor_type: str
    description: Optional[str] = None
    service_cities: list[str] = []
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    price_unit: str = "FIXED"


class AddServiceRequest(BaseModel):
    service_name: str
    description: Optional[str] = None
    price: Optional[float] = None
    unit: Optional[str] = None
    photo_url: Optional[str] = None


class VendorServiceResponse(BaseModel):
    id: UUID
    service_name: str
    description: Optional[str] = None
    price: Optional[float] = None
    unit: Optional[str] = None
    photo_url: Optional[str] = None
    model_config = {"from_attributes": True}


class VendorResponse(BaseModel):
    id: UUID
    user_id: UUID
    business_name: str
    vendor_type: str
    description: Optional[str] = None
    service_cities: list[str] = []
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    price_unit: str
    rating_avg: float
    review_count: int
    portfolio_urls: list[str] = []
    is_verified: bool
    is_active: bool
    created_at: str
    services: list[VendorServiceResponse] = []
    model_config = {"from_attributes": True}


class VendorListResponse(BaseModel):
    vendors: list[VendorResponse]
    total: int


class SendRFQRequest(BaseModel):
    booking_id: UUID
    vendor_ids: list[UUID]
    custom_note: Optional[str] = None


class RFQResponse(BaseModel):
    id: UUID
    booking_id: UUID
    vendor_id: UUID
    renter_id: UUID
    message: Optional[str] = None
    status: str
    vendor_quoted_price: Optional[float] = None
    notes: Optional[str] = None
    created_at: str
    model_config = {"from_attributes": True}


class RespondRFQRequest(BaseModel):
    action: str = Field(..., description="ACCEPTED, DECLINED, or COUNTERED")
    quoted_price: Optional[float] = None
    notes: Optional[str] = None


# ── POST /vendors/register-as-vendor ──────────────────────────
@router.post(
    "/register-as-vendor",
    response_model=VendorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Self-serve vendor onboarding",
)
async def register_as_vendor(
    body: RegisterVendorRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check if already registered
    existing = await db.execute(select(Vendor).where(Vendor.user_id == current_user.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You are already registered as a vendor.")

    try:
        vendor_type = VendorType(body.vendor_type)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid vendor_type. Use: {[v.value for v in VendorType]}")

    try:
        price_unit = PriceUnit(body.price_unit)
    except ValueError:
        price_unit = PriceUnit.FIXED

    vendor = Vendor(
        user_id=current_user.id,
        business_name=body.business_name,
        vendor_type=vendor_type,
        description=body.description,
        service_cities=body.service_cities,
        min_price=body.min_price,
        max_price=body.max_price,
        price_unit=price_unit,
    )
    db.add(vendor)
    await db.flush()
    await db.refresh(vendor)
    return vendor


# ── GET /vendors/ ─────────────────────────────────────────────
@router.get(
    "/",
    response_model=VendorListResponse,
    summary="List vendors with filters",
)
async def list_vendors(
    vendor_type: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Vendor).where(Vendor.is_active == True)

    if vendor_type:
        try:
            stmt = stmt.where(Vendor.vendor_type == VendorType(vendor_type))
        except ValueError:
            pass

    if city:
        stmt = stmt.where(Vendor.service_cities.contains([city]))

    if min_price is not None:
        stmt = stmt.where(Vendor.min_price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Vendor.max_price <= max_price)

    count_result = await db.execute(select(func.count()).select_from(stmt.subquery()))
    total = count_result.scalar() or 0

    stmt = stmt.order_by(Vendor.rating_avg.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    vendors = list(result.scalars().all())
    return VendorListResponse(vendors=vendors, total=total)


# ── GET /vendors/{id} ─────────────────────────────────────────
@router.get(
    "/{vendor_id}",
    response_model=VendorResponse,
    summary="Vendor detail + services",
)
async def get_vendor(vendor_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vendor).where(Vendor.id == vendor_id))
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found.")
    return vendor


# ── POST /vendors/{id}/services ───────────────────────────────
@router.post(
    "/{vendor_id}/services",
    response_model=VendorServiceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a service to vendor profile",
)
async def add_service(
    vendor_id: UUID,
    body: AddServiceRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Vendor).where(Vendor.id == vendor_id))
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found.")
    if vendor.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your vendor profile.")

    service = VendorService(
        vendor_id=vendor.id,
        service_name=body.service_name,
        description=body.description,
        price=body.price,
        unit=body.unit,
        photo_url=body.photo_url,
    )
    db.add(service)
    await db.flush()
    await db.refresh(service)
    return service


# ── GET /vendors/for-booking/{booking_id} ─────────────────────
@router.get(
    "/for-booking/{booking_id}",
    response_model=VendorListResponse,
    summary="Recommended vendors for a booking (by space city + type)",
)
async def vendors_for_booking(
    booking_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    booking_result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = booking_result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    space_result = await db.execute(select(Space).where(Space.id == booking.space_id))
    space = space_result.scalar_one_or_none()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found.")

    stmt = (
        select(Vendor)
        .where(Vendor.is_active == True)
        .where(Vendor.service_cities.contains([space.city]))
        .order_by(Vendor.rating_avg.desc())
        .limit(20)
    )
    result = await db.execute(stmt)
    vendors = list(result.scalars().all())
    return VendorListResponse(vendors=vendors, total=len(vendors))


# ── POST /vendors/rfq/send ───────────────────────────────────
@router.post(
    "/rfq/send",
    response_model=list[RFQResponse],
    summary="Send AI-generated RFQs to vendors",
)
async def send_rfqs(
    body: SendRFQRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Fetch booking + space
    booking_result = await db.execute(select(Booking).where(Booking.id == body.booking_id))
    booking = booking_result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    space_result = await db.execute(select(Space).where(Space.id == booking.space_id))
    space = space_result.scalar_one_or_none()

    rfqs = []
    for vendor_id in body.vendor_ids:
        vendor_result = await db.execute(select(Vendor).where(Vendor.id == vendor_id))
        vendor = vendor_result.scalar_one_or_none()
        if not vendor:
            continue

        # Generate AI message
        message = await _generate_rfq_message(vendor, booking, space, body.custom_note)

        gig = GigRequest(
            booking_id=booking.id,
            vendor_id=vendor.id,
            renter_id=current_user.id,
            message=message,
            status=RFQStatus.SENT,
        )
        db.add(gig)
        await db.flush()
        await db.refresh(gig)
        rfqs.append(gig)

        # Send WhatsApp to vendor (fire-and-forget)
        try:
            from app.services.twilio_service import send_whatsapp
            vendor_user_result = await db.execute(select(User).where(User.id == vendor.user_id))
            vendor_user = vendor_user_result.scalar_one_or_none()
            if vendor_user:
                await send_whatsapp(vendor_user.phone, f"📋 New RFQ from FlexiSpace!\n\n{message}")
        except Exception as e:
            logger.warning(f"RFQ WhatsApp failed for vendor {vendor.id}: {e}")

    return rfqs


# ── GET /vendors/rfq/incoming ─────────────────────────────────
@router.get(
    "/rfq/incoming",
    response_model=list[RFQResponse],
    summary="Vendor sees their incoming RFQs",
)
async def incoming_rfqs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    vendor_result = await db.execute(select(Vendor).where(Vendor.user_id == current_user.id))
    vendor = vendor_result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(status_code=404, detail="You are not a registered vendor.")

    result = await db.execute(
        select(GigRequest)
        .where(GigRequest.vendor_id == vendor.id)
        .order_by(GigRequest.created_at.desc())
        .limit(50)
    )
    return list(result.scalars().all())


# ── POST /vendors/rfq/{id}/respond ────────────────────────────
@router.post(
    "/rfq/{rfq_id}/respond",
    response_model=RFQResponse,
    summary="Vendor accepts/declines/counters an RFQ",
)
async def respond_rfq(
    rfq_id: UUID,
    body: RespondRFQRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(GigRequest).where(GigRequest.id == rfq_id))
    gig = result.scalar_one_or_none()
    if not gig:
        raise HTTPException(status_code=404, detail="RFQ not found.")

    vendor_result = await db.execute(select(Vendor).where(Vendor.user_id == current_user.id))
    vendor = vendor_result.scalar_one_or_none()
    if not vendor or vendor.id != gig.vendor_id:
        raise HTTPException(status_code=403, detail="Not your RFQ.")

    try:
        gig.status = RFQStatus(body.action)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid action. Use: {[s.value for s in RFQStatus]}")

    if body.quoted_price is not None:
        gig.vendor_quoted_price = body.quoted_price
    if body.notes:
        gig.notes = body.notes

    await db.flush()
    await db.refresh(gig)
    return gig


# ── AI RFQ Message Generator ─────────────────────────────────

async def _generate_rfq_message(vendor: Vendor, booking: Booking, space: Space, custom_note: Optional[str]) -> str:
    """Generate a professional RFQ message using Groq."""
    try:
        from langchain_groq import ChatGroq
        from app.config import get_settings
        settings = get_settings()

        llm = ChatGroq(
            api_key=settings.groq_api_key,
            model_name="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=200,
        )

        event_date = booking.start_datetime.strftime("%d %b %Y at %I:%M %p") if booking.start_datetime else "TBD"
        capacity = booking.capacity_requested or "TBD"
        venue = f"{space.title}, {space.neighbourhood or space.city}" if space else "TBD"

        prompt = (
            f"Generate a professional but friendly event service request message for "
            f"{vendor.business_name} ({vendor.vendor_type.value if hasattr(vendor.vendor_type, 'value') else vendor.vendor_type}). "
            f"Event: {booking.event_name or 'Private Event'} on {event_date} "
            f"for {capacity} people at {venue}. "
            f"{'Additional note: ' + custom_note + '. ' if custom_note else ''}"
            f"Keep under 100 words. End with a contact CTA. "
            f"Return ONLY the message text."
        )

        response = await llm.ainvoke(prompt)
        return response.content.strip()

    except Exception as e:
        logger.error(f"AI RFQ generation failed: {e}")
        # Fallback template
        return (
            f"Hi {vendor.business_name},\n\n"
            f"We'd like to request your services for an upcoming event at FlexiSpace.\n"
            f"Event: {booking.event_name or 'Private Event'}\n"
            f"Date: {booking.start_datetime.strftime('%d %b %Y') if booking.start_datetime else 'TBD'}\n"
            f"Guests: {booking.capacity_requested or 'TBD'}\n\n"
            f"Please let us know your availability and pricing. Thank you!"
        )
