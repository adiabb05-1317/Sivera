-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ORGANIZATIONS (base)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- USERS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    email VARCHAR NOT NULL UNIQUE,
    name VARCHAR,
    role VARCHAR NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW(),
);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);

-- INTERVIEW FLOWS
CREATE TABLE IF NOT EXISTS interview_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    flow_json JSONB NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_flows_created_by ON interview_flows(created_by);
CREATE INDEX IF NOT EXISTS idx_flows_flow_json ON interview_flows USING GIN(flow_json);

-- JOBS
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    description TEXT NOT NULL,
    flow_id UUID REFERENCES interview_flows(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jobs_org_id ON jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_jobs_flow_id ON jobs(flow_id);

-- INTERVIEWS (a batch of candidate invites linked to a job)
CREATE TABLE IF NOT EXISTS interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    status VARCHAR NOT NULL DEFAULT 'open',  -- open, closed, in_progress
    candidates_invited UUID[] NOT NULL DEFAULT '{}',  -- array of candidate IDs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_interviews_job_id ON interviews(job_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);

-- CANDIDATES
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    phone VARCHAR,
    resume_url VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_candidates_org_id ON candidates(organization_id);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);

-- CANDIDATE_INTERVIEWS (one record per candidate per interview batch)
CREATE TABLE IF NOT EXISTS candidate_interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    status VARCHAR NOT NULL DEFAULT 'scheduled',  -- scheduled, started, completed, no_show
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(interview_id, candidate_id)
);
CREATE INDEX IF NOT EXISTS idx_candint_interview_id ON candidate_interviews(interview_id);
CREATE INDEX IF NOT EXISTS idx_candint_candidate_id ON candidate_interviews(candidate_id);

-- INTERVIEW_SESSIONS (legacy, can be deprecated or used for detailed session history)
CREATE TABLE IF NOT EXISTS interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_interview_id UUID REFERENCES candidate_interviews(id) ON DELETE CASCADE,
    session_history JSONB,
    analytics JSONB,
    status VARCHAR NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_candint_id ON interview_sessions(candidate_interview_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON interview_sessions(status);

-- INTERVIEW_ANALYTICS (linked to candidate_interview)
CREATE TABLE IF NOT EXISTS interview_analytics (
    id BIGSERIAL PRIMARY KEY,
    candidate_interview_id UUID NOT NULL REFERENCES candidate_interviews(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    data JSONB NOT NULL,  -- detailed performance and metrics
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analytics_candint_id ON interview_analytics(candidate_interview_id);
CREATE INDEX IF NOT EXISTS idx_analytics_job_id ON interview_analytics(job_id);
CREATE INDEX IF NOT EXISTS idx_analytics_interview_id ON interview_analytics(interview_id);
CREATE INDEX IF NOT EXISTS idx_analytics_candidate_id ON interview_analytics(candidate_id);
CREATE INDEX IF NOT EXISTS idx_analytics_data ON interview_analytics USING GIN(data);