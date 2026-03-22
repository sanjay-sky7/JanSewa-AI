"""Notification delivery log — tracks SMS, WhatsApp, and Email dispatches."""

import uuid
from datetime import datetime
from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    complaint_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("complaints.id"), nullable=False
    )

    # Channel: SMS, WHATSAPP, EMAIL
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    # Recipient address (phone number or email)
    recipient: Mapped[str] = mapped_column(String(255), nullable=False)

    # Type: REGISTRATION, STATUS_UPDATE, ASSIGNMENT, RESOLUTION
    notification_type: Mapped[str] = mapped_column(String(30), nullable=False)

    # Status transition that triggered the notification
    complaint_status: Mapped[str] = mapped_column(String(30), nullable=True)

    # Whether the send was successful
    success: Mapped[bool] = mapped_column(Boolean, default=False)

    # Error message if failed
    error_message: Mapped[str] = mapped_column(Text, nullable=True)

    # Message content (truncated for storage)
    message_preview: Mapped[str] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    complaint = relationship("Complaint", foreign_keys=[complaint_id])
