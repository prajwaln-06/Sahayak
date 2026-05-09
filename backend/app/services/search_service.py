"""
FlexiSpace — Search Service
Vector similarity search using pgvector + Gemini embeddings.
"""

import logging
from datetime import date
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, text, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.listing import Space, Availability
from app.services.embedding_service import embed_query

logger = logging.getLogger(__name__)


async def vector_search(
    db: AsyncSession,
    query: str,
    city: Optional[str] = None,
    capacity: Optional[int] = None,
    budget: Optional[float] = None,
    target_date: Optional[date] = None,
    limit: int = 10,
) -> list[dict]:
    """
    Perform vector similarity search on spaces.

    1. Embed the query with retrieval_query task type
    2. Cosine similarity search via pgvector (<=> operator)
    3. Apply optional filters (city, capacity, budget, date)
    4. Return ranked spaces with distance scores
    """
    query_vec = await embed_query(query)

    # Build the base query with cosine distance
    # <=> is cosine distance in pgvector
    distance_expr = Space.embedding.cosine_distance(query_vec).label("distance")

    stmt = (
        select(Space, distance_expr)
        .where(Space.is_active == True)
        .where(Space.embedding.isnot(None))
    )

    # Apply filters
    if city:
        stmt = stmt.where(func.lower(Space.city) == city.lower())

    if capacity:
        stmt = stmt.where(
            (Space.capacity_seated >= capacity) | (Space.capacity_standing >= capacity)
        )

    if budget:
        stmt = stmt.where(Space.base_price_hourly <= budget)

    if target_date:
        # Exclude spaces blocked on the target date
        blocked_subq = (
            select(Availability.space_id)
            .where(Availability.blocked_date == target_date)
            .scalar_subquery()
        )
        stmt = stmt.where(~Space.id.in_(blocked_subq))

    # Order by cosine distance (smaller = more similar)
    stmt = stmt.order_by(text("distance")).limit(limit)

    result = await db.execute(stmt)
    rows = result.all()

    results = []
    for space, distance in rows:
        match_score = round(max(0, 1 - distance), 4)  # Convert distance to similarity score
        results.append({
            "space": space,
            "match_score": match_score,
            "distance": round(distance, 4),
        })

    if len(results) < limit:
        fallback_spaces = await text_search(
            db,
            query=query,
            city=city,
            capacity=capacity,
            budget=budget,
            target_date=target_date,
            limit=limit,
        )
        existing_ids = {r["space"].id for r in results}
        for space in fallback_spaces:
            if space.id in existing_ids:
                continue
            results.append(
                {
                    "space": space,
                    "match_score": 0.35,
                    "distance": 1.0,
                }
            )
            if len(results) >= limit:
                break

    logger.info(f"Vector search for '{query[:50]}...' returned {len(results)} results")
    return results


async def text_search(
    db: AsyncSession,
    query: str,
    city: Optional[str] = None,
    capacity: Optional[int] = None,
    budget: Optional[float] = None,
    target_date: Optional[date] = None,
    limit: int = 10,
) -> list[Space]:
    """
    Fallback text search using ILIKE when vector search isn't available.
    """
    pattern = f"%{query}%"
    stmt = (
        select(Space)
        .where(Space.is_active == True)
        .where(
            (Space.title.ilike(pattern))
            | (Space.description.ilike(pattern))
            | (Space.neighbourhood.ilike(pattern))
        )
    )

    if city:
        stmt = stmt.where(func.lower(Space.city) == city.lower())

    if capacity:
        stmt = stmt.where(
            (Space.capacity_seated >= capacity) | (Space.capacity_standing >= capacity)
        )

    if budget:
        stmt = stmt.where(Space.base_price_hourly <= budget)

    if target_date:
        blocked_subq = (
            select(Availability.space_id)
            .where(Availability.blocked_date == target_date)
            .scalar_subquery()
        )
        stmt = stmt.where(~Space.id.in_(blocked_subq))

    stmt = stmt.order_by(Space.rating_avg.desc()).limit(limit)

    result = await db.execute(stmt)
    return list(result.scalars().all())
