"""User model — leaders, workers, department heads, admins."""

import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=True)
    phone: Mapped[str] = mapped_column(String(15), nullable=True)
    role: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # CITIZEN, LEADER, DEPARTMENT_HEAD, WORKER, OFFICER, ENGINEER, ADMIN
    department: Mapped[str] = mapped_column(String(255), nullable=True)
    ward_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("wards.id"), nullable=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )

    # Relationships
    ward = relationship("Ward", back_populates="users")
    assigned_complaints = relationship(
        "Complaint",
        back_populates="assignee",
        foreign_keys="Complaint.assigned_to",
    )
