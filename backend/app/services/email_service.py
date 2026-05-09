"""
FlexiSpace — Email Service (via Resend)
Transactional emails: verification, booking receipt, KYC status.
"""

import logging
from datetime import datetime

import resend

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

resend.api_key = settings.resend_api_key

FROM_ADDR = "FlexiSpace <noreply@flexispace.app>"


async def send_email_verification(to_email: str, verification_url: str, user_name: str | None = None) -> bool:
    """Send email verification link."""
    display_name = user_name or "there"
    try:
        params: resend.Emails.SendParams = {
            "from": FROM_ADDR,
            "to": [to_email],
            "subject": "Verify your FlexiSpace email",
            "html": f"""
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                <h2 style="color: #0D1B2A; margin-bottom: 8px;">Welcome to FlexiSpace 🏠</h2>
                <p style="color: #4a4a68; font-size: 15px; line-height: 1.6;">
                    Hi {display_name},<br><br>
                    Please verify your email address by clicking the button below.
                    This link expires in 24 hours.
                </p>
                <a href="{verification_url}"
                   style="display: inline-block; background: #0D9488; color: #fff;
                          padding: 12px 28px; border-radius: 8px; text-decoration: none;
                          font-weight: 600; margin: 24px 0;">
                    Verify Email
                </a>
                <p style="color: #999; font-size: 12px; margin-top: 32px;">
                    If you didn't request this, you can safely ignore this email.
                </p>
            </div>
            """,
        }
        email_resp = resend.Emails.send(params)
        logger.info(f"Verification email sent to {to_email}, id: {email_resp.get('id', 'N/A')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send verification email to {to_email}: {e}")
        return False


async def send_booking_receipt(to_email: str, booking_data: dict) -> bool:
    """Send booking receipt with GST invoice details."""
    try:
        params: resend.Emails.SendParams = {
            "from": FROM_ADDR,
            "to": [to_email],
            "subject": f"FlexiSpace Booking Receipt — {booking_data.get('event_name', 'Your Booking')}",
            "html": f"""
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
                <h2 style="color: #0D1B2A;">✅ Booking Confirmed</h2>
                <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Booking ID:</strong> {booking_data.get('id', 'N/A')}</p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Space:</strong> {booking_data.get('space_title', 'N/A')}</p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Date:</strong> {booking_data.get('date', 'N/A')}</p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Duration:</strong> {booking_data.get('duration', 'N/A')}</p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Guests:</strong> {booking_data.get('capacity', 'N/A')}</p>
                </div>
                <h3 style="color: #0D1B2A; margin-top: 24px;">Invoice</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 8px 0;">Base Amount</td>
                        <td style="text-align: right;">Rs.{booking_data.get('base_amount', '0')}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 8px 0;">Platform Fee (12%)</td>
                        <td style="text-align: right;">Rs.{booking_data.get('platform_fee', '0')}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 8px 0;">GST (18%)</td>
                        <td style="text-align: right;">Rs.{booking_data.get('gst', '0')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: 700;">Total</td>
                        <td style="text-align: right; font-weight: 700; color: #0D9488;">Rs.{booking_data.get('total', '0')}</td>
                    </tr>
                </table>
                <p style="color: #999; font-size: 11px; margin-top: 24px;">
                    GSTIN: Pending | This is a computer-generated receipt.
                </p>
            </div>
            """,
        }
        email_resp = resend.Emails.send(params)
        logger.info(f"Booking receipt sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send booking receipt to {to_email}: {e}")
        return False


async def send_kyc_status_email(to_email: str, status: str, reason: str | None = None) -> bool:
    """Send KYC verification status update."""
    status_map = {
        "APPROVED": ("✅ KYC Verified!", "#0D9488", "Your identity has been verified. You can now list spaces on FlexiSpace."),
        "REJECTED": ("❌ KYC Rejected", "#dc2626", f"Your document was rejected. Reason: {reason or 'Not specified'}. Please re-upload."),
        "PENDING": ("⏳ KYC Under Review", "#f59e0b", "We're reviewing your documents. This usually takes 24 hours."),
    }
    title, color, message = status_map.get(status, ("KYC Update", "#666", "Your KYC status has been updated."))
    try:
        params: resend.Emails.SendParams = {
            "from": FROM_ADDR,
            "to": [to_email],
            "subject": f"FlexiSpace — {title}",
            "html": f"""
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                <h2 style="color: {color};">{title}</h2>
                <p style="color: #4a4a68; font-size: 15px; line-height: 1.6;">{message}</p>
                <a href="{settings.frontend_url}/dashboard"
                   style="display: inline-block; background: #0D1B2A; color: #fff;
                          padding: 12px 28px; border-radius: 8px; text-decoration: none;
                          font-weight: 600; margin: 24px 0;">Go to Dashboard</a>
            </div>
            """,
        }
        resend.Emails.send(params)
        logger.info(f"KYC status email sent to {to_email}: {status}")
        return True
    except Exception as e:
        logger.error(f"Failed to send KYC email to {to_email}: {e}")
        return False
