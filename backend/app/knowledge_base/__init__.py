"""
Jansewa AI — Complete Internal Knowledge Base
=============================================
Self-contained intelligence layer for Indian local governance.
Works OFFLINE without any external API dependency.

Modules:
  - complaint_categories  — Full taxonomy with Hindi/English keywords
  - ward_database         — Demographics, infrastructure, vulnerability
  - keyword_classifier    — Rule-based NLP for category + severity
  - priority_rules        — Deterministic priority engine with escalation
  - response_templates    — Bilingual templates for all communication types
  - governance_policies   — SLAs, escalation rules, department routing
  - faq_resolutions       — Known solutions & SOPs for complaint types
  - social_analysis       — Offline social media analysis (sentiment, misinfo, crisis)
"""

from app.knowledge_base.complaint_categories import (
    get_all_categories,
    get_category_by_name,
    get_subcategory_match,
)
from app.knowledge_base.ward_database import (
    get_ward,
    get_all_wards,
    get_vulnerable_wards,
    get_ward_vulnerability_score,
    get_ward_by_location,
    get_nearest_ward,
)
from app.knowledge_base.keyword_classifier import (
    classify_complaint,
    check_duplicate_local,
    summarize_text,
)
from app.knowledge_base.priority_rules import calculate_priority_kb
from app.knowledge_base.response_templates import render_communication
from app.knowledge_base.governance_policies import (
    get_department,
    get_escalation_target,
    get_sla,
    is_holiday,
    get_trust_label,
)
from app.knowledge_base.faq_resolutions import (
    get_resolution,
    get_resolution_steps,
    get_faq_answer,
    get_estimated_hours,
    get_required_resources,
)
from app.knowledge_base.social_analysis import (
    analyze_social_post,
    analyze_social_batch,
)
from app.knowledge_base.workforce_assignment import recommend_assignees
from app.knowledge_base.help_center import get_help_center_content

__all__ = [
    # Categories
    "get_all_categories", "get_category_by_name", "get_subcategory_match",
    # Wards
    "get_ward", "get_all_wards", "get_vulnerable_wards",
    "get_ward_vulnerability_score", "get_ward_by_location", "get_nearest_ward",
    # Classifier
    "classify_complaint", "check_duplicate_local", "summarize_text",
    # Priority
    "calculate_priority_kb",
    # Templates
    "render_communication",
    # Governance
    "get_department", "get_escalation_target", "get_sla", "is_holiday", "get_trust_label",
    # FAQ
    "get_resolution", "get_resolution_steps", "get_faq_answer",
    "get_estimated_hours", "get_required_resources",
    # Social
    "analyze_social_post", "analyze_social_batch",
    # Workforce assignment
    "recommend_assignees",
    # Help center
    "get_help_center_content",
]
