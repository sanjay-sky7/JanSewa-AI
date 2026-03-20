"""Workforce assignment knowledge base for complaint resolution teams."""

from __future__ import annotations

from typing import Any


DEPARTMENT_EXECUTION_MODEL = {
    "water": {"recommended_role": "ENGINEER", "escalation_role": "OFFICER"},
    "electricity": {"recommended_role": "ENGINEER", "escalation_role": "OFFICER"},
    "road": {"recommended_role": "ENGINEER", "escalation_role": "OFFICER"},
    "drain": {"recommended_role": "ENGINEER", "escalation_role": "OFFICER"},
    "garbage": {"recommended_role": "WORKER", "escalation_role": "OFFICER"},
    "health": {"recommended_role": "OFFICER", "escalation_role": "DEPARTMENT_HEAD"},
    "safety": {"recommended_role": "OFFICER", "escalation_role": "DEPARTMENT_HEAD"},
}


def _resolve_assignment_model(department: str | None, category: str | None) -> dict[str, str]:
    haystack = f"{department or ''} {category or ''}".lower()
    for key, model in DEPARTMENT_EXECUTION_MODEL.items():
        if key in haystack:
            return model
    return {"recommended_role": "WORKER", "escalation_role": "DEPARTMENT_HEAD"}


def _score_candidate(candidate: Any, complaint: Any, recommended_role: str, required_department: str | None) -> tuple[int, str]:
    score = 0
    reasons: list[str] = []

    role = (getattr(candidate, "role", "") or "").upper()
    department = (getattr(candidate, "department", "") or "").lower()

    if role == recommended_role:
        score += 60
        reasons.append(f"Preferred role: {recommended_role}")
    elif role in ("WORKER", "OFFICER", "ENGINEER", "DEPARTMENT_HEAD"):
        score += 25
        reasons.append("Field assignment role")

    if required_department and required_department.lower() in department:
        score += 25
        reasons.append("Department match")

    complaint_ward = getattr(complaint, "ward_id", None)
    candidate_ward = getattr(candidate, "ward_id", None)
    if complaint_ward and candidate_ward and complaint_ward == candidate_ward:
        score += 15
        reasons.append("Ward match")

    return score, ", ".join(reasons) if reasons else "General fit"


def recommend_assignees(complaint: Any, candidates: list[Any]) -> dict[str, Any]:
    category_name = complaint.category.name if getattr(complaint, "category", None) else None
    required_department = complaint.category.department if getattr(complaint, "category", None) else None

    model = _resolve_assignment_model(required_department, category_name)
    recommended_role = model["recommended_role"]
    scored: list[dict[str, Any]] = []

    for user in candidates:
        score, reason = _score_candidate(
            candidate=user,
            complaint=complaint,
            recommended_role=recommended_role,
            required_department=required_department,
        )
        if score <= 0:
            continue

        scored.append(
            {
                "user_id": user.id,
                "name": user.name,
                "role": user.role,
                "department": user.department,
                "ward_id": user.ward_id,
                "suitability_score": score,
                "reason": reason,
            }
        )

    scored.sort(key=lambda item: item["suitability_score"], reverse=True)

    return {
        "required_department": required_department,
        "recommended_role": recommended_role,
        "escalation_role": model["escalation_role"],
        "candidates": scored[:8],
    }
