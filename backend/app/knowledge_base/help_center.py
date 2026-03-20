"""Internal help center knowledge base for product support."""

from __future__ import annotations

from typing import Optional


HELP_ARTICLES = [
    {
        "id": "track-complaint-status",
        "title": "How to track complaint status",
        "category": "Complaints",
        "audience": ["CITIZEN", "LEADER", "DEPARTMENT_HEAD", "WORKER", "OFFICER", "ENGINEER", "ADMIN"],
        "summary": "View complaint journey from OPEN to CLOSED with latest feedback and timestamps.",
        "steps": [
            "Open My Complaints from the sidebar.",
            "Use search and status filters to find your complaint.",
            "Open complaint details to see timeline, assignee, and latest notes.",
        ],
        "keywords": ["track", "status", "complaint", "progress", "timeline"],
    },
    {
        "id": "register-voice-image-complaint",
        "title": "Register complaint using voice or image",
        "category": "Complaints",
        "audience": ["CITIZEN"],
        "summary": "Submit text, voice, or image complaints with ward and category context for faster triage.",
        "steps": [
            "Open Register Complaint and choose Text, Voice, or Image mode.",
            "Select ward and category (or use auto-detect for image mode).",
            "Submit to create complaint and get status updates.",
        ],
        "keywords": ["voice", "image", "register", "complaint", "upload"],
    },
    {
        "id": "assign-complaint-field-team",
        "title": "Assign complaint to worker, officer, or engineer",
        "category": "Operations",
        "audience": ["LEADER", "DEPARTMENT_HEAD", "ADMIN"],
        "summary": "Use assignment recommendations and assign tasks based on role, department, and ward fit.",
        "steps": [
            "Open complaint details from Manage Complaints.",
            "Review assignment recommendations for best-fit team member.",
            "Assign to Worker, Officer, Engineer, or Department Head.",
        ],
        "keywords": ["assign", "worker", "officer", "engineer", "leader", "department"],
    },
    {
        "id": "verification-workflow",
        "title": "Complete 4-layer verification workflow",
        "category": "Verification",
        "audience": ["WORKER", "OFFICER", "ENGINEER", "LEADER", "DEPARTMENT_HEAD", "ADMIN"],
        "summary": "Submit after-work evidence and verify GPS, timestamp, visual change, and tamper checks.",
        "steps": [
            "Open verification page for assigned complaint.",
            "Upload after-work evidence and location details.",
            "Leader reviews and approves/rejects final verification.",
        ],
        "keywords": ["verification", "gps", "timestamp", "tamper", "evidence"],
    },
    {
        "id": "sms-whatsapp-updates",
        "title": "Enable complaint updates via SMS and WhatsApp",
        "category": "Notifications",
        "audience": ["ADMIN", "LEADER", "DEPARTMENT_HEAD"],
        "summary": "Configure Twilio credentials and sender numbers to deliver registration and status update messages.",
        "steps": [
            "Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in backend .env.",
            "Set TWILIO_SMS_FROM and TWILIO_WHATSAPP_FROM sender values.",
            "Restart backend service and test with a new complaint.",
        ],
        "keywords": ["sms", "whatsapp", "twilio", "notification", "confirmation"],
    },
]


def _score_article(article: dict, query: str) -> int:
    if not query:
        return 1

    q = query.lower().strip()
    score = 0
    for field in ("title", "summary", "category"):
        val = str(article.get(field, "")).lower()
        if q in val:
            score += 4

    for keyword in article.get("keywords", []):
        if q in str(keyword).lower() or str(keyword).lower() in q:
            score += 3

    return score


def get_help_center_content(query: Optional[str] = None, role: Optional[str] = None) -> dict:
    role_key = (role or "").upper()
    filtered = []

    for article in HELP_ARTICLES:
        audience = article.get("audience", [])
        if role_key and role_key not in audience:
            continue
        score = _score_article(article, query or "")
        if query and score <= 0:
            continue
        filtered.append((score, article))

    filtered.sort(key=lambda pair: pair[0], reverse=True)
    articles = [item[1] for item in filtered] if filtered else []

    if not articles:
        # Role fallback with top general guides.
        articles = [
            article for article in HELP_ARTICLES
            if not role_key or role_key in article.get("audience", [])
        ][:4]

    categories = sorted({a.get("category", "General") for a in articles})

    return {
        "query": query,
        "role": role,
        "total_articles": len(articles),
        "categories": categories,
        "articles": articles,
    }
