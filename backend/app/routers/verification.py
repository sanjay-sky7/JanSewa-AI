"""Verification router — submit evidence, get results, approve."""

import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.complaint import Complaint
from app.models.verification import Verification
from app.models.audit_log import AuditLog
from app.schemas.verification import (
    VerificationApproval,
    VerificationOut,
)
from app.utils.helpers import get_current_user
from app.utils.exif_reader import extract_exif_data
from app.services.verification_service import verify_work_completion

router = APIRouter()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "verifications"


async def _save_upload(image_file: UploadFile, prefix: str) -> tuple[str, str]:
    content_type = (image_file.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WEBP images are supported")

    extension = ".jpg"
    if content_type == "image/png":
        extension = ".png"
    elif content_type == "image/webp":
        extension = ".webp"

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_name = f"{prefix}_{uuid.uuid4().hex}{extension}"
    file_path = UPLOAD_DIR / file_name

    data = await image_file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded image is empty")

    max_size_bytes = 10 * 1024 * 1024
    if len(data) > max_size_bytes:
        raise HTTPException(status_code=413, detail="Image size must be <= 10MB")

    with open(file_path, "wb") as saved:
        saved.write(data)

    return f"/uploads/verifications/{file_name}", str(file_path)


def _parse_exif_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y:%m:%d %H:%M:%S")
    except Exception:
        return None


@router.post("/{complaint_id}", response_model=VerificationOut, status_code=201)
async def submit_verification(
    complaint_id: uuid.UUID,
    after_image: UploadFile = File(...),
    before_image: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Worker submits after-photo for verification."""
    result = await db.execute(select(Complaint).where(Complaint.id == complaint_id))
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if complaint.assigned_to and complaint.assigned_to != user.id:
        raise HTTPException(status_code=403, detail="Only assigned worker can submit verification evidence")

    before_image_url = complaint.raw_image_url
    before_image_path = None
    if before_image is not None:
        before_image_url, before_image_path = await _save_upload(before_image, "before")
    elif before_image_url and before_image_url.startswith("/uploads/"):
        candidate_path = Path(__file__).resolve().parents[2] / before_image_url.lstrip("/")
        if candidate_path.exists():
            before_image_path = str(candidate_path)

    after_image_url, after_image_path = await _save_upload(after_image, "after")

    before_exif = extract_exif_data(before_image_path) if before_image_path else {}
    after_exif = extract_exif_data(after_image_path) if after_image_path else {}

    detected_before_lat = before_exif.get("gps_latitude")
    detected_before_lng = before_exif.get("gps_longitude")
    detected_before_time = _parse_exif_datetime(before_exif.get("datetime"))

    detected_after_lat = after_exif.get("gps_latitude")
    detected_after_lng = after_exif.get("gps_longitude")
    detected_after_time = _parse_exif_datetime(after_exif.get("datetime"))

    verification = Verification(
        complaint_id=complaint_id,
        before_image_url=before_image_url,
        before_latitude=detected_before_lat if detected_before_lat is not None else (float(complaint.ai_latitude) if complaint.ai_latitude else None),
        before_longitude=detected_before_lng if detected_before_lng is not None else (float(complaint.ai_longitude) if complaint.ai_longitude else None),
        before_timestamp=detected_before_time or complaint.created_at,
        after_image_url=after_image_url,
        after_latitude=detected_after_lat,
        after_longitude=detected_after_lng,
        after_timestamp=detected_after_time or datetime.utcnow(),
    )

    assignment_reference = complaint.assigned_at or complaint.updated_at or complaint.created_at
    assignment_date_str = assignment_reference.strftime("%Y-%m-%d")

    # Run actual 4-layer verification service
    try:
        verification_result = await verify_work_completion(
            before_image_path=before_image_path,
            after_image_path=after_image_path,
            original_latitude=float(verification.before_latitude) if verification.before_latitude is not None else None,
            original_longitude=float(verification.before_longitude) if verification.before_longitude is not None else None,
            assignment_date=assignment_date_str,
        )

        verification.location_match = bool(verification_result.get("layer1_location_match"))
        verification.time_valid = bool(verification_result.get("layer2_time_valid"))
        verification.visual_change_detected = bool(verification_result.get("layer3_visual_change"))
        verification.visual_change_confidence = 1.0 if verification.visual_change_detected else 0.0
        verification.tamper_detected = not bool(verification_result.get("layer4_no_tampering"))
        verification.verification_status = verification_result.get("overall_verdict", "MANUAL_REVIEW")
        verification.overall_confidence = float(verification_result.get("confidence", 0.0))
        verification.ai_remarks = " | ".join(verification_result.get("remarks", []))
    except Exception:
        verification.verification_status = "MANUAL_REVIEW"
        verification.ai_remarks = "Automated verification unavailable — sent to manual review"

    db.add(verification)

    # Update complaint status
    complaint.status = "VERIFICATION_PENDING"
    complaint.updated_at = datetime.utcnow()
    db.add(AuditLog(
        entity_type="verification",
        entity_id=verification.id,
        action="CREATED",
        performed_by=user.id,
    ))

    await db.flush()
    await db.refresh(verification)
    return VerificationOut.model_validate(verification)


@router.get("/{complaint_id}", response_model=VerificationOut)
async def get_verification(
    complaint_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Verification).where(Verification.complaint_id == complaint_id)
    )
    verification = result.scalar_one_or_none()
    if not verification:
        raise HTTPException(status_code=404, detail="Verification not found")
    return VerificationOut.model_validate(verification)


@router.post("/{verification_id}/approve", response_model=VerificationOut)
async def approve_verification(
    verification_id: uuid.UUID,
    body: VerificationApproval,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Leader approves or rejects verification."""
    result = await db.execute(
        select(Verification).where(Verification.id == verification_id)
    )
    verification = result.scalar_one_or_none()
    if not verification:
        raise HTTPException(status_code=404, detail="Verification not found")

    verification.verified_by = user.id
    if body.approved:
        verification.verification_status = "VERIFIED"
        # Update complaint
        complaint_result = await db.execute(
            select(Complaint).where(Complaint.id == verification.complaint_id)
        )
        complaint = complaint_result.scalar_one_or_none()
        if complaint:
            complaint.status = "VERIFIED"
            import datetime as dt
            complaint.verified_at = dt.datetime.utcnow()
    else:
        verification.verification_status = "REJECTED"
        if body.remarks:
            verification.ai_remarks = (verification.ai_remarks or "") + f"\nLeader: {body.remarks}"

    db.add(AuditLog(
        entity_type="verification",
        entity_id=verification.id,
        action="APPROVED" if body.approved else "REJECTED",
        performed_by=user.id,
    ))

    await db.flush()
    await db.refresh(verification)
    return VerificationOut.model_validate(verification)
