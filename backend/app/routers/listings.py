"""
FlexiSpace — Listings Router
All endpoints for space CRUD, photos, availability, pricing, and AI description.
"""

import asyncio
import logging
from datetime import date, datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.listing import (
    AvailabilityResponse,
    BlockDateRequest,
    CreateSpaceRequest,
    GenerateDescriptionRequest,
    GenerateDescriptionResponse,
    PhotoUploadResponse,
    PriceBreakdownResponse,
    PriceCalculateRequest,
    SpaceListResponse,
    SpaceResponse,
    UpdateSpaceRequest,
)
from app.services import listing_service, pricing_service, storage_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/listings", tags=["Listings"])


# ── POST /listings/ ───────────────────────────────────────────
@router.post(
    "/",
    response_model=SpaceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new listing (host only)",
)
async def create_listing(
    body: CreateSpaceRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        space = await listing_service.create_space(db, current_user, body.model_dump())
        return space
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"create_listing error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create listing.")


# ── GET /listings/ ────────────────────────────────────────────
@router.get(
    "/",
    response_model=SpaceListResponse,
    summary="Browse listings with filters",
)
async def list_listings(
    city: Optional[str] = Query(None),
    space_type: Optional[str] = Query(None),
    capacity: Optional[int] = Query(None, ge=1, description="Minimum capacity"),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    amenities: Optional[str] = Query(None, description="Comma-separated amenity list"),
    date: Optional[str] = Query(None, description="Available date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    amenity_list = [a.strip() for a in amenities.split(",")] if amenities else None
    available_date = None
    if date:
        try:
            from datetime import date as date_type
            parts = date.split("-")
            available_date = date_type(int(parts[0]), int(parts[1]), int(parts[2]))
        except (ValueError, IndexError):
            raise HTTPException(status_code=422, detail="Invalid date format. Use YYYY-MM-DD.")

    spaces, total = await listing_service.list_spaces(
        db,
        city=city,
        space_type=space_type,
        min_capacity=capacity,
        min_price=min_price,
        max_price=max_price,
        amenities=amenity_list,
        available_date=available_date,
        page=page,
        page_size=page_size,
    )
    return SpaceListResponse(spaces=spaces, total=total, page=page, page_size=page_size)


# ── GET /listings/{id} ───────────────────────────────────────
@router.get(
    "/{space_id}",
    response_model=SpaceResponse,
    summary="Get space detail",
)
async def get_listing(
    space_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    space = await listing_service.get_space_by_id(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Space not found.")
    return space


# ── PUT /listings/{id} ───────────────────────────────────────
@router.put(
    "/{space_id}",
    response_model=SpaceResponse,
    summary="Update listing (host only, own listing)",
)
async def update_listing(
    space_id: UUID,
    body: UpdateSpaceRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    space = await listing_service.get_space_by_id(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Space not found.")
    try:
        updated = await listing_service.update_space(
            db, space, current_user, body.model_dump(exclude_unset=True)
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


# ── DELETE /listings/{id} ────────────────────────────────────
@router.delete(
    "/{space_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft delete a listing",
)
async def delete_listing(
    space_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    space = await listing_service.get_space_by_id(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Space not found.")
    try:
        await listing_service.soft_delete_space(db, space, current_user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


# ── POST /listings/{id}/photos ────────────────────────────────
@router.post(
    "/{space_id}/photos",
    summary="Upload photos and videos to Cloudinary",
)
async def upload_photos(
    space_id: UUID,
    files: list[UploadFile] = File(..., description="Up to 10 images or videos"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    space = await listing_service.get_space_by_id(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Space not found.")
    if space.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your listing.")
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files per upload.")

    urls = []
    results = []
    video_uploaded = False
    
    for f in files:
        content = await f.read()
        if f.content_type and f.content_type.startswith("video/"):
            video_url = await storage_service.upload_video(content, folder=f"flexispace/spaces/{space_id}")
            space.video_url = video_url
            video_uploaded = True
            results.append({"type": "video", "url": video_url})
        else:
            result = await storage_service.upload_image(content, folder=f"flexispace/spaces/{space_id}")
            urls.append(result["secure_url"])
            results.append({"type": "image", "url": result["secure_url"]})

    if urls:
        space = await listing_service.add_photos(db, space, urls)
    elif video_uploaded:
        await db.flush()
        await db.refresh(space)

    if len(results) == 1:
        return results[0]
    return results


# ── POST /listings/{id}/availability/block ────────────────────
@router.post(
    "/{space_id}/availability/block",
    response_model=AvailabilityResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Block a date",
)
async def block_availability(
    space_id: UUID,
    body: BlockDateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    space = await listing_service.get_space_by_id(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Space not found.")
    if space.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your listing.")
    try:
        block = await listing_service.block_date(db, space_id, body.blocked_date, body.reason)
        return block
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── DELETE /listings/{id}/availability/{date} ─────────────────
@router.delete(
    "/{space_id}/availability/{target_date}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unblock a date",
)
async def unblock_availability(
    space_id: UUID,
    target_date: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    space = await listing_service.get_space_by_id(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Space not found.")
    if space.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your listing.")
    try:
        parts = target_date.split("-")
        d = date(int(parts[0]), int(parts[1]), int(parts[2]))
        await listing_service.unblock_date(db, space_id, d)
    except (ValueError, IndexError):
        raise HTTPException(status_code=422, detail="Invalid date format. Use YYYY-MM-DD.")


# ── GET /listings/{id}/availability ───────────────────────────
@router.get(
    "/{space_id}/availability",
    response_model=list[AvailabilityResponse],
    summary="Get blocked dates for a month",
)
async def get_availability(
    space_id: UUID,
    month: str = Query(..., description="Month in YYYY-MM format"),
    db: AsyncSession = Depends(get_db),
):
    try:
        parts = month.split("-")
        year, mon = int(parts[0]), int(parts[1])
    except (ValueError, IndexError):
        raise HTTPException(status_code=422, detail="Invalid month format. Use YYYY-MM.")

    blocks = await listing_service.get_blocked_dates(db, space_id, year, mon)
    return blocks


# ── POST /listings/ai/generate-description ────────────────────
@router.post(
    "/ai/generate-description",
    response_model=GenerateDescriptionResponse,
    summary="AI-generate listing description via Groq",
)
async def ai_generate_description(
    body: GenerateDescriptionRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        text = await listing_service.generate_description(body.bullet_points, body.space_type)
        return GenerateDescriptionResponse(description=text)
    except Exception as e:
        logger.error(f"AI description error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate description.")


# ── POST /listings/calculate-price ────────────────────────────
@router.post(
    "/calculate-price",
    response_model=PriceBreakdownResponse,
    summary="Calculate booking price",
)
async def calculate_price(
    body: PriceCalculateRequest,
    db: AsyncSession = Depends(get_db),
):
    space = await listing_service.get_space_by_id(db, body.space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Space not found.")
    try:
        result = pricing_service.calculate_price(
            base_price_hourly=space.base_price_hourly,
            start_dt=body.start_datetime,
            end_dt=body.end_datetime,
            weekend_multiplier=space.weekend_multiplier,
            surge_enabled=space.surge_enabled,
            surge_multiplier=space.surge_multiplier,
            demand_factor=body.demand_factor,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
