"""Communications router — generate, list, approve, publish."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.communication import Communication
from app.models.complaint import Complaint
from app.schemas.dashboard import CommunicationGenerate, CommunicationOut
from app.utils.helpers import get_current_user

router = APIRouter()


@router.post("/generate", response_model=CommunicationOut, status_code=201)
async def generate_communication(
    body: CommunicationGenerate,
    db: AsyncSession = Depends(get_db),
):
    """AI-generates a communication draft."""
    from app.services.comms_service import generate_communication as gen_comm

    # Gather complaint data if linked
    complaint_data = {}
    linked_complaint_id = None
    if body.complaint_id:
        complaint_identifier = str(body.complaint_id).strip()
        complaint_stmt = (
            select(Complaint)
            .options(
                selectinload(Complaint.category),
                selectinload(Complaint.ward),
                selectinload(Complaint.assignee),
            )
        )

        complaint = None
        try:
            complaint_uuid = uuid.UUID(complaint_identifier)
            result = await db.execute(complaint_stmt.where(Complaint.id == complaint_uuid))
            complaint = result.scalar_one_or_none()
        except Exception:
            result = await db.execute(
                complaint_stmt.where(Complaint.complaint_code == complaint_identifier)
            )
            complaint = result.scalar_one_or_none()

        if not complaint:
            raise HTTPException(
                status_code=404,
                detail="Complaint not found. Use a valid complaint UUID or complaint code.",
            )

        linked_complaint_id = complaint.id

        complaint_data = {
            "id": str(complaint.id),
            "complaint_code": complaint.complaint_code,
            "summary": complaint.ai_summary or complaint.raw_text or "",
            "category": complaint.category.name if complaint.category else "Other",
            "ward": complaint.ward.ward_name if complaint.ward else "Ward Area",
            "ward_number": complaint.ward.ward_number if complaint.ward else None,
            "status": complaint.status,
            "priority": complaint.priority_level,
            "assigned_to": complaint.assignee.name if complaint.assignee else "Ward Field Team",
        }

    if body.comm_type == "ANNOUNCEMENT":
        if not body.announcement_message:
            raise HTTPException(status_code=400, detail="Announcement message is required for ward announcement")

        complaint_data.update(
            {
                "announcement_title": body.announcement_title or "Ward Public Announcement",
                "announcement_message": body.announcement_message,
                "announcement_scheduled_for": body.announcement_scheduled_for,
                "announcement_duration_hours": body.announcement_duration_hours,
            }
        )

    content = await gen_comm(body.comm_type, complaint_data, body.format)

    comm = Communication(
        complaint_id=linked_complaint_id,
        comm_type=body.comm_type,
        content_english=content.get("content_english", ""),
        content_hindi=content.get("content_hindi", ""),
        format=body.format,
        status="DRAFT",
    )
    db.add(comm)
    await db.flush()
    await db.refresh(comm)
    return CommunicationOut.model_validate(comm)


@router.get("", response_model=list[CommunicationOut])
async def list_communications(
    status: str = None,
    comm_type: str = None,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Communication).order_by(desc(Communication.created_at)).limit(limit)
    if status:
        stmt = stmt.where(Communication.status == status.upper())
    if comm_type:
        stmt = stmt.where(Communication.comm_type == comm_type.upper())
    result = await db.execute(stmt)
    return [CommunicationOut.model_validate(c) for c in result.scalars().all()]


@router.put("/{comm_id}/approve", response_model=CommunicationOut)
async def approve_communication(
    comm_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(Communication).where(Communication.id == comm_id)
    )
    comm = result.scalar_one_or_none()
    if not comm:
        raise HTTPException(status_code=404, detail="Communication not found")

    comm.status = "APPROVED"
    comm.approved_by = user.id
    await db.flush()
    await db.refresh(comm)
    return CommunicationOut.model_validate(comm)


@router.post("/{comm_id}/publish", response_model=CommunicationOut)
async def publish_communication(
    comm_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(Communication).where(Communication.id == comm_id)
    )
    comm = result.scalar_one_or_none()
    if not comm:
        raise HTTPException(status_code=404, detail="Communication not found")

    comm.status = "PUBLISHED"
    comm.published_at = datetime.utcnow()
    await db.flush()
    await db.refresh(comm)
    return CommunicationOut.model_validate(comm)
