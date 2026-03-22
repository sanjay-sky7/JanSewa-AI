"""
Notification service — SMS (Twilio), WhatsApp (Twilio), Email (Gmail SMTP).

Dispatches acknowledgements for:
  • Complaint registration
  • Every status change (Under Review, Assigned, In Progress, Resolved, etc.)

All dispatches are logged to the notification_logs table.
"""

from __future__ import annotations

import base64
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


# ── Helpers ──────────────────────────────────────────────


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


# ── Status helper messages (bilingual) ───────────────────

STATUS_MESSAGES = {
    "OPEN": {
        "en": "Your complaint has been registered and is in the queue.",
        "hi": "आपकी शिकायत दर्ज हो गई है और कतार में है।",
    },
    "UNDER_REVIEW": {
        "en": "Your complaint is currently under review by our team.",
        "hi": "आपकी शिकायत हमारी टीम द्वारा समीक्षाधीन है।",
    },
    "ASSIGNED": {
        "en": "Your complaint has been assigned to a field team for action.",
        "hi": "आपकी शिकायत कार्रवाई के लिए फील्ड टीम को सौंपी गई है।",
    },
    "IN_PROGRESS": {
        "en": "Work on your complaint is actively in progress.",
        "hi": "आपकी शिकायत पर कार्य प्रगति पर है।",
    },
    "VERIFICATION_PENDING": {
        "en": "Work on your complaint is completed and pending verification.",
        "hi": "आपकी शिकायत पर कार्य पूरा हो गया है और सत्यापन लंबित है।",
    },
    "RESOLVED": {
        "en": "Your complaint has been marked as resolved.",
        "hi": "आपकी शिकायत का समाधान हो गया है।",
    },
    "VERIFIED": {
        "en": "Your complaint resolution has been verified successfully.",
        "hi": "आपकी शिकायत के समाधान का सत्यापन हो गया है।",
    },
    "CLOSED": {
        "en": "Your complaint has been closed. Thank you for your patience.",
        "hi": "आपकी शिकायत बंद कर दी गई है। आपके धैर्य के लिए धन्यवाद।",
    },
}


def _get_status_text(status: Optional[str], lang: str = "en") -> str:
    key = (status or "").upper()
    entry = STATUS_MESSAGES.get(key, {})
    return entry.get(lang, "Your complaint status has been updated.")


# ── Twilio (SMS & WhatsApp) ──────────────────────────────


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
        logger.info("SMS not sent (not configured or no phone): phone=%s", phone)
        return False
    return await _twilio_send(to=to, body=body, from_number=settings.TWILIO_SMS_FROM)


async def send_whatsapp(phone: Optional[str], body: str) -> bool:
    to = _to_e164_india_default(phone)
    from_number = settings.TWILIO_WHATSAPP_FROM
    if not to or not _is_configured(from_number):
        logger.info("WhatsApp not sent (not configured or no phone): phone=%s", phone)
        return False

    if not to.startswith("whatsapp:"):
        to = f"whatsapp:{to}"
    if not from_number.startswith("whatsapp:"):
        from_number = f"whatsapp:{from_number}"

    return await _twilio_send(to=to, body=body, from_number=from_number)


# ── Email (Gmail SMTP with App Password) ─────────────────


def _build_html_email(
    subject: str,
    complaint_id: str,
    status: str,
    category: str,
    ward: str,
    summary: str,
    registered_at: str,
    status_message_en: str,
    status_message_hi: str,
    note: str = "",
    actor: str = "",
) -> str:
    """Build a professional HTML email for Jansewa AI notifications."""

    status_color_map = {
        "OPEN": "#3B82F6",
        "UNDER_REVIEW": "#F59E0B",
        "ASSIGNED": "#8B5CF6",
        "IN_PROGRESS": "#F97316",
        "VERIFICATION_PENDING": "#06B6D4",
        "RESOLVED": "#10B981",
        "VERIFIED": "#059669",
        "CLOSED": "#6B7280",
    }
    badge_color = status_color_map.get(status.upper(), "#3B82F6")
    status_display = status.replace("_", " ").title()

    note_html = ""
    if note:
        note_html = f"""
        <tr>
          <td style="padding:12px 20px;background:#FFF7ED;border-left:4px solid #F97316;">
            <p style="margin:0;font-size:13px;color:#9A3412;font-weight:600;">📝 Note from Official:</p>
            <p style="margin:4px 0 0;font-size:14px;color:#7C2D12;">{note}</p>
          </td>
        </tr>
        """

    actor_html = ""
    if actor:
        actor_html = f'<p style="margin:4px 0 0;font-size:12px;color:#6B7280;">Updated by: {actor}</p>'

    return f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#F1F5F9;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#0F172A 0%,#1E40AF 50%,#0EA5E9 100%);padding:32px 24px;text-align:center;">
      <h1 style="margin:0;font-size:28px;font-weight:800;color:#FFFFFF;letter-spacing:1px;">🏛️ JanSewa AI</h1>
      <p style="margin:8px 0 0;font-size:13px;color:#BAE6FD;letter-spacing:2px;text-transform:uppercase;">AI-Powered Governance Platform</p>
    </td>
  </tr>

  <!-- Status Badge -->
  <tr>
    <td style="padding:24px 24px 0;text-align:center;">
      <span style="display:inline-block;background:{badge_color};color:#FFF;padding:8px 20px;border-radius:20px;font-size:14px;font-weight:700;letter-spacing:0.5px;">
        {status_display}
      </span>
    </td>
  </tr>

  <!-- English Message -->
  <tr>
    <td style="padding:20px 24px 8px;">
      <p style="margin:0;font-size:15px;color:#1E293B;line-height:1.6;">
        {status_message_en}
      </p>
    </td>
  </tr>

  <!-- Hindi Message -->
  <tr>
    <td style="padding:0 24px 16px;">
      <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;font-style:italic;">
        {status_message_hi}
      </p>
    </td>
  </tr>

  <!-- Complaint Details Table -->
  <tr>
    <td style="padding:0 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border-radius:12px;border:1px solid #E2E8F0;">
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid #E2E8F0;">
            <p style="margin:0;font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;">Complaint ID</p>
            <p style="margin:4px 0 0;font-size:15px;color:#0F172A;font-weight:700;font-family:monospace;">{complaint_id}</p>
          </td>
          <td style="padding:14px 16px;border-bottom:1px solid #E2E8F0;">
            <p style="margin:0;font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;">Category</p>
            <p style="margin:4px 0 0;font-size:14px;color:#1E293B;font-weight:600;">{category}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 16px;">
            <p style="margin:0;font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;">Ward</p>
            <p style="margin:4px 0 0;font-size:14px;color:#1E293B;font-weight:600;">{ward}</p>
          </td>
          <td style="padding:14px 16px;">
            <p style="margin:0;font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;">Registered</p>
            <p style="margin:4px 0 0;font-size:14px;color:#1E293B;font-weight:600;">{registered_at}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Summary -->
  <tr>
    <td style="padding:16px 24px;">
      <p style="margin:0;font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;">Summary</p>
      <p style="margin:6px 0 0;font-size:14px;color:#334155;line-height:1.5;background:#F0F9FF;padding:12px;border-radius:8px;border-left:4px solid #3B82F6;">{summary}</p>
    </td>
  </tr>

  {note_html}

  <!-- Actor -->
  <tr>
    <td style="padding:4px 24px 16px;">
      {actor_html}
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#F8FAFC;padding:20px 24px;text-align:center;border-top:1px solid #E2E8F0;">
      <p style="margin:0;font-size:12px;color:#64748B;">This is an automated notification from <strong>JanSewa AI</strong></p>
      <p style="margin:4px 0 0;font-size:11px;color:#94A3B8;">AI-Powered Governance Intelligence & Decision-Support System</p>
      <p style="margin:8px 0 0;font-size:11px;color:#94A3B8;">📱 SMS • 💬 WhatsApp • 📧 Email — Multi-channel citizen updates</p>
    </td>
  </tr>

</table>
</td></tr></table>
</body>
</html>"""


def send_email(
    to_email: Optional[str],
    subject: str,
    body: str,
    html_body: Optional[str] = None,
) -> bool:
    """Send an email via Gmail SMTP (App Password)."""
    if not to_email:
        return False
    if not settings.SMTP_HOST or not settings.SMTP_FROM_EMAIL:
        logger.info("Email not sent (SMTP not configured): to=%s", to_email)
        return False

    try:
        if html_body:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"JanSewa AI <{settings.SMTP_FROM_EMAIL}>"
            msg["To"] = to_email

            # Plain text fallback
            part_text = MIMEText(body, "plain")
            part_html = MIMEText(html_body, "html")
            msg.attach(part_text)
            msg.attach(part_html)
        else:
            msg = MIMEMultipart()
            msg["Subject"] = subject
            msg["From"] = f"JanSewa AI <{settings.SMTP_FROM_EMAIL}>"
            msg["To"] = to_email
            msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.starttls()
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())

        logger.info("Email sent successfully to %s", to_email)
        return True
    except Exception as exc:
        logger.warning("Email send failed: %s", exc)
        return False


# ── Unified message builder for SMS / WhatsApp ──────────


def build_sms_message(
    notification_type: str,
    complaint_short_id: str,
    status: str,
    category: str,
    ward: str,
    summary: str,
    note: str = "",
    actor: str = "",
) -> str:
    """Build a clean bilingual SMS/WhatsApp notification message."""
    status_en = _get_status_text(status, "en")
    status_hi = _get_status_text(status, "hi")
    status_display = status.replace("_", " ").title()

    lines = [
        f"🏛️ JanSewa AI — {'Registration Confirmed' if notification_type == 'REGISTRATION' else 'Status Update'}",
        f"",
        f"📋 Complaint: {complaint_short_id}",
        f"📊 Status: {status_display}",
        f"📁 Category: {category}",
        f"📍 {ward}",
        f"",
        f"✅ {status_en}",
        f"✅ {status_hi}",
    ]

    if summary:
        lines.append(f"")
        lines.append(f"📝 {summary[:120]}")

    if note:
        lines.append(f"💬 Note: {note}")

    if actor:
        lines.append(f"👤 By: {actor}")

    lines.append("")
    lines.append("— JanSewa AI | AI-Powered Governance")

    return "\n".join(lines)
