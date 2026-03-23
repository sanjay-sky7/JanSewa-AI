"""WhatsApp webhook router for citizen complaint intake and status checks."""

from __future__ import annotations

import re
from html import escape
from typing import Optional

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.citizen import Citizen
from app.models.complaint import Complaint
from app.schemas.complaint import ComplaintCreate
from app.routers.complaints import create_complaint

router = APIRouter()


def _normalize_phone(phone: Optional[str]) -> str:
    if not phone:
        return ""
    return "".join(ch for ch in str(phone) if ch.isdigit())


def _phone_matches(stored_phone: Optional[str], requested_phone: Optional[str]) -> bool:
    stored = _normalize_phone(stored_phone)
    requested = _normalize_phone(requested_phone)
    if not stored or not requested:
        return False
    if stored == requested:
        return True
    return len(stored) >= 10 and len(requested) >= 10 and stored[-10:] == requested[-10:]


def _twiml_message(text: str) -> Response:
    safe = escape((text or "").strip())
    xml = f"<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Message>{safe}</Message></Response>"
    return Response(content=xml, media_type="application/xml")


def _extract_ward_id(text: str) -> tuple[Optional[int], str]:
    match = re.search(r"\bward\s*[:#-]?\s*(\d{1,3})\b", text, flags=re.IGNORECASE)
    if not match:
        return None, text

    ward = int(match.group(1))
    cleaned = re.sub(r"\bward\s*[:#-]?\s*\d{1,3}\b", "", text, flags=re.IGNORECASE).strip(" ,;:-")
    return ward, cleaned


async def _resolve_citizen_ids_by_phone(db: AsyncSession, phone: str) -> list:
    result = await db.execute(select(Citizen.id, Citizen.phone).where(Citizen.phone.isnot(None)))
    return [row[0] for row in result.all() if _phone_matches(row[1], phone)]


def _msg91_message(text: str) -> JSONResponse:
    # Common JSON response shape used by webhook orchestrators.
    return JSONResponse({"message": text})


def _build_reply(text: str, provider: str) -> Response:
    if provider == "twilio":
        return _twiml_message(text)
    return _msg91_message(text)


def _extract_payload(data: dict) -> tuple[str, str, str]:
    sender = (
        data.get("From")
        or data.get("from")
        or data.get("mobile")
        or data.get("sender")
        or ""
    )
    incoming = (
        data.get("Body")
        or data.get("body")
        or data.get("text")
        or data.get("message")
        or ""
    )

    sender = str(sender).strip()
    incoming = str(incoming).strip()

    provider = "twilio" if ("From" in data or "Body" in data) else "msg91"
    return sender, incoming, provider


@router.post("/webhook")
async def whatsapp_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    content_type = request.headers.get("content-type", "").lower()
    payload = {}

    if "application/json" in content_type:
        try:
            payload = await request.json()
        except Exception:
            payload = {}
    else:
        form = await request.form()
        payload = dict(form)

    sender, incoming, provider = _extract_payload(payload)

    if sender.lower().startswith("whatsapp:"):
        sender = sender.split(":", 1)[1]

    if not incoming:
        return _build_reply(
            "Welcome to Jansewa WhatsApp Desk. Send 'REGISTER <your complaint>' to file a complaint, "
            "or 'STATUS <complaint_id>' to check status.",
            provider,
        )

    lowered = incoming.lower()

    if lowered in {"help", "menu", "hi", "hello"}:
        return _build_reply(
            "Jansewa WhatsApp Commands:\n"
            "1) REGISTER <your complaint text>\n"
            "   Example: REGISTER Ward 12 no water supply for 2 days\n"
            "2) STATUS <complaint_id>\n"
            "   Example: STATUS 2f8a1c3d\n"
            "3) STATUS\n"
            "   Shows your latest complaints",
            provider,
        )

    if lowered.startswith("register"):
        details = incoming[len("register"):].strip(" :-")
        if not details:
            return _build_reply("Please send details after REGISTER. Example: REGISTER Ward 12 no water supply", provider)

        ward_id, raw_text = _extract_ward_id(details)
        complaint_body = ComplaintCreate(
            raw_text=raw_text or details,
            input_type="text",
            citizen_name="WhatsApp Citizen",
            citizen_phone=sender,
            ward_id=ward_id,
        )

        try:
            created = await create_complaint(body=complaint_body, db=db, user=None)
            short_id = str(created.id)[:8]
            status = (created.status or "OPEN").replace("_", " ").title()
            return _build_reply(
                f"Complaint registered successfully. ID: {short_id}. Status: {status}. "
                "You will receive SMS/WhatsApp updates on progress.",
                provider,
            )
        except Exception:
            return _build_reply("We could not register your complaint right now. Please try again in a moment.", provider)

    if lowered.startswith("status"):
        token = incoming[len("status"):].strip()
        citizen_ids = await _resolve_citizen_ids_by_phone(db, sender)
        if not citizen_ids:
            return _build_reply("No complaints found for this WhatsApp number yet. Send REGISTER to create one.", provider)

        result = await db.execute(
            select(Complaint)
            .where(Complaint.citizen_id.in_(citizen_ids))
            .order_by(Complaint.created_at.desc())
            .limit(20)
        )
        complaints = result.scalars().all()
        if not complaints:
            return _build_reply("No complaints found for this WhatsApp number yet.", provider)

        if token:
            token_lower = token.lower()
            matched = next((c for c in complaints if str(c.id).lower().startswith(token_lower)), None)
            if not matched:
                return _build_reply("Complaint ID not found for your number. Send STATUS to view recent complaint IDs.", provider)

            return _build_reply(
                f"Complaint {str(matched.id)[:8]} status: {matched.status.replace('_', ' ').title()}. "
                f"Priority: {(matched.priority_level or 'NA')}",
                provider,
            )

        top = complaints[:3]
        lines = [
            f"{str(c.id)[:8]} -> {c.status.replace('_', ' ').title()}"
            for c in top
        ]
        return _build_reply("Your recent complaints:\n" + "\n".join(lines) + "\nUse STATUS <id> for details.", provider)

    return _build_reply("Unknown command. Send HELP for supported WhatsApp commands.", provider)
