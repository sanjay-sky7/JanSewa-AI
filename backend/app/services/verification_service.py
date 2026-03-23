"""
4-Layer work verification service.

Layer 1 — GPS location match        (LOCAL — haversine)
Layer 2 — Timestamp validation       (LOCAL — EXIF parsing)
Layer 3 — Visual change detection    (KB pixel-diff PRIMARY · Gemini optional)
Layer 4 — Tamper detection           (LOCAL — EXIF metadata)
"""

import json
import logging
import math
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two GPS points in meters."""
    R = 6_371_000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def verify_work_completion(
    before_image_path: Optional[str],
    after_image_path: str,
    original_latitude: Optional[float],
    original_longitude: Optional[float],
    assignment_date: str,
) -> dict:
    """
    4-Layer verification of work completion:
      Layer 1 — GPS location match
      Layer 2 — Timestamp validation
      Layer 3 — Visual change detection (Gemini Vision)
      Layer 4 — Tamper detection
    """
    from app.utils.exif_reader import extract_exif_data

    result = {
        "layer1_location_match": False,
        "layer2_time_valid": False,
        "layer3_visual_change": False,
        "layer4_no_tampering": False,
        "overall_verdict": "REJECTED",
        "confidence": 0.0,
        "remarks": [],
    }

    after_exif = extract_exif_data(after_image_path)

    # ── LAYER 1: GPS LOCATION MATCH ─────────────────────
    if (
        original_latitude is not None
        and original_longitude is not None
        and after_exif.get("gps_latitude") is not None
        and after_exif.get("gps_longitude") is not None
    ):
        distance = haversine_distance(
            original_latitude,
            original_longitude,
            after_exif["gps_latitude"],
            after_exif["gps_longitude"],
        )
        if distance <= 50:
            result["layer1_location_match"] = True
            result["remarks"].append(
                f"✅ Location match: {distance:.1f}m from original (within 50m)"
            )
        else:
            result["remarks"].append(
                f"❌ Location mismatch: {distance:.1f}m away from original"
            )
    else:
        result["remarks"].append("⚠️ GPS data unavailable — location check skipped")

    # ── LAYER 2: TIMESTAMP VALIDATION ────────────────────
    if after_exif.get("datetime"):
        try:
            photo_date = datetime.strptime(after_exif["datetime"], "%Y:%m:%d %H:%M:%S")
            assign_date = datetime.strptime(assignment_date, "%Y-%m-%d")
            if photo_date > assign_date:
                result["layer2_time_valid"] = True
                result["remarks"].append(
                    f"✅ Timestamp valid: Photo {photo_date.date()} after assignment {assign_date.date()}"
                )
            else:
                result["remarks"].append(
                    f"❌ Timestamp invalid: Photo {photo_date.date()} before assignment {assign_date.date()}"
                )
        except ValueError:
            result["remarks"].append("⚠️ Could not parse timestamp")
    else:
        result["remarks"].append("⚠️ No timestamp in after-photo")

    # ── LAYER 3: VISUAL CHANGE DETECTION ─────────────────
    # Strategy: try Gemini Vision first, fall back to KB pixel-diff
    layer3_done = False
    try:
        import google.generativeai as genai
        from app.config import settings

        if getattr(settings, "GEMINI_API_KEY", None):
            from PIL import Image as PILImage

            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-1.5-flash")

            before_img = PILImage.open(before_image_path)
            after_img = PILImage.open(after_image_path)

            vision_prompt = """
Compare these two images. The first is BEFORE repair/work, the second is AFTER.

Analyze:
1. Is there a visible structural change/repair/improvement?
2. Does the AFTER image show the same location as BEFORE?
3. Confidence that genuine work was completed (0.0 to 1.0)?
4. Brief description of changes detected.

Return JSON:
{
    "visual_change_detected": true/false,
    "same_location": true/false,
    "confidence": 0.0 to 1.0,
    "changes_description": "..."
}
Return ONLY the JSON.
"""
            response = model.generate_content([vision_prompt, before_img, after_img])
            cleaned = response.text.strip().strip("`").strip()
            if cleaned.startswith("json"):
                cleaned = cleaned[4:].strip()
            vision_result = json.loads(cleaned)

            if vision_result.get("visual_change_detected") and vision_result.get("confidence", 0) > 0.6:
                result["layer3_visual_change"] = True
                result["remarks"].append(
                    f"✅ Visual change detected: {vision_result.get('changes_description', '')} "
                    f"(confidence: {vision_result.get('confidence', 0):.0%})"
                )
            else:
                result["remarks"].append(
                    f"❌ No significant visual change (confidence: {vision_result.get('confidence', 0):.0%})"
                )
            layer3_done = True
    except Exception as e:
        logger.warning(f"Gemini Vision unavailable, using KB pixel-diff: {e}")

    # ── LAYER 3 FALLBACK: KB pixel-difference analysis ───
    if not layer3_done:
        try:
            from PIL import Image as PILImage
            import numpy as np

            if not before_image_path:
                result["remarks"].append(
                    "⚠️ Before image unavailable — visual change comparison skipped"
                )
                raise ValueError("before image missing")

            before_img = PILImage.open(before_image_path).convert("RGB").resize((256, 256))
            after_img = PILImage.open(after_image_path).convert("RGB").resize((256, 256))

            before_arr = np.array(before_img, dtype=float)
            after_arr = np.array(after_img, dtype=float)

            # Mean absolute difference normalised to 0–1
            diff = np.mean(np.abs(before_arr - after_arr)) / 255.0

            if diff > 0.12:  # >12% pixel change → work likely done
                result["layer3_visual_change"] = True
                result["remarks"].append(
                    f"✅ Pixel-diff change detected ({diff:.1%}) — indicates visible work"
                )
            else:
                result["remarks"].append(
                    f"❌ Pixel-diff too small ({diff:.1%}) — no significant visual change"
                )
        except ImportError:
            result["remarks"].append(
                "⚠️ numpy not installed — pixel-diff analysis unavailable, visual check skipped"
            )
        except ValueError:
            pass
        except Exception as e:
            logger.error(f"Pixel-diff analysis failed: {e}")
            result["remarks"].append(f"⚠️ Visual analysis unavailable: {e}")

    # ── LAYER 4: TAMPER DETECTION ────────────────────────
    tamper_flags = []

    if after_exif.get("software"):
        editing_tools = ["photoshop", "gimp", "snapseed", "lightroom", "editor"]
        if any(tool in after_exif["software"].lower() for tool in editing_tools):
            tamper_flags.append(f"Image edited with: {after_exif['software']}")

    if after_exif.get("gps_latitude"):
        lat_decimals = str(after_exif["gps_latitude"]).split(".")[-1]
        if len(lat_decimals) < 3:
            tamper_flags.append("GPS coordinates suspiciously rounded")

    try:
        from PIL import Image as PILImage
        after_img_check = PILImage.open(after_image_path)
        width, height = after_img_check.size
        if after_exif.get("make") is None and width == height:
            tamper_flags.append("No camera metadata — possible screenshot or download")
    except Exception:
        pass

    if not tamper_flags:
        result["layer4_no_tampering"] = True
        result["remarks"].append("✅ No tampering indicators detected")
    else:
        result["remarks"].append(f"❌ Tamper flags: {', '.join(tamper_flags)}")

    # ── FINAL VERDICT ────────────────────────────────────
    passed = sum([
        result["layer1_location_match"],
        result["layer2_time_valid"],
        result["layer3_visual_change"],
        result["layer4_no_tampering"],
    ])
    result["confidence"] = round(passed / 4.0, 2)

    if passed == 4:
        result["overall_verdict"] = "VERIFIED"
    elif passed >= 3:
        result["overall_verdict"] = "MANUAL_REVIEW"
    else:
        result["overall_verdict"] = "REJECTED"

    return result
