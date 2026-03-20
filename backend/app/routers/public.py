"""Public portal router — citizen-facing endpoints (no auth required)."""

import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.complaint import Complaint
from app.models.ward import Ward
from app.models.verification import Verification
from app.models.trust_score import TrustScore
from app.models.citizen import Citizen
from app.models.audit_log import AuditLog
from app.schemas.dashboard import WardScorecard, PublicAction, TrustScoreOut, PublicWardMapItem
from app.schemas.complaint import ComplaintCreate, ComplaintOut
from app.schemas.dashboard import HelpCenterOut
from app.knowledge_base.help_center import get_help_center_content

router = APIRouter()


@router.get("/wards/map", response_model=list[PublicWardMapItem])
async def wards_map(db: AsyncSession = Depends(get_db)):
    """All wards with coordinates and headline complaint metrics for map rendering."""
    wards = (await db.execute(select(Ward).order_by(Ward.ward_number.asc()))).scalars().all()
    payload: list[PublicWardMapItem] = []

    for ward in wards:
        total = (await db.execute(
            select(func.count()).select_from(Complaint).where(Complaint.ward_id == ward.id)
        )).scalar() or 0

        open_count = (await db.execute(
            select(func.count()).select_from(Complaint).where(
                Complaint.ward_id == ward.id,
                Complaint.status.in_(["OPEN", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "VERIFICATION_PENDING"]),
            )
        )).scalar() or 0

        resolved_count = (await db.execute(
            select(func.count()).select_from(Complaint).where(
                Complaint.ward_id == ward.id,
                Complaint.status.in_(["RESOLVED", "VERIFIED", "CLOSED"]),
            )
        )).scalar() or 0

        trust = (await db.execute(
            select(TrustScore)
            .where(TrustScore.ward_id == ward.id)
            .order_by(TrustScore.date.desc())
            .limit(1)
        )).scalar_one_or_none()

        payload.append(
            PublicWardMapItem(
                ward_id=ward.id,
                ward_number=ward.ward_number,
                ward_name=ward.ward_name,
                latitude=float(ward.latitude) if ward.latitude is not None else None,
                longitude=float(ward.longitude) if ward.longitude is not None else None,
                total_complaints=total,
                open_complaints=open_count,
                resolved_complaints=resolved_count,
                trust_score=float(trust.final_trust_score) if trust and trust.final_trust_score is not None else None,
            )
        )

    return payload


@router.get("/help-center", response_model=HelpCenterOut)
async def help_center(
    query: Optional[str] = None,
    role: Optional[str] = None,
):
    return HelpCenterOut(**get_help_center_content(query=query, role=role))


async def _resolve_ward(ward_ref: int, db: AsyncSession) -> Ward | None:
    result = await db.execute(
        select(Ward).where((Ward.id == ward_ref) | (Ward.ward_number == ward_ref))
    )
    return result.scalar_one_or_none()


@router.get("/ward/{ward_id}/scorecard", response_model=WardScorecard)
async def ward_scorecard(ward_id: int, db: AsyncSession = Depends(get_db)):
    ward = await _resolve_ward(ward_id, db)
    if not ward:
        raise HTTPException(status_code=404, detail="Ward not found")

    thirty = datetime.utcnow() - timedelta(days=30)

    total = (await db.execute(
        select(func.count()).select_from(Complaint).where(
            Complaint.ward_id == ward.id, Complaint.created_at >= thirty
        )
    )).scalar() or 0

    resolved = (await db.execute(
        select(func.count()).select_from(Complaint).where(
            Complaint.ward_id == ward.id,
            Complaint.status.in_(["RESOLVED", "VERIFIED", "CLOSED"]),
            Complaint.created_at >= thirty,
        )
    )).scalar() or 0

    pending = max(total - resolved, 0)

    avg_hours = (await db.execute(
        select(func.avg(
            func.extract("epoch", Complaint.resolved_at - Complaint.created_at) / 3600
        )).where(
            Complaint.ward_id == ward.id,
            Complaint.resolved_at.isnot(None),
        )
    )).scalar() or 0

    # Latest trust score
    trust = (await db.execute(
        select(TrustScore)
        .where(TrustScore.ward_id == ward.id)
        .order_by(TrustScore.date.desc())
        .limit(1)
    )).scalar_one_or_none()

    return WardScorecard(
        ward_id=ward.id,
        ward_name=ward.ward_name,
        ward_number=ward.ward_number,
        latitude=float(ward.latitude) if ward.latitude is not None else None,
        longitude=float(ward.longitude) if ward.longitude is not None else None,
        total_complaints=total,
        total_resolved=resolved,
        resolved=resolved,
        pending=pending,
        resolution_rate=round(resolved / total * 100, 1) if total > 0 else 0,
        avg_response_hours=round(float(avg_hours), 1),
        avg_resolution_hours=round(float(avg_hours), 1),
        trust_score=float(trust.final_trust_score) if trust else 0,
    )


@router.get("/ward/{ward_id}/actions", response_model=list[PublicAction])
async def recent_actions(ward_id: int, db: AsyncSession = Depends(get_db)):
    """Recently resolved complaints in a ward — public facing."""
    ward = await _resolve_ward(ward_id, db)
    if not ward:
        raise HTTPException(status_code=404, detail="Ward not found")

    stmt = (
        select(Complaint)
        .options(selectinload(Complaint.category))
        .where(
            Complaint.ward_id == ward.id,
            Complaint.status.in_([
                "UNDER_REVIEW",
                "ASSIGNED",
                "IN_PROGRESS",
                "RESOLVED",
                "VERIFIED",
                "CLOSED",
            ]),
        )
        .order_by(Complaint.updated_at.desc())
        .limit(20)
    )
    result = await db.execute(stmt)
    complaints = result.scalars().all()

    actions = []
    for c in complaints:
        # Check if it has a verification
        ver = (await db.execute(
            select(Verification).where(Verification.complaint_id == c.id)
        )).scalar_one_or_none()

        actions.append(PublicAction(
            complaint_id=c.id,
            summary=c.ai_summary or c.raw_text or "Issue resolved",
            category=c.category.name if c.category else "General",
            status=c.status,
            resolved_at=c.resolved_at or c.updated_at,
            has_verification=ver is not None,
        ))
    return actions


@router.get("/ward/{ward_id}/trust", response_model=Optional[TrustScoreOut])
async def ward_trust(ward_id: int, db: AsyncSession = Depends(get_db)):
    ward = await _resolve_ward(ward_id, db)
    if not ward:
        raise HTTPException(status_code=404, detail="Ward not found")

    trust = (await db.execute(
        select(TrustScore)
        .where(TrustScore.ward_id == ward.id)
        .order_by(TrustScore.date.desc())
        .limit(1)
    )).scalar_one_or_none()

    if not trust:
        return None
    return TrustScoreOut.model_validate(trust)


@router.post("/complaint", response_model=ComplaintOut, status_code=201)
async def public_submit_complaint(
    body: ComplaintCreate,
    db: AsyncSession = Depends(get_db),
):
    """Citizen submits a complaint through the public portal (no auth)."""
    from app.routers.complaints import create_complaint
    return await create_complaint(body, db)
