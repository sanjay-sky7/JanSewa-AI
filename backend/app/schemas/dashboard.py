"""Pydantic schemas for dashboard, social, communications, public, auth."""

from __future__ import annotations
import uuid
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator


# ── Auth ─────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = Field(default="CITIZEN", pattern="^(CITIZEN|LEADER|DEPARTMENT_HEAD|WORKER|OFFICER|ENGINEER|ADMIN)$")
    department: Optional[str] = None
    ward_id: Optional[int] = None
    phone: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    ward_id: Optional[int] = None


class ForgotPasswordRequest(BaseModel):
    email: str
    new_password: str = Field(min_length=8)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut = None


class UserOut(BaseModel):
    id: uuid.UUID
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str
    department: Optional[str] = None
    ward_id: Optional[int] = None
    ward_number: Optional[int] = None
    ward_name: Optional[str] = None

    class Config:
        from_attributes = True


# ── Dashboard ────────────────────────────────────────────

class DashboardOverview(BaseModel):
    total_open: int
    total_critical: int
    resolved_today: int
    avg_trust_score: float
    total_complaints: int
    total_resolved: int
    trend_open: int  # change from yesterday
    trend_critical: int
    trend_resolved: int
    trend_trust: float


class WardHeatmapItem(BaseModel):
    ward_id: int
    ward_number: int
    ward_name: str
    latitude: Optional[float]
    longitude: Optional[float]
    total_complaints: int
    open_complaints: int
    critical_complaints: int


class SentimentTrendItem(BaseModel):
    date: date
    positive: int
    negative: int
    angry: int
    neutral: int
    avg_score: float


# ── Social ───────────────────────────────────────────────

class SocialPostOut(BaseModel):
    id: uuid.UUID
    platform: str
    post_url: Optional[str] = None
    post_text: Optional[str] = None
    author_handle: Optional[str] = None
    sentiment: Optional[str] = None
    sentiment_score: Optional[float] = None
    extracted_category: Optional[str] = None
    extracted_ward: Optional[int] = None
    is_complaint: Optional[bool] = None
    is_misinformation: bool = False
    misinfo_confidence: Optional[float] = None
    misinfo_explanation: Optional[str] = None
    likes: int = 0
    shares: int = 0
    replies: int = 0
    virality_score: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SocialAlert(BaseModel):
    id: uuid.UUID
    post_text: str
    platform: str
    sentiment: str
    virality_score: int
    is_misinformation: bool
    misinfo_explanation: Optional[str] = None


# ── Communications ───────────────────────────────────────

class CommunicationGenerate(BaseModel):
    complaint_id: Optional[str] = None
    comm_type: str = Field(
        ...,
        pattern="^(ACKNOWLEDGMENT|PROGRESS|COMPLETION|CRISIS_RESPONSE|WEEKLY_DIGEST|ANNOUNCEMENT)$",
    )
    format: str = Field(default="whatsapp", pattern="^(whatsapp|social_media|official_notice)$")
    announcement_title: Optional[str] = None
    announcement_message: Optional[str] = None
    announcement_scheduled_for: Optional[str] = None
    announcement_duration_hours: Optional[int] = Field(default=None, ge=1, le=72)

    @field_validator("comm_type", mode="before")
    @classmethod
    def normalize_comm_type(cls, value: str) -> str:
        raw = str(value or "").strip().upper()
        aliases = {
            "PRESS_RELEASE": "WEEKLY_DIGEST",
            "SOCIAL_UPDATE": "PROGRESS",
            "CITIZEN_NOTICE": "ACKNOWLEDGMENT",
            "EMERGENCY_ALERT": "CRISIS_RESPONSE",
            "PROGRESS_REPORT": "PROGRESS",
            "ACK": "ACKNOWLEDGMENT",
            "NOTICE": "ANNOUNCEMENT",
            "PUBLIC_NOTICE": "ANNOUNCEMENT",
        }
        return aliases.get(raw, raw)

    @field_validator("format", mode="before")
    @classmethod
    def normalize_format(cls, value: str) -> str:
        raw = str(value or "").strip().lower()
        aliases = {
            "formal": "official_notice",
            "simple": "whatsapp",
            "social": "social_media",
        }
        return aliases.get(raw, raw)

    @field_validator("complaint_id", mode="before")
    @classmethod
    def normalize_complaint_id(cls, value):
        if value is None:
            return None
        cleaned = str(value).strip()
        return cleaned or None

    @field_validator("announcement_title", "announcement_message", "announcement_scheduled_for", mode="before")
    @classmethod
    def normalize_optional_text(cls, value):
        if value is None:
            return None
        cleaned = str(value).strip()
        return cleaned or None


class CommunicationOut(BaseModel):
    id: uuid.UUID
    complaint_id: Optional[uuid.UUID] = None
    comm_type: Optional[str] = None
    content_english: Optional[str] = None
    content_hindi: Optional[str] = None
    format: Optional[str] = None
    status: str
    approved_by: Optional[uuid.UUID] = None
    published_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Public Portal ────────────────────────────────────────

class WardScorecard(BaseModel):
    ward_id: int
    ward_name: str
    ward_number: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    total_complaints: int
    total_resolved: int
    resolved: int
    pending: int
    resolution_rate: float
    avg_response_hours: float
    avg_resolution_hours: float
    trust_score: float


class PublicWardMapItem(BaseModel):
    ward_id: int
    ward_number: int
    ward_name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    total_complaints: int = 0
    open_complaints: int = 0
    resolved_complaints: int = 0
    trust_score: Optional[float] = None


class PublicAction(BaseModel):
    complaint_id: uuid.UUID
    summary: str
    category: str
    status: str
    resolved_at: Optional[datetime] = None
    has_verification: bool = False


class PublicLeaderOut(BaseModel):
    ward_id: int
    ward_number: int
    ward_name: str
    leader_name: str
    leader_role: str
    leader_department: Optional[str] = None
    leader_phone: Optional[str] = None
    leader_email: Optional[str] = None
    office_hours: Optional[str] = None
    key_focus: list[str] = []
    total_complaints_30d: int = 0
    resolved_complaints_30d: int = 0
    pending_complaints_30d: int = 0
    resolution_rate_30d: float = 0.0
    ward_trust_score: Optional[float] = None


class TrustScoreOut(BaseModel):
    ward_id: int
    date: date
    resolution_rate: Optional[float] = None
    avg_response_hours: Optional[float] = None
    public_sentiment: Optional[float] = None
    transparency_score: Optional[float] = None
    communication_score: Optional[float] = None
    final_trust_score: Optional[float] = None

    class Config:
        from_attributes = True


class HelpArticleOut(BaseModel):
    id: str
    title: str
    category: str
    audience: list[str]
    summary: str
    steps: list[str]
    keywords: list[str]


class HelpCenterOut(BaseModel):
    query: Optional[str] = None
    role: Optional[str] = None
    total_articles: int
    categories: list[str]
    articles: list[HelpArticleOut]
