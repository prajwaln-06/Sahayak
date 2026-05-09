"""
FlexiSpace — Search Router
Vector similarity search endpoint using Gemini embeddings.
"""

import logging
from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services import search_service, pricing_service, embedding_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["Search"])


# ── Schemas ───────────────────────────────────────────────────

class VectorSearchRequest(BaseModel):
    query: str = Field(..., min_length=2, description="Natural language search query")
    city: Optional[str] = None
    capacity: Optional[int] = Field(None, ge=1)
    date: Optional[str] = Field(None, description="YYYY-MM-DD")
    budget: Optional[float] = Field(None, gt=0, description="Max hourly budget in INR")
    limit: int = Field(default=10, ge=1, le=50)


class SpaceSearchResult(BaseModel):
    id: UUID
    title: str
    space_type: str
    city: str
    neighbourhood: Optional[str] = None
    base_price_hourly: float
    rating_avg: float
    review_count: int
    capacity_seated: Optional[int] = None
    capacity_standing: Optional[int] = None
    thumbnail_url: Optional[str] = None
    instant_book: bool
    match_score: float
    available: bool = True

    model_config = {"from_attributes": True}


class VectorSearchResponse(BaseModel):
    results: list[SpaceSearchResult]
    total: int
    query: str


# ── POST /search/vector ──────────────────────────────────────
@router.post(
    "/vector",
    response_model=VectorSearchResponse,
    summary="Semantic vector search using Gemini embeddings",
)
async def vector_search(
    body: VectorSearchRequest,
    db: AsyncSession = Depends(get_db),
):
    target_date = None
    if body.date:
        try:
            parts = body.date.split("-")
            target_date = date(int(parts[0]), int(parts[1]), int(parts[2]))
        except (ValueError, IndexError):
            raise HTTPException(status_code=422, detail="Invalid date. Use YYYY-MM-DD.")

    try:
        results = await search_service.vector_search(
            db,
            query=body.query,
            city=body.city,
            capacity=body.capacity,
            budget=body.budget,
            target_date=target_date,
            limit=body.limit,
        )
    except Exception as e:
        logger.warning(f"Vector search failed, falling back to text: {e}")
        spaces = await search_service.text_search(db, body.query, city=body.city, limit=body.limit)
        results = [{"space": s, "match_score": 0.5} for s in spaces]

    search_results = []
    for r in results:
        s = r["space"]
        search_results.append(SpaceSearchResult(
            id=s.id,
            title=s.title,
            space_type=s.space_type.value if hasattr(s.space_type, "value") else str(s.space_type),
            city=s.city,
            neighbourhood=s.neighbourhood,
            base_price_hourly=s.base_price_hourly,
            rating_avg=s.rating_avg,
            review_count=s.review_count,
            capacity_seated=s.capacity_seated,
            capacity_standing=s.capacity_standing,
            thumbnail_url=s.thumbnail_url,
            instant_book=s.instant_book,
            match_score=r["match_score"],
        ))

    return VectorSearchResponse(
        results=search_results,
        total=len(search_results),
        query=body.query,
    )
