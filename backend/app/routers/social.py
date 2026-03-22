"""Social media router — feed, sentiment, alerts, scan, and live summary."""

import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.social_post import SocialPost
from app.schemas.dashboard import SocialPostOut, SocialAlert

router = APIRouter()


@router.get("/feed", response_model=list[SocialPostOut])
async def social_feed(
    limit: int = Query(30, ge=1, le=100),
    platform: Optional[str] = None,
    sentiment: Optional[str] = None,
    only_complaints: Optional[bool] = None,
    only_misinformation: Optional[bool] = None,
    since_minutes: int = Query(0, ge=0, le=1440),
    db: AsyncSession = Depends(get_db),
):
    """Latest monitored social media posts."""
    stmt = select(SocialPost).order_by(desc(SocialPost.created_at)).limit(limit)
    if platform:
        stmt = stmt.where(func.lower(SocialPost.platform) == platform.lower())
    if sentiment:
        stmt = stmt.where(func.upper(SocialPost.sentiment) == sentiment.upper())
    if only_complaints is True:
        stmt = stmt.where(SocialPost.is_complaint == True)
    if only_misinformation is True:
        stmt = stmt.where(SocialPost.is_misinformation == True)
    if since_minutes > 0:
        since_ts = datetime.utcnow() - timedelta(minutes=since_minutes)
        stmt = stmt.where(SocialPost.created_at >= since_ts)

    result = await db.execute(stmt)
    return [SocialPostOut.model_validate(p) for p in result.scalars().all()]


@router.get("/sentiment")
async def sentiment_overview(db: AsyncSession = Depends(get_db)):
    """Aggregate sentiment breakdown."""
    stmt = (
        select(SocialPost.sentiment, func.count().label("count"))
        .group_by(SocialPost.sentiment)
    )
    result = await db.execute(stmt)
    breakdown = {row.sentiment: row.count for row in result.all()}

    total = sum(breakdown.values()) or 1
    return {
        "total_posts": total,
        "positive": breakdown.get("POSITIVE", 0),
        "negative": breakdown.get("NEGATIVE", 0),
        "angry": breakdown.get("ANGRY", 0),
        "neutral": breakdown.get("NEUTRAL", 0),
        "positive_pct": round(breakdown.get("POSITIVE", 0) / total * 100, 1),
        "negative_pct": round(breakdown.get("NEGATIVE", 0) / total * 100, 1),
        "angry_pct": round(breakdown.get("ANGRY", 0) / total * 100, 1),
        "neutral_pct": round(breakdown.get("NEUTRAL", 0) / total * 100, 1),
    }


@router.get("/alerts", response_model=list[SocialAlert])
async def social_alerts(db: AsyncSession = Depends(get_db)):
    """Viral posts and misinformation alerts."""
    stmt = (
        select(SocialPost)
        .where(
            (SocialPost.is_misinformation == True)
            | (SocialPost.virality_score >= 70)
        )
        .order_by(desc(SocialPost.virality_score))
        .limit(20)
    )
    result = await db.execute(stmt)
    posts = result.scalars().all()
    return [
        SocialAlert(
            id=p.id,
            post_text=p.post_text or "",
            platform=p.platform,
            sentiment=p.sentiment or "NEUTRAL",
            virality_score=p.virality_score or 0,
            is_misinformation=p.is_misinformation or False,
            misinfo_explanation=p.misinfo_explanation,
        )
        for p in posts
    ]


@router.get("/live-summary")
async def social_live_summary(db: AsyncSession = Depends(get_db)):
    """Real-time signal summary for the last 15 and 60 minutes."""
    now = datetime.utcnow()
    last_15 = now - timedelta(minutes=15)
    last_60 = now - timedelta(minutes=60)

    row_15 = (await db.execute(
        select(
            func.count(SocialPost.id).label("total"),
            func.sum(case((SocialPost.is_complaint == True, 1), else_=0)).label("complaints"),
            func.sum(case((SocialPost.is_misinformation == True, 1), else_=0)).label("misinfo"),
            func.sum(case((SocialPost.sentiment == "NEGATIVE", 1), else_=0)).label("negative"),
            func.sum(case((SocialPost.sentiment == "ANGRY", 1), else_=0)).label("angry"),
        ).where(SocialPost.created_at >= last_15)
    )).one()

    row_60 = (await db.execute(
        select(
            func.count(SocialPost.id).label("total"),
            func.avg(SocialPost.virality_score).label("avg_virality"),
            func.sum(case((SocialPost.sentiment.in_(["NEGATIVE", "ANGRY"]), 1), else_=0)).label("negative_or_angry"),
        ).where(SocialPost.created_at >= last_60)
    )).one()

    top_ward_rows = (await db.execute(
        select(SocialPost.extracted_ward, func.count(SocialPost.id).label("cnt"))
        .where(SocialPost.created_at >= last_60, SocialPost.extracted_ward.isnot(None))
        .group_by(SocialPost.extracted_ward)
        .order_by(desc("cnt"))
        .limit(3)
    )).all()

    top_category_rows = (await db.execute(
        select(SocialPost.extracted_category, func.count(SocialPost.id).label("cnt"))
        .where(SocialPost.created_at >= last_60, SocialPost.extracted_category.isnot(None))
        .group_by(SocialPost.extracted_category)
        .order_by(desc("cnt"))
        .limit(3)
    )).all()

    total_60 = int(row_60.total or 0)
    negative_or_angry_60 = int(row_60.negative_or_angry or 0)

    return {
        "as_of": now.isoformat(),
        "signals_last_15m": int(row_15.total or 0),
        "complaints_last_15m": int(row_15.complaints or 0),
        "misinfo_last_15m": int(row_15.misinfo or 0),
        "negative_last_15m": int(row_15.negative or 0),
        "angry_last_15m": int(row_15.angry or 0),
        "signals_last_60m": total_60,
        "avg_virality_last_60m": round(float(row_60.avg_virality or 0), 2),
        "negative_pressure_last_60m": round((negative_or_angry_60 / total_60) * 100, 1) if total_60 else 0.0,
        "top_wards_last_60m": [{"ward": int(r[0]), "count": int(r[1])} for r in top_ward_rows],
        "top_categories_last_60m": [{"category": r[0], "count": int(r[1])} for r in top_category_rows],
    }


@router.post("/scan")
async def trigger_scan(db: AsyncSession = Depends(get_db)):
    """Trigger a manual social media scan."""
    from app.services.social_service import scan_social_media

    posts = await scan_social_media("Delhi", ["Shanti Nagar", "Rajendra Nagar"])

    saved = 0
    for p in posts:
        sp = SocialPost(
            platform=p.get("platform", "twitter"),
            post_url=p.get("post_url"),
            post_text=p.get("post_text"),
            author_handle=p.get("author_handle"),
            sentiment=p.get("sentiment"),
            sentiment_score=p.get("sentiment_score"),
            extracted_category=p.get("category"),
            extracted_ward=p.get("extracted_ward"),
            is_complaint=p.get("is_complaint", False),
            is_misinformation=p.get("is_misinformation", False),
            misinfo_confidence=p.get("misinfo_confidence"),
            misinfo_explanation=p.get("misinfo_explanation"),
            likes=p.get("likes", 0),
            shares=p.get("shares", 0),
            replies=p.get("replies", 0),
            virality_score=p.get("virality_score", 0),
        )
        db.add(sp)
        saved += 1

    await db.flush()
    return {"message": f"Scanned and saved {saved} posts"}
