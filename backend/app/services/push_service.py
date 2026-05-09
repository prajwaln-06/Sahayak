"""
FlexiSpace — Push Notification Service (Firebase)
FCM push notifications via Firebase Admin SDK.
"""

import logging

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Lazy-init Firebase
_initialized = False


def _init_firebase():
    """Initialize Firebase Admin SDK if credentials are present."""
    global _initialized
    if _initialized:
        return True
    if not settings.firebase_project_id or not settings.firebase_private_key:
        logger.warning("Firebase credentials not configured — push disabled.")
        return False
    try:
        import firebase_admin
        from firebase_admin import credentials

        # Build credential from env vars
        cred_dict = {
            "type": "service_account",
            "project_id": settings.firebase_project_id,
            "client_email": settings.firebase_client_email,
            "private_key": settings.firebase_private_key.replace("\\n", "\n"),
            "token_uri": "https://oauth2.googleapis.com/token",
        }
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        _initialized = True
        logger.info("Firebase Admin SDK initialized.")
        return True
    except Exception as e:
        logger.error(f"Firebase init failed: {e}")
        return False


async def send_push(token: str, title: str, body: str, data: dict | None = None) -> bool:
    """Send a push notification to a single device token."""
    if not _init_firebase():
        return False

    try:
        from firebase_admin import messaging

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data=data or {},
            token=token,
        )
        result = messaging.send(message)
        logger.info(f"Push sent: {result}")
        return True
    except Exception as e:
        logger.error(f"Push notification failed: {e}")
        return False


async def send_booking_push(token: str, booking_id: str, space_title: str) -> bool:
    """Send booking confirmation push."""
    return await send_push(
        token,
        "Booking Confirmed! ✅",
        f"Your space at {space_title} is reserved.",
        {"type": "booking_confirmed", "booking_id": booking_id},
    )


async def send_reminder_push(token: str, space_title: str, hours: int) -> bool:
    """Send event reminder push."""
    return await send_push(
        token,
        f"⏰ {hours}h until your event!",
        f"Your booking at {space_title} starts soon.",
        {"type": "reminder"},
    )


async def send_rfq_push(token: str, vendor_name: str) -> bool:
    """Send RFQ notification push to vendor."""
    return await send_push(
        token,
        "📋 New Gig Request",
        f"You have a new request on FlexiSpace for {vendor_name}.",
        {"type": "rfq"},
    )


async def send_chat_push(token: str, sender_name: str, message_preview: str) -> bool:
    """Send new chat message push."""
    return await send_push(
        token,
        f"💬 {sender_name}",
        message_preview[:100],
        {"type": "chat_message"},
    )
