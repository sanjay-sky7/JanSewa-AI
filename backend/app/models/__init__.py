"""Re-export all ORM models so `from app.models import *` works."""

from app.models.user import User  # noqa: F401
from app.models.ward import Ward  # noqa: F401
from app.models.citizen import Citizen  # noqa: F401
from app.models.category import Category  # noqa: F401
from app.models.complaint import Complaint  # noqa: F401
from app.models.verification import Verification  # noqa: F401
from app.models.social_post import SocialPost  # noqa: F401
from app.models.communication import Communication  # noqa: F401
from app.models.trust_score import TrustScore  # noqa: F401
from app.models.audit_log import AuditLog  # noqa: F401
from app.models.notification_state import NotificationState  # noqa: F401
from app.models.notification_log import NotificationLog  # noqa: F401

__all__ = [
    "User",
    "Ward",
    "Citizen",
    "Category",
    "Complaint",
    "Verification",
    "SocialPost",
    "Communication",
    "TrustScore",
    "AuditLog",
    "NotificationState",
    "NotificationLog",
]
