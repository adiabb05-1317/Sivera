-- Create verification_tokens table for email verification and registration
CREATE TABLE IF NOT EXISTS verification_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations (id),
    job_title TEXT,
    interview_id UUID REFERENCES interviews (id),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on token for faster lookups
CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_verification_tokens_email ON verification_tokens(email);
