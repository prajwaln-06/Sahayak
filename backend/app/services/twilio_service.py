"""
FlexiSpace — Twilio SMS Service
Sends OTP codes via Twilio SMS.
"""

import logging

from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Twilio Client (module-level singleton) ────────────────────
_client: Client | None = None


def _get_client() -> Client:
    """Lazy-initialise the Twilio REST client."""
    global _client
    if _client is None:
        _client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
    return _client


async def send_otp_sms(phone: str, otp_code: str) -> bool:
    """
    Send a 6-digit OTP to the given phone number via Twilio SMS.

    Returns True on success, False on failure.
    The Twilio SDK is synchronous, but the call is fast enough for
    our use case. For production scale, consider wrapping in
    asyncio.to_thread().
    """
    try:
        client = _get_client()
        message = client.messages.create(
            body=f"Your FlexiSpace verification code is: {otp_code}. Valid for 5 minutes. Do not share this code.",
            from_=settings.twilio_phone_number,
            to=phone,
        )
        logger.info(f"OTP SMS sent to {phone}, SID: {message.sid}")
        return True
    except TwilioRestException as e:
        logger.error(f"Twilio SMS failed for {phone}: {e.msg}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending OTP to {phone}: {e}")
        return False


async def send_whatsapp_otp(phone: str, otp_code: str) -> bool:
    """
    Send OTP via Twilio WhatsApp sandbox (fallback channel).
    """
    try:
        client = _get_client()
        message = client.messages.create(
            body=f"Your FlexiSpace code is: {otp_code}. Valid for 5 minutes.",
            from_=settings.twilio_whatsapp_number,
            to=f"whatsapp:{phone}",
        )
        logger.info(f"WhatsApp OTP sent to {phone}, SID: {message.sid}")
        return True
    except TwilioRestException as e:
        logger.error(f"Twilio WhatsApp failed for {phone}: {e.msg}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending WhatsApp OTP to {phone}: {e}")
        return False

async def send_whatsapp(phone: str, message_body: str) -> bool:
    """
    Send a generic WhatsApp message via Twilio sandbox.
    """
    try:
        client = _get_client()
        message = client.messages.create(
            body=message_body,
            from_=settings.twilio_whatsapp_number,
            to=f"whatsapp:{phone}",
        )
        logger.info(f"WhatsApp message sent to {phone}, SID: {message.sid}")
        return True
    except TwilioRestException as e:
        logger.error(f"Twilio WhatsApp failed for {phone}: {e.msg}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending WhatsApp message to {phone}: {e}")
        return False
