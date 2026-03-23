"""Optional external notification integrations (MSG91 + SMTP)."""

from __future__ import annotations

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
    # Retained only for backward compatibility in internal call sites.
    return False


def _to_msg91_mobile(phone: Optional[str]) -> Optional[str]:
    digits = _normalize_phone(phone)
    if not digits:
        return None
    if len(digits) == 10:
        return f"91{digits}"
    if len(digits) == 12 and digits.startswith("91"):
        return digits
    if len(digits) > 10:
        return digits
    return None


async def _msg91_post(url: str, payload: dict) -> bool:
    if not _is_configured(settings.MSG91_AUTH_KEY):
        return False

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.post(
                url,
                json=payload,
                headers={
                    "authkey": settings.MSG91_AUTH_KEY,
                    "Content-Type": "application/json",
                },
            )
        if response.status_code >= 400:
            logger.warning("MSG91 send failed (%s): %s", response.status_code, response.text)
            return False
        return True
    except Exception as exc:
        logger.warning("MSG91 send failed with exception: %s", exc)
        return False


async def send_sms(phone: Optional[str], body: str) -> bool:
    mobile = _to_msg91_mobile(phone)
    if not mobile:
        return False
    if not _is_configured(settings.MSG91_SMS_FLOW_ID):
        return False

    payload = {
        "flow_id": settings.MSG91_SMS_FLOW_ID,
        "mobiles": mobile,
        "VAR1": body[:500],
    }
    if _is_configured(settings.MSG91_SMS_SENDER):
        payload["sender"] = settings.MSG91_SMS_SENDER

    return await _msg91_post("https://control.msg91.com/api/v5/flow/", payload)


async def send_whatsapp(phone: Optional[str], body: str) -> bool:
    mobile = _to_msg91_mobile(phone)
    if not mobile:
        return False

    # Preferred path: MSG91 WhatsApp Flow.
    if _is_configured(settings.MSG91_WHATSAPP_FLOW_ID):
        wa_flow_payload = {
            "flow_id": settings.MSG91_WHATSAPP_FLOW_ID,
            "mobiles": mobile,
            "VAR1": body[:500],
        }
        sent = await _msg91_post("https://control.msg91.com/api/v5/flow/", wa_flow_payload)
        if sent:
            return True

    # Fallback path: direct WhatsApp outbound endpoint.
    if _is_configured(settings.MSG91_WHATSAPP_NUMBER):
        wa_direct_payload = {
            "integrated_number": settings.MSG91_WHATSAPP_NUMBER,
            "content_type": "text",
            "payload": {
                "type": "text",
                "text": body[:1000],
            },
            "recipient": mobile,
        }
        return await _msg91_post(settings.MSG91_WHATSAPP_ENDPOINT, wa_direct_payload)

    return False


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
