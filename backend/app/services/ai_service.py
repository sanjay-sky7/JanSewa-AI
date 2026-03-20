"""
AI service — NLP extraction & image analysis.

PRIMARY:   Internal Knowledge Base (keyword_classifier, complaint_categories)
OPTIONAL:  Google Gemini API for enhanced analysis
FALLBACK:  KB always works offline — zero external API dependency
"""

import json
import logging
import os
from typing import Optional

from app.knowledge_base.keyword_classifier import (
    classify_complaint,
    check_duplicate_local,
    summarize_text,
)
from app.knowledge_base.complaint_categories import get_subcategory_match
from app.knowledge_base.governance_policies import get_department

logger = logging.getLogger(__name__)

_model = None
_gemini_available = False
_vision_client = None
_vision_available = False


def _get_model():
    """Lazy-init the Gemini model (optional enhancement)."""
    global _model, _gemini_available
    if _model is None:
        try:
            import google.generativeai as genai
            from app.config import settings

            if not getattr(settings, "GEMINI_API_KEY", None):
                logger.info("No GEMINI_API_KEY — running in KB-only mode")
                _gemini_available = False
                return None

            genai.configure(api_key=settings.GEMINI_API_KEY)
            _model = genai.GenerativeModel("gemini-1.5-flash")
            _gemini_available = True
        except Exception as e:
            logger.warning(f"Gemini init failed — KB-only mode: {e}")
            _gemini_available = False
    return _model


def _get_vision_client():
    """Lazy-init Google Vision client (optional enhancement)."""
    global _vision_client, _vision_available
    if _vision_client is not None:
        return _vision_client

    try:
        from app.config import settings

        if not getattr(settings, "GOOGLE_VISION_ENABLED", True):
            _vision_available = False
            return None

        from google.cloud import vision

        _vision_client = vision.ImageAnnotatorClient()
        _vision_available = True
        return _vision_client
    except Exception as e:
        logger.info(f"Google Vision unavailable, continuing without it: {e}")
        _vision_available = False
        _vision_client = None
        return None


def _parse_json(text: str) -> dict:
    """Best-effort parse JSON from LLM output (strip markdown fences)."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
    if cleaned.endswith("```"):
        cleaned = cleaned.rsplit("```", 1)[0]
    cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("Failed to parse LLM JSON, returning raw text")
        return {"raw_response": text}


# ─────────────────────────────────────────────────────────
# Complaint NLP extraction
# ─────────────────────────────────────────────────────────

async def extract_complaint_details(
    raw_text: str,
    source_language: str = "auto",
) -> dict:
    """
    Extract structured information from raw complaint text.
    Works with Hindi, English, or any Indian regional language input.

    Strategy: KB classifier first → optionally enhance with Gemini.
    """
    # ── STEP 1: Knowledge-Base classification (always works) ──
    kb_result = classify_complaint(raw_text)
    dept = get_department(kb_result.get("category", "Other"))

    result = {
        "summary_english": kb_result.get("summary_en", raw_text[:200]),
        "summary_hindi": kb_result.get("summary_hi", ""),
        "category": kb_result.get("category", "Other"),
        "category_confidence": kb_result.get("confidence", 0.5),
        "location_text": kb_result.get("location"),
        "ward_number": kb_result.get("ward_number"),
        "duration_days": kb_result.get("duration_days"),
        "severity_keywords": kb_result.get("severity_keywords", []),
        "affected_estimate": kb_result.get("impact", "individual"),
        "is_emergency": kb_result.get("is_emergency", False),
        "requires_department": dept.get("name_en", "General Administration"),
        "source": "knowledge_base",
    }

    # ── STEP 2: Optional Gemini enhancement ──────────────
    model = _get_model()
    if model and _gemini_available:
        try:
            prompt = f"""
You are an AI assistant for a local governance complaint management system in India.

Analyze the following citizen complaint and extract structured information.
The complaint may be in Hindi, English, or any Indian regional language.

COMPLAINT TEXT: \"{raw_text}\"

Extract and return a JSON object with these fields:
{{
    "summary_english": "Brief summary in English (1-2 sentences)",
    "summary_hindi": "Brief summary in Hindi (1-2 sentences)",
    "category": "One of: Water Supply, Road/Pothole, Electricity, Drainage, Garbage, Health, Public Safety, Other",
    "category_confidence": 0.0 to 1.0,
    "location_text": "Extracted location/area/ward name from complaint or null",
    "ward_number": null or integer if mentioned,
    "duration_days": null or integer (how long the problem has existed),
    "severity_keywords": ["list", "of", "severity", "indicators"],
    "affected_estimate": "individual / family / street / colony / ward",
    "is_emergency": true or false,
    "requires_department": "Water Dept / Roads Dept / Electricity Dept / Health Dept / Sanitation Dept / General"
}}

Return ONLY the JSON object. No markdown, no explanation.
"""
            response = model.generate_content(prompt)
            gemini_data = _parse_json(response.text)

            # Merge: prefer Gemini for summaries & confidence, keep KB for structure
            if gemini_data.get("summary_english"):
                result["summary_english"] = gemini_data["summary_english"]
            if gemini_data.get("summary_hindi"):
                result["summary_hindi"] = gemini_data["summary_hindi"]
            if gemini_data.get("category_confidence", 0) > result["category_confidence"]:
                result["category"] = gemini_data.get("category", result["category"])
                result["category_confidence"] = gemini_data["category_confidence"]
            result["source"] = "knowledge_base+gemini"
        except Exception as e:
            logger.warning(f"Gemini enhancement failed, using KB result: {e}")

    return result


# ─────────────────────────────────────────────────────────
# Image complaint analysis
# ─────────────────────────────────────────────────────────

async def analyze_image_complaint(image_path: str) -> dict:
    """
    Analyze a complaint photo.
    Uses Gemini Vision if available, otherwise returns a KB-based placeholder
    prompting manual review.
    """
    vision_result = _analyze_image_with_google_vision(image_path)
    if vision_result:
        return vision_result

    model = _get_model()

    if model and _gemini_available:
        try:
            from PIL import Image as PILImage

            image = PILImage.open(image_path)

            prompt = """
You are analyzing a photo submitted as a citizen complaint to local government in India.

Describe:
1. What issue/problem is visible in this image?
2. Category: Water Supply, Road/Pothole, Electricity, Drainage, Garbage, Health, Public Safety, Other
3. Severity: Low, Medium, High, Critical
4. Estimated impact area (small/medium/large)
5. Brief description for official records (1-2 sentences)

Return as JSON:
{
    "issue_description": "...",
    "category": "...",
    "severity": "...",
    "impact_area": "...",
    "official_summary": "..."
}

Return ONLY the JSON object.
"""
            response = model.generate_content([prompt, image])
            result = _parse_json(response.text)
            result["source"] = "gemini_vision"
            return result
        except Exception as e:
            logger.error(f"Image analysis failed: {e}")

    # ── Local heuristic classifier fallback (no external API) ──
    return _analyze_image_locally(image_path)


def _analyze_image_with_google_vision(image_path: str) -> Optional[dict]:
    client = _get_vision_client()
    if not client or not _vision_available:
        return None

    try:
        from google.cloud import vision

        with open(image_path, "rb") as image_file:
            content = image_file.read()

        image = vision.Image(content=content)
        label_response = client.label_detection(image=image)
        object_response = client.object_localization(image=image)

        if label_response.error.message:
            logger.warning(f"Google Vision label detection error: {label_response.error.message}")
            return None
        if object_response.error.message:
            logger.warning(f"Google Vision object detection error: {object_response.error.message}")

        labels = label_response.label_annotations or []
        objects = object_response.localized_object_annotations or []

        label_tokens = [label.description.lower() for label in labels]
        object_tokens = [obj.name.lower() for obj in objects]
        all_tokens = label_tokens + object_tokens

        category, confidence = _map_vision_tokens_to_category(all_tokens)
        severity = _derive_severity_from_tokens(all_tokens)
        impact_area = _derive_impact_area_from_tokens(all_tokens)
        issue_desc = _build_issue_description(category, all_tokens)

        top_labels = ", ".join([label.description for label in labels[:4]]) or "no confident labels"
        summary = (
            f"Google Vision detected likely {category} complaint context "
            f"(signals: {top_labels})."
        )

        return {
            "issue_description": issue_desc,
            "category": category,
            "severity": severity,
            "impact_area": impact_area,
            "official_summary": summary,
            "category_confidence": confidence,
            "source": "google_vision",
            "requires_manual_review": category == "Other" or confidence < 0.45,
            "vision_labels": [label.description for label in labels[:10]],
        }
    except Exception as e:
        logger.warning(f"Google Vision image analysis failed: {e}")
        return None


def _map_vision_tokens_to_category(tokens: list[str]) -> tuple[str, float]:
    category_keywords = {
        "Road/Pothole": [
            "road",
            "street",
            "asphalt",
            "pothole",
            "sidewalk",
            "lane",
            "highway",
            "damaged",
            "crack",
        ],
        "Electricity": [
            "electric",
            "electricity",
            "wire",
            "cable",
            "pole",
            "street light",
            "transformer",
            "power",
        ],
        "Garbage": [
            "garbage",
            "trash",
            "waste",
            "litter",
            "dump",
            "debris",
            "pollution",
        ],
        "Drainage": [
            "drain",
            "drainage",
            "sewer",
            "waterlogging",
            "flood",
            "manhole",
            "gutter",
        ],
        "Water Supply": [
            "water",
            "tap",
            "pipeline",
            "leak",
            "pipe",
            "tank",
            "valve",
        ],
        "Public Safety": [
            "fire",
            "accident",
            "hazard",
            "danger",
            "collapse",
            "smoke",
            "injury",
        ],
        "Health": [
            "hospital",
            "clinic",
            "medical",
            "sanitary",
            "disease",
            "mosquito",
            "contamination",
        ],
    }

    scores = {category: 0 for category in category_keywords}
    token_set = [t.strip().lower() for t in tokens if t]
    for token in token_set:
        for category, keywords in category_keywords.items():
            for keyword in keywords:
                if keyword in token:
                    scores[category] += 1

    best_category = "Other"
    best_score = 0
    for category, score in scores.items():
        if score > best_score:
            best_score = score
            best_category = category

    if best_score <= 0:
        return "Other", 0.35

    confidence = min(0.92, 0.42 + (best_score * 0.12))
    return best_category, round(confidence, 2)


def _derive_severity_from_tokens(tokens: list[str]) -> str:
    joined = " ".join(tokens).lower()
    critical_signals = ["fire", "collapse", "accident", "flood", "spark", "danger"]
    high_signals = ["damage", "broken", "overflow", "leak", "hazard"]

    if any(signal in joined for signal in critical_signals):
        return "Critical"
    if any(signal in joined for signal in high_signals):
        return "High"
    return "Medium"


def _derive_impact_area_from_tokens(tokens: list[str]) -> str:
    joined = " ".join(tokens).lower()
    large_signals = ["highway", "flood", "road", "public", "street"]
    medium_signals = ["lane", "market", "building", "junction"]

    if any(signal in joined for signal in large_signals):
        return "large"
    if any(signal in joined for signal in medium_signals):
        return "medium"
    return "small"


def _build_issue_description(category: str, tokens: list[str]) -> str:
    if category == "Other":
        return "Image submitted by citizen; category requires manual review."

    top_signals = ", ".join(tokens[:3]) if tokens else "visual indicators"
    return f"Detected {category} complaint indicators in image ({top_signals})."


def _analyze_image_locally(image_path: str) -> dict:
    """Classify common civic image complaints using lightweight local heuristics."""
    filename = os.path.basename(image_path).lower()
    filename_hint = _category_from_filename(filename)

    try:
        from PIL import Image as PILImage

        image = PILImage.open(image_path).convert("RGB").resize((192, 192))
        width, height = image.size
        pixels = image.load()

        lower_total = 0
        lower_road_like = 0
        lower_dark = 0

        upper_total = 0
        upper_sky_like = 0
        upper_transition_count = 0
        upper_transition_samples = 0

        for y in range(height):
            row_prev_luma = None
            for x in range(width):
                r, g, b = pixels[x, y]
                max_c = max(r, g, b)
                min_c = min(r, g, b)
                sat = 0 if max_c == 0 else (max_c - min_c) / max_c
                luma = int(0.299 * r + 0.587 * g + 0.114 * b)

                if y >= height // 2:
                    lower_total += 1
                    # Road-like texture: low saturation + medium luminance
                    if sat < 0.22 and 35 <= luma <= 170:
                        lower_road_like += 1
                    # Pothole-like dark patch candidates
                    if luma < 45:
                        lower_dark += 1
                else:
                    upper_total += 1
                    # Sky-like region often appears in electricity pole/wire photos
                    if b > g and b > r and luma > 95 and sat > 0.15:
                        upper_sky_like += 1

                    if row_prev_luma is not None:
                        upper_transition_samples += 1
                        if abs(luma - row_prev_luma) > 85:
                            upper_transition_count += 1
                    row_prev_luma = luma

        road_ratio = (lower_road_like / lower_total) if lower_total else 0.0
        pothole_ratio = (lower_dark / lower_total) if lower_total else 0.0
        sky_ratio = (upper_sky_like / upper_total) if upper_total else 0.0
        transition_ratio = (
            upper_transition_count / upper_transition_samples if upper_transition_samples else 0.0
        )

        if road_ratio > 0.30 and pothole_ratio > 0.055:
            return {
                "issue_description": "Road surface damage with pothole-like dark depressions detected.",
                "category": "Road/Pothole",
                "severity": "High" if pothole_ratio > 0.09 else "Medium",
                "impact_area": "medium",
                "official_summary": "Image analysis indicates road damage/pothole requiring roads department action.",
                "category_confidence": round(min(0.9, 0.55 + pothole_ratio), 2),
                "source": "local_image_model",
                "requires_manual_review": False,
            }

        if sky_ratio > 0.26 and transition_ratio > 0.14:
            return {
                "issue_description": "Overhead infrastructure pattern suggests electricity-related issue.",
                "category": "Electricity",
                "severity": "Medium",
                "impact_area": "small",
                "official_summary": "Image analysis suggests an electricity complaint (wires/poles/streetlight context).",
                "category_confidence": round(min(0.85, 0.5 + transition_ratio), 2),
                "source": "local_image_model",
                "requires_manual_review": False,
            }

    except Exception as e:
        logger.warning(f"Local image heuristic analysis failed: {e}")

    if filename_hint:
        return {
            "issue_description": f"Image filename hints at {filename_hint} complaint.",
            "category": filename_hint,
            "severity": "Medium",
            "impact_area": "small",
            "official_summary": f"Auto-detected probable {filename_hint} issue from uploaded complaint image.",
            "category_confidence": 0.55,
            "source": "local_image_model_filename",
            "requires_manual_review": False,
        }

    return {
        "issue_description": "Photo submitted — category could not be determined confidently.",
        "category": "Other",
        "severity": "Medium",
        "impact_area": "small",
        "official_summary": "Image submitted — requires manual review.",
        "category_confidence": 0.25,
        "source": "local_image_model",
        "requires_manual_review": True,
    }


def _category_from_filename(filename: str) -> Optional[str]:
    if any(token in filename for token in ["pothole", "road", "sadak", "gaddha", "asphalt"]):
        return "Road/Pothole"
    if any(token in filename for token in ["electric", "bijli", "power", "wire", "streetlight", "transformer"]):
        return "Electricity"
    return None


# ─────────────────────────────────────────────────────────
# Duplicate detection
# ─────────────────────────────────────────────────────────

async def check_duplicate(
    new_summary: str,
    existing_summaries: list[dict],
) -> Optional[dict]:
    """
    Compare a new complaint summary against existing ones.
    Uses KB Jaccard + keyword similarity first, Gemini as enhancement.
    """
    if not existing_summaries:
        return None

    # ── STEP 1: KB-based duplicate check ─────────────────
    existing_for_kb = [
        {"id": s["id"], "text": s["summary"]}
        for s in existing_summaries[:50]
    ]
    kb_dup = check_duplicate_local(new_summary, existing_for_kb, threshold=0.55)
    if kb_dup:
        kb_dup["source"] = "knowledge_base"
        return kb_dup

    # ── STEP 2: Optional Gemini for borderline cases ─────
    model = _get_model()
    if model and _gemini_available:
        summaries_text = "\n".join(
            [f"ID: {s['id']} — {s['summary']}" for s in existing_summaries[:20]]
        )
        prompt = f"""
Compare this new complaint with existing complaints and determine if it is a duplicate.

NEW COMPLAINT: "{new_summary}"

EXISTING COMPLAINTS:
{summaries_text}

Return JSON:
{{
    "is_duplicate": true or false,
    "duplicate_of_id": "id of matching complaint or null",
    "similarity_score": 0.0 to 1.0,
    "reason": "brief explanation"
}}
"""
        try:
            response = model.generate_content(prompt)
            result = _parse_json(response.text)
            result["source"] = "gemini"
            if result.get("is_duplicate") and result.get("similarity_score", 0) > 0.75:
                return result
        except Exception:
            pass

    return None
