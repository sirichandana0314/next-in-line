-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP TABLE IF EXISTS application_status_log CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS job_openings CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- Companies
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Openings
CREATE TABLE job_openings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    active_capacity INTEGER NOT NULL CHECK (active_capacity > 0),
    decay_window_minutes INTEGER DEFAULT 1440,
    decay_penalty_divisor INTEGER DEFAULT 3,
    max_decays INTEGER DEFAULT 3,
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES job_openings(id) ON DELETE CASCADE,
    applicant_name VARCHAR(255) NOT NULL,
    applicant_email VARCHAR(255) NOT NULL,
    status VARCHAR(30) DEFAULT 'applied',
    waitlist_position INTEGER,
    promoted_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    decay_count INTEGER DEFAULT 0,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, applicant_email)
);

-- Audit Log
CREATE TABLE application_status_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    previous_status VARCHAR(30),
    new_status VARCHAR(30),
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);