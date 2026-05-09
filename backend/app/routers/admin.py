"""
FlexiSpace — Admin Router
Endpoints for managing users, KYC queue, spaces, bookings, and demo resets.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import String, cast, func, select, text, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_admin_user
from app.database import get_db
from app.models.booking import Booking, BookingStatus
from app.models.chat import ChatMessage
from app.models.listing import Space
from app.models.user import User, KYCStatus
from app.models.vendor import Vendor
from app.schemas.auth import UserResponse
from app.services.twilio_service import send_whatsapp

logger = logging.getLogger(__name__)

router = APIRouter()


class RejectKYCRequest(BaseModel):
    reason: str

class AdminStatsResponse(BaseModel):
    total_users: int
    total_hosts: int
    total_vendors: int
    total_spaces: int
    total_bookings: int
    confirmed_bookings: int
    pending_kyc: int
    recent_bookings: list[dict]


# ── POST /admin/bootstrap ─────────────────────────────────────
@router.post("/bootstrap", summary="Bootstrap first admin user")
async def bootstrap_admin(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Make the current user an admin if no admins exist in the DB."""
    admin_check = await db.execute(select(User).where(User.is_admin == True))
    first_admin = admin_check.scalar_first()
    
    if first_admin is not None:
        raise HTTPException(status_code=403, detail="Admin already exists.")

    current_user.is_admin = True
    await db.flush()
    await db.refresh(current_user)
    
    return {"message": "You are now admin.", "user": current_user}


# ── GET /admin/dashboard ──────────────────────────────────────
@router.get("/dashboard", response_model=AdminStatsResponse)
async def admin_dashboard(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    total_hosts = (await db.execute(select(func.count(User.id)).where(User.is_host == True))).scalar() or 0
    total_vendors = (await db.execute(select(func.count(Vendor.id)))).scalar() or 0
    total_spaces = (await db.execute(select(func.count(Space.id)).where(Space.is_active == True))).scalar() or 0
    total_bookings = (await db.execute(select(func.count(Booking.id)))).scalar() or 0
    
    confirmed_bookings = (await db.execute(
        select(func.count(Booking.id)).where(Booking.status == BookingStatus.CONFIRMED)
    )).scalar() or 0
    
    pending_kyc = (await db.execute(
        select(func.count(User.id)).where(
            cast(User.kyc_status, String).in_(["PENDING", "UNDER_REVIEW"])
        )
    )).scalar() or 0

    recent_bookings_query = (
        select(Booking, Space.title.label("space_title"), User.full_name.label("renter_name"))
        .join(Space, Booking.space_id == Space.id)
        .join(User, Booking.renter_id == User.id)
        .order_by(Booking.created_at.desc())
        .limit(10)
    )
    result = await db.execute(recent_bookings_query)
    
    recent_bookings = []
    for booking, space_title, renter_name in result.all():
        recent_bookings.append({
            "id": booking.id,
            "space_title": space_title,
            "renter_name": renter_name,
            "total_amount": float(booking.total_amount),
            "status": booking.status,
            "created_at": booking.created_at
        })

    return AdminStatsResponse(
        total_users=total_users,
        total_hosts=total_hosts,
        total_vendors=total_vendors,
        total_spaces=total_spaces,
        total_bookings=total_bookings,
        confirmed_bookings=confirmed_bookings,
        pending_kyc=pending_kyc,
        recent_bookings=recent_bookings
    )


# ── GET /admin/users ──────────────────────────────────────────
@router.get("/users")
async def get_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(stmt)
    users = result.scalars().all()
    
    total = (await db.execute(select(func.count(User.id)))).scalar() or 0
    return {"users": users, "total": total, "page": page, "limit": limit}


# ── GET /admin/users/by-phone/{phone} ─────────────────────────
@router.get("/users/by-phone/{phone}")
async def get_user_by_phone(
    phone: str,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ── POST /admin/promote-admin/{user_id} ───────────────────────
@router.post("/promote-admin/{user_id}")
async def promote_admin(
    user_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_admin = True
    await db.flush()
    await db.refresh(user)
    return user


# ── POST /admin/make-host/{user_id} ───────────────────────────
@router.post("/make-host/{user_id}")
async def make_host(
    user_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_host = True
    user.kyc_status = KYCStatus.APPROVED
    await db.flush()
    await db.refresh(user)
    return user


# ── GET /admin/kyc/queue ──────────────────────────────────────
@router.get("/kyc/queue")
async def kyc_queue(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    # Depending on schema, you'd join with KYCDocument. Assuming simple query for now.
    stmt = select(User).where(User.kyc_status.in_([KYCStatus.PENDING])).order_by(User.created_at.asc())
    result = await db.execute(stmt)
    return result.scalars().all()


# ── POST /admin/kyc/{user_id}/approve ─────────────────────────
@router.post("/kyc/{user_id}/approve")
async def approve_kyc(
    user_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.kyc_status = KYCStatus.APPROVED
    await db.flush()
    await db.refresh(user)
    
    try:
        await send_whatsapp(user.phone, "✅ Your FlexiSpace KYC is approved! You can now list spaces.")
    except Exception as e:
        logger.warning(f"WhatsApp failed: {e}")
        
    return user


# ── POST /admin/kyc/{user_id}/reject ──────────────────────────
@router.post("/kyc/{user_id}/reject")
async def reject_kyc(
    user_id: UUID,
    body: RejectKYCRequest,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.kyc_status = KYCStatus.REJECTED
    await db.flush()
    await db.refresh(user)
    
    try:
        await send_whatsapp(
            user.phone, 
            f"Your KYC was not approved. Reason: {body.reason}. Please re-upload documents via the app."
        )
    except Exception as e:
        logger.warning(f"WhatsApp failed: {e}")
        
    return user


# ── GET /admin/spaces ─────────────────────────────────────────
@router.get("/spaces")
async def get_spaces(
    is_active: Optional[bool] = None,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Space, User.full_name, func.count(Booking.id).label("booking_count"))
        .join(User, Space.host_id == User.id)
        .outerjoin(Booking, Space.id == Booking.space_id)
        .group_by(Space.id, User.full_name)
    )
    
    if is_active is not None:
        stmt = stmt.where(Space.is_active == is_active)
        
    result = await db.execute(stmt)
    
    data = []
    for space, host_name, b_count in result.all():
        d = space.__dict__.copy()
        if "_sa_instance_state" in d:
             del d["_sa_instance_state"]
        d["host_name"] = host_name
        d["booking_count"] = b_count
        data.append(d)
        
    return data


# ── POST /admin/spaces/{space_id}/toggle-active ───────────────
@router.post("/spaces/{space_id}/toggle-active")
async def toggle_space_active(
    space_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Space).where(Space.id == space_id))
    space = result.scalar_one_or_none()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
        
    space.is_active = not space.is_active
    await db.flush()
    await db.refresh(space)
    return space


# ── GET /admin/bookings ───────────────────────────────────────
@router.get("/bookings")
async def get_bookings(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    host_alias = select(User).alias("host_user")
    renter_alias = select(User).alias("renter_user")

    query = (
        select(
            Booking, 
            Space.title.label("space_title"), 
            renter_alias.c.full_name.label("renter_name"),
            host_alias.c.full_name.label("host_name")
        )
        .join(Space, Booking.space_id == Space.id)
        .join(renter_alias, Booking.renter_id == renter_alias.c.id)
        .join(host_alias, Space.host_id == host_alias.c.id)
        .order_by(Booking.created_at.desc())
    )

    if status_filter:
        try:
            enum_status = BookingStatus(status_filter)
            query = query.where(Booking.status == enum_status)
        except ValueError:
            pass

    query = query.offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)

    bookings = []
    for booking, space_title, renter_name, host_name in result.all():
        bookings.append({
            "id": booking.id,
            "space_title": space_title,
            "renter_name": renter_name,
            "host_name": host_name,
            "total_amount": float(booking.total_amount),
            "status": booking.status,
            "created_at": booking.created_at
        })

    return bookings


# ── POST /admin/demo-reset ────────────────────────────────────
@router.post("/demo-reset")
async def demo_reset(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Clear all bookings and chats. Keep users, spaces, vendors."""
    try:
        deleted_messages = (await db.execute(text("DELETE FROM chat_messages"))).rowcount
        deleted_bookings = (await db.execute(text("DELETE FROM bookings"))).rowcount
        await db.commit()
    except Exception as e:
        logger.error(f"Demo reset error: {e}")
        raise HTTPException(status_code=500, detail="Demo reset failed")

    return {
        "deleted_bookings": deleted_bookings,
        "deleted_messages": deleted_messages,
        "message": "Demo reset complete"
    }


# ── GET /admin/stats/revenue ──────────────────────────────────
@router.get("/stats/revenue")
async def revenue_stats(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    # Bookings by Space Type
    type_query = (
        select(Space.space_type, func.count(Booking.id))
        .join(Booking, Booking.space_id == Space.id)
        .group_by(Space.space_type)
    )
    res_types = await db.execute(type_query)
    
    by_type = {}
    for t, count in res_types.all():
        val = t.value if hasattr(t, "value") else str(t)
        by_type[val] = count
        
    return {
        "revenue_by_week": [], # For simplicity we'll omit the complex cross-db week grouping in postgres for now
        "bookings_by_space_type": by_type
    }
