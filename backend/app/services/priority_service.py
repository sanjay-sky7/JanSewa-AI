"""
Priority scoring engine — 5-factor weighted composite.

PRIMARY:   KB priority_rules + ward_database for enriched scoring
ENHANCED:  DB queries for recurrence + vulnerability data
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.complaint import Complaint
from app.models.ward import Ward
from app.models.social_post import SocialPost

from app.knowledge_base.priority_rules import ESCALATION_RULES, calculate_priority_kb
from app.knowledge_base.ward_database import get_ward_vulnerability_score
from app.knowledge_base.governance_policies import get_sla, get_escalation_target

logger = logging.getLogger(__name__)

# Category base urgency scores
CATEGORY_URGENCY: dict[str, int] = {
    "Water Supply": 85,
    "Health": 90,
    "Public Safety": 95,
    "Electricity": 75,
    "Drainage": 80,
    "Road/Pothole": 60,
    "Garbage": 65,
    "Other": 40,
}


SEVERITY_SIGNAL_SCORES: dict[str, int] = {
    "urgent": 8,
    "emergency": 12,
    "critical": 12,
    "danger": 10,
    "accident": 10,
    "injury": 10,
    "fire": 12,
    "flood": 9,
    "waterlogging": 8,
    "hospital": 7,
    "no water": 8,
    "power cut": 6,
    "collapsed": 12,
    "toxic": 10,
    "sewage": 9,
    "electrocution": 12,
    "school": 7,
    "hospital emergency": 11,
}


async def calculate_priority_score(
    complaint_data: dict,
    db: AsyncSession,
) -> dict:
    """
    Calculate composite priority score (0-100) using 5 weighted factors.

    Formula:
        Score = 0.30×Urgency + 0.25×Impact + 0.20×Recurrence
              + 0.15×Sentiment + 0.10×Vulnerability
    """

    # ── FACTOR 1: URGENCY (30%) ──────────────────────────
    category = complaint_data.get("category", "Other")
    urgency = CATEGORY_URGENCY.get(category, 40)

    if complaint_data.get("is_emergency"):
        urgency = min(100, urgency + 15)

    duration = complaint_data.get("duration_days") or 0
    if duration > 7:
        urgency = min(100, urgency + 10)
    elif duration > 3:
        urgency = min(100, urgency + 5)

    severity_keywords = [str(k).lower() for k in (complaint_data.get("severity_keywords") or [])]
    severity_boost = 0
    for token in severity_keywords:
        for signal, score in SEVERITY_SIGNAL_SCORES.items():
            if signal in token:
                severity_boost = max(severity_boost, score)
    urgency = min(100, urgency + severity_boost)

    sla = get_sla("high" if urgency >= 60 else "medium")
    sla_target_hours = int((sla or {}).get("target_hours") or 72)
    if sla_target_hours <= 6:
        urgency = min(100, urgency + 10)
    elif sla_target_hours <= 12:
        urgency = min(100, urgency + 6)

    # ── FACTOR 2: IMPACT (25%) ───────────────────────────
    impact_map = {
        "individual": 20,
        "family": 35,
        "street": 55,
        "colony": 75,
        "ward": 95,
    }
    impact = impact_map.get(
        complaint_data.get("affected_estimate", "individual"), 20
    )

    if duration >= 14:
        impact = min(100, impact + 10)
    elif duration >= 7:
        impact = min(100, impact + 5)

    # ── FACTOR 3: RECURRENCE (20%) ───────────────────────
    ward_id = complaint_data.get("ward_id")
    recurrence = 0
    aged_backlog = 0
    if ward_id:
        try:
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            seven_days_ago = datetime.utcnow() - timedelta(days=7)
            stmt = (
                select(func.count())
                .select_from(Complaint)
                .where(
                    Complaint.ward_id == ward_id,
                    Complaint.created_at >= thirty_days_ago,
                )
            )
            category_id = complaint_data.get("category_id")
            if category_id:
                stmt = stmt.where(Complaint.category_id == category_id)

            result = await db.execute(stmt)
            count = result.scalar() or 0

            open_stmt = (
                select(func.count())
                .select_from(Complaint)
                .where(
                    Complaint.ward_id == ward_id,
                    Complaint.created_at >= thirty_days_ago,
                    Complaint.status.in_(["OPEN", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "VERIFICATION_PENDING"]),
                )
            )
            if category_id:
                open_stmt = open_stmt.where(Complaint.category_id == category_id)

            open_result = await db.execute(open_stmt)
            unresolved_count = open_result.scalar() or 0

            aged_stmt = (
                select(func.count())
                .select_from(Complaint)
                .where(
                    Complaint.ward_id == ward_id,
                    Complaint.status.in_(["OPEN", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "VERIFICATION_PENDING"]),
                    Complaint.created_at <= seven_days_ago,
                )
            )
            if category_id:
                aged_stmt = aged_stmt.where(Complaint.category_id == category_id)

            aged_result = await db.execute(aged_stmt)
            aged_backlog = aged_result.scalar() or 0

            recurrence = min(100, count * 8 + unresolved_count * 8 + aged_backlog * 12)
        except Exception as e:
            logger.warning(f"Recurrence calculation failed: {e}")

    # ── FACTOR 4: SENTIMENT (15%) ────────────────────────
    sentiment_score_raw = complaint_data.get("area_sentiment", 0)
    if isinstance(sentiment_score_raw, (int, float)) and -1.0 <= float(sentiment_score_raw) <= 1.0:
        sentiment_priority = max(0, 100 - int((float(sentiment_score_raw) + 1) * 50))
    else:
        sentiment_priority = 50

    negative_keyword_signals = ["angry", "protest", "unsafe", "hazard", "serious"]
    if any(sig in token for sig in negative_keyword_signals for token in severity_keywords):
        sentiment_priority = min(100, sentiment_priority + 8)

    # ── FACTOR 5: VULNERABILITY (10%) ────────────────────
    vulnerability = 30
    ward_number = None
    if ward_id:
        try:
            vulnerability = get_ward_vulnerability_score(int(ward_id))
            stmt = select(Ward).where(Ward.id == ward_id)
            result = await db.execute(stmt)
            ward = result.scalar_one_or_none()
            if ward and ward.is_vulnerable:
                vulnerability = max(vulnerability, 85)
            if ward:
                ward_number = ward.ward_number
        except Exception as e:
            logger.warning(f"Vulnerability check failed: {e}")

    # ── SOCIAL PRESSURE (real-time public signals) ──────
    social_pressure = 0
    try:
        social_window = datetime.utcnow() - timedelta(days=7)
        social_stmt = (
            select(
                func.count(SocialPost.id).label("total"),
                func.sum(case((SocialPost.sentiment == "NEGATIVE", 1), else_=0)).label("negative"),
                func.sum(case((SocialPost.sentiment == "ANGRY", 1), else_=0)).label("angry"),
                func.sum(case((SocialPost.is_misinformation == True, 1), else_=0)).label("misinfo"),
                func.sum(case((SocialPost.virality_score >= 70, 1), else_=0)).label("viral"),
            )
            .where(SocialPost.created_at >= social_window)
        )

        if ward_number is not None:
            social_stmt = social_stmt.where(SocialPost.extracted_ward == ward_number)

        category_value = str(category or "").strip().lower().replace("/", " ")
        category_aliases = {
            "water supply": ["water", "water supply"],
            "road pothole": ["road", "pothole"],
            "electricity": ["electricity", "power"],
            "drainage": ["drainage", "sewage", "waterlogging"],
            "garbage": ["garbage", "sanitation", "waste"],
            "health": ["health", "medical", "disease"],
            "public safety": ["safety", "security", "crime", "accident"],
        }
        alias_terms = category_aliases.get(category_value, [])
        if alias_terms:
            category_filters = [SocialPost.extracted_category.ilike(f"%{term}%") for term in alias_terms]
            social_stmt = social_stmt.where(or_(*category_filters))

        social_row = (await db.execute(social_stmt)).one_or_none()
        if social_row:
            negative_count = int(social_row.negative or 0)
            angry_count = int(social_row.angry or 0)
            misinfo_count = int(social_row.misinfo or 0)
            viral_count = int(social_row.viral or 0)
            social_pressure = min(100, negative_count * 8 + angry_count * 12 + misinfo_count * 10 + viral_count * 6)

            recurrence = min(100, recurrence + int(social_pressure * 0.30))
            sentiment_priority = min(100, sentiment_priority + int(social_pressure * 0.25))
    except Exception as e:
        logger.warning(f"Social pressure calculation failed: {e}")

    # ── COMPOSITE SCORE ──────────────────────────────────
    final_score = int(
        0.30 * urgency
        + 0.25 * impact
        + 0.20 * recurrence
        + 0.15 * sentiment_priority
        + 0.10 * vulnerability
    )

    # Blend in deterministic KB rules to improve consistency for edge cases.
    kb_priority = calculate_priority_kb(
        {
            "category": category,
            "urgency_score": urgency,
            "is_emergency": complaint_data.get("is_emergency", False),
            "duration_days": duration,
            "affected_estimate": complaint_data.get("affected_estimate", "individual"),
            "ward_number": ward_number,
            "text_lower": " ".join(severity_keywords),
        },
        recurrence_count=max(1, int(recurrence / 10)),
    )
    final_score = int(round(0.7 * final_score + 0.3 * int(kb_priority.get("final_priority_score", final_score))))

    # Escalate compound risk combinations so high-impact emergencies do not under-rank.
    if complaint_data.get("is_emergency") and (impact >= 75 or recurrence >= 55):
        final_score = min(100, final_score + 8)
    if vulnerability >= 75 and recurrence >= 50:
        final_score = min(100, final_score + 5)

    if final_score >= 80:
        level = "CRITICAL"
    elif final_score >= 60:
        level = "HIGH"
    elif final_score >= 40:
        level = "MEDIUM"
    else:
        level = "LOW"

    return {
        "urgency_score": urgency,
        "impact_score": impact,
        "recurrence_score": recurrence,
        "sentiment_score": int(sentiment_priority),
        "vulnerability_score": vulnerability,
        "social_pressure_score": social_pressure,
        "final_priority_score": final_score,
        "priority_level": level,
        "scoring_breakdown": {
            "urgency": f"{urgency} × 0.30 = {0.30 * urgency:.1f}",
            "impact": f"{impact} × 0.25 = {0.25 * impact:.1f}",
            "recurrence": f"{recurrence} × 0.20 = {0.20 * recurrence:.1f}",
            "sentiment": f"{int(sentiment_priority)} × 0.15 = {0.15 * sentiment_priority:.1f}",
            "vulnerability": f"{vulnerability} × 0.10 = {0.10 * vulnerability:.1f}",
            "social_pressure": f"{social_pressure} (adjusts recurrence + sentiment)",
            "kb_blend": f"30% blend from KB score {kb_priority.get('final_priority_score', final_score)}",
        },
        # ── KB enrichment ────────────────────────────────
        "sla": get_sla(level.lower()),
        "escalation_target": get_escalation_target(
            category, 0  # initial — 0 hours elapsed
        ),
        "escalation_rules_matched": _match_escalation_rules(complaint_data, final_score),
        "source": "db+knowledge_base",
    }


def _match_escalation_rules(complaint_data: dict, score: int) -> list:
    """Check which KB escalation rules apply."""
    matched = []
    for rule in ESCALATION_RULES:
        try:
            conditions = rule.get("conditions", {})
            if conditions.get("severity") in ("critical",) and score >= 80:
                matched.append(rule["name"])
            elif conditions.get("severity") == "high" and score >= 60:
                matched.append(rule["name"])
            elif conditions.get("is_emergency") and complaint_data.get("is_emergency"):
                matched.append(rule["name"])
        except Exception:
            pass
    return matched
