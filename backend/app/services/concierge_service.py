"""
FlexiSpace — AI Concierge Service
LangChain ChatGroq (llama-3.3-70b-versatile) with tool-calling for venue search.
Compatible with langchain >=1.2.
"""

import json
import logging
import re
from datetime import date, datetime
from typing import Optional

import httpx
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool

from app.config import get_settings
from app.database import async_session
from app.services import search_service, pricing_service
from app.models.listing import Space, Availability

logger = logging.getLogger(__name__)
settings = get_settings()

_llm = None
_llm_with_tools = None


# ── Tool Definitions ──────────────────────────────────────────

@tool
async def search_spaces(
    location: str,
    capacity: int = 20,
    date_str: str = "",
    budget_hourly: float = 5000.0,
    amenities: str = "",
) -> str:
    """Search for spaces matching criteria. Returns top 5 as formatted text.

    Args:
        location: City or area name (e.g. 'Koramangala', 'Mumbai')
        capacity: Minimum number of people
        date_str: Date in YYYY-MM-DD format (optional)
        budget_hourly: Maximum hourly budget in INR
        amenities: Comma-separated amenity keywords (optional)
    """
    query_parts = [location]
    if amenities:
        query_parts.append(amenities)
    query_text = " ".join(query_parts)

    target_date = None
    if date_str:
        try:
            parts = date_str.split("-")
            target_date = date(int(parts[0]), int(parts[1]), int(parts[2]))
        except (ValueError, IndexError):
            pass

    try:
        async with async_session() as db:
            results = await search_service.vector_search(
                db,
                query=query_text,
                city=location if len(location) > 3 else None,
                capacity=capacity,
                budget=budget_hourly,
                target_date=target_date,
                limit=5,
            )

            if not results:
                spaces = await search_service.text_search(
                    db,
                    query_text,
                    city=location,
                    capacity=capacity,
                    budget=budget_hourly,
                    target_date=target_date,
                    limit=5,
                )
                results = [{"space": s, "match_score": 0.5, "distance": 0.5} for s in spaces]

            if not results:
                return "No spaces found matching your criteria. Try broadening your search."

            lines = []
            for i, r in enumerate(results, 1):
                s = r["space"]
                score = r["match_score"]
                cap = s.capacity_seated or s.capacity_standing or "N/A"
                amenity_str = ", ".join(s.amenities[:5]) if s.amenities else "None listed"
                lines.append(
                    f"{i}. **{s.title}** ({s.space_type.value if hasattr(s.space_type, 'value') else s.space_type})\n"
                    f"   📍 {s.neighbourhood or ''}, {s.city} | ⭐ {s.rating_avg:.1f}\n"
                    f"   👥 Capacity: {cap} | 💰 Rs.{s.base_price_hourly:,.0f}/hr\n"
                    f"   🏷 Amenities: {amenity_str}\n"
                    f"   📊 Match: {score:.0%} | ID: {s.id}"
                )
            return "\n\n".join(lines)

    except Exception as e:
        logger.error(f"search_spaces tool error: {e}")
        return f"Search failed: {str(e)[:100]}. Please try again."


@tool
async def get_price_estimate(space_id: str, hours: float = 2.0, date_str: str = "") -> str:
    """Get price estimate for a space. Returns base cost, platform fee, GST breakdown.

    Args:
        space_id: UUID of the space
        hours: Number of hours to book
        date_str: Booking date in YYYY-MM-DD format
    """
    try:
        start_dt = datetime.now()
        if date_str:
            try:
                parts = date_str.split("-")
                start_dt = datetime(int(parts[0]), int(parts[1]), int(parts[2]), 10, 0)
            except (ValueError, IndexError):
                pass

        end_dt = datetime.fromtimestamp(start_dt.timestamp() + hours * 3600)

        async with async_session() as db:
            from sqlalchemy import select
            result = await db.execute(select(Space).where(Space.id == space_id))
            space = result.scalar_one_or_none()
            if not space:
                return f"Space {space_id} not found."

            pricing = pricing_service.calculate_price(
                base_price_hourly=space.base_price_hourly,
                start_dt=start_dt,
                end_dt=end_dt,
                weekend_multiplier=space.weekend_multiplier,
                surge_enabled=space.surge_enabled,
                surge_multiplier=space.surge_multiplier,
            )
            return (
                f"**Price Estimate for {space.title}** ({hours:.0f}h)\n"
                f"Base: Rs.{pricing['base_price']:,.2f}\n"
                f"Platform fee (12%): Rs.{pricing['platform_fee']:,.2f}\n"
                f"GST (18%): Rs.{pricing['gst']:,.2f}\n"
                f"**Total: Rs.{pricing['total']:,.2f}**\n"
                f"{'⚠ Weekend surcharge applied' if pricing.get('weekend_applied') else ''}\n"
                f"{'⚠ Surge pricing active' if pricing.get('surge_applied') else ''}"
            ).strip()

    except Exception as e:
        logger.error(f"get_price_estimate error: {e}")
        return f"Price calculation failed: {str(e)[:100]}"


@tool
async def check_availability(space_id: str, date_str: str, start_hour: int = 10, duration: int = 2) -> str:
    """Check if space is available for given date/time.

    Args:
        space_id: UUID of the space
        date_str: Date in YYYY-MM-DD format
        start_hour: Starting hour (24h format)
        duration: Duration in hours
    """
    try:
        parts = date_str.split("-")
        target = date(int(parts[0]), int(parts[1]), int(parts[2]))

        async with async_session() as db:
            from sqlalchemy import select, and_
            result = await db.execute(
                select(Availability).where(
                    and_(
                        Availability.space_id == space_id,
                        Availability.blocked_date == target,
                    )
                )
            )
            blocked = result.scalar_one_or_none()

            if blocked:
                reason = f" (Reason: {blocked.reason})" if blocked.reason else ""
                return f"❌ **Blocked** on {date_str}{reason}. Try another date."
            else:
                return f"✅ **Available** on {date_str} from {start_hour}:00 for {duration}h."

    except Exception as e:
        logger.error(f"check_availability error: {e}")
        return f"Availability check failed: {str(e)[:100]}"


# ── Agent Setup ───────────────────────────────────────────────

SYSTEM_PROMPT = """You are FlexiSpace AI Concierge, an expert venue finder for India.

Your role:
- Help users find and book the perfect space (conference rooms, studios, rooftops, etc.)
- Extract booking intent: city, date, capacity, budget, amenities
- Always confirm key details before searching
- Be conversational, helpful, and concise
- Respond in the same language the user writes in
- Format results as structured info, not long paragraphs
- When showing spaces, include the space ID for follow-up queries
- When recommending spaces, ALWAYS end each space recommendation with exactly: ID: [the-space-uuid]
  Never omit the ID. Format it on its own line.
- If the user asks about pricing, use the get_price_estimate tool
- If the user asks about availability, use the check_availability tool

Important:
- You cover all major Indian cities
- Prices are in Indian Rupees (Rs. / ₹)
- Always suggest 2-3 options when possible
- If you don't have enough information, ask clarifying questions
"""

available_tools = [search_spaces, get_price_estimate, check_availability]
tool_map = {t.name: t for t in available_tools}


def _get_llm():
    global _llm
    if _llm is None:
        _llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            api_key=settings.GROQ_API_KEY,
        )
    return _llm


def _get_llm_with_tools():
    global _llm_with_tools
    if _llm_with_tools is None:
        _llm_with_tools = _get_llm().bind_tools(available_tools)
    return _llm_with_tools


# ── Chat Function ─────────────────────────────────────────────

async def chat(message: str, history: list[dict] | None = None) -> dict:
    """
    Process a chat message through the AI concierge with manual tool-call loop.
    """
    messages = [SystemMessage(content=SYSTEM_PROMPT)]

    if history:
        for msg in history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))

    messages.append(HumanMessage(content=message))

    try:
        # Iterative tool-calling loop (max 5 iterations)
        for _ in range(5):
            response = await _get_llm_with_tools().ainvoke(messages)
            messages.append(response)

            # If the model made tool calls, execute them and loop
            if hasattr(response, "tool_calls") and response.tool_calls:
                for tc in response.tool_calls:
                    tool_fn = tool_map.get(tc["name"])
                    if tool_fn:
                        try:
                            result = await tool_fn.ainvoke(tc["args"])
                        except Exception as e:
                            result = f"Tool error: {str(e)[:200]}"
                    else:
                        result = f"Unknown tool: {tc['name']}"

                    messages.append(ToolMessage(content=str(result), tool_call_id=tc["id"]))
                continue  # Loop back so model can use tool results

            # No tool calls — we have the final response
            break

        response_text = response.content or "I couldn't process that. Could you try again?"

        # Extract space IDs from response for frontend cards
        space_ids = re.findall(r"ID:\s*([0-9a-f-]{36})", response_text)

        return {
            "response": response_text,
            "space_ids": space_ids,
        }

    except Exception as e:
        logger.error(f"Concierge chat error: {e}")
        return {
            "response": "I'm having trouble right now. Please try again in a moment.",
            "space_ids": [],
        }


async def translate_text(text: str, target_lang: str) -> str:
    """Translate text to target language using Groq."""
    try:
        result = await _get_llm().ainvoke(
            f"Translate the following text to {target_lang}. Return ONLY the translation, nothing else.\n\n{text}"
        )
        return result.content.strip()
    except Exception as e:
        logger.error(f"Translation error: {e}")
        return text


# ── Redis Session Management ─────────────────────────────────

async def load_session(session_id: str) -> list[dict]:
    """Load conversation history from Upstash Redis."""
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"{settings.upstash_redis_rest_url}/get/concierge:{session_id}",
                headers={"Authorization": f"Bearer {settings.upstash_redis_rest_token}"},
                timeout=5,
            )
            data = res.json()
            if data.get("result"):
                return json.loads(data["result"])
    except Exception as e:
        logger.warning(f"Redis load failed for session {session_id}: {e}")
    return []


async def save_session(session_id: str, history: list[dict]) -> None:
    """Save conversation history to Upstash Redis with 15 min TTL."""
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{settings.upstash_redis_rest_url}/set/concierge:{session_id}",
                headers={
                    "Authorization": f"Bearer {settings.upstash_redis_rest_token}",
                    "Content-Type": "application/json",
                },
                json=json.dumps(history),
                timeout=5,
            )
            await client.post(
                f"{settings.upstash_redis_rest_url}/expire/concierge:{session_id}/900",
                headers={"Authorization": f"Bearer {settings.upstash_redis_rest_token}"},
                timeout=5,
            )
    except Exception as e:
        logger.warning(f"Redis save failed for session {session_id}: {e}")
