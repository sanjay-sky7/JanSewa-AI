"""Complaint model — main table."""

import uuid
from datetime import datetime
from sqlalchemy import (
    String, Integer, Text, Boolean, DateTime, Numeric, ForeignKey, Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    citizen_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("citizens.id"), nullable=True
    )
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id"), nullable=True
    )
    ward_id: Mapped[int] = mapped_column(
        ForeignKey("wards.id"), nullable=True
    )

    # ── Raw input ────────────────────────────────────────
    raw_text: Mapped[str] = mapped_column(Text, nullable=True)
    raw_audio_url: Mapped[str] = mapped_column(String(500), nullable=True)
    # Data URL uploads can be several KB/MB; store as TEXT to avoid truncation.
    raw_image_url: Mapped[str] = mapped_column(Text, nullable=True)
    input_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # text, voice, image, social
    source_language: Mapped[str] = mapped_column(String(20), nullable=True)

    # ── AI-extracted structured data ─────────────────────
    ai_summary: Mapped[str] = mapped_column(Text, nullable=True)
    ai_location: Mapped[str] = mapped_column(Text, nullable=True)
    ai_latitude: Mapped[float] = mapped_column(Numeric(10, 8), nullable=True)
    ai_longitude: Mapped[float] = mapped_column(Numeric(11, 8), nullable=True)
    ai_duration_days: Mapped[int] = mapped_column(Integer, nullable=True)
    ai_category_confidence: Mapped[float] = mapped_column(
        Numeric(3, 2), nullable=True
    )

    # ── Priority scoring ─────────────────────────────────
    urgency_score: Mapped[int] = mapped_column(Integer, nullable=True)
    impact_score: Mapped[int] = mapped_column(Integer, nullable=True)
    recurrence_score: Mapped[int] = mapped_column(Integer, nullable=True)
    sentiment_score: Mapped[int] = mapped_column(Integer, nullable=True)
    vulnerability_score: Mapped[int] = mapped_column(Integer, nullable=True)
    final_priority_score: Mapped[int] = mapped_column(Integer, nullable=True)
    priority_level: Mapped[str] = mapped_column(
        String(20), nullable=True
    )  # CRITICAL, HIGH, MEDIUM, LOW

    # ── Status tracking ──────────────────────────────────
    status: Mapped[str] = mapped_column(
        String(30), default="OPEN"
    )  # OPEN, ASSIGNED, IN_PROGRESS, VERIFICATION_PENDING, VERIFIED, CLOSED
    assigned_to: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    assigned_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    resolved_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    verified_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # ── Metadata ─────────────────────────────────────────
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False)
    duplicate_of: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("complaints.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # ── Relationships ────────────────────────────────────
    citizen = relationship("Citizen", back_populates="complaints")
    category = relationship("Category", back_populates="complaints")
    ward = relationship("Ward", back_populates="complaints")
    assignee = relationship(
        "User",
        back_populates="assigned_complaints",
        foreign_keys=[assigned_to],
    )
    verifications = relationship("Verification", back_populates="complaint")
    communications = relationship("Communication", back_populates="complaint")
    duplicate_parent = relationship(
        "Complaint", remote_side="Complaint.id", foreign_keys=[duplicate_of]
    )

    # ── Indexes ──────────────────────────────────────────
    __table_args__ = (
        Index("idx_complaints_ward", "ward_id"),
        Index("idx_complaints_status", "status"),
        Index("idx_complaints_priority", final_priority_score.desc()),
        Index("idx_complaints_created", created_at.desc()),
    )
