"""
FlexiSpace — Listing Service
CRUD operations and AI description generation for spaces.
"""

import logging
from datetime import date, datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import select, and_, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.listing import Space, Availability, SpaceType
from app.models.user import User

logger = logging.getLogger(__name__)
settings = get_settings()


# ── Create Space ──────────────────────────────────────────────

async def create_space(db: AsyncSession, host: User, data: dict) -> Space:
    """Create a new listing. Host must be verified."""
    if not host.is_host:
        raise ValueError("You must be a registered host to create listings.")

    # Validate space_type
    try:
        space_type = SpaceType(data["space_type"])
    except ValueError:
        raise ValueError(f"Invalid space_type: {data['space_type']}. Must be one of: {[t.value for t in SpaceType]}")

    space = Space(
        host_id=host.id,
        title=data["title"],
        description=data.get("description"),
        space_type=space_type,
        address=data["address"],
        city=data["city"],
        neighbourhood=data.get("neighbourhood"),
        lat=data.get("lat"),
        lng=data.get("lng"),
        capacity_standing=data.get("capacity_standing"),
        capacity_seated=data.get("capacity_seated"),
        amenities=data.get("amenities", []),
        rules=data.get("rules"),
        base_price_hourly=data["base_price_hourly"],
        base_price_daily=data.get("base_price_daily"),
        weekend_multiplier=data.get("weekend_multiplier", 1.3),
        surge_enabled=data.get("surge_enabled", False),
        surge_multiplier=data.get("surge_multiplier", 1.5),
        min_booking_hours=data.get("min_booking_hours", 1),
        instant_book=data.get("instant_book", False),
    )
    db.add(space)
    await db.flush()
    await db.refresh(space)
    logger.info(f"Space created: {space.id} by host {host.id}")

    # Generate embedding in background (non-blocking)
    try:
        from app.services.embedding_service import update_space_embedding
        await update_space_embedding(db, space.id)
    except Exception as e:
        logger.warning(f"Embedding generation deferred for space {space.id}: {e}")

    return space


# ── Get Space ─────────────────────────────────────────────────

async def get_space_by_id(db: AsyncSession, space_id: UUID) -> Optional[Space]:
    """Get a single space by ID."""
    result = await db.execute(select(Space).where(Space.id == space_id))
    return result.scalar_one_or_none()


# ── List Spaces with Filters ─────────────────────────────────

async def list_spaces(
    db: AsyncSession,
    city: Optional[str] = None,
    space_type: Optional[str] = None,
    min_capacity: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    amenities: Optional[list[str]] = None,
    available_date: Optional[date] = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Space], int]:
    """List active spaces with optional filters."""
    query = select(Space).where(Space.is_active == True)

    if city:
        query = query.where(func.lower(Space.city) == city.lower())

    if space_type:
        try:
            st = SpaceType(space_type)
            query = query.where(Space.space_type == st)
        except ValueError:
            pass

    if min_capacity:
        query = query.where(
            (Space.capacity_seated >= min_capacity) | (Space.capacity_standing >= min_capacity)
        )

    if min_price is not None:
        query = query.where(Space.base_price_hourly >= min_price)

    if max_price is not None:
        query = query.where(Space.base_price_hourly <= max_price)

    if amenities:
        for amenity in amenities:
            query = query.where(Space.amenities.contains([amenity]))

    if available_date:
        # Exclude spaces that have this date blocked
        blocked_subq = select(Availability.space_id).where(
            Availability.blocked_date == available_date
        ).scalar_subquery()
        query = query.where(~Space.id.in_(blocked_subq))

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    offset = (page - 1) * page_size
    query = query.order_by(Space.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(query)
    spaces = list(result.scalars().all())

    return spaces, total


# ── Update Space ──────────────────────────────────────────────

async def update_space(db: AsyncSession, space: Space, host: User, data: dict) -> Space:
    """Update a space. Only the owning host can update."""
    if space.host_id != host.id:
        raise ValueError("You can only update your own listings.")

    for key, value in data.items():
        if value is not None and hasattr(space, key):
            if key == "space_type":
                try:
                    value = SpaceType(value)
                except ValueError:
                    raise ValueError(f"Invalid space_type: {value}")
            setattr(space, key, value)

    await db.flush()
    await db.refresh(space)
    return space


# ── Soft Delete ───────────────────────────────────────────────

async def soft_delete_space(db: AsyncSession, space: Space, host: User) -> None:
    """Soft-delete by setting is_active=False."""
    if space.host_id != host.id:
        raise ValueError("You can only delete your own listings.")
    space.is_active = False
    await db.flush()


# ── Photo Management ─────────────────────────────────────────

async def add_photos(db: AsyncSession, space: Space, urls: list[str]) -> Space:
    """Add photo URLs to a space."""
    current = list(space.photo_urls or [])
    current.extend(urls)
    space.photo_urls = current
    if not space.thumbnail_url and urls:
        space.thumbnail_url = urls[0]
    await db.flush()
    await db.refresh(space)
    return space


# ── Availability ──────────────────────────────────────────────

async def block_date(
    db: AsyncSession, space_id: UUID, blocked_date: date, reason: Optional[str] = None
) -> Availability:
    """Block a specific date for a space."""
    # Check if already blocked
    result = await db.execute(
        select(Availability).where(
            and_(
                Availability.space_id == space_id,
                Availability.blocked_date == blocked_date,
            )
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise ValueError(f"Date {blocked_date} is already blocked.")

    block = Availability(space_id=space_id, blocked_date=blocked_date, reason=reason)
    db.add(block)
    await db.flush()
    await db.refresh(block)
    return block


async def unblock_date(db: AsyncSession, space_id: UUID, target_date: date) -> None:
    """Remove a date block for a space."""
    await db.execute(
        delete(Availability).where(
            and_(
                Availability.space_id == space_id,
                Availability.blocked_date == target_date,
            )
        )
    )
    await db.flush()


async def get_blocked_dates(
    db: AsyncSession, space_id: UUID, year: int, month: int
) -> list[Availability]:
    """Get all blocked dates for a space in a given month."""
    from calendar import monthrange

    _, last_day = monthrange(year, month)
    start = date(year, month, 1)
    end = date(year, month, last_day)

    result = await db.execute(
        select(Availability).where(
            and_(
                Availability.space_id == space_id,
                Availability.blocked_date >= start,
                Availability.blocked_date <= end,
            )
        ).order_by(Availability.blocked_date)
    )
    return list(result.scalars().all())


# ── AI Description Generation ────────────────────────────────

async def generate_description(bullet_points: list[str], space_type: str) -> str:
    """
    Use Groq (llama-3.3-70b-versatile) to generate an SEO-optimized listing description.
    """
    from langchain_groq import ChatGroq

    llm = ChatGroq(
        api_key=settings.groq_api_key,
        model_name="llama-3.3-70b-versatile",
        temperature=0.7,
        max_tokens=500,
    )

    bullet_text = "\n".join(f"- {bp}" for bp in bullet_points)
    prompt = f"""You are an expert real estate copywriter for FlexiSpace, a premium space booking marketplace in India.

Write a compelling, SEO-optimized listing description for a {space_type} space.

Key features:
{bullet_text}

Requirements:
- 2-3 paragraphs, 150-200 words
- Highlight unique selling points
- Use engaging, professional language
- Include relevant keywords for search
- Appeal to corporate event planners, photographers, and creatives
- Do NOT use bullet points in the output
- Return ONLY the description text, no headers or labels"""

    response = await llm.ainvoke(prompt)
    return response.content.strip()
