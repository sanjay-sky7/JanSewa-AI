"""Replace placeholder complaint/verification image URLs with real photo URLs.

Usage:
    python scripts/backfill_real_problem_images.py
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.config import settings
from app.models.complaint import Complaint
from app.models.verification import Verification

PROBLEM_IMAGE_URLS = [
    "https://picsum.photos/seed/jansewa-garbage/1280/720",
    "https://picsum.photos/seed/jansewa-pothole/1280/720",
    "https://picsum.photos/seed/jansewa-drainage/1280/720",
    "https://picsum.photos/seed/jansewa-waterlogging/1280/720",
    "https://picsum.photos/seed/jansewa-streetlight/1280/720",
    "https://picsum.photos/seed/jansewa-public-safety/1280/720",
    "https://picsum.photos/seed/jansewa-sewage/1280/720",
    "https://picsum.photos/seed/jansewa-road-damage/1280/720",
]

PLACEHOLDER_HOSTS = (
    "placehold.co",
    "via.placeholder.com",
)


def is_placeholder_url(url: str | None) -> bool:
    if not url:
        return False
    lowered = url.lower()
    return any(host in lowered for host in PLACEHOLDER_HOSTS)


def pick_image(idx: int) -> str:
    return PROBLEM_IMAGE_URLS[idx % len(PROBLEM_IMAGE_URLS)]


def main() -> None:
    engine = create_engine(settings.DATABASE_SYNC_URL, echo=False)

    updated_complaints = 0
    updated_verifications = 0

    with Session(engine) as db:
        complaints = db.query(Complaint).order_by(Complaint.created_at.asc()).all()
        for idx, complaint in enumerate(complaints):
            if complaint.input_type == "image" and is_placeholder_url(complaint.raw_image_url):
                complaint.raw_image_url = pick_image(idx)
                updated_complaints += 1

        verifications = db.query(Verification).order_by(Verification.created_at.asc()).all()
        for idx, verification in enumerate(verifications):
            changed = False

            if is_placeholder_url(verification.before_image_url):
                verification.before_image_url = pick_image(idx)
                changed = True

            if is_placeholder_url(verification.after_image_url):
                verification.after_image_url = pick_image(idx + 1)
                changed = True

            if changed:
                updated_verifications += 1

        db.commit()

    print(f"Updated complaint images: {updated_complaints}")
    print(f"Updated verification image pairs: {updated_verifications}")


if __name__ == "__main__":
    main()
