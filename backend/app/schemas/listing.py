"""
FlexiSpace — Listing Pydantic Schemas
"""

from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Requests ──────────────────────────────────────────────────

class CreateSpaceRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    space_type: str = Field(..., description="One of: CONFERENCE_ROOM, STUDIO, ROOFTOP, GARDEN, GALLERY, RESTAURANT, WAREHOUSE, OTHER")
    address: str = Field(..., min_length=5)
    city: str = Field(..., min_length=2, max_length=100)
    neighbourhood: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    capacity_standing: Optional[int] = Field(None, ge=0)
    capacity_seated: Optional[int] = Field(None, ge=0)
    amenities: list[str] = Field(default_factory=list)
    rules: Optional[dict[str, Any]] = None
    base_price_hourly: float = Field(..., gt=0)
    base_price_daily: Optional[float] = Field(None, gt=0)
    weekend_multiplier: float = Field(default=1.3, ge=1.0)
    surge_enabled: bool = False
    surge_multiplier: float = Field(default=1.5, ge=1.0)
    min_booking_hours: int = Field(default=1, ge=1)
    instant_book: bool = False


class UpdateSpaceRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = None
    space_type: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    neighbourhood: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    capacity_standing: Optional[int] = Field(None, ge=0)
    capacity_seated: Optional[int] = Field(None, ge=0)
    amenities: Optional[list[str]] = None
    rules: Optional[dict[str, Any]] = None
    base_price_hourly: Optional[float] = Field(None, gt=0)
    base_price_daily: Optional[float] = Field(None, gt=0)
    weekend_multiplier: Optional[float] = Field(None, ge=1.0)
    surge_enabled: Optional[bool] = None
    surge_multiplier: Optional[float] = Field(None, ge=1.0)
    min_booking_hours: Optional[int] = Field(None, ge=1)
    instant_book: Optional[bool] = None
    is_active: Optional[bool] = None
    thumbnail_url: Optional[str] = None


class BlockDateRequest(BaseModel):
    blocked_date: date
    reason: Optional[str] = None


class GenerateDescriptionRequest(BaseModel):
    bullet_points: list[str] = Field(..., min_length=1)
    space_type: str


class PriceCalculateRequest(BaseModel):
    space_id: UUID
    start_datetime: datetime
    end_datetime: datetime
    demand_factor: float = Field(default=1.0, ge=0.0, le=2.0)


# ── Responses ─────────────────────────────────────────────────

class SpaceResponse(BaseModel):
    id: UUID
    host_id: UUID
    title: str
    description: Optional[str] = None
    space_type: str
    address: str
    city: str
    neighbourhood: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    capacity_standing: Optional[int] = None
    capacity_seated: Optional[int] = None
    amenities: list[str] = []
    rules: Optional[dict[str, Any]] = None
    base_price_hourly: float
    base_price_daily: Optional[float] = None
    weekend_multiplier: float
    surge_enabled: bool
    surge_multiplier: float
    min_booking_hours: int
    instant_book: bool
    is_active: bool
    is_3d_generated: bool = False
    thumbnail_url: Optional[str] = None
    photo_urls: list[str] = []
    mesh_url: Optional[str] = None
    rating_avg: float = 0.0
    review_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SpaceListResponse(BaseModel):
    spaces: list[SpaceResponse]
    total: int
    page: int
    page_size: int


class AvailabilityResponse(BaseModel):
    id: UUID
    space_id: UUID
    blocked_date: date
    reason: Optional[str] = None

    model_config = {"from_attributes": True}


class PriceBreakdownResponse(BaseModel):
    hours: float
    base_price: float
    weekend_applied: bool
    surge_applied: bool
    platform_fee: float
    gst: float
    total: float
    breakdown: str


class PhotoUploadResponse(BaseModel):
    urls: list[str]
    thumbnail_url: str


class GenerateDescriptionResponse(BaseModel):
    description: str
