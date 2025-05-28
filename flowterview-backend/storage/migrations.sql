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
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);

-- INTERVIEW FLOWS
CREATE TABLE IF NOT EXISTS interview_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    flow_json JSONB NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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
CREATE INDEX IF NOT EXISTS idx_jobs_org_id_optimized ON jobs(organization_id, id);
CREATE INDEX IF NOT EXISTS idx_jobs_flow_id ON jobs(flow_id);

-- INTERVIEWS (a batch of candidate invites linked to a job)
CREATE TABLE IF NOT EXISTS interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR NOT NULL DEFAULT 'open',  -- open, closed, in_progress
    candidates_invited UUID[] NOT NULL DEFAULT '{}',  -- array of candidate IDs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_interviews_job_id ON interviews(job_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
CREATE INDEX IF NOT EXISTS idx_interviews_created_by ON interviews(created_by);

-- CANDIDATES
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    name VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    phone VARCHAR,
    resume_url VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_candidates_org_id ON candidates(organization_id);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_job_id ON candidates(job_id);

-- CANDIDATE_INTERVIEWS (one record per candidate per interview batch)
CREATE TABLE IF NOT EXISTS candidate_interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    status VARCHAR NOT NULL DEFAULT 'scheduled',  -- scheduled, started, completed, no_show
    room_url VARCHAR,  -- Daily.co room URL for this candidate's interview
    bot_token VARCHAR,  -- Daily.co bot token for this candidate's interview
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

-- VERIFICATION_TOKENS (missing table from your schema)
CREATE TABLE IF NOT EXISTS verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    token VARCHAR NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_interview_id ON verification_tokens(interview_id);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_organization_id ON verification_tokens(organization_id);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires_at ON verification_tokens(expires_at);

-- Add columns to existing candidate_interviews table if they don't exist
ALTER TABLE candidate_interviews ADD COLUMN IF NOT EXISTS room_url VARCHAR;
ALTER TABLE candidate_interviews ADD COLUMN IF NOT EXISTS bot_token VARCHAR;

-- -- FEEDBACK (missing table from your schema)
-- CREATE TABLE IF NOT EXISTS feedback (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     candidate_interview_id UUID REFERENCES candidate_interviews(id) ON DELETE CASCADE,
--     interviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
--     rating INTEGER CHECK (rating >= 1 AND rating <= 5),
--     comments TEXT,
--     created_at TIMESTAMPTZ DEFAULT NOW(),
--     updated_at TIMESTAMPTZ DEFAULT NOW()
-- );
-- CREATE INDEX IF NOT EXISTS idx_feedback_candint_id ON feedback(candidate_interview_id);
-- CREATE INDEX IF NOT EXISTS idx_feedback_interviewer_id ON feedback(interviewer_id);

-- -- NOTIFICATIONS (missing table from your schema)
-- CREATE TABLE IF NOT EXISTS notifications (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
--     type VARCHAR NOT NULL,
--     title VARCHAR NOT NULL,
--     message TEXT,
--     read_at TIMESTAMPTZ,
--     created_at TIMESTAMPTZ DEFAULT NOW()
-- );
-- CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
-- CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
-- CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- -- INTEGRATIONS (missing table from your schema)
-- CREATE TABLE IF NOT EXISTS integrations (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
--     type VARCHAR NOT NULL,
--     config JSONB NOT NULL,
--     enabled BOOLEAN DEFAULT true,
--     created_at TIMESTAMPTZ DEFAULT NOW(),
--     updated_at TIMESTAMPTZ DEFAULT NOW()
-- );
-- CREATE INDEX IF NOT EXISTS idx_integrations_org_id ON integrations(organization_id);
-- CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);
-- CREATE INDEX IF NOT EXISTS idx_integrations_config ON integrations USING GIN(config);
