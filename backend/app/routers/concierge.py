"""
FlexiSpace — Concierge Router
AI chat endpoints powered by LangChain + Groq.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services import concierge_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/concierge", tags=["AI Concierge"])


# ── Schemas ───────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: str = Field(..., description="Client-generated UUID for session tracking")


class SpaceSummary(BaseModel):
    id: str
    title: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    spaces: list[SpaceSummary] = []
    session_id: str


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1)
    target_lang: str = Field(..., description="Target language, e.g. Hindi, Kannada, Tamil")


class TranslateResponse(BaseModel):
    translated: str
    target_lang: str


# ── POST /concierge/chat ─────────────────────────────────────
@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Chat with the AI Concierge",
)
async def chat(body: ChatRequest):
    """
    Send a message to the AI Concierge.
    Session history is managed via Redis (15-min TTL).
    """
    try:
        # Load conversation history from Redis
        history = await concierge_service.load_session(body.session_id)

        # Run the agent
        result = await concierge_service.chat(body.message, history)

        # Update history
        history.append({"role": "user", "content": body.message})
        history.append({"role": "assistant", "content": result["response"]})

        # Keep last 20 messages to avoid context overflow
        if len(history) > 20:
            history = history[-20:]

        # Save to Redis
        await concierge_service.save_session(body.session_id, history)

        # Build space summaries from extracted IDs
        spaces = [SpaceSummary(id=sid) for sid in result.get("space_ids", [])]

        return ChatResponse(
            response=result["response"],
            spaces=spaces,
            session_id=body.session_id,
        )

    except Exception as e:
        logger.error(f"Concierge chat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI Concierge is temporarily unavailable.",
        )


# ── POST /concierge/translate ────────────────────────────────
@router.post(
    "/translate",
    response_model=TranslateResponse,
    summary="Translate text using Groq",
)
async def translate(body: TranslateRequest):
    """Translate text to a target Indian language."""
    try:
        translated = await concierge_service.translate_text(body.text, body.target_lang)
        return TranslateResponse(translated=translated, target_lang=body.target_lang)
    except Exception as e:
        logger.error(f"Translation error: {e}")
        raise HTTPException(status_code=500, detail="Translation failed.")
