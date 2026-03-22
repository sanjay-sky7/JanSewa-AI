"""Pydantic schemas for complaints (request / response)."""

from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ── Request schemas ──────────────────────────────────────

class ComplaintCreate(BaseModel):
    raw_text: Optional[str] = None
    raw_audio_url: Optional[str] = None
    raw_image_url: Optional[str] = None
    geo_latitude: Optional[float] = None
    geo_longitude: Optional[float] = None
    input_type: str = Field(..., pattern="^(text|voice|image|social)$")
    source_language: Optional[str] = None
    citizen_name: Optional[str] = None
    citizen_phone: Optional[str] = None
    citizen_email: Optional[str] = None
    ward_id: Optional[int] = None
    category_id: Optional[int] = None
    is_anonymous: bool = False


class ComplaintAssign(BaseModel):
    assigned_to: uuid.UUID
    department: Optional[str] = None
    assignee_role: Optional[str] = None


class ComplaintStatusUpdate(BaseModel):
    status: str = Field(
        ...,
        pattern="^(OPEN|UNDER_REVIEW|ASSIGNED|IN_PROGRESS|VERIFICATION_PENDING|RESOLVED|VERIFIED|CLOSED)$",
    )
    notes: Optional[str] = None


# ── Response schemas ─────────────────────────────────────

class PriorityBreakdown(BaseModel):
    urgency: str
    impact: str
    recurrence: str
    sentiment: str
    vulnerability: str


class CategoryOut(BaseModel):
    id: int
    name: str
    department: Optional[str] = None

    class Config:
        from_attributes = True


class WardOut(BaseModel):
    id: int
    ward_number: int
    ward_name: str
    area_name: Optional[str] = None

    class Config:
        from_attributes = True


class AssigneeOut(BaseModel):
    id: uuid.UUID
    name: str
    role: str
    department: Optional[str] = None

    class Config:
        from_attributes = True


class ComplaintOut(BaseModel):
    id: uuid.UUID
    citizen_id: Optional[uuid.UUID] = None
    category: Optional[CategoryOut] = None
    ward: Optional[WardOut] = None

    raw_text: Optional[str] = None
    raw_audio_url: Optional[str] = None
    raw_image_url: Optional[str] = None
    input_type: str
    source_language: Optional[str] = None

    ai_summary: Optional[str] = None
    ai_location: Optional[str] = None
    ai_latitude: Optional[float] = None
    ai_longitude: Optional[float] = None
    ai_duration_days: Optional[int] = None
    ai_category_confidence: Optional[float] = None

    urgency_score: Optional[int] = None
    impact_score: Optional[int] = None
    recurrence_score: Optional[int] = None
    sentiment_score: Optional[int] = None
    vulnerability_score: Optional[int] = None
    final_priority_score: Optional[int] = None
    priority_level: Optional[str] = None

    status: str
    assignee: Optional[AssigneeOut] = None
    assigned_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None

    is_duplicate: bool = False
    duplicate_of: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ComplaintListOut(BaseModel):
    items: List[ComplaintOut]
    total: int
    page: int
    per_page: int


class ComplaintStats(BaseModel):
    total_open: int
    total_critical: int
    resolved_today: int
    avg_trust_score: float
    total_complaints: int
    total_resolved: int
    total_pending: Optional[int] = None
    total_in_progress: Optional[int] = None
    avg_resolution_hours: Optional[float] = None


class ComplaintFeedbackOut(BaseModel):
    complaint_id: uuid.UUID
    complaint_summary: Optional[str] = None
    action: str
    status: Optional[str] = None
    feedback_note: Optional[str] = None
    notification_message: str
    performed_by_name: Optional[str] = None
    performed_at: datetime


class ComplaintNotificationOut(BaseModel):
    complaint_id: uuid.UUID
    complaint_summary: Optional[str] = None
    status: Optional[str] = None
    feedback_note: Optional[str] = None
    notification_message: str
    performed_by_name: Optional[str] = None
    performed_at: datetime
    is_read: bool = False
    is_recent: bool = False


class ComplaintNotificationListOut(BaseModel):
    items: List[ComplaintNotificationOut]
    total: int
    unread_count: int = 0


class NotificationSeenOut(BaseModel):
    message: str
    unread_count: int = 0


class AssignmentRecommendationItem(BaseModel):
    user_id: uuid.UUID
    name: str
    role: str
    department: Optional[str] = None
    ward_id: Optional[int] = None
    suitability_score: int
    reason: str


class AssignmentRecommendationOut(BaseModel):
    complaint_id: uuid.UUID
    category: Optional[str] = None
    required_department: Optional[str] = None
    recommended_role: str
    escalation_role: Optional[str] = None
    candidates: List[AssignmentRecommendationItem]
