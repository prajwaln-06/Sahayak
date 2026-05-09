"""
FlexiSpace — Application Configuration
Reads all settings from the root .env file via Pydantic BaseSettings.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache
from pathlib import Path
import re


# .env lives at the repo root (one level above backend/)
_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    """Central configuration – every value comes from environment variables."""

    # ── Groq LLM ──────────────────────────────────────────────
    GROQ_API_KEY: str = ""

    # ── Gemini Embeddings ─────────────────────────────────────
    GEMINI_EMBEDDING_MODEL: str = "models/gemini-embedding-2"
    GEMINI_API_KEY: str = ""

    # ── Supabase / PostgreSQL ─────────────────────────────────
    supabase_url: str = Field(..., description="Supabase project URL")
    supabase_anon_key: str = Field(..., description="Supabase anon (public) key")
    supabase_service_role_key: str = Field(..., description="Supabase service-role key")
    supabase_db_url: str = Field(..., description="PostgreSQL connection string")

    # ── Twilio SMS / WhatsApp ─────────────────────────────────
    twilio_account_sid: str = Field(..., description="Twilio Account SID")
    twilio_auth_token: str = Field(..., description="Twilio Auth Token")
    twilio_phone_number: str = Field(..., description="Twilio phone number for SMS")
    twilio_whatsapp_number: str = Field(
        default="whatsapp:+14155238886",
        description="Twilio WhatsApp sandbox number",
    )

    # ── Cloudinary ────────────────────────────────────────────
    cloudinary_cloud_name: str = Field(..., description="Cloudinary cloud name")
    cloudinary_api_key: str = Field(..., description="Cloudinary API key")
    cloudinary_api_secret: str = Field(..., description="Cloudinary API secret")

    # ── Google Cloud APIs ─────────────────────────────────────
    google_api_key: str = Field(..., description="Google Cloud API key (Maps, Places, Geocoding, Vision)")

    # ── Resend (email) ────────────────────────────────────────
    resend_api_key: str = Field(..., description="Resend API key for transactional email")

    # ── Replicate ─────────────────────────────────────────────
    replicate_api_token: str = Field(default="", description="Replicate API token")

    # ── Upstash Redis ─────────────────────────────────────────
    upstash_redis_rest_url: str = Field(..., description="Upstash Redis REST URL")
    upstash_redis_rest_token: str = Field(..., description="Upstash Redis REST token")

    # ── Firebase ──────────────────────────────────────────────
    firebase_project_id: str = Field(default="", description="Firebase project ID")
    firebase_client_email: str = Field(default="", description="Firebase service-account email")
    firebase_private_key: str = Field(default="", description="Firebase private key (PEM)")

    # ── JWT ────────────────────────────────────────────────────
    jwt_secret_key: str = Field(..., description="Secret key for signing JWTs")
    jwt_algorithm: str = Field(default="HS256", description="JWT signing algorithm")
    access_token_expire_days: int = Field(default=7, description="Access-token lifetime in days")
    refresh_token_expire_days: int = Field(default=30, description="Refresh-token lifetime in days")

    # ── App ────────────────────────────────────────────────────
    frontend_url: str = Field(default="http://localhost:3000", description="Frontend base URL")
    port: int = Field(default=8000, description="Backend server port")
    node_env: str = Field(default="development", description="Environment mode")

    # ── Razorpay (NOT IMPLEMENTED — kept for .env compat) ────
    razorpay_key_id: str = Field(default="", description="Razorpay key ID (unused)")
    razorpay_key_secret: str = Field(default="", description="Razorpay key secret (unused)")

    @property
    def async_database_url(self) -> str:
        """Convert the standard postgres URL to an asyncpg-compatible URL."""
        url = self.supabase_db_url
        # Force Supabase transaction pooler port for IPv4-safe demos.
        url = re.sub(r":5432(?=/)", ":6543", url)
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    model_config = {
        "env_file": str(_ENV_PATH),
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    """Cached singleton so Settings is only parsed once per process."""
    return Settings()
