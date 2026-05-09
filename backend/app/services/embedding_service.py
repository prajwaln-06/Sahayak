import urllib.request
import json
import asyncio
from app.config import get_settings
from app.database import async_session

settings = get_settings()

def _http_embed(text: str, task_type: str) -> list[float]:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/"
        f"{settings.GEMINI_EMBEDDING_MODEL}:embedContent"
        f"?key={settings.GEMINI_API_KEY}"
    )
    payload = json.dumps({
        "model": settings.GEMINI_EMBEDDING_MODEL,
        "content": {"parts": [{"text": text}]},
        "taskType": task_type
    }).encode("utf-8")
    req = urllib.request.Request(
        url, data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read())
        return data["embedding"]["values"]

async def embed_text(text: str) -> list[float]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _http_embed, text, "RETRIEVAL_DOCUMENT")

async def embed_query(text: str) -> list[float]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _http_embed, text, "RETRIEVAL_QUERY")

async def embed_space(space) -> list[float]:
    amenities = " ".join(space.amenities) if space.amenities else ""
    rich_text = (
        f"{space.title} {space.space_type} {space.description} "
        f"{space.neighbourhood} {space.city} "
        f"capacity:{space.capacity_seated} amenities:{amenities}"
    )
    return await embed_text(rich_text)

async def update_space_embedding(space_id: str, db):
    from app.models.listing import Space
    space = await db.get(Space, space_id)
    if not space:
        return
    embedding = await embed_space(space)
    space.embedding = embedding
    await db.commit()


async def update_space_embedding_task(space_id: str):
    """Background-safe embedding updater using its own DB session."""
    async with async_session() as db:
        await update_space_embedding(space_id, db)
