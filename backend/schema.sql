-- ============================================================
-- Jansewa AI — Complete Database Schema
-- Target: PostgreSQL 15+
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── WARDS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wards (
    id SERIAL PRIMARY KEY,
    ward_number INTEGER UNIQUE NOT NULL,
    ward_name VARCHAR(255) NOT NULL,
    area_name VARCHAR(255),
    population INTEGER,
    is_vulnerable BOOLEAN DEFAULT false,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8)
);

-- ── CATEGORIES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    base_urgency_score INTEGER NOT NULL,
    department VARCHAR(255)
);

-- ── USERS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(15),
    role VARCHAR(20) NOT NULL,
    department VARCHAR(255),
    ward_id INTEGER REFERENCES wards(id),
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ── CITIZENS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS citizens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    phone VARCHAR(15) UNIQUE,
    ward_id INTEGER REFERENCES wards(id),
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ── COMPLAINTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id UUID REFERENCES citizens(id),
    category_id INTEGER REFERENCES categories(id),
    ward_id INTEGER REFERENCES wards(id),

    raw_text TEXT,
    raw_audio_url VARCHAR(500),
    raw_image_url VARCHAR(500),
    input_type VARCHAR(20) NOT NULL,
    source_language VARCHAR(20),

    ai_summary TEXT,
    ai_location TEXT,
    ai_latitude DECIMAL(10,8),
    ai_longitude DECIMAL(11,8),
    ai_duration_days INTEGER,
    ai_category_confidence DECIMAL(3,2),

    urgency_score INTEGER,
    impact_score INTEGER,
    recurrence_score INTEGER,
    sentiment_score INTEGER,
    vulnerability_score INTEGER,
    final_priority_score INTEGER,
    priority_level VARCHAR(20),

    status VARCHAR(30) DEFAULT 'OPEN',
    assigned_to UUID REFERENCES users(id),
    assigned_at TIMESTAMP,
    resolved_at TIMESTAMP,
    verified_at TIMESTAMP,

    is_duplicate BOOLEAN DEFAULT false,
    duplicate_of UUID REFERENCES complaints(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ── VERIFICATIONS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID REFERENCES complaints(id),
    before_image_url VARCHAR(500),
    before_latitude DECIMAL(10,8),
    before_longitude DECIMAL(11,8),
    before_timestamp TIMESTAMP,
    after_image_url VARCHAR(500),
    after_latitude DECIMAL(10,8),
    after_longitude DECIMAL(11,8),
    after_timestamp TIMESTAMP,
    location_match BOOLEAN,
    time_valid BOOLEAN,
    visual_change_detected BOOLEAN,
    visual_change_confidence DECIMAL(3,2),
    tamper_detected BOOLEAN,
    verification_status VARCHAR(20),
    overall_confidence DECIMAL(3,2),
    ai_remarks TEXT,
    verified_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ── SOCIAL POSTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(20) NOT NULL,
    post_url VARCHAR(500),
    post_text TEXT,
    author_handle VARCHAR(255),
    sentiment VARCHAR(20),
    sentiment_score DECIMAL(4,3),
    extracted_category VARCHAR(100),
    extracted_ward INTEGER,
    is_complaint BOOLEAN,
    is_misinformation BOOLEAN DEFAULT false,
    misinfo_confidence DECIMAL(3,2),
    misinfo_explanation TEXT,
    likes INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    replies INTEGER DEFAULT 0,
    virality_score INTEGER,
    linked_complaint_id UUID REFERENCES complaints(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ── COMMUNICATIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID REFERENCES complaints(id),
    comm_type VARCHAR(30),
    content_english TEXT,
    content_hindi TEXT,
    format VARCHAR(20),
    status VARCHAR(20) DEFAULT 'DRAFT',
    approved_by UUID REFERENCES users(id),
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ── TRUST SCORES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trust_scores (
    id SERIAL PRIMARY KEY,
    ward_id INTEGER REFERENCES wards(id),
    date DATE NOT NULL,
    resolution_rate DECIMAL(5,2),
    avg_response_hours DECIMAL(8,2),
    public_sentiment DECIMAL(4,3),
    transparency_score DECIMAL(5,2),
    communication_score DECIMAL(5,2),
    final_trust_score DECIMAL(5,2),
    UNIQUE(ward_id, date)
);

-- ── AUDIT LOGS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50),
    entity_id UUID,
    action VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMP DEFAULT NOW()
);

-- ── NOTIFICATION READ STATE ───────────────────────────
CREATE TABLE IF NOT EXISTS notification_states (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    last_seen_at TIMESTAMP DEFAULT NOW()
);

-- ── INDEXES ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_complaints_ward ON complaints(ward_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(final_priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_sentiment ON social_posts(sentiment);
CREATE INDEX IF NOT EXISTS idx_trust_scores_ward_date ON trust_scores(ward_id, date DESC);
