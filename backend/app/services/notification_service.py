"""Optional external push notification integrations."""

from __future__ import annotations

import base64
import logging
import smtplib
from email.message import EmailMessage
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def _is_configured(value: Optional[str]) -> bool:
    if not value:
        return False
    low = value.strip().lower()
    if not low:
        return False
    return not low.startswith("your_")


def _normalize_phone(phone: Optional[str]) -> str:
    if not phone:
        return ""
    return "".join(ch for ch in str(phone) if ch.isdigit())


def _to_e164_india_default(phone: Optional[str]) -> Optional[str]:
    digits = _normalize_phone(phone)
    if not digits:
        return None
    if len(digits) == 10:
        return f"+91{digits}"
    if digits.startswith("91") and len(digits) == 12:
        return f"+{digits}"
    if len(digits) > 10 and str(phone).strip().startswith("+"):
        return str(phone).strip()
    return f"+{digits}"


async def _twilio_send(to: str, body: str, from_number: str) -> bool:
    if not _is_configured(settings.TWILIO_ACCOUNT_SID) or not _is_configured(settings.TWILIO_AUTH_TOKEN):
        return False

    auth_raw = f"{settings.TWILIO_ACCOUNT_SID}:{settings.TWILIO_AUTH_TOKEN}".encode("utf-8")
    auth = base64.b64encode(auth_raw).decode("utf-8")
    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                url,
                data={"To": to, "From": from_number, "Body": body},
                headers={"Authorization": f"Basic {auth}"},
            )
        if response.status_code >= 400:
            logger.warning("Twilio send failed (%s): %s", response.status_code, response.text)
            return False
        return True
    except Exception as exc:
        logger.warning("Twilio send failed with exception: %s", exc)
        return False


async def send_sms(phone: Optional[str], body: str) -> bool:
    to = _to_e164_india_default(phone)
    if not to or not _is_configured(settings.TWILIO_SMS_FROM):
        return False
    return await _twilio_send(to=to, body=body, from_number=settings.TWILIO_SMS_FROM)


async def send_whatsapp(phone: Optional[str], body: str) -> bool:
    to = _to_e164_india_default(phone)
    from_number = settings.TWILIO_WHATSAPP_FROM
    if not to or not _is_configured(from_number):
        return False

    if not to.startswith("whatsapp:"):
        to = f"whatsapp:{to}"
    if not from_number.startswith("whatsapp:"):
        from_number = f"whatsapp:{from_number}"

    return await _twilio_send(to=to, body=body, from_number=from_number)


def send_email(to_email: Optional[str], subject: str, body: str) -> bool:
    if not to_email:
        return False
    if not settings.SMTP_HOST or not settings.SMTP_FROM_EMAIL:
        return False

    try:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM_EMAIL
        msg["To"] = to_email
        msg.set_content(body)

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.starttls()
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as exc:
        logger.warning("Email send failed: %s", exc)
        return False
