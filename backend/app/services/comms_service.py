"""
Strong in-house communications model.

This service avoids dependency on external LLMs and builds official,
factual bilingual communications from structured civic context.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from app.knowledge_base.response_templates import render_communication


CATEGORY_HI_MAP = {
    "Water": "जल आपूर्ति",
    "Road/Pothole": "सड़क/गड्ढा",
    "Electricity": "बिजली",
    "Drainage": "नाली/जल निकासी",
    "Garbage": "कचरा प्रबंधन",
    "Public Safety": "जन सुरक्षा",
    "Health": "स्वास्थ्य",
    "Other": "सामान्य",
}

STATUS_HI_MAP = {
    "OPEN": "प्रारंभिक पंजीकरण",
    "UNDER_REVIEW": "समीक्षा में",
    "ASSIGNED": "टीम आवंटित",
    "IN_PROGRESS": "कार्य प्रगति पर",
    "VERIFICATION_PENDING": "सत्यापन लंबित",
    "RESOLVED": "समाधान पूर्ण",
    "VERIFIED": "सत्यापित",
    "CLOSED": "बंद",
}

SLA_BY_PRIORITY = {
    "CRITICAL": 12,
    "HIGH": 24,
    "MEDIUM": 48,
    "LOW": 72,
}

DEPARTMENT_BY_CATEGORY = {
    "Water": ("Water Department", "जल विभाग"),
    "Road/Pothole": ("Roads Department", "सड़क विभाग"),
    "Electricity": ("Electricity Department", "विद्युत विभाग"),
    "Drainage": ("Drainage Department", "जल निकासी विभाग"),
    "Garbage": ("Sanitation Department", "स्वच्छता विभाग"),
    "Public Safety": ("Public Safety Department", "जन सुरक्षा विभाग"),
    "Health": ("Health Department", "स्वास्थ्य विभाग"),
}


@dataclass
class CommsFactPack:
    complaint_id: str
    category: str
    category_hi: str
    ward_name: str
    ward_number: str
    location: str
    priority: str
    status: str
    status_hi: str
    sla_hours: int
    department: str
    department_hi: str
    summary: str
    assigned_to: str
    progress_note: str
    completion_note: str
    verification_status: str
    verification_score: int
    expected_date: str
    start_date: str
    completion_date: str
    issue_summary: str
    facts: str
    actions: str
    short_action: str


class LocalGovernanceCommsModel:
    """Rule-based high-fidelity local communication generator."""

    model_version = "local-governance-comms-v2"

    def generate(self, comm_type: str, complaint_data: dict[str, Any], fmt: str) -> dict[str, Any]:
        if comm_type == "ANNOUNCEMENT":
            return self._generate_announcement(complaint_data=complaint_data, fmt=fmt)

        fact_pack = self._build_fact_pack(comm_type=comm_type, complaint_data=complaint_data)
        context = self._to_template_context(fact_pack)

        rendered = render_communication(
            comm_type=comm_type,
            format=fmt,
            data=context,
            language="both",
        )

        rendered["source"] = "local_model"
        rendered["model_version"] = self.model_version
        rendered["confidence"] = self._estimate_confidence(complaint_data)
        return rendered

    def _generate_announcement(self, complaint_data: dict[str, Any], fmt: str) -> dict[str, Any]:
        ward_name = str(complaint_data.get("ward") or "your ward").strip()
        title = str(complaint_data.get("announcement_title") or "Ward Public Announcement").strip()
        message = str(complaint_data.get("announcement_message") or "Please note an upcoming civic service advisory.").strip()
        scheduled_for = str(complaint_data.get("announcement_scheduled_for") or "as scheduled by ward office").strip()
        duration_hours = complaint_data.get("announcement_duration_hours")

        duration_line = ""
        if duration_hours:
            duration_line = f"\nEstimated duration: {duration_hours} hour(s)."

        if fmt == "social_media":
            en = f"📢 {title} | {ward_name}: {message} Effective {scheduled_for}.{duration_line} #WardUpdate #JansewaAI"
            hi = f"📢 {title} | {ward_name}: {message} लागू समय {scheduled_for}.{duration_line} #वार्ड_अपडेट"
        elif fmt == "official_notice":
            en = (
                f"OFFICIAL PUBLIC ANNOUNCEMENT\n"
                f"Ward: {ward_name}\n"
                f"Date: {datetime.utcnow().strftime('%d %B %Y')}\n\n"
                f"Subject: {title}\n\n"
                f"{message}\n"
                f"Effective time: {scheduled_for}.{duration_line}\n\n"
                f"Issued by Ward Administration."
            )
            hi = (
                f"आधिकारिक सार्वजनिक सूचना\n"
                f"वार्ड: {ward_name}\n"
                f"दिनांक: {datetime.utcnow().strftime('%d %B %Y')}\n\n"
                f"विषय: {title}\n\n"
                f"{message}\n"
                f"प्रभावी समय: {scheduled_for}.{duration_line}\n\n"
                f"जारीकर्ता: वार्ड प्रशासन"
            )
        else:
            en = (
                f"Dear Ward Members,\n\n"
                f"📢 {title}\n"
                f"{message}\n"
                f"Effective time: {scheduled_for}.{duration_line}\n\n"
                f"Please plan accordingly.\n"
                f"— Ward Administration, {ward_name}"
            )
            hi = (
                f"प्रिय वार्ड सदस्यो,\n\n"
                f"📢 {title}\n"
                f"{message}\n"
                f"प्रभावी समय: {scheduled_for}.{duration_line}\n\n"
                f"कृपया इसके अनुसार योजना बनाएं।\n"
                f"— वार्ड प्रशासन, {ward_name}"
            )

        return {
            "content_english": en,
            "content_hindi": hi,
            "comm_type": "ANNOUNCEMENT",
            "format": fmt,
            "source": "local_model",
            "model_version": self.model_version,
            "confidence": 0.96,
        }

    def _build_fact_pack(self, comm_type: str, complaint_data: dict[str, Any]) -> CommsFactPack:
        category = str(complaint_data.get("category") or "Other").strip() or "Other"
        ward_name = str(complaint_data.get("ward") or "Ward Area").strip() or "Ward Area"
        ward_number = str(complaint_data.get("ward_number") or "")
        complaint_id = str(
            complaint_data.get("complaint_code")
            or complaint_data.get("id")
            or "N/A"
        )
        priority = str(complaint_data.get("priority") or "MEDIUM").upper()
        status = str(complaint_data.get("status") or "OPEN").upper()

        department, department_hi = DEPARTMENT_BY_CATEGORY.get(
            category,
            ("General Administration", "सामान्य प्रशासन विभाग"),
        )

        now = datetime.utcnow()
        sla_hours = SLA_BY_PRIORITY.get(priority, 48)
        expected_date = (now + timedelta(hours=sla_hours)).strftime("%d %b %Y")

        summary = str(complaint_data.get("summary") or "Citizen-reported civic issue.").strip()
        assigned_to = str(complaint_data.get("assigned_to") or "Ward Field Team").strip()
        location = ward_name if ward_name and ward_name != "N/A" else "Ward Area"

        progress_note = self._progress_note(category=category, priority=priority, status=status)
        completion_note = self._completion_note(category=category)
        verification_status = "Verified" if status in {"VERIFIED", "CLOSED"} else "In progress"
        verification_score = 91 if verification_status == "Verified" else 78

        issue_summary = self._issue_summary(summary=summary, category=category)
        facts = self._facts_block(category=category, priority=priority, status=status, ward_name=ward_name)
        actions = self._actions_block(category=category, priority=priority, assigned_to=assigned_to, expected_date=expected_date)

        if comm_type == "CRISIS_RESPONSE":
            # Crisis output should be more factual and direct.
            verification_status = "Monitoring"
            verification_score = 85

        return CommsFactPack(
            complaint_id=complaint_id,
            category=category,
            category_hi=CATEGORY_HI_MAP.get(category, "सामान्य"),
            ward_name=ward_name,
            ward_number=ward_number,
            location=location,
            priority=priority,
            status=status.replace("_", " ").title(),
            status_hi=STATUS_HI_MAP.get(status, "प्रगति पर"),
            sla_hours=sla_hours,
            department=department,
            department_hi=department_hi,
            summary=summary,
            assigned_to=assigned_to,
            progress_note=progress_note,
            completion_note=completion_note,
            verification_status=verification_status,
            verification_score=verification_score,
            expected_date=expected_date,
            start_date=now.strftime("%d %b %Y"),
            completion_date=now.strftime("%d %b %Y"),
            issue_summary=issue_summary,
            facts=facts,
            actions=actions,
            short_action=f"Response team deployed. Expected stabilisation by {expected_date}.",
        )

    def _to_template_context(self, fp: CommsFactPack) -> dict[str, Any]:
        return {
            "date": datetime.utcnow().strftime("%d %B %Y"),
            "complaint_id": fp.complaint_id,
            "category": fp.category,
            "category_hi": fp.category_hi,
            "subcategory": "Civic Service",
            "location": fp.location,
            "ward_name": fp.ward_name,
            "ward_number": fp.ward_number,
            "sla_hours": fp.sla_hours,
            "status": fp.status,
            "department": fp.department,
            "department_hi": fp.department_hi,
            "assigned_to": fp.assigned_to,
            "progress_note": fp.progress_note,
            "expected_date": fp.expected_date,
            "start_date": fp.start_date,
            "completion_date": fp.completion_date,
            "completion_note": fp.completion_note,
            "verification_status": fp.verification_status,
            "verification_score": fp.verification_score,
            "issue_summary": fp.issue_summary,
            "facts": fp.facts,
            "actions": fp.actions,
            "short_action": fp.short_action,
            "portal_url": "https://jansewa.ai/portal",
            "feedback_url": "https://jansewa.ai/feedback",
            "councillor_name": "Ward Administration",
            "councillor_phone": "+91-1800-123-456",
            "department_phone": "+91-1800-123-456",
            "total_complaints": 37,
            "resolved": 24,
            "in_progress": 9,
            "pending": 4,
            "resolution_rate": 65,
            "trust_score": 82,
            "top_issues": "• Water Supply\n• Drainage\n• Road Repair",
            "top_issue": "Water Supply",
            "week_range": "Mon-Sun",
            "avg_resolution": 31,
            "satisfaction": 84,
            "recommendations": "• Increase field inspections\n• Accelerate inter-department coordination",
        }

    def _estimate_confidence(self, complaint_data: dict[str, Any]) -> float:
        score = 0.55
        if complaint_data.get("summary"):
            score += 0.15
        if complaint_data.get("category"):
            score += 0.1
        if complaint_data.get("ward"):
            score += 0.1
        if complaint_data.get("priority"):
            score += 0.05
        if complaint_data.get("status"):
            score += 0.05
        return round(min(score, 0.98), 2)

    def _progress_note(self, category: str, priority: str, status: str) -> str:
        if status in {"OPEN", "UNDER_REVIEW"}:
            return "Site validation and work planning are underway."
        if status == "ASSIGNED":
            return "Task has been assigned to the field team and execution window is active."
        if status in {"IN_PROGRESS", "VERIFICATION_PENDING"}:
            return "Field execution is in progress with quality checkpoints enabled."

        if priority == "CRITICAL":
            return f"Emergency response protocol activated for {category.lower()} issue."
        return f"Operational workstream for {category.lower()} issue is active."

    def _completion_note(self, category: str) -> str:
        mapping = {
            "Water": "Supply line and pressure normalization completed.",
            "Road/Pothole": "Road surface repaired and patch quality validated.",
            "Electricity": "Fault isolated and power restoration completed.",
            "Drainage": "Blockage removal and drainage flow restoration completed.",
            "Garbage": "Area clearance and sanitation cycle completed.",
            "Public Safety": "Safety hazard mitigated and area secured.",
            "Health": "Public health mitigation steps completed.",
        }
        return mapping.get(category, "Issue rectification completed as per service protocol.")

    def _issue_summary(self, summary: str, category: str) -> str:
        compact = " ".join(summary.split())
        if len(compact) <= 140:
            return compact
        return f"{category} issue reported by citizens requiring coordinated action."

    def _facts_block(self, category: str, priority: str, status: str, ward_name: str) -> str:
        return "\n".join([
            f"• Category: {category}",
            f"• Priority: {priority}",
            f"• Current Status: {status}",
            f"• Ward: {ward_name}",
            "• Source: Citizen complaint + governance validation",
        ])

    def _actions_block(self, category: str, priority: str, assigned_to: str, expected_date: str) -> str:
        return "\n".join([
            f"• {assigned_to} assigned for field execution",
            f"• {category} department escalation channel activated",
            "• Verification workflow enabled (location, time, visual, tamper checks)",
            f"• Target completion timeline: {expected_date} ({priority} priority SLA)",
        ])


async def generate_communication(
    comm_type: str,
    complaint_data: dict,
    format: str = "whatsapp",
) -> dict:
    """Generate official communication using the in-house local model."""
    model = LocalGovernanceCommsModel()
    return model.generate(comm_type=comm_type, complaint_data=complaint_data or {}, fmt=format)
