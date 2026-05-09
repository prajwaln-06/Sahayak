"""
FlexiSpace — WhatsApp Notification Service
All WhatsApp messages via Twilio Sandbox.
"""

import logging
from datetime import datetime

from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
    return _client


async def _send(phone: str, body: str) -> bool:
    """Send a WhatsApp message via Twilio sandbox."""
    try:
        client = _get_client()
        wa_phone = phone if phone.startswith("whatsapp:") else f"whatsapp:{phone}"
        message = client.messages.create(
            body=body,
            from_=settings.twilio_whatsapp_number,
            to=wa_phone,
        )
        logger.info(f"WhatsApp sent to {phone}, SID: {message.sid}")
        return True
    except TwilioRestException as e:
        logger.error(f"Twilio WhatsApp failed for {phone}: {e.msg}")
        return False
    except Exception as e:
        logger.error(f"WhatsApp error for {phone}: {e}")
        return False


# Alias used by other modules
async def send_whatsapp(phone: str, body: str) -> bool:
    return await _send(phone, body)


async def send_booking_confirmation(phone: str, booking, space):
    message = (
        f"✅ FlexiSpace Booking Confirmed!\n"
        f"📍 {space.title}\n"
        f"📅 {booking.start_datetime.strftime('%d %b %Y, %I:%M %p')}\n"
        f"👥 {booking.capacity_requested} people\n"
        f"💰 ₹{booking.total_amount}\n"
        f"🆔 Booking ID: {str(booking.id)[:8].upper()}\n"
        f"See you there! 🎉"
    )
    return await send_whatsapp(phone, message)


async def send_otp(phone: str, otp_code: str) -> bool:
    """Send OTP via WhatsApp."""
    body = f"Your FlexiSpace OTP is: {otp_code}\n\nValid for 5 minutes. Do not share."
    return await _send(phone, body)


async def send_host_notification(host_phone: str, booking, renter_name: str, space_title: str) -> bool:
    """Notify host of a new booking."""
    start = booking.start_datetime
    start_str = start.strftime("%d %b %Y, %I:%M %p") if isinstance(start, datetime) else str(start)
    body = (
        f"📋 New Booking Request!\n\n"
        f"{renter_name} wants to book {space_title}\n"
        f"📅 {start_str}\n"
        f"👥 {booking.capacity_requested or 'N/A'} guests\n\n"
        f"Log in to FlexiSpace to manage."
    )
    return await _send(host_phone, body)


async def send_booking_reminder(phone: str, booking, space_title: str, address: str, hours_before: int) -> bool:
    """Send pre-event reminder."""
    body = (
        f"⏰ Reminder: Your event at {space_title} is in {hours_before} hours!\n\n"
        f"📍 {address}\n"
        f"🆔 Booking: {str(booking.id)[:8]}\n\n"
        f"Have a great event! — FlexiSpace"
    )
    return await _send(phone, body)


async def send_rfq_notification(vendor_phone: str, rfq_message: str) -> bool:
    """Notify vendor of new RFQ."""
    body = f"📋 New Gig Request on FlexiSpace!\n\n{rfq_message}\n\nReply on the app."
    return await _send(vendor_phone, body)


async def send_cancellation(phone: str, booking_id: str) -> bool:
    """Notify about cancellation."""
    body = (
        f"❌ Booking Cancelled\n\n"
        f"Booking ID: {booking_id[:8]}\n"
        f"Refund will be processed if applicable.\n\n"
        f"— FlexiSpace"
    )
    return await _send(phone, body)
