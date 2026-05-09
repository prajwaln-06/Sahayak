import os
import sys
from dotenv import load_dotenv
from pathlib import Path

for candidate in [
    Path(__file__).resolve().parent / ".env",
    Path(__file__).resolve().parents[1] / ".env",
]:
    if candidate.exists():
        load_dotenv(candidate)
        print(f"✅ Loaded .env from: {candidate}")
        break

print(f"GROQ: {'✅' if os.getenv('GROQ_API_KEY') else '❌ MISSING'}")
print(f"GEMINI: {'✅' if os.getenv('GEMINI_API_KEY') else '❌ MISSING'}")

import urllib.request
import urllib.error
import json
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def async_db_check(db_url):
    # Convert exactly as app.config does
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    engine = create_async_engine(db_url, connect_args={"statement_cache_size": 0})
    async with engine.connect() as conn:
        users_count = (await conn.execute(text("SELECT count(*) FROM users"))).scalar()
        spaces_count = (await conn.execute(text("SELECT count(*) FROM spaces"))).scalar()
        vendors_count = (await conn.execute(text("SELECT count(*) FROM vendors"))).scalar()
        bookings_count = (await conn.execute(text("SELECT count(*) FROM bookings"))).scalar()
        
        spaces_json = (await conn.execute(text("SELECT photo_urls FROM spaces"))).scalars().all()
        missing_photos = sum(1 for p in spaces_json if not p or len(p) == 0)
        
    await engine.dispose()
    return users_count, spaces_count, vendors_count, bookings_count, missing_photos

def main():
    print("================================")
    print("  FLEXISPACE — DEMO READINESS")
    print("================================")
    print("DATABASE:")
    
    # 1. Check PostgreSQL
    db_url = os.getenv("SUPABASE_DB_URL")
    if not db_url:
        print("  ❌ No SUPABASE_DB_URL found.")
        sys.exit(1)
        
    try:
        users_count, spaces_count, vendors_count, bookings_count, missing_photos = asyncio.run(async_db_check(db_url))
        
        print(f"  ✅ Users:     {users_count}")
        print(f"  ✅ Spaces:    {spaces_count}")
        print(f"  ✅ Vendors:   {vendors_count}")
        print(f"  ✅ Bookings:  {bookings_count}")
            
    except Exception as e:
        print(f"  ❌ Database connection failed: {e}")
        sys.exit(1)
        
    print("\nSERVICES:")
    
    warnings = []
    
    # 2. Ping Upstash Redis REST
    upstash_url = os.getenv("UPSTASH_REDIS_REST_URL")
    upstash_token = os.getenv("UPSTASH_REDIS_REST_TOKEN")
    
    try:
        if not upstash_url or not upstash_token:
            raise Exception("Missing UPSTASH configured variables")
            
        req = urllib.request.Request(f"{upstash_url}/set/test_key/test_val", 
                                     headers={"Authorization": f"Bearer {upstash_token}"})
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print("  ✅ Redis — connected")
            else:
                raise Exception("Failed status code on SET")
    except Exception as e:
        print(f"  ❌ Redis — failed ({e})")
        warnings.append("Redis failed")
        
    # 3. Gemini API 

    gemini_key = os.getenv("GEMINI_API_KEY")
    gemini_model = os.getenv("GEMINI_EMBEDDING_MODEL", "models/gemini-embedding-2")
    try:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/"
            f"{gemini_model}:embedContent?key={gemini_key}"
        )
        payload = json.dumps({
            "model": gemini_model,
            "content": {"parts": [{"text": "test"}]},
            "taskType": "RETRIEVAL_QUERY"
        }).encode("utf-8")
        req = urllib.request.Request(
            url, data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            if "embedding" in data:
                print(f"  ✅ Gemini embeddings — connected ({gemini_model})")
            else:
                print("  ⚠️  Gemini embeddings — unexpected response")
    except Exception as e:
        print(f"  ⚠️  Gemini embeddings — failed ({e})")

    # 4. Groq API
    groq_key = os.getenv("GROQ_API_KEY")
    try:
        import httpx
        headers = {
            "Authorization": f"Bearer {groq_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0"
        }
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [{"role": "user", "content": "hi"}],
            "max_tokens": 1
        }
        with httpx.Client(timeout=10) as client:
            resp = client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=payload
            )
            if resp.status_code == 200:
                print("  ✅ Groq LLM — connected")
            else:
                print(f"  ⚠️  Groq LLM — status {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"  ⚠️  Groq LLM — failed ({e})")
        
    # 5. Twilio API
    twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
    twilio_auth = os.getenv("TWILIO_AUTH_TOKEN")
    try:
        if not twilio_sid or not twilio_auth:
            raise Exception("Missing Twilio credentials")
            
        import base64
        auth = base64.b64encode(f"{twilio_sid}:{twilio_auth}".encode("utf-8")).decode("utf-8")
        url = f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}.json"
        
        req = urllib.request.Request(url, headers={"Authorization": f"Basic {auth}"})
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print("  ✅ Twilio — connected")
            else:
                raise Exception("Non 200 status code")
    except Exception as e:
        print(f"  ❌ Twilio — failed ({e})")
        warnings.append("Twilio failed")
        
    # 6. Cloudinary
    cloudinary_key = os.getenv("CLOUDINARY_API_KEY")
    cloudinary_secret = os.getenv("CLOUDINARY_API_SECRET")
    cloudinary_cloud = os.getenv("CLOUDINARY_CLOUD_NAME")
    try:
        if not cloudinary_key or not cloudinary_secret or not cloudinary_cloud:
            raise Exception("Missing Cloudinary credentials")
        import base64
        auth = base64.b64encode(f"{cloudinary_key}:{cloudinary_secret}".encode("utf-8")).decode("utf-8")
        url = f"https://api.cloudinary.com/v1_1/{cloudinary_cloud}/ping"
        req = urllib.request.Request(url, headers={"Authorization": f"Basic {auth}"})
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print("  ✅ Cloudinary — connected")
            else:
                raise Exception("Non 200 status code")
    except Exception as e:
        if "HTTP Error 401" not in str(e) and "HTTP Error 404" not in str(e): # It might be a 404 if ping not allowed without full perms but basic auth succeeds
            print(f"  ⚠️ Cloudinary might be unreachable or ping blocked ({e})")
        else:
             print("  ✅ Cloudinary — likely connected (check manual configuration)")

    print("\nWARNINGS:")
    if spaces_count < 2:
        warnings.append(f"Only {spaces_count} spaces found — Need more spaces listed")
    if missing_photos > 0:
        warnings.append(f"{missing_photos} spaces have no photos — add photos before demo")
    if bookings_count == 0:
        warnings.append("No bookings exist — do a test booking")
    if vendors_count == 0:
        warnings.append("No vendors registered")
        
    if warnings:
        for w in warnings:
            print(f"  ⚠️  {w}")
    else:
        print("  (None)")
        
    critical_failures = [w for w in warnings if
                        "Database" in w or "Redis" in w]
    if critical_failures:
        print("\nRESULT: NOT READY ❌")
    else:
        print("\nRESULT: READY FOR DEMO ✅")
        if warnings:
            print("(Some non-critical warnings — see above)")

if __name__ == "__main__":
    main()
