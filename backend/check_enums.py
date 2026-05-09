import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import get_settings

async def main():
    settings = get_settings()
    engine = create_async_engine(settings.async_database_url, connect_args={"statement_cache_size": 0})
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT typname FROM pg_type WHERE typtype = 'e';"))
        for row in result:
            print(row[0])
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
