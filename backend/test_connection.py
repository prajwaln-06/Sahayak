"""
FlexiSpace — Database Connection Test
Run: python test_connection.py
"""

import asyncio
import sys
from pathlib import Path

# Ensure app is importable
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.config import get_settings


async def test_connection():
    """Test raw asyncpg connection to Supabase PostgreSQL."""
    settings = get_settings()
    db_url = settings.async_database_url
    print(f"Connecting to: {db_url[:50]}...")

    try:
        import asyncpg

        # Parse the URL to extract components for asyncpg
        # URL format: postgresql+asyncpg://user:pass@host:port/db
        raw_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

        conn = await asyncpg.connect(raw_url)
        version = await conn.fetchval("SELECT version()")
        print(f"\n[OK] DB connection OK")
        print(f"   PostgreSQL: {version[:60]}...")

        # Check if pgvector extension exists
        ext = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector')"
        )
        print(f"   pgvector extension: {'[OK] installed' if ext else '[MISSING] not installed'}")

        # Check existing tables
        tables = await conn.fetch(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
        )
        if tables:
            print(f"   Tables: {', '.join(t['tablename'] for t in tables)}")
        else:
            print("   Tables: (none — run alembic upgrade head)")

        await conn.close()

    except Exception as e:
        print(f"\n[FAIL] DB connection FAILED")
        print(f"   Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(test_connection())
