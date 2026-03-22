"""Complaints router — full CRUD + AI pipeline."""

import uuid
import logging
import json
import os
import base64
import tempfile
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.complaint import Complaint
from app.models.citizen import Citizen
from app.models.category import Category
from app.models.audit_log import AuditLog
from app.models.ward import Ward
from app.models.user import User
from app.models.notification_state import NotificationState
from app.models.notification_log import NotificationLog
from app.knowledge_base.ward_database import get_nearest_ward
from app.schemas.complaint import (
    ComplaintCreate,
    ComplaintAssign,
    ComplaintStatusUpdate,
    CategoryOut,
    ComplaintOut,
    ComplaintListOut,
    ComplaintStats,
    ComplaintFeedbackOut,
    ComplaintNotificationOut,
    ComplaintNotificationListOut,
    NotificationSeenOut,
    AssignmentRecommendationOut,
    AssignmentRecommendationItem,
)
from app.utils.helpers import get_current_user, get_current_user_optional
from app.services.notification_service import (
    send_sms,
    send_whatsapp,
    send_email,
    build_sms_message,
    _build_html_email,
    _get_status_text,
)
from app.knowledge_base.workforce_assignment import recommend_assignees

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Helpers ──────────────────────────────────────────────

def _complaint_query():
    """Base query with eager-loaded relationships."""
    return (
        select(Complaint)
        .options(
            selectinload(Complaint.category),
            selectinload(Complaint.ward),
            selectinload(Complaint.assignee),
            selectinload(Complaint.citizen),
        )
    )


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

    # Treat local mobile number equivalence by last 10 digits.
    if len(stored) >= 10 and len(requested) >= 10 and stored[-10:] == requested[-10:]:
        return True

    return False


def _status_notification_text(status: Optional[str]) -> str:
    mapping = {
        "UNDER_REVIEW": "Your complaint is under review.",
        "ASSIGNED": "Your complaint has been assigned to a field team.",
        "IN_PROGRESS": "Work on your complaint is in progress.",
        "VERIFICATION_PENDING": "Your complaint work is completed and pending verification.",
        "RESOLVED": "Your complaint has been marked as resolved.",
        "VERIFIED": "Your complaint resolution has been verified.",
        "CLOSED": "Your complaint has been closed.",
        "OPEN": "Your complaint is registered and in the queue.",
    }
    return mapping.get((status or "").upper(), "Your complaint status has been updated.")


def _parse_status_audit_payload(value: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    if not value:
        return None, None

    try:
        payload = json.loads(value)
        if isinstance(payload, dict):
            status = payload.get("status")
            note = payload.get("note")
            if isinstance(note, str):
                note = note.strip() or None
            return status, note
    except Exception:
        pass

    return value, None


async def _transcribe_audio_data_url(raw_audio_url: str) -> tuple[Optional[str], Optional[str]]:
    if not raw_audio_url or not raw_audio_url.startswith("data:audio"):
        return None, None

    if "," not in raw_audio_url:
        return None, None

    header, encoded = raw_audio_url.split(",", 1)
    mime = "audio/webm"
    if ";" in header and "/" in header:
        mime = header.split(";", 1)[0].replace("data:", "")

    suffix = ".webm"
    if "wav" in mime:
        suffix = ".wav"
    elif "mpeg" in mime or "mp3" in mime:
        suffix = ".mp3"
    elif "mp4" in mime or "m4a" in mime:
        suffix = ".m4a"
    elif "ogg" in mime:
        suffix = ".ogg"

    try:
        audio_bytes = base64.b64decode(encoded, validate=False)
    except Exception:
        return None, None

    temp_path = None
    try:
        from app.services.stt_service import transcribe_audio, transcribe_audio_local

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name

        result = await transcribe_audio(temp_path)
        text = (result or {}).get("text") or ""
        language = (result or {}).get("language")

        if not text.strip():
            local_result = await transcribe_audio_local(temp_path)
            text = (local_result or {}).get("text") or ""
            language = language or (local_result or {}).get("language")

        clean_text = text.strip() or None
        return clean_text, language
    except Exception as exc:
        logger.error(f"Whisper transcription pipeline failed: {exc}")
        return None, None
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


async def _analyze_image_data_url(raw_image_url: str) -> dict:
    if not raw_image_url or not raw_image_url.startswith("data:image"):
        return {}

    if "," not in raw_image_url:
        return {}

    header, encoded = raw_image_url.split(",", 1)
    mime = "image/jpeg"
    if ";" in header and "/" in header:
        mime = header.split(";", 1)[0].replace("data:", "")

    suffix = ".jpg"
    if "png" in mime:
        suffix = ".png"
    elif "webp" in mime:
        suffix = ".webp"

    temp_path = None
    try:
        image_bytes = base64.b64decode(encoded, validate=False)

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(image_bytes)
            temp_path = temp_file.name

        from app.services.ai_service import analyze_image_complaint

        return await analyze_image_complaint(temp_path)
    except Exception as exc:
        logger.warning("Image analysis pipeline failed: %s", exc)
        return {}
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


def _normalize_category_name(name: str) -> str:
    normalized = " ".join((name or "").strip().lower().replace("&", "/").replace("-", " ").split())
    return normalized.replace(" / ", "/")


async def _resolve_category_id_by_name(db: AsyncSession, name: Optional[str]) -> Optional[int]:
    if not name:
        return None

    normalized = _normalize_category_name(name)
    aliases = {
        "road pothole": "road/pothole",
        "road / pothole": "road/pothole",
        "road damage": "road/pothole",
        "pothole": "road/pothole",
        "electricity problem": "electricity",
        "electricity issue": "electricity",
        "power": "electricity",
    }
    normalized = aliases.get(normalized, normalized)

    categories_result = await db.execute(select(Category))
    categories = categories_result.scalars().all()
    for category in categories:
        if _normalize_category_name(category.name) == normalized:
            return category.id

    return None


async def _resolve_citizen_ids_by_phone(db: AsyncSession, phone: Optional[str]) -> list[uuid.UUID]:
    if not phone:
        return []
    citizens_result = await db.execute(select(Citizen.id, Citizen.phone).where(Citizen.phone.isnot(None)))
    return [row[0] for row in citizens_result.all() if _phone_matches(row[1], phone)]


async def _resolve_citizen_ids_by_email(db: AsyncSession, email: Optional[str]) -> list[uuid.UUID]:
    if not email:
        return []
    normalized = email.strip().lower()
    if not normalized:
        return []
    citizens_result = await db.execute(select(Citizen.id).where(func.lower(Citizen.email) == normalized))
    return [row[0] for row in citizens_result.all()]


async def _resolve_user_email_by_phone(db: AsyncSession, phone: Optional[str]) -> Optional[str]:
    if not phone:
        return None
    users_result = await db.execute(select(User.email, User.phone).where(User.phone.isnot(None)))
    for email, user_phone in users_result.all():
        if email and _phone_matches(user_phone, phone):
            return email
    return None


def _build_complaint_context(complaint: Complaint) -> dict:
    category_name = complaint.category.name if complaint.category else "General"
    ward_number = complaint.ward.ward_number if complaint.ward else None
    ward_name = complaint.ward.ward_name if complaint.ward else None
    summary = (complaint.ai_summary or complaint.raw_text or "Complaint update").strip()
    ward_label = f"Ward {ward_number}" if ward_number is not None else "Ward not set"
    if ward_name:
        ward_label = f"{ward_label} ({ward_name})"

    return {
        "complaint_short_id": str(complaint.id)[:8],
        "category_name": category_name,
        "ward_label": ward_label,
        "summary": summary,
    }


async def _log_notification(
    db: AsyncSession,
    complaint_id: uuid.UUID,
    channel: str,
    recipient: str,
    notification_type: str,
    complaint_status: Optional[str],
    success: bool,
    error_message: Optional[str] = None,
    message_preview: Optional[str] = None,
):
    """Log a notification delivery attempt."""
    try:
        log = NotificationLog(
            complaint_id=complaint_id,
            channel=channel,
            recipient=recipient,
            notification_type=notification_type,
            complaint_status=complaint_status,
            success=success,
            error_message=error_message,
            message_preview=(message_preview or "")[:500],
        )
        db.add(log)
    except Exception as exc:
        logger.warning("Failed to log notification: %s", exc)


async def _resolve_citizen_email(db: AsyncSession, citizen, phone: Optional[str]) -> Optional[str]:
    """Resolve email: citizen.email → user.email (by phone match)."""
    if citizen and getattr(citizen, "email", None):
        return citizen.email
    return await _resolve_user_email_by_phone(db, phone)


async def _dispatch_external_notifications(
    db: AsyncSession,
    complaint: Complaint,
    status: str,
    feedback_note: Optional[str],
    actor_name: Optional[str],
):
    """Send notifications via SMS, WhatsApp, and Email on status change."""
    citizen = complaint.citizen
    if not citizen:
        return

    context = _build_complaint_context(complaint)
    note = (feedback_note or "").strip()
    created_label = complaint.created_at.strftime("%d-%b-%Y %H:%M") if complaint.created_at else "NA"

    # Build SMS / WhatsApp message
    sms_message = build_sms_message(
        notification_type="STATUS_UPDATE",
        complaint_short_id=context["complaint_short_id"],
        status=status,
        category=context["category_name"],
        ward=context["ward_label"],
        summary=context["summary"],
        note=note,
        actor=actor_name or "",
    )

    try:
        # ── SMS ──
        if citizen.phone:
            sms_sent = await send_sms(citizen.phone, sms_message)
            await _log_notification(
                db, complaint.id, "SMS", citizen.phone, "STATUS_UPDATE",
                status, sms_sent,
                error_message=None if sms_sent else "Twilio SMS delivery failed or not configured",
                message_preview=sms_message[:200],
            )

        # ── WhatsApp ──
        if citizen.phone:
            wa_sent = await send_whatsapp(citizen.phone, sms_message)
            await _log_notification(
                db, complaint.id, "WHATSAPP", citizen.phone, "STATUS_UPDATE",
                status, wa_sent,
                error_message=None if wa_sent else "Twilio WhatsApp delivery failed or not configured",
                message_preview=sms_message[:200],
            )

        # ── Email ──
        email = await _resolve_citizen_email(db, citizen, citizen.phone)
        if email:
            subject = f"JanSewa AI — Complaint Update: {status.replace('_', ' ').title()}"
            plain_body = sms_message
            html_body = _build_html_email(
                subject=subject,
                complaint_id=context["complaint_short_id"],
                status=status,
                category=context["category_name"],
                ward=context["ward_label"],
                summary=context["summary"],
                registered_at=created_label,
                status_message_en=_get_status_text(status, "en"),
                status_message_hi=_get_status_text(status, "hi"),
                note=note,
                actor=actor_name or "",
            )
            email_sent = send_email(email, subject, plain_body, html_body)
            await _log_notification(
                db, complaint.id, "EMAIL", email, "STATUS_UPDATE",
                status, email_sent,
                error_message=None if email_sent else "SMTP email delivery failed or not configured",
                message_preview=f"Subject: {subject}",
            )

    except Exception as exc:
        logger.warning("External notification dispatch failed: %s", exc)


async def _dispatch_registration_confirmation(db: AsyncSession, complaint: Complaint):
    """Send registration confirmation via SMS, WhatsApp, and Email."""
    citizen = complaint.citizen
    if not citizen:
        return

    context = _build_complaint_context(complaint)
    status = complaint.status or "OPEN"
    created_label = complaint.created_at.strftime("%d-%b-%Y %H:%M") if complaint.created_at else "NA"

    # Build SMS / WhatsApp message
    sms_message = build_sms_message(
        notification_type="REGISTRATION",
        complaint_short_id=context["complaint_short_id"],
        status=status,
        category=context["category_name"],
        ward=context["ward_label"],
        summary=context["summary"],
    )

    try:
        # ── SMS ──
        if citizen.phone:
            sms_sent = await send_sms(citizen.phone, sms_message)
            await _log_notification(
                db, complaint.id, "SMS", citizen.phone, "REGISTRATION",
                status, sms_sent,
                error_message=None if sms_sent else "Twilio SMS delivery failed or not configured",
                message_preview=sms_message[:200],
            )

        # ── WhatsApp ──
        if citizen.phone:
            wa_sent = await send_whatsapp(citizen.phone, sms_message)
            await _log_notification(
                db, complaint.id, "WHATSAPP", citizen.phone, "REGISTRATION",
                status, wa_sent,
                error_message=None if wa_sent else "Twilio WhatsApp delivery failed or not configured",
                message_preview=sms_message[:200],
            )

        # ── Email ──
        email = await _resolve_citizen_email(db, citizen, citizen.phone)
        if email:
            subject = "JanSewa AI — Complaint Registration Confirmation"
            plain_body = sms_message
            html_body = _build_html_email(
                subject=subject,
                complaint_id=context["complaint_short_id"],
                status=status,
                category=context["category_name"],
                ward=context["ward_label"],
                summary=context["summary"],
                registered_at=created_label,
                status_message_en=_get_status_text(status, "en"),
                status_message_hi=_get_status_text(status, "hi"),
            )
            email_sent = send_email(email, subject, plain_body, html_body)
            await _log_notification(
                db, complaint.id, "EMAIL", email, "REGISTRATION",
                status, email_sent,
                error_message=None if email_sent else "SMTP email delivery failed or not configured",
                message_preview=f"Subject: {subject}",
            )

    except Exception as exc:
        logger.warning("Registration confirmation dispatch failed: %s", exc)


async def _process_complaint(complaint: Complaint, db: AsyncSession):
    """Run AI pipeline on a new complaint (NLP + priority scoring)."""
    from app.services.ai_service import extract_complaint_details
    from app.services.priority_service import calculate_priority_score

    if not complaint.raw_text:
        return

    try:
        # Step 1: NLP extraction
        ai_data = await extract_complaint_details(
            complaint.raw_text,
            complaint.source_language or "auto",
        )

        complaint.ai_summary = ai_data.get("summary_english", "")
        if ai_data.get("location_text"):
            complaint.ai_location = ai_data.get("location_text")
        complaint.ai_duration_days = ai_data.get("duration_days")
        complaint.ai_category_confidence = ai_data.get("category_confidence", 0)

        # Use manually selected category when present; otherwise map AI category.
        cat_name = "Other"
        if complaint.category_id:
            selected_category = await db.get(Category, complaint.category_id)
            if selected_category:
                cat_name = selected_category.name
        else:
            cat_name = ai_data.get("category", "Other")
            cat_result = await db.execute(
                select(Category).where(Category.name == cat_name)
            )
            cat = cat_result.scalar_one_or_none()
            if cat:
                complaint.category_id = cat.id

        # Step 2: Priority scoring
        priority = await calculate_priority_score(
            {
                "category": cat_name,
                "is_emergency": ai_data.get("is_emergency", False),
                "duration_days": ai_data.get("duration_days"),
                "affected_estimate": ai_data.get("affected_estimate", "individual"),
                "ward_id": complaint.ward_id,
                "category_id": complaint.category_id,
                "area_sentiment": 0,
            },
            db,
        )

        complaint.urgency_score = priority["urgency_score"]
        complaint.impact_score = priority["impact_score"]
        complaint.recurrence_score = priority["recurrence_score"]
        complaint.sentiment_score = priority["sentiment_score"]
        complaint.vulnerability_score = priority["vulnerability_score"]
        complaint.final_priority_score = priority["final_priority_score"]
        complaint.priority_level = priority["priority_level"]

    except Exception as e:
        logger.error(f"AI pipeline failed for complaint {complaint.id}: {e}")


# ── Endpoints ────────────────────────────────────────────

@router.post("", response_model=ComplaintOut, status_code=201)
async def create_complaint(
    body: ComplaintCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user_optional),
):
    """Submit a new complaint (text, voice, or image)."""
    resolved_raw_text = (body.raw_text or "").strip() or None
    resolved_language = body.source_language

    if body.input_type == "voice" and body.raw_audio_url and not resolved_raw_text:
        transcribed_text, detected_language = await _transcribe_audio_data_url(body.raw_audio_url)
        resolved_raw_text = transcribed_text
        if (not resolved_language or resolved_language == "auto") and detected_language:
            resolved_language = detected_language

    if body.input_type == "voice" and not resolved_raw_text:
        if body.raw_audio_url:
            resolved_raw_text = "Voice complaint received. Transcription pending."
        else:
            raise HTTPException(
                status_code=400,
                detail="Voice complaint needs either text details or an uploaded audio file.",
            )

    resolved_ward_id = None
    if body.ward_id is not None:
        ward_result = await db.execute(
            select(Ward).where((Ward.id == body.ward_id) | (Ward.ward_number == body.ward_id))
        )
        ward = ward_result.scalar_one_or_none()
        resolved_ward_id = ward.id if ward else None

    resolved_category_id = None
    if body.category_id is not None:
        category_result = await db.execute(select(Category).where(Category.id == body.category_id))
        category = category_result.scalar_one_or_none()
        resolved_category_id = category.id if category else None

    if body.input_type == "image" and resolved_category_id is None and body.raw_image_url:
        image_ai = await _analyze_image_data_url(body.raw_image_url)
        category_name = image_ai.get("category")
        resolved_category_id = await _resolve_category_id_by_name(db, category_name)

        # If no details were provided, use image model summary as base text for AI pipeline.
        if not resolved_raw_text:
            resolved_raw_text = (image_ai.get("official_summary") or image_ai.get("issue_description") or "").strip() or None

    # KB-assisted geo mapping from uploaded image metadata
    geo_ward = None
    if body.geo_latitude is not None and body.geo_longitude is not None:
        geo_ward = get_nearest_ward(body.geo_latitude, body.geo_longitude)
        if geo_ward and resolved_ward_id is None:
            ward_by_number = await db.execute(select(Ward).where(Ward.ward_number == geo_ward["id"]))
            ward_obj = ward_by_number.scalar_one_or_none()
            if ward_obj:
                resolved_ward_id = ward_obj.id

    # Create or find citizen
    citizen = None
    resolved_citizen_phone = body.citizen_phone or getattr(user, "phone", None)
    resolved_citizen_name = body.citizen_name or getattr(user, "name", None)
    resolved_citizen_email = body.citizen_email or getattr(user, "email", None)

    if resolved_citizen_phone or resolved_citizen_email:
        if resolved_citizen_phone:
            result = await db.execute(select(Citizen).where(Citizen.phone == resolved_citizen_phone))
            citizen = result.scalar_one_or_none()
        if not citizen and resolved_citizen_email:
            result = await db.execute(
                select(Citizen)
                .where(func.lower(Citizen.email) == resolved_citizen_email.strip().lower())
                .order_by(Citizen.created_at.asc())
            )
            citizen = result.scalars().first()

        if not citizen:
            citizen = Citizen(
                name=resolved_citizen_name,
                phone=resolved_citizen_phone,
                email=resolved_citizen_email,
                ward_id=resolved_ward_id,
                is_anonymous=body.is_anonymous,
            )
            db.add(citizen)
            await db.flush()
        else:
            # Fill missing citizen contact details for future linkage.
            if resolved_citizen_email and not citizen.email:
                citizen.email = resolved_citizen_email
            if resolved_citizen_phone and not citizen.phone:
                citizen.phone = resolved_citizen_phone

    complaint = Complaint(
        citizen_id=citizen.id if citizen else None,
        category_id=resolved_category_id,
        raw_text=resolved_raw_text,
        raw_audio_url=body.raw_audio_url,
        raw_image_url=body.raw_image_url,
        input_type=body.input_type,
        source_language=resolved_language,
        ward_id=resolved_ward_id,
        status="OPEN",
    )
    if body.geo_latitude is not None:
        complaint.ai_latitude = body.geo_latitude
    if body.geo_longitude is not None:
        complaint.ai_longitude = body.geo_longitude
    if geo_ward:
        complaint.ai_location = f"Geo-tagged near {geo_ward['name']}"

    db.add(complaint)
    await db.flush()

    # Run AI pipeline
    await _process_complaint(complaint, db)
    await db.flush()

    # Audit log
    db.add(AuditLog(
        entity_type="complaint",
        entity_id=complaint.id,
        action="CREATED",
        new_value=json.dumps({"status": complaint.status, "note": "Complaint submitted"}),
    ))

    await db.refresh(complaint)
    # Re-fetch with relationships
    result = await db.execute(
        _complaint_query().where(Complaint.id == complaint.id)
    )
    created_complaint = result.scalar_one()

    await _dispatch_registration_confirmation(db, created_complaint)

    return ComplaintOut.model_validate(created_complaint)


@router.get("", response_model=ComplaintListOut)
async def list_complaints(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    ward_id: Optional[int] = None,
    category_id: Optional[int] = None,
    priority_level: Optional[str] = None,
    assigned_to: Optional[uuid.UUID] = None,
    citizen_phone: Optional[str] = None,
    citizen_email: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = _complaint_query()

    if status:
        stmt = stmt.where(Complaint.status == status)
    if ward_id:
        stmt = stmt.where(Complaint.ward_id == ward_id)
    if category_id:
        stmt = stmt.where(Complaint.category_id == category_id)
    if priority_level:
        stmt = stmt.where(Complaint.priority_level == priority_level)
    if assigned_to:
        stmt = stmt.where(Complaint.assigned_to == assigned_to)
    if citizen_phone or citizen_email:
        citizen_ids: list[uuid.UUID] = []
        if citizen_phone:
            citizen_ids.extend(await _resolve_citizen_ids_by_phone(db, citizen_phone))
        if citizen_email:
            citizen_ids.extend(await _resolve_citizen_ids_by_email(db, citizen_email))
        citizen_ids = list(dict.fromkeys(citizen_ids))
        if not citizen_ids:
            return ComplaintListOut(items=[], total=0, page=page, per_page=per_page)
        stmt = stmt.where(Complaint.citizen_id.in_(citizen_ids))
    if search:
        stmt = stmt.where(
            Complaint.raw_text.ilike(f"%{search}%")
            | Complaint.ai_summary.ilike(f"%{search}%")
        )

    # Count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    # Paginate
    stmt = (
        stmt.order_by(desc(Complaint.created_at))
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(stmt)
    items = [ComplaintOut.model_validate(c) for c in result.scalars().all()]

    return ComplaintListOut(items=items, total=total, page=page, per_page=per_page)


@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category).order_by(Category.name.asc()))
    categories = result.scalars().all()
    return [CategoryOut.model_validate(c) for c in categories]


@router.get("/priority-queue", response_model=ComplaintListOut)
async def priority_queue(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    ward_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    """Return complaints sorted by priority score descending."""
    stmt = _complaint_query().where(
        Complaint.status.in_([
            "OPEN",
            "UNDER_REVIEW",
            "ASSIGNED",
            "IN_PROGRESS",
            "VERIFICATION_PENDING",
        ])
    )
    if ward_id:
        stmt = stmt.where(Complaint.ward_id == ward_id)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    stmt = (
        stmt.order_by(desc(func.coalesce(Complaint.final_priority_score, 0)), desc(Complaint.created_at))
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(stmt)
    items = [ComplaintOut.model_validate(c) for c in result.scalars().all()]

    return ComplaintListOut(items=items, total=total, page=page, per_page=per_page)


@router.get("/stats", response_model=ComplaintStats)
async def complaint_stats(db: AsyncSession = Depends(get_db)):
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    total = (await db.execute(select(func.count()).select_from(Complaint))).scalar() or 0
    total_open = (await db.execute(
        select(func.count()).select_from(Complaint).where(
            Complaint.status.in_(["OPEN", "ASSIGNED", "IN_PROGRESS"])
        )
    )).scalar() or 0
    total_in_progress = (await db.execute(
        select(func.count()).select_from(Complaint).where(
            Complaint.status == "IN_PROGRESS"
        )
    )).scalar() or 0
    total_pending = (await db.execute(
        select(func.count()).select_from(Complaint).where(
            Complaint.status.in_(["OPEN", "UNDER_REVIEW", "ASSIGNED", "VERIFICATION_PENDING"])
        )
    )).scalar() or 0
    total_critical = (await db.execute(
        select(func.count()).select_from(Complaint).where(
            Complaint.priority_level == "CRITICAL",
            Complaint.status.in_(["OPEN", "ASSIGNED", "IN_PROGRESS"]),
        )
    )).scalar() or 0
    resolved_today = (await db.execute(
        select(func.count()).select_from(Complaint).where(
            Complaint.status.in_(["VERIFIED", "CLOSED"]),
            Complaint.resolved_at >= today_start,
        )
    )).scalar() or 0
    total_resolved = (await db.execute(
        select(func.count()).select_from(Complaint).where(
            Complaint.status.in_(["RESOLVED", "VERIFIED", "CLOSED"])
        )
    )).scalar() or 0

    avg_resolution_hours = (await db.execute(
        select(
            func.avg(func.extract("epoch", Complaint.resolved_at - Complaint.created_at) / 3600)
        ).where(Complaint.resolved_at.isnot(None))
    )).scalar()

    return ComplaintStats(
        total_open=total_open,
        total_critical=total_critical,
        resolved_today=resolved_today,
        avg_trust_score=72.5,  # Will be computed from trust_scores table
        total_complaints=total,
        total_resolved=total_resolved,
        total_pending=total_pending,
        total_in_progress=total_in_progress,
        avg_resolution_hours=round(float(avg_resolution_hours), 1) if avg_resolution_hours is not None else 0.0,
    )


@router.get("/ward/{ward_id}", response_model=ComplaintListOut)
async def complaints_by_ward(
    ward_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = _complaint_query().where(Complaint.ward_id == ward_id)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    stmt = stmt.order_by(desc(Complaint.created_at)).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(stmt)
    items = [ComplaintOut.model_validate(c) for c in result.scalars().all()]
    return ComplaintListOut(items=items, total=total, page=page, per_page=per_page)


@router.get("/{complaint_id}", response_model=ComplaintOut)
async def get_complaint(complaint_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        _complaint_query().where(Complaint.id == complaint_id)
    )
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return ComplaintOut.model_validate(complaint)


@router.put("/{complaint_id}/assign", response_model=ComplaintOut)
async def assign_complaint(
    complaint_id: uuid.UUID,
    body: ComplaintAssign,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        _complaint_query().where(Complaint.id == complaint_id)
    )
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if user.role not in ("LEADER", "DEPARTMENT_HEAD", "ADMIN"):
        raise HTTPException(status_code=403, detail="Only leadership roles can assign complaints")

    assignee_result = await db.execute(select(User).where(User.id == body.assigned_to))
    assignee = assignee_result.scalar_one_or_none()
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee user not found")

    if assignee.role not in ("WORKER", "OFFICER", "ENGINEER", "DEPARTMENT_HEAD"):
        raise HTTPException(
            status_code=400,
            detail="Assignee must be WORKER, OFFICER, ENGINEER, or DEPARTMENT_HEAD",
        )

    old_status = complaint.status
    complaint.assigned_to = body.assigned_to
    complaint.assigned_at = datetime.utcnow()
    complaint.status = "ASSIGNED"

    db.add(AuditLog(
        entity_type="complaint",
        entity_id=complaint.id,
        action="ASSIGNED",
        old_value=old_status,
        new_value=json.dumps({
            "status": "ASSIGNED",
            "note": f"Assigned to {assignee.name} ({assignee.role})",
        }),
        performed_by=user.id,
    ))

    await _dispatch_external_notifications(
        db=db,
        complaint=complaint,
        status="ASSIGNED",
        feedback_note=f"Assigned to {assignee.name} ({assignee.role})",
        actor_name=getattr(user, "name", None),
    )

    await db.flush()
    await db.refresh(complaint)
    return ComplaintOut.model_validate(complaint)


@router.get("/{complaint_id}/assignment-recommendations", response_model=AssignmentRecommendationOut)
async def assignment_recommendations(
    complaint_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if user.role not in ("LEADER", "DEPARTMENT_HEAD", "ADMIN"):
        raise HTTPException(status_code=403, detail="Only leadership roles can view assignment recommendations")

    result = await db.execute(
        _complaint_query().where(Complaint.id == complaint_id)
    )
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    users_result = await db.execute(
        select(User).where(User.role.in_(["WORKER", "OFFICER", "ENGINEER", "DEPARTMENT_HEAD"]))
    )
    candidates = users_result.scalars().all()

    recommendations = recommend_assignees(complaint, candidates)
    recommendation_items = [
        AssignmentRecommendationItem(
            user_id=item["user_id"],
            name=item["name"],
            role=item["role"],
            department=item.get("department"),
            ward_id=item.get("ward_id"),
            suitability_score=item["suitability_score"],
            reason=item["reason"],
        )
        for item in recommendations["candidates"]
    ]

    return AssignmentRecommendationOut(
        complaint_id=complaint.id,
        category=complaint.category.name if complaint.category else None,
        required_department=recommendations.get("required_department"),
        recommended_role=recommendations.get("recommended_role", "WORKER"),
        escalation_role=recommendations.get("escalation_role"),
        candidates=recommendation_items,
    )


@router.put("/{complaint_id}/status", response_model=ComplaintOut)
async def update_status(
    complaint_id: uuid.UUID,
    body: ComplaintStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        _complaint_query().where(Complaint.id == complaint_id)
    )
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    leadership_roles = {"LEADER", "DEPARTMENT_HEAD", "ADMIN"}
    worker_roles = {"WORKER", "OFFICER", "ENGINEER"}
    worker_allowed_statuses = {"UNDER_REVIEW", "IN_PROGRESS", "VERIFICATION_PENDING"}
    final_leader_statuses = {"RESOLVED", "VERIFIED", "CLOSED"}

    if user.role in worker_roles:
        if complaint.assigned_to != user.id:
            raise HTTPException(status_code=403, detail="Workers can update only complaints assigned to them")
        if body.status not in worker_allowed_statuses:
            raise HTTPException(
                status_code=403,
                detail="Workers can set status only to UNDER_REVIEW, IN_PROGRESS, or VERIFICATION_PENDING",
            )
    elif user.role in leadership_roles:
        if body.status in final_leader_statuses and complaint.status != "VERIFICATION_PENDING":
            raise HTTPException(
                status_code=400,
                detail="Final verification statuses can only be set after worker marks VERIFICATION_PENDING",
            )
    else:
        raise HTTPException(status_code=403, detail="Not allowed to update complaint status")

    old_status = complaint.status
    complaint.status = body.status
    complaint.updated_at = datetime.utcnow()

    if body.status in ("RESOLVED", "VERIFIED", "CLOSED"):
        complaint.resolved_at = datetime.utcnow()
    if body.status == "VERIFIED":
        complaint.verified_at = datetime.utcnow()

    db.add(AuditLog(
        entity_type="complaint",
        entity_id=complaint.id,
        action="STATUS_CHANGED",
        old_value=old_status,
        new_value=json.dumps({"status": body.status, "note": (body.notes or "").strip()}),
        performed_by=user.id,
    ))

    await _dispatch_external_notifications(
        db=db,
        complaint=complaint,
        status=body.status,
        feedback_note=body.notes,
        actor_name=getattr(user, "name", None),
    )

    await db.flush()
    await db.refresh(complaint)
    return ComplaintOut.model_validate(complaint)


@router.get("/citizen/notifications", response_model=ComplaintNotificationListOut)
async def my_notifications(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    citizen_ids = await _resolve_citizen_ids_by_phone(db, getattr(user, "phone", None))
    citizen_ids += await _resolve_citizen_ids_by_email(db, getattr(user, "email", None))
    citizen_ids = list(dict.fromkeys(citizen_ids))
    if not citizen_ids:
        return ComplaintNotificationListOut(items=[], total=0, unread_count=0)

    state = await db.get(NotificationState, user.id)
    last_seen_at = state.last_seen_at if state else None

    complaints_result = await db.execute(
        select(Complaint.id, Complaint.ai_summary, Complaint.raw_text)
        .where(Complaint.citizen_id.in_(citizen_ids))
    )
    complaint_rows = complaints_result.all()
    complaint_ids = [row[0] for row in complaint_rows]
    if not complaint_ids:
        return ComplaintNotificationListOut(items=[], total=0, unread_count=0)

    complaint_map = {
        row[0]: (row[1] or row[2] or "Complaint update")
        for row in complaint_rows
    }

    logs_result = await db.execute(
        select(AuditLog)
        .where(
            AuditLog.entity_type == "complaint",
            AuditLog.entity_id.in_(complaint_ids),
            AuditLog.action.in_(["ASSIGNED", "STATUS_CHANGED"]),
        )
        .order_by(desc(AuditLog.performed_at))
        .limit(limit)
    )
    logs = logs_result.scalars().all()

    performer_ids = [log.performed_by for log in logs if log.performed_by]
    performer_map: dict[uuid.UUID, str] = {}
    if performer_ids:
        users_result = await db.execute(select(User.id, User.name).where(User.id.in_(performer_ids)))
        performer_map = {row[0]: row[1] for row in users_result.all()}

    now = datetime.utcnow()
    items = []
    unread_count = 0
    for log in logs:
        status_value, feedback_note = _parse_status_audit_payload(log.new_value)
        summary = complaint_map.get(log.entity_id)
        message = _status_notification_text(status_value)
        if feedback_note:
            message = f"{message} Leader feedback: {feedback_note}"

        performed_at = log.performed_at or now
        is_read = bool(last_seen_at and performed_at <= last_seen_at)
        is_recent = (now - performed_at).total_seconds() <= 86400
        if not is_read:
            unread_count += 1

        items.append(
            ComplaintNotificationOut(
                complaint_id=log.entity_id,
                complaint_summary=summary,
                status=status_value,
                feedback_note=feedback_note,
                notification_message=message,
                performed_by_name=performer_map.get(log.performed_by),
                performed_at=performed_at,
                is_read=is_read,
                is_recent=is_recent,
            )
        )

    return ComplaintNotificationListOut(items=items, total=len(items), unread_count=unread_count)


@router.post("/citizen/notifications/mark-seen", response_model=NotificationSeenOut)
async def mark_notifications_seen(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    now = datetime.utcnow()
    state = await db.get(NotificationState, user.id)
    if not state:
        state = NotificationState(user_id=user.id, last_seen_at=now)
        db.add(state)
    else:
        state.last_seen_at = now

    await db.flush()
    return NotificationSeenOut(message="Notifications marked as seen.", unread_count=0)


@router.get("/{complaint_id}/feedback", response_model=ComplaintFeedbackOut)
async def latest_complaint_feedback(
    complaint_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    complaint_result = await db.execute(
        select(Complaint).where(Complaint.id == complaint_id)
    )
    complaint = complaint_result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Citizens can only read feedback for their own complaint set.
    if getattr(user, "role", None) == "CITIZEN":
        citizen_ids = await _resolve_citizen_ids_by_phone(db, getattr(user, "phone", None))
        if complaint.citizen_id not in citizen_ids:
            raise HTTPException(status_code=403, detail="Not allowed to access this complaint feedback")

    log_result = await db.execute(
        select(AuditLog)
        .where(
            AuditLog.entity_type == "complaint",
            AuditLog.entity_id == complaint.id,
            AuditLog.action.in_(["ASSIGNED", "STATUS_CHANGED"]),
        )
        .order_by(desc(AuditLog.performed_at))
        .limit(1)
    )
    log = log_result.scalar_one_or_none()

    if not log:
        message = _status_notification_text(complaint.status)
        return ComplaintFeedbackOut(
            complaint_id=complaint.id,
            complaint_summary=complaint.ai_summary or complaint.raw_text,
            action="STATUS_SNAPSHOT",
            status=complaint.status,
            feedback_note=None,
            notification_message=message,
            performed_by_name=None,
            performed_at=complaint.updated_at or complaint.created_at,
        )

    status_value, feedback_note = _parse_status_audit_payload(log.new_value)
    performer_name = None
    if log.performed_by:
        performer = await db.get(User, log.performed_by)
        performer_name = performer.name if performer else None

    message = _status_notification_text(status_value)
    if feedback_note:
        message = f"{message} Leader feedback: {feedback_note}"

    return ComplaintFeedbackOut(
        complaint_id=complaint.id,
        complaint_summary=complaint.ai_summary or complaint.raw_text,
        action=log.action or "STATUS_CHANGED",
        status=status_value,
        feedback_note=feedback_note,
        notification_message=message,
        performed_by_name=performer_name,
        performed_at=log.performed_at or datetime.utcnow(),
    )
