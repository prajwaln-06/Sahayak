import asyncio
import asyncpg
from app.config import get_settings

async def main():
    settings = get_settings()
    url = settings.supabase_db_url.replace("6543", "5432")
    conn = await asyncpg.connect(url)
    await conn.execute("DROP SCHEMA public CASCADE;")
    await conn.execute("CREATE SCHEMA public;")
    await conn.execute("GRANT ALL ON SCHEMA public TO postgres;")
    await conn.execute("GRANT ALL ON SCHEMA public TO public;")
    await conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    print("Schema reset successful.")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
