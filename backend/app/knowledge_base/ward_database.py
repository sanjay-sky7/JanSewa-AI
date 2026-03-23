"""
Ward & Area Knowledge Base
============================
Comprehensive demographic, infrastructure, and vulnerability data
for all 15 wards. Used by priority engine, dashboard, and public portal.
"""

import re
import unicodedata

# ─────────────────────────────────────────────────────────
# WARD DATABASE — Complete profiles for 15 Delhi wards
# ─────────────────────────────────────────────────────────

WARDS = {
    1: {
        "name": "Rajendra Nagar",
        "name_hi": "राजेन्द्र नगर",
        "zone": "Central",
        "latitude": 28.6328,
        "longitude": 77.1842,
        "population": 48500,
        "area_sq_km": 2.8,
        "households": 9200,
        "population_density": 17321,  # per sq km
        "is_vulnerable": False,
        "vulnerability_score": 25,
        "literacy_rate": 89.5,
        "avg_household_income": 45000,  # ₹ monthly
        "slum_percentage": 5.0,
        "water_supply_hours": 6,
        "road_km": 18.5,
        "drain_coverage_pct": 92,
        "garbage_collection_freq": "daily",
        "street_lights": 420,
        "parks": 4,
        "primary_health_centers": 2,
        "schools": 5,
        "common_issues": ["parking", "traffic congestion", "noise"],
        "major_landmarks": ["Rajendra Nagar Market", "IGNOU", "Shankar Road"],
        "councillor_name": "Rajesh Kumar",
        "councillor_phone": "+91-9876543210",
    },
    2: {
        "name": "Karol Bagh",
        "name_hi": "करोल बाग",
        "zone": "Central",
        "latitude": 28.6519,
        "longitude": 77.1905,
        "population": 62000,
        "area_sq_km": 3.1,
        "households": 12400,
        "population_density": 20000,
        "is_vulnerable": False,
        "vulnerability_score": 30,
        "literacy_rate": 88.0,
        "avg_household_income": 55000,
        "slum_percentage": 3.0,
        "water_supply_hours": 7,
        "road_km": 22.0,
        "drain_coverage_pct": 95,
        "garbage_collection_freq": "daily",
        "street_lights": 560,
        "parks": 3,
        "primary_health_centers": 2,
        "schools": 8,
        "common_issues": ["commercial waste", "encroachment", "old wiring"],
        "major_landmarks": ["Karol Bagh Market", "Pusa Road", "Gaffar Market"],
        "councillor_name": "Sonia Gupta",
        "councillor_phone": "+91-9876543211",
    },
    3: {
        "name": "Chandni Chowk",
        "name_hi": "चांदनी चौक",
        "zone": "North",
        "latitude": 28.6506,
        "longitude": 77.2310,
        "population": 78000,
        "area_sq_km": 2.5,
        "households": 15600,
        "population_density": 31200,
        "is_vulnerable": True,
        "vulnerability_score": 78,
        "literacy_rate": 72.0,
        "avg_household_income": 25000,
        "slum_percentage": 18.0,
        "water_supply_hours": 4,
        "road_km": 15.0,
        "drain_coverage_pct": 68,
        "garbage_collection_freq": "daily",
        "street_lights": 380,
        "parks": 1,
        "primary_health_centers": 1,
        "schools": 4,
        "common_issues": ["overcrowding", "fire hazard", "drainage", "encroachment"],
        "major_landmarks": ["Red Fort", "Chandni Chowk Market", "Jama Masjid"],
        "councillor_name": "Mohammad Irfan",
        "councillor_phone": "+91-9876543212",
    },
    4: {
        "name": "Sadar Bazaar",
        "name_hi": "सदर बाजार",
        "zone": "North",
        "latitude": 28.6584,
        "longitude": 77.2098,
        "population": 55000,
        "area_sq_km": 2.2,
        "households": 11000,
        "population_density": 25000,
        "is_vulnerable": True,
        "vulnerability_score": 72,
        "literacy_rate": 74.5,
        "avg_household_income": 22000,
        "slum_percentage": 22.0,
        "water_supply_hours": 3,
        "road_km": 12.0,
        "drain_coverage_pct": 60,
        "garbage_collection_freq": "alternate_days",
        "street_lights": 280,
        "parks": 1,
        "primary_health_centers": 1,
        "schools": 3,
        "common_issues": ["water scarcity", "sanitation", "overcrowding"],
        "major_landmarks": ["Sadar Bazaar Market", "Qutab Road"],
        "councillor_name": "Priya Sharma",
        "councillor_phone": "+91-9876543213",
    },
    5: {
        "name": "Civil Lines",
        "name_hi": "सिविल लाइन्स",
        "zone": "North",
        "latitude": 28.6803,
        "longitude": 77.2249,
        "population": 32000,
        "area_sq_km": 4.5,
        "households": 6800,
        "population_density": 7111,
        "is_vulnerable": False,
        "vulnerability_score": 15,
        "literacy_rate": 94.0,
        "avg_household_income": 75000,
        "slum_percentage": 2.0,
        "water_supply_hours": 10,
        "road_km": 28.0,
        "drain_coverage_pct": 98,
        "garbage_collection_freq": "daily",
        "street_lights": 650,
        "parks": 8,
        "primary_health_centers": 3,
        "schools": 7,
        "common_issues": ["tree maintenance", "park upkeep"],
        "major_landmarks": ["Delhi University", "Kashmere Gate"],
        "councillor_name": "Vikram Singh",
        "councillor_phone": "+91-9876543214",
    },
    6: {
        "name": "Shahdara",
        "name_hi": "शाहदरा",
        "zone": "East",
        "latitude": 28.6740,
        "longitude": 77.2890,
        "population": 85000,
        "area_sq_km": 5.0,
        "households": 17000,
        "population_density": 17000,
        "is_vulnerable": True,
        "vulnerability_score": 65,
        "literacy_rate": 78.0,
        "avg_household_income": 28000,
        "slum_percentage": 15.0,
        "water_supply_hours": 4,
        "road_km": 20.0,
        "drain_coverage_pct": 72,
        "garbage_collection_freq": "alternate_days",
        "street_lights": 400,
        "parks": 3,
        "primary_health_centers": 2,
        "schools": 6,
        "common_issues": ["waterlogging", "industrial pollution", "poor roads"],
        "major_landmarks": ["Shahdara Railway Station", "GTB Hospital"],
        "councillor_name": "Amit Verma",
        "councillor_phone": "+91-9876543215",
    },
    7: {
        "name": "Laxmi Nagar",
        "name_hi": "लक्ष्मी नगर",
        "zone": "East",
        "latitude": 28.6348,
        "longitude": 77.2777,
        "population": 72000,
        "area_sq_km": 3.8,
        "households": 14400,
        "population_density": 18947,
        "is_vulnerable": False,
        "vulnerability_score": 35,
        "literacy_rate": 86.0,
        "avg_household_income": 42000,
        "slum_percentage": 8.0,
        "water_supply_hours": 5,
        "road_km": 19.0,
        "drain_coverage_pct": 85,
        "garbage_collection_freq": "daily",
        "street_lights": 480,
        "parks": 4,
        "primary_health_centers": 2,
        "schools": 9,
        "common_issues": ["parking", "commercial waste", "traffic"],
        "major_landmarks": ["Laxmi Nagar Market", "V3S Mall"],
        "councillor_name": "Neeta Bansal",
        "councillor_phone": "+91-9876543216",
    },
    8: {
        "name": "Dwarka",
        "name_hi": "द्वारका",
        "zone": "South-West",
        "latitude": 28.5921,
        "longitude": 77.0460,
        "population": 95000,
        "area_sq_km": 8.5,
        "households": 22000,
        "population_density": 11176,
        "is_vulnerable": False,
        "vulnerability_score": 20,
        "literacy_rate": 91.0,
        "avg_household_income": 65000,
        "slum_percentage": 3.0,
        "water_supply_hours": 8,
        "road_km": 45.0,
        "drain_coverage_pct": 94,
        "garbage_collection_freq": "daily",
        "street_lights": 980,
        "parks": 12,
        "primary_health_centers": 4,
        "schools": 15,
        "common_issues": ["water pressure", "stray dogs", "park maintenance"],
        "major_landmarks": ["Dwarka Sector 21 Metro", "NSIT"],
        "councillor_name": "Ravi Tiwari",
        "councillor_phone": "+91-9876543217",
    },
    9: {
        "name": "Sangam Vihar",
        "name_hi": "संगम विहार",
        "zone": "South",
        "latitude": 28.5050,
        "longitude": 77.2300,
        "population": 120000,
        "area_sq_km": 4.2,
        "households": 24000,
        "population_density": 28571,
        "is_vulnerable": True,
        "vulnerability_score": 88,
        "literacy_rate": 65.0,
        "avg_household_income": 18000,
        "slum_percentage": 35.0,
        "water_supply_hours": 2,
        "road_km": 14.0,
        "drain_coverage_pct": 45,
        "garbage_collection_freq": "alternate_days",
        "street_lights": 250,
        "parks": 1,
        "primary_health_centers": 1,
        "schools": 3,
        "common_issues": [
            "water scarcity", "illegal construction", "poor drainage",
            "open defecation", "no sewage connection",
        ],
        "major_landmarks": ["Sangam Vihar Colony"],
        "councillor_name": "Geeta Devi",
        "councillor_phone": "+91-9876543218",
    },
    10: {
        "name": "Rohini",
        "name_hi": "रोहिणी",
        "zone": "North-West",
        "latitude": 28.7330,
        "longitude": 77.1100,
        "population": 88000,
        "area_sq_km": 7.5,
        "households": 19000,
        "population_density": 11733,
        "is_vulnerable": False,
        "vulnerability_score": 22,
        "literacy_rate": 90.0,
        "avg_household_income": 58000,
        "slum_percentage": 5.0,
        "water_supply_hours": 7,
        "road_km": 38.0,
        "drain_coverage_pct": 90,
        "garbage_collection_freq": "daily",
        "street_lights": 820,
        "parks": 10,
        "primary_health_centers": 3,
        "schools": 12,
        "common_issues": ["traffic", "green belt encroachment"],
        "major_landmarks": ["Rohini Court", "Adventure Island", "Metro Walk"],
        "councillor_name": "Suresh Yadav",
        "councillor_phone": "+91-9876543219",
    },
    11: {
        "name": "Mehrauli",
        "name_hi": "महरौली",
        "zone": "South",
        "latitude": 28.5245,
        "longitude": 77.1855,
        "population": 45000,
        "area_sq_km": 3.0,
        "households": 9000,
        "population_density": 15000,
        "is_vulnerable": True,
        "vulnerability_score": 62,
        "literacy_rate": 76.0,
        "avg_household_income": 30000,
        "slum_percentage": 12.0,
        "water_supply_hours": 4,
        "road_km": 16.0,
        "drain_coverage_pct": 70,
        "garbage_collection_freq": "alternate_days",
        "street_lights": 350,
        "parks": 2,
        "primary_health_centers": 1,
        "schools": 4,
        "common_issues": ["heritage preservation", "water supply", "drainage"],
        "major_landmarks": ["Qutub Minar", "Mehrauli Archaeological Park"],
        "councillor_name": "Farhan Ahmed",
        "councillor_phone": "+91-9876543220",
    },
    12: {
        "name": "Trilokpuri",
        "name_hi": "त्रिलोकपुरी",
        "zone": "East",
        "latitude": 28.6100,
        "longitude": 77.3050,
        "population": 68000,
        "area_sq_km": 2.5,
        "households": 13600,
        "population_density": 27200,
        "is_vulnerable": True,
        "vulnerability_score": 80,
        "literacy_rate": 70.0,
        "avg_household_income": 20000,
        "slum_percentage": 25.0,
        "water_supply_hours": 3,
        "road_km": 10.0,
        "drain_coverage_pct": 55,
        "garbage_collection_freq": "alternate_days",
        "street_lights": 260,
        "parks": 1,
        "primary_health_centers": 1,
        "schools": 3,
        "common_issues": ["water supply", "sanitation", "health", "open drains"],
        "major_landmarks": ["Trilokpuri Block 32"],
        "councillor_name": "Ram Prasad",
        "councillor_phone": "+91-9876543221",
    },
    13: {
        "name": "Vasant Kunj",
        "name_hi": "वसंत कुंज",
        "zone": "South",
        "latitude": 28.5200,
        "longitude": 77.1540,
        "population": 58000,
        "area_sq_km": 6.0,
        "households": 13000,
        "population_density": 9667,
        "is_vulnerable": False,
        "vulnerability_score": 18,
        "literacy_rate": 93.0,
        "avg_household_income": 80000,
        "slum_percentage": 2.0,
        "water_supply_hours": 12,
        "road_km": 32.0,
        "drain_coverage_pct": 97,
        "garbage_collection_freq": "daily",
        "street_lights": 720,
        "parks": 6,
        "primary_health_centers": 2,
        "schools": 8,
        "common_issues": ["traffic", "stray dog menace"],
        "major_landmarks": ["Ambience Mall", "Vasant Kunj Institutional Area"],
        "councillor_name": "Anita Kapoor",
        "councillor_phone": "+91-9876543222",
    },
    14: {
        "name": "Najafgarh",
        "name_hi": "नजफगढ़",
        "zone": "South-West",
        "latitude": 28.6093,
        "longitude": 76.9798,
        "population": 110000,
        "area_sq_km": 12.0,
        "households": 22000,
        "population_density": 9167,
        "is_vulnerable": True,
        "vulnerability_score": 58,
        "literacy_rate": 75.0,
        "avg_household_income": 25000,
        "slum_percentage": 10.0,
        "water_supply_hours": 3,
        "road_km": 35.0,
        "drain_coverage_pct": 62,
        "garbage_collection_freq": "alternate_days",
        "street_lights": 500,
        "parks": 3,
        "primary_health_centers": 2,
        "schools": 7,
        "common_issues": ["waterlogging", "mosquito breeding", "poor connectivity"],
        "major_landmarks": ["Najafgarh Lake", "Najafgarh Bus Stand"],
        "councillor_name": "Deepak Jha",
        "councillor_phone": "+91-9876543223",
    },
    15: {
        "name": "Mangolpuri",
        "name_hi": "मंगोलपुरी",
        "zone": "North-West",
        "latitude": 28.7020,
        "longitude": 77.0840,
        "population": 92000,
        "area_sq_km": 4.0,
        "households": 18400,
        "population_density": 23000,
        "is_vulnerable": True,
        "vulnerability_score": 75,
        "literacy_rate": 71.0,
        "avg_household_income": 22000,
        "slum_percentage": 20.0,
        "water_supply_hours": 3,
        "road_km": 16.0,
        "drain_coverage_pct": 58,
        "garbage_collection_freq": "alternate_days",
        "street_lights": 340,
        "parks": 2,
        "primary_health_centers": 1,
        "schools": 5,
        "common_issues": ["water scarcity", "drug menace", "drainage", "gang activity"],
        "major_landmarks": ["Mangolpuri Industrial Area"],
        "councillor_name": "Sunita Kumari",
        "councillor_phone": "+91-9876543224",
    },
}


# ─────────────────────────────────────────────────────────
# INFRASTRUCTURE BENCHMARKS — what "good" looks like
# ─────────────────────────────────────────────────────────

INFRASTRUCTURE_BENCHMARKS = {
    "water_supply_hours_good": 8,
    "water_supply_hours_acceptable": 4,
    "drain_coverage_pct_good": 90,
    "drain_coverage_pct_acceptable": 70,
    "street_lights_per_km_good": 25,
    "street_lights_per_km_acceptable": 15,
    "population_density_high": 20000,
    "slum_percentage_high": 15,
    "literacy_rate_low": 75,
}


# ─────────────────────────────────────────────────────────
# Helper functions
# ─────────────────────────────────────────────────────────

def get_ward(ward_id: int) -> dict | None:
    """Get ward profile by ID."""
    return WARDS.get(ward_id)


def get_all_wards() -> list[dict]:
    """Return all ward profiles as a list."""
    return [{"id": wid, **data} for wid, data in WARDS.items()]


def get_vulnerable_wards() -> list[dict]:
    """Return only wards marked as vulnerable."""
    return [
        {"id": wid, **data}
        for wid, data in WARDS.items()
        if data.get("is_vulnerable")
    ]


def get_ward_vulnerability_score(ward_id: int) -> int:
    """Calculate composite vulnerability score (0-100)."""
    ward = WARDS.get(ward_id)
    if not ward:
        return 50  # default

    score = 0
    b = INFRASTRUCTURE_BENCHMARKS

    # Water stress
    if ward["water_supply_hours"] < b["water_supply_hours_acceptable"]:
        score += 20
    elif ward["water_supply_hours"] < b["water_supply_hours_good"]:
        score += 10

    # Drainage deficit
    if ward["drain_coverage_pct"] < b["drain_coverage_pct_acceptable"]:
        score += 20
    elif ward["drain_coverage_pct"] < b["drain_coverage_pct_good"]:
        score += 10

    # High population density
    if ward["population_density"] > b["population_density_high"]:
        score += 15

    # Slum percentage
    if ward["slum_percentage"] > b["slum_percentage_high"]:
        score += 20

    # Low literacy
    if ward["literacy_rate"] < b["literacy_rate_low"]:
        score += 10

    # Low income (below ₹25k/month)
    if ward["avg_household_income"] < 25000:
        score += 15

    return min(100, score)


def get_ward_by_location(text: str) -> dict | None:
    """Find a ward by matching names, ward number hints, and landmark aliases."""
    if not text:
        return None

    normalized_text = _normalize_location_text(text)

    ward_match = re.search(r"\bward\s*(?:no\.?|number)?\s*(\d{1,2})\b", normalized_text)
    if ward_match:
        try:
            ward_id = int(ward_match.group(1))
            ward = WARDS.get(ward_id)
            if ward:
                return {"id": ward_id, **ward}
        except Exception:
            pass

    best: dict | None = None
    best_score = 0

    for wid, ward in WARDS.items():
        score = 0

        ward_name = _normalize_location_text(ward.get("name", ""))
        ward_name_hi = _normalize_location_text(ward.get("name_hi", ""))
        zone_name = _normalize_location_text(ward.get("zone", ""))

        if ward_name and ward_name in normalized_text:
            score += 8
        if ward_name_hi and ward_name_hi in normalized_text:
            score += 7
        if zone_name and zone_name in normalized_text:
            score += 1

        name_tokens = [token for token in ward_name.split() if len(token) >= 4]
        token_hits = sum(1 for token in name_tokens if token in normalized_text)
        score += min(3, token_hits)

        for landmark in ward.get("major_landmarks", []):
            lm = _normalize_location_text(landmark)
            if lm and lm in normalized_text:
                score += 5
            else:
                lm_tokens = [token for token in lm.split() if len(token) >= 5]
                if any(token in normalized_text for token in lm_tokens):
                    score += 2

        if score > best_score:
            best_score = score
            best = {"id": wid, **ward}

    return best if best_score >= 3 else None


def _normalize_location_text(text: str) -> str:
    compact = unicodedata.normalize("NFKD", str(text or "")).encode("ascii", "ignore").decode("ascii")
    compact = compact.lower().replace("&", " and ")
    compact = re.sub(r"[^a-z0-9\s]", " ", compact)
    compact = re.sub(r"\s+", " ", compact).strip()
    return compact


def get_nearest_ward(lat: float, lng: float) -> dict | None:
    """Find nearest ward by GPS coordinates."""
    import math
    best = None
    best_dist = float("inf")
    for wid, ward in WARDS.items():
        dlat = ward["latitude"] - lat
        dlng = ward["longitude"] - lng
        dist = math.sqrt(dlat ** 2 + dlng ** 2)
        if dist < best_dist:
            best_dist = dist
            best = {"id": wid, **ward}
    return best
