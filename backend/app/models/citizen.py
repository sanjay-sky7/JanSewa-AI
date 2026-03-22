"""Citizen model — complaint submitters."""

import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Citizen(Base):
    __tablename__ = "citizens"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=True)
    phone: Mapped[str] = mapped_column(String(15), unique=True, nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    ward_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("wards.id"), nullable=True
    )
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    ward = relationship("Ward", back_populates="citizens")
    complaints = relationship("Complaint", back_populates="citizen")
