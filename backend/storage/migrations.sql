-- Create session_history table to store chat histories by session
CREATE TABLE IF NOT EXISTS session_history (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR NOT NULL,
    chat_history JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on session_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_session_history_session_id ON session_history(session_id);

-- Add a comment to the table
COMMENT ON TABLE session_history IS 'Stores chat history data for each session';

-- Create interview_analytics table to store analysis results
CREATE TABLE IF NOT EXISTS interview_analytics (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR NOT NULL,
    analysis JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on session_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_interview_analytics_session_id ON interview_analytics(session_id);

-- Add a comment to the table
COMMENT ON TABLE interview_analytics IS 'Stores interview analysis results';
