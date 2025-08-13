-- Migration: Add Interview Recordings Table
-- Description: Creates table and indexes for storing interview screen recordings
-- Date: 2025-08-02

-- Create interview_recordings table
CREATE TABLE IF NOT EXISTS public.interview_recordings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL,
    candidate_id uuid NOT NULL,
    interview_id uuid,
    
    -- Interview type and round information
    interview_type character varying NOT NULL DEFAULT 'ai_interview'::character varying,
    round_number smallint,
    
    -- Link to specific interview sessions
    candidate_interview_id uuid,  -- For AI interviews
    candidate_interview_round_id uuid,  -- For human interview rounds
    round_token text,  -- For multi-participant rounds
    
    -- Recording file information
    filename character varying NOT NULL,
    file_size bigint NOT NULL,
    storage_type character varying NOT NULL DEFAULT 'local'::character varying,
    cloud_url text,
    object_key text,
    local_path text,
    metadata jsonb,
    
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT interview_recordings_pkey PRIMARY KEY (id),
    CONSTRAINT interview_recordings_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE,
    CONSTRAINT interview_recordings_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE,
    CONSTRAINT interview_recordings_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE,
    CONSTRAINT interview_recordings_candidate_interview_id_fkey FOREIGN KEY (candidate_interview_id) REFERENCES public.candidate_interviews(id) ON DELETE CASCADE,
    CONSTRAINT interview_recordings_candidate_interview_round_id_fkey FOREIGN KEY (candidate_interview_round_id) REFERENCES public.candidate_interview_round(id) ON DELETE CASCADE,
    CONSTRAINT interview_recordings_interview_type_check CHECK (interview_type IN ('ai_interview', 'human_interview'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_interview_recordings_job_id ON public.interview_recordings(job_id);
CREATE INDEX IF NOT EXISTS idx_interview_recordings_candidate_id ON public.interview_recordings(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interview_recordings_interview_id ON public.interview_recordings(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_recordings_interview_type ON public.interview_recordings(interview_type);
CREATE INDEX IF NOT EXISTS idx_interview_recordings_round_number ON public.interview_recordings(round_number);
CREATE INDEX IF NOT EXISTS idx_interview_recordings_candidate_interview_id ON public.interview_recordings(candidate_interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_recordings_round_token ON public.interview_recordings(round_token);
CREATE INDEX IF NOT EXISTS idx_interview_recordings_created_at ON public.interview_recordings(created_at);
CREATE INDEX IF NOT EXISTS idx_interview_recordings_storage_type ON public.interview_recordings(storage_type);

-- Add comments for documentation
COMMENT ON TABLE public.interview_recordings IS 'Stores metadata and links for interview screen recordings (AI and human interviews)';
COMMENT ON COLUMN public.interview_recordings.job_id IS 'Reference to the job for which the interview was conducted';
COMMENT ON COLUMN public.interview_recordings.candidate_id IS 'Reference to the candidate being interviewed';
COMMENT ON COLUMN public.interview_recordings.interview_id IS 'Reference to the main interview';
COMMENT ON COLUMN public.interview_recordings.interview_type IS 'Type of interview: ai_interview or human_interview';
COMMENT ON COLUMN public.interview_recordings.round_number IS 'Round number for human interviews (1, 2, 3, etc.)';
COMMENT ON COLUMN public.interview_recordings.candidate_interview_id IS 'Link to candidate_interviews table (for AI interviews)';
COMMENT ON COLUMN public.interview_recordings.candidate_interview_round_id IS 'Link to candidate_interview_round table (for human interview rounds)';
COMMENT ON COLUMN public.interview_recordings.round_token IS 'Token used for multi-participant round coordination';
COMMENT ON COLUMN public.interview_recordings.filename IS 'Original filename of the recording';
COMMENT ON COLUMN public.interview_recordings.file_size IS 'Size of the recording file in bytes';
COMMENT ON COLUMN public.interview_recordings.storage_type IS 'Type of storage: local, s3, or gcs';
COMMENT ON COLUMN public.interview_recordings.cloud_url IS 'Public URL if stored in cloud storage';
COMMENT ON COLUMN public.interview_recordings.object_key IS 'Object key/path in cloud storage bucket';
COMMENT ON COLUMN public.interview_recordings.local_path IS 'Local file path if stored locally';
COMMENT ON COLUMN public.interview_recordings.metadata IS 'Additional metadata about the recording (JSON)';