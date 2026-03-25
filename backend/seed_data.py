"""
Seed script — populates the database with demo data.

Usage:
    python -m seed_data

Requires: a running PostgreSQL with the schema already applied,
          and a valid DATABASE_SYNC_URL in .env
"""

import uuid
import random
from datetime import datetime, timedelta, date

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

# ── Bootstrap the app models ─────────────────────────────
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import Base
from app.models import (
    Ward, Category, User, Citizen, Complaint, Verification,
    SocialPost, Communication, TrustScore, AuditLog,
)
from app.utils.helpers import hash_password
from app.config import settings

engine = create_engine(settings.DATABASE_SYNC_URL, echo=False)

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


def seed():
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        # ── 1. WARDS (15) ───────────────────────────────
        wards_data = [
            (1, "Shanti Nagar", "Central", 12000, False, 28.6139, 77.2090),
            (2, "Gandhi Colony", "North", 15000, False, 28.6280, 77.2185),
            (3, "Rajendra Nagar", "East", 9500, True, 28.6353, 77.2249),
            (4, "Laxmi Puri", "South", 18000, False, 28.6508, 77.2335),
            (5, "Nehru Vihar", "West", 11000, False, 28.6445, 77.2088),
            (6, "Ambedkar Nagar", "Central", 8000, True, 28.6100, 77.2300),
            (7, "Subhash Colony", "North", 14000, False, 28.6200, 77.2400),
            (8, "Patel Ward", "East", 10000, False, 28.6350, 77.2100),
            (9, "Tagore Nagar", "South", 7500, True, 28.6412, 77.2500),
            (10, "Bose Marg", "West", 13000, False, 28.6050, 77.2150),
            (11, "Sarojini Colony", "Central", 16000, False, 28.6550, 77.2200),
            (12, "Vivekananda Ward", "North", 9000, True, 28.6180, 77.2350),
            (13, "Indira Nagar", "East", 11500, False, 28.6320, 77.2050),
            (14, "Azad Colony", "South", 10500, False, 28.6470, 77.2420),
            (15, "Bhagat Singh Ward", "West", 8500, True, 28.6250, 77.2280),
        ]
        existing = db.query(Ward).count()
        if existing == 0:
            for wn, name, area, pop, vuln, lat, lng in wards_data:
                db.add(Ward(
                    ward_number=wn, ward_name=name, area_name=area,
                    population=pop, is_vulnerable=vuln,
                    latitude=lat, longitude=lng,
                ))
            db.flush()
            print(f"  ✅ Seeded {len(wards_data)} wards")

        # ── 2. CATEGORIES (8) ───────────────────────────
        categories_data = [
            ("Water Supply", 85, "Water Department"),
            ("Road/Pothole", 60, "Roads Department"),
            ("Electricity", 75, "Electricity Department"),
            ("Drainage", 80, "Drainage Department"),
            ("Garbage", 65, "Sanitation Department"),
            ("Health", 90, "Health Department"),
            ("Public Safety", 95, "Safety Department"),
            ("Other", 40, "General Administration"),
        ]
        existing = db.query(Category).count()
        if existing == 0:
            for name, score, dept in categories_data:
                db.add(Category(name=name, base_urgency_score=score, department=dept))
            db.flush()
            print(f"  ✅ Seeded {len(categories_data)} categories")

        # ── 3. USERS (Ward leaders + specialist workers) ───────────────
        pw = hash_password("password123")
        users_data = []

        # One dedicated leader for each ward (Indian names).
        leader_names = [
            "Sunita Sharma",
            "Rakesh Verma",
            "Anita Yadav",
            "Vikram Singh",
            "Pooja Gupta",
            "Rajesh Kumar",
            "Meena Joshi",
            "Amit Tiwari",
            "Kavita Mishra",
            "Sanjay Chauhan",
            "Neha Patel",
            "Deepak Sharma",
            "Lata Srivastava",
            "Rohit Agarwal",
            "Priyanka Dubey",
        ]
        for ward_number in range(1, 16):
            users_data.append(
                (
                    leader_names[ward_number - 1],
                    f"leader.w{ward_number:02d}@jansewa.gov",
                    "LEADER",
                    "Administration",
                    ward_number,
                    None,
                )
            )

        # Specialist workers per ward per complaint category.
        worker_specializations = [
            ("water", "Water Department", "Water Specialist"),
            ("road", "Roads Department", "Road Specialist"),
            ("electricity", "Electricity Department", "Electricity Specialist"),
            ("drainage", "Drainage Department", "Drainage Specialist"),
            ("garbage", "Sanitation Department", "Sanitation Specialist"),
            ("health", "Health Department", "Health Specialist"),
            ("safety", "Safety Department", "Safety Specialist"),
        ]

        worker_first_names = [
            "Arjun", "Ravi", "Suresh", "Mahesh", "Kiran", "Nitin", "Pradeep", "Vivek", "Aakash", "Manoj",
            "Alok", "Dinesh", "Gaurav", "Harish", "Jitendra", "Lokesh", "Naresh", "Omkar", "Pankaj", "Rahul",
        ]
        worker_last_names = [
            "Kumar", "Sharma", "Verma", "Yadav", "Tiwari", "Patel", "Singh", "Mishra", "Gupta", "Chauhan",
            "Pandey", "Saxena", "Agarwal", "Tripathi", "Dubey", "Srivastava", "Rawat", "Joshi", "Maurya", "Thakur",
        ]

        for ward_number in range(1, 16):
            for spec_index, (slug, department, title) in enumerate(worker_specializations):
                first = worker_first_names[(ward_number + spec_index * 2) % len(worker_first_names)]
                last = worker_last_names[(ward_number * 3 + spec_index) % len(worker_last_names)]
                users_data.append(
                    (
                        f"{first} {last}",
                        f"w{ward_number:02d}.{slug}@jansewa.gov",
                        "WORKER",
                        department,
                        ward_number,
                        None,
                    )
                )

        # Cross-ward operations users.
        users_data.extend([
            ("Sunny Kumar", "sunny.worker@jansewa.gov", "WORKER", "Roads Department", 1, None),
            ("Water Department Head", "dh.water@jansewa.gov", "DEPARTMENT_HEAD", "Water Department", None, None),
            ("Roads Department Head", "dh.roads@jansewa.gov", "DEPARTMENT_HEAD", "Roads Department", None, None),
            ("Health Department Head", "dh.health@jansewa.gov", "DEPARTMENT_HEAD", "Health Department", None, None),
            ("Public Works Officer", "officer.publicworks@jansewa.gov", "OFFICER", "Public Works", None, None),
            ("Roads Engineer", "engineer.roads@jansewa.gov", "ENGINEER", "Roads Department", None, None),
            ("Admin User", "admin@jansewa.gov", "ADMIN", "IT", None, None),
        ])

        # Citizen login users for ward-wise demo/testing.
        citizen_demo_users = [
            ("Aarav Mehta", "citizen.w01@jansewa.gov", "+919800000001", 1),
            ("Isha Verma", "citizen.w02@jansewa.gov", "+919800000002", 2),
            ("Rohan Singh", "citizen.w03@jansewa.gov", "+919800000003", 3),
            ("Kriti Sharma", "citizen.w04@jansewa.gov", "+919800000004", 4),
            ("Aditya Yadav", "citizen.w05@jansewa.gov", "+919800000005", 5),
            ("Sneha Gupta", "citizen.w06@jansewa.gov", "+919800000006", 6),
            ("Nikhil Tiwari", "citizen.w07@jansewa.gov", "+919800000007", 7),
            ("Pallavi Patel", "citizen.w08@jansewa.gov", "+919800000008", 8),
            ("Yash Chauhan", "citizen.w09@jansewa.gov", "+919800000009", 9),
            ("Ritika Joshi", "citizen.w10@jansewa.gov", "+919800000010", 10),
            ("Harsh Agarwal", "citizen.w11@jansewa.gov", "+919800000011", 11),
            ("Neha Dubey", "citizen.w12@jansewa.gov", "+919800000012", 12),
            ("Karan Srivastava", "citizen.w13@jansewa.gov", "+919800000013", 13),
            ("Ananya Mishra", "citizen.w14@jansewa.gov", "+919800000014", 14),
            ("Devansh Kumar", "citizen.w15@jansewa.gov", "+919800000015", 15),
        ]
        for name, email, phone, ward_number in citizen_demo_users:
            users_data.append(
                (
                    name,
                    email,
                    "CITIZEN",
                    None,
                    ward_number,
                    phone,
                )
            )
        ward_id_by_number = {
            w.ward_number: w.id
            for w in db.query(Ward).all()
        }
        existing_users_by_email = {
            u.email: u
            for u in db.query(User).all()
            if u.email
        }
        seeded_users = 0
        updated_users = 0
        for name, email, role, dept, wid, phone in users_data:
            existing_user = existing_users_by_email.get(email)
            resolved_ward_id = ward_id_by_number.get(wid) if wid is not None else None

            if existing_user:
                changed = False
                if existing_user.name != name:
                    existing_user.name = name
                    changed = True
                if existing_user.role != role:
                    existing_user.role = role
                    changed = True
                if existing_user.department != dept:
                    existing_user.department = dept
                    changed = True
                if existing_user.ward_id != resolved_ward_id:
                    existing_user.ward_id = resolved_ward_id
                    changed = True
                if phone is not None and existing_user.phone != phone:
                    existing_user.phone = phone
                    changed = True
                if changed:
                    updated_users += 1
                continue

            db.add(User(
                name=name,
                email=email,
                role=role,
                department=dept,
                ward_id=resolved_ward_id,
                password_hash=pw,
                phone=phone or f"+9198{random.randint(10000000,99999999)}",
            ))
            seeded_users += 1

        if seeded_users:
            db.flush()
            print(f"  ✅ Seeded {seeded_users} demo users")
        if updated_users:
            db.flush()
            print(f"  ✅ Updated {updated_users} demo users")

        # ── 4. CITIZENS (20) ────────────────────────────
        citizen_names = [
            "Ramesh Verma", "Sita Kumari", "Mohan Lal", "Geeta Devi",
            "Suresh Yadav", "Kavita Sharma", "Dinesh Gupta", "Anita Patel",
            "Manoj Tiwari", "Pooja Singh", "Rahul Kumar", "Neha Joshi",
            "Vijay Chauhan", "Lata Mishra", "Anil Saxena", "Rekha Agarwal",
            "Deepak Pandey", "Sunita Rani", "Ashok Dubey", "Kamla Devi",
        ]
        existing = db.query(Citizen).count()
        if existing == 0:
            ward_ids = [w.id for w in db.query(Ward).all()]
            for name in citizen_names:
                db.add(Citizen(
                    name=name,
                    phone=f"+9199{random.randint(10000000,99999999)}",
                    ward_id=random.choice(ward_ids) if ward_ids else None,
                    is_anonymous=random.random() < 0.15,
                ))
            db.flush()
            print(f"  ✅ Seeded {len(citizen_names)} citizens")

        # ── 5. COMPLAINTS (50) ──────────────────────────
        complaint_texts = [
            ("Hamare mohalle mein 3 din se paani nahi aa raha hai.", "hindi", "Water Supply", 85),
            ("There is a huge pothole on MG Road near ward 5 intersection.", "english", "Road/Pothole", 55),
            ("Bijli 2 din se gayi hui hai, bacche padh nahi pa rahe.", "hindi", "Electricity", 70),
            ("Open drain overflowing in Rajendra Nagar, causing health hazard.", "english", "Drainage", 78),
            ("Garbage has not been collected for 5 days in our colony.", "english", "Garbage", 60),
            ("Dengue cases increasing due to stagnant water in Ward 7.", "english", "Health", 92),
            ("Street lights not working for past week, unsafe for women.", "english", "Public Safety", 88),
            ("Paani mein badbu aa rahi hai, peene layak nahi hai.", "hindi", "Water Supply", 90),
            ("Road construction debris blocking the main entrance of ward.", "english", "Road/Pothole", 45),
            ("Power fluctuation damaging electronic appliances daily.", "english", "Electricity", 65),
            ("Sewage water entering homes during rain in Ambedkar Nagar.", "english", "Drainage", 95),
            ("Kachra gaadi 1 hafte se nahi aayi.", "hindi", "Garbage", 55),
            ("Medical camp needed in slum area, many children are sick.", "english", "Health", 85),
            ("Broken wall near school playground is dangerous for children.", "english", "Public Safety", 82),
            ("Water tank leaking for months, huge wastage of water.", "english", "Water Supply", 72),
            ("Potholes causing accidents near hospital intersection.", "english", "Road/Pothole", 80),
            ("No electricity transformer replacement for 3 weeks.", "english", "Electricity", 78),
            ("Naali band ho gayi hai, ganda paani sadak par aa raha hai.", "hindi", "Drainage", 83),
            ("Dead animal carcass rotting on roadside near market.", "english", "Garbage", 75),
            ("Hospital beds not available in government hospital Ward 9.", "english", "Health", 88),
            ("CCTV cameras in park not working since 2 months.", "english", "Public Safety", 50),
            ("Bore well hand pump broken, no alternative water source.", "english", "Water Supply", 92),
            ("Speed breaker needed near school zone in Ward 4.", "english", "Road/Pothole", 40),
            ("Transformer blast risk — exposed wires near children's park.", "english", "Electricity", 95),
            ("Manhole cover missing on main road in Gandhi Colony.", "english", "Drainage", 90),
            ("Ward 3 slum area has no toilet facilities nearby.", "english", "Health", 87),
            ("Stray dog menace in Laxmi Puri, children attacked twice.", "english", "Public Safety", 84),
            ("Municipality water comes only for 30 mins per day.", "english", "Water Supply", 68),
            ("Footpath completely destroyed, pedestrians walking on road.", "english", "Road/Pothole", 52),
            ("Street light timer broken, lights on during day wasting power.", "english", "Electricity", 35),
            ("Rain water logging in entire ward, no drainage outlet.", "english", "Drainage", 89),
            ("Dustbins overflowing at bus stop, very unhygienic.", "english", "Garbage", 58),
            ("Vaccination center closed without notice in Ward 11.", "english", "Health", 80),
            ("Abandoned building used for illegal activities near school.", "english", "Public Safety", 91),
            ("Contaminated water supply causing diarrhea in colony.", "english", "Water Supply", 96),
            ("Major cracks on bridge connecting Ward 2 and Ward 3.", "english", "Road/Pothole", 93),
            ("Load shedding 8 hours daily despite paying bills on time.", "english", "Electricity", 72),
            ("Drainage pipe burst flooding colony with sewage water.", "english", "Drainage", 94),
            ("E-waste dumped openly near residential area.", "english", "Garbage", 62),
            ("Ambulance service not responding in emergency calls.", "english", "Health", 97),
            ("No police patrol in late night hours in outer wards.", "english", "Public Safety", 76),
            ("Tanker water not reaching scheduled areas on time.", "english", "Water Supply", 65),
            ("Road divider missing causing wrong-side driving accidents.", "english", "Road/Pothole", 74),
            ("Electricity meter showing wrong readings, overbilling.", "english", "Electricity", 48),
            ("Storm drain blocked with plastic waste before monsoon.", "english", "Drainage", 86),
            ("Community toilet maintenance very poor in Ward 6.", "english", "Garbage", 70),
            ("Primary health center lacks basic medicines.", "english", "Health", 82),
            ("Unauthorized construction blocking fire exit in market.", "english", "Public Safety", 85),
            ("Hamare ward mein ek mahine se paani ka tanker nahi aaya.", "hindi", "Water Supply", 78),
            ("Sadak itni kharab hai ki ambulance bhi nahi aa sakti.", "hindi", "Road/Pothole", 88),
        ]

        statuses = ["OPEN", "OPEN", "OPEN", "ASSIGNED", "IN_PROGRESS",
                     "VERIFICATION_PENDING", "VERIFIED", "CLOSED"]
        priorities = ["CRITICAL", "HIGH", "HIGH", "MEDIUM", "MEDIUM", "LOW"]

        existing = db.query(Complaint).count()
        if existing == 0:
            citizens = db.query(Citizen).all()
            users = db.query(User).filter(User.role == "WORKER").all()
            wards = db.query(Ward).all()
            ward_ids = [w.id for w in wards]
            categories = db.query(Category).all()
            cat_map = {c.name: c.id for c in categories}
            other_category_id = cat_map.get("Other")

            for i, (text, lang, cat_name, score) in enumerate(complaint_texts):
                citizen = random.choice(citizens)
                ward_id = random.choice(ward_ids) if ward_ids else None
                status = random.choice(statuses)
                input_type = random.choice(["text", "text", "text", "voice", "image"])
                raw_image_url = PROBLEM_IMAGE_URLS[i % len(PROBLEM_IMAGE_URLS)] if input_type == "image" else None
                created = datetime.utcnow() - timedelta(
                    days=random.randint(0, 30),
                    hours=random.randint(0, 23),
                )

                priority_level = (
                    "CRITICAL" if score >= 80 else
                    "HIGH" if score >= 60 else
                    "MEDIUM" if score >= 40 else "LOW"
                )

                assignee_id = random.choice(users).id if users and status != "OPEN" else None

                c = Complaint(
                    citizen_id=citizen.id,
                    category_id=cat_map.get(cat_name, other_category_id),
                    ward_id=ward_id,
                    raw_text=text,
                    input_type=input_type,
                    raw_image_url=raw_image_url,
                    source_language=lang,
                    ai_summary=text[:120],
                    ai_location=f"Ward {ward_id} area" if ward_id is not None else "Ward area",
                    ai_duration_days=random.choice([1, 2, 3, 5, 7, 14, 30, None]),
                    ai_category_confidence=round(random.uniform(0.75, 0.98), 2),
                    urgency_score=min(100, score + random.randint(-5, 5)),
                    impact_score=random.randint(20, 95),
                    recurrence_score=random.randint(0, 60),
                    sentiment_score=random.randint(30, 90),
                    vulnerability_score=random.choice([30, 30, 30, 90]),
                    final_priority_score=score,
                    priority_level=priority_level,
                    status=status,
                    assigned_to=assignee_id,
                    assigned_at=created + timedelta(hours=1) if assignee_id else None,
                    resolved_at=(
                        created + timedelta(days=random.randint(1, 5))
                        if status in ("VERIFIED", "CLOSED") else None
                    ),
                    verified_at=(
                        created + timedelta(days=random.randint(1, 5))
                        if status == "VERIFIED" else None
                    ),
                    created_at=created,
                    updated_at=created,
                )
                db.add(c)

            db.flush()
            print(f"  ✅ Seeded {len(complaint_texts)} complaints")

        # ── 6. VERIFICATIONS (10) ───────────────────────
        existing = db.query(Verification).count()
        if existing == 0:
            resolved = (
                db.query(Complaint)
                .filter(Complaint.status.in_(["VERIFIED", "CLOSED"]))
                .limit(10)
                .all()
            )
            ver_statuses = ["VERIFIED"] * 7 + ["REJECTED"] * 2 + ["MANUAL_REVIEW"]
            for i, complaint in enumerate(resolved):
                vs = ver_statuses[i] if i < len(ver_statuses) else "VERIFIED"
                before_image = complaint.raw_image_url or PROBLEM_IMAGE_URLS[i % len(PROBLEM_IMAGE_URLS)]
                after_image = PROBLEM_IMAGE_URLS[(i + 1) % len(PROBLEM_IMAGE_URLS)]
                db.add(Verification(
                    complaint_id=complaint.id,
                    before_image_url=before_image,
                    before_latitude=28.6139 + random.uniform(-0.01, 0.01),
                    before_longitude=77.2090 + random.uniform(-0.01, 0.01),
                    before_timestamp=complaint.created_at,
                    after_image_url=after_image,
                    after_latitude=28.6139 + random.uniform(-0.001, 0.001),
                    after_longitude=77.2090 + random.uniform(-0.001, 0.001),
                    after_timestamp=complaint.created_at + timedelta(days=2),
                    location_match=vs != "REJECTED",
                    time_valid=True,
                    visual_change_detected=vs == "VERIFIED",
                    visual_change_confidence=round(random.uniform(0.7, 0.95), 2) if vs == "VERIFIED" else 0.3,
                    tamper_detected=vs == "REJECTED",
                    verification_status=vs,
                    overall_confidence=round(random.uniform(0.75, 1.0), 2) if vs == "VERIFIED" else 0.25,
                    ai_remarks=f"{'✅' if vs == 'VERIFIED' else '❌'} Verification {vs.lower()}",
                ))
            db.flush()
            print(f"  ✅ Seeded {len(resolved)} verifications")

        # ── 7. SOCIAL POSTS (30) ────────────────────────
        existing = db.query(SocialPost).count()
        if existing == 0:
            social_texts = [
                ("3 days no water in Shanti Nagar! Municipal corporation sleeping! #WaterCrisis", "ANGRY", -0.85, "Water Supply", 12, False),
                ("Great job by Ward 5 team — pothole fixed within 24 hours! 👏", "POSITIVE", 0.78, "Road/Pothole", 5, False),
                ("Councillor stole 50 crore from drainage project!! No work done! #Corruption", "ANGRY", -0.92, "Drainage", 8, True),
                ("Garbage not collected for a week. Terrible smell everywhere.", "NEGATIVE", -0.65, "Garbage", 3, False),
                ("New LED street lights installed in Ward 1. Feels safer now.", "POSITIVE", 0.82, "Electricity", 1, False),
                ("Dengue cases rising in Ward 7 due to open drains!", "ANGRY", -0.78, "Health", 7, False),
                ("Municipality claims 100% resolved — TOTAL LIES! #FakeStats", "ANGRY", -0.88, "Other", None, True),
                ("Thank you Ward 10 councillor for quick pipeline repair.", "POSITIVE", 0.71, "Water Supply", 10, False),
                ("When will the broken road in ward 4 be fixed?", "NEGATIVE", -0.45, "Road/Pothole", 4, False),
                ("Power cuts every day for 6 hours. Enough is enough!", "ANGRY", -0.80, "Electricity", 9, False),
                ("Community park renovated beautifully in Ward 13!", "POSITIVE", 0.85, "Other", 13, False),
                ("Stray dogs attacking children. No action by municipality!", "ANGRY", -0.75, "Public Safety", 6, False),
                ("The new complaint portal is actually working. Impressed!", "POSITIVE", 0.72, "Other", None, False),
                ("Drainage overflow destroying houses. EMERGENCY!", "ANGRY", -0.95, "Drainage", 3, False),
                ("Health camp in Ward 11 was very helpful. Thanking the team.", "POSITIVE", 0.80, "Health", 11, False),
                ("Fake news: All ward funds diverted to personal accounts", "ANGRY", -0.90, "Other", None, True),
                ("Road marking and signals updated in Ward 2. Good work!", "POSITIVE", 0.75, "Road/Pothole", 2, False),
                ("No ambulance for 2 hours when my father had a heart attack!", "ANGRY", -0.93, "Health", 14, False),
                ("Ward 15 — garbage bins finally replaced after months!", "POSITIVE", 0.68, "Garbage", 15, False),
                ("Illegal construction going on despite complaints. Who is protecting them?", "NEGATIVE", -0.70, "Public Safety", 8, False),
                ("Water tanker mafia controlling supply. Administration is hand in glove!", "ANGRY", -0.87, "Water Supply", 6, True),
                ("Schools getting regular water supply now. Children happy!", "POSITIVE", 0.83, "Water Supply", 1, False),
                ("Pothole caused bike accident. When will they learn?", "NEGATIVE", -0.60, "Road/Pothole", 7, False),
                ("Electricity department resolved my complaint in 4 hours!", "POSITIVE", 0.77, "Electricity", 10, False),
                ("Sewage flowing on the main road. Disgusting!", "ANGRY", -0.82, "Drainage", 12, False),
                ("Ward 5 cleanest ward this month! 🏆", "POSITIVE", 0.90, "Garbage", 5, False),
                ("Fake photo used to show road repair. Same old road!", "ANGRY", -0.85, "Road/Pothole", 4, True),
                ("Free health checkup camp in Ward 9. Very useful.", "POSITIVE", 0.79, "Health", 9, False),
                ("Street lights on during daytime wasting electricity.", "NEGATIVE", -0.40, "Electricity", 3, False),
                ("New CCTV cameras installed at 10 locations. Feeling secure.", "POSITIVE", 0.76, "Public Safety", 2, False),
            ]

            for text, sent, score, cat, ward, misinfo in social_texts:
                db.add(SocialPost(
                    platform="twitter",
                    post_url=f"https://twitter.com/i/status/{random.randint(10**17, 10**18)}",
                    post_text=text,
                    author_handle=f"@citizen_{random.randint(100,9999)}",
                    sentiment=sent,
                    sentiment_score=score,
                    extracted_category=cat,
                    extracted_ward=ward,
                    is_complaint=sent in ("ANGRY", "NEGATIVE"),
                    is_misinformation=misinfo,
                    misinfo_confidence=0.87 if misinfo else 0.0,
                    misinfo_explanation="Unverified claim — no evidence found in public records" if misinfo else None,
                    likes=random.randint(5, 800),
                    shares=random.randint(1, 300),
                    replies=random.randint(0, 80),
                    virality_score=random.randint(60, 95) if misinfo else random.randint(10, 75),
                    created_at=datetime.utcnow() - timedelta(
                        days=random.randint(0, 29),
                        hours=random.randint(0, 23),
                    ),
                ))
            db.flush()
            print(f"  ✅ Seeded {len(social_texts)} social posts")

        # ── 8. TRUST SCORES (15 wards × 7 days) ────────
        existing = db.query(TrustScore).count()
        if existing == 0:
            for ward in db.query(Ward).all():
                ward_id = ward.id
                base_trust = random.uniform(45, 92)
                for day_offset in range(7):
                    d = date.today() - timedelta(days=day_offset)
                    jitter = random.uniform(-3, 3)
                    db.add(TrustScore(
                        ward_id=ward_id,
                        date=d,
                        resolution_rate=round(random.uniform(40, 95), 2),
                        avg_response_hours=round(random.uniform(6, 72), 2),
                        public_sentiment=round(random.uniform(-0.5, 0.8), 3),
                        transparency_score=round(random.uniform(30, 90), 2),
                        communication_score=round(random.uniform(20, 80), 2),
                        final_trust_score=round(max(0, min(100, base_trust + jitter)), 2),
                    ))
            db.flush()
            print(f"  ✅ Seeded trust scores (15 wards × 7 days)")

        # ── 9. COMMUNICATIONS (10) ──────────────────────
        existing = db.query(Communication).count()
        if existing == 0:
            complaints_sample = db.query(Complaint).limit(10).all()
            comm_types = [
                "ACKNOWLEDGMENT", "ACKNOWLEDGMENT", "ACKNOWLEDGMENT",
                "PROGRESS", "PROGRESS", "PROGRESS",
                "COMPLETION", "COMPLETION",
                "CRISIS_RESPONSE",
                "WEEKLY_DIGEST",
            ]
            for i, ct in enumerate(comm_types):
                cid = complaints_sample[i].id if i < len(complaints_sample) else None
                db.add(Communication(
                    complaint_id=cid,
                    comm_type=ct,
                    content_english=f"[{ct}] Your complaint has been noted and appropriate action is being taken.",
                    content_hindi=f"[{ct}] आपकी शिकायत दर्ज कर ली गई है और उचित कार्रवाई की जा रही है।",
                    format=random.choice(["whatsapp", "social_media", "official_notice"]),
                    status=random.choice(["DRAFT", "APPROVED", "PUBLISHED"]),
                ))
            db.flush()
            print(f"  ✅ Seeded {len(comm_types)} communications")

        db.commit()
        print("\n🎉 Seed data complete!\n")


if __name__ == "__main__":
    print("\n🌱 Seeding Jansewa AI database...\n")
    seed()
