"""EXIF data reader - extract GPS, timestamp, camera info from images."""

import logging

logger = logging.getLogger(__name__)


def extract_exif_data(image_path: str) -> dict:
    """Extract GPS, timestamp, and camera info from image EXIF data."""
    result = {
        "gps_latitude": None,
        "gps_longitude": None,
        "datetime": None,
        "make": None,
        "model": None,
        "software": None,
    }

    try:
        from PIL import Image
        from PIL.ExifTags import TAGS, GPSTAGS

        img = Image.open(image_path)
        exif_data = img._getexif() or {}

        if not exif_data:
            return result

        for tag_id, value in exif_data.items():
            tag = TAGS.get(tag_id, tag_id)

            if tag in ("DateTime", "DateTimeOriginal", "DateTimeDigitized") and not result["datetime"]:
                result["datetime"] = value
            elif tag == "Make":
                result["make"] = value
            elif tag == "Model":
                result["model"] = value
            elif tag == "Software":
                result["software"] = value
            elif tag == "GPSInfo":
                gps_data = {}
                for gps_tag_id, gps_value in value.items():
                    gps_tag = GPSTAGS.get(gps_tag_id, gps_tag_id)
                    gps_data[gps_tag] = gps_value

                if "GPSLatitude" in gps_data and "GPSLongitude" in gps_data:
                    lat_ref = gps_data.get("GPSLatitudeRef", "N")
                    lon_ref = gps_data.get("GPSLongitudeRef", "E")

                    if isinstance(lat_ref, bytes):
                        lat_ref = lat_ref.decode(errors="ignore")
                    if isinstance(lon_ref, bytes):
                        lon_ref = lon_ref.decode(errors="ignore")

                    result["gps_latitude"] = _convert_to_degrees(gps_data["GPSLatitude"], lat_ref)
                    result["gps_longitude"] = _convert_to_degrees(gps_data["GPSLongitude"], lon_ref)
    except Exception as e:
        logger.warning(f"EXIF extraction error: {e}")

    return result


def _rational_to_float(value) -> float:
    """Convert EXIF rational representations to float."""
    try:
        if isinstance(value, (int, float)):
            return float(value)

        # EXIF tuples are often (numerator, denominator).
        if isinstance(value, (tuple, list)) and len(value) == 2:
            num, den = value
            den = float(den) if den else 1.0
            return float(num) / den

        # PIL IFDRational supports float conversion.
        return float(value)
    except Exception:
        return 0.0


def _convert_to_degrees(value, ref: str) -> float:
    """Convert GPS coordinates to decimal degrees."""
    d, m, s = value
    degrees = _rational_to_float(d) + _rational_to_float(m) / 60 + _rational_to_float(s) / 3600
    if ref in ("S", "W"):
        degrees = -degrees
    return degrees
