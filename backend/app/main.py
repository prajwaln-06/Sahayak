"""
FlexiSpace — FastAPI Application Entry Point
Sets up CORS, registers routers, and defines the /health endpoint.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth as auth_router
from app.routers import listings as listings_router
from app.routers import kyc as kyc_router
from app.routers import search as search_router
from app.routers import concierge as concierge_router
from app.routers import bookings as bookings_router
from app.routers import vendors as vendors_router
from app.routers import chat as chat_router
from app.routers import admin as admin_router

settings = get_settings()

# ── Logging ───────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO if settings.node_env == "development" else logging.WARNING,
    format="%(asctime)s │ %(levelname)-8s │ %(name)s │ %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Lifespan ──────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown hooks."""
    logger.info("🚀 FlexiSpace backend starting up...")
    logger.info(f"   Environment : {settings.node_env}")
    logger.info(f"   Database    : {settings.supabase_url}")
    yield
    logger.info("🛑 FlexiSpace backend shutting down...")


# ── FastAPI App ───────────────────────────────────────────────
app = FastAPI(
    title="FlexiSpace API",
    description="Space booking marketplace — backend API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# ── CORS Middleware ───────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers ──────────────────────────────────────────────────
app.include_router(auth_router.router)
app.include_router(listings_router.router)
app.include_router(kyc_router.router)
app.include_router(search_router.router)
app.include_router(concierge_router.router)
app.include_router(bookings_router.router)
app.include_router(vendors_router.router)
app.include_router(chat_router.router)
app.include_router(admin_router.router, prefix="/admin", tags=["admin"])


# ── Health Check ──────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "version": "1.0.0"}
