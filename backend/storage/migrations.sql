-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.candidate_interviews (
  interview_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  room_url character varying NOT NULL UNIQUE,
  bot_token character varying NOT NULL UNIQUE,
  scheduled_at timestamp with time zone,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  status character varying NOT NULL DEFAULT 'scheduled'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT candidate_interviews_pkey PRIMARY KEY (id),
  CONSTRAINT candidate_interviews_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id),
  CONSTRAINT candidate_interviews_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id)
);
CREATE TABLE public.candidates (
  linkedin_profile text,
  additional_links jsonb,
  organization_id uuid NOT NULL,
  name character varying NOT NULL,
  email character varying NOT NULL,
  phone character varying,
  resume_url character varying,
  job_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'Applied'::text,
  CONSTRAINT candidates_pkey PRIMARY KEY (id),
  CONSTRAINT candidates_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id),
  CONSTRAINT candidates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.interview_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  candidate_interview_id uuid NOT NULL,
  data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT interview_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT interview_analytics_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT interview_analytics_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id),
  CONSTRAINT interview_analytics_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id),
  CONSTRAINT interview_analytics_candidate_interview_id_fkey FOREIGN KEY (candidate_interview_id) REFERENCES public.candidate_interviews(id)
);
CREATE TABLE public.interview_flows (
  name character varying NOT NULL,
  flow_json jsonb NOT NULL,
  created_by uuid,
  skills ARRAY,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  duration smallint DEFAULT 10,
  CONSTRAINT interview_flows_pkey PRIMARY KEY (id),
  CONSTRAINT interview_flows_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.interview_sessions (
  analytics uuid NOT NULL,
  candidate_interview_id uuid,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  session_history uuid,
  status text,
  CONSTRAINT interview_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT interview_sessions_candidate_interview_id_fkey FOREIGN KEY (candidate_interview_id) REFERENCES public.candidate_interviews(id),
  CONSTRAINT interview_sessions_session_history_fkey FOREIGN KEY (session_history) REFERENCES public.session_history(id),
  CONSTRAINT interview_sessions_analytics_fkey FOREIGN KEY (analytics) REFERENCES public.interview_analytics(id)
);
CREATE TABLE public.interviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  status character varying NOT NULL DEFAULT 'open'::character varying,
  job_id uuid NOT NULL,
  created_by uuid,
  candidates_invited ARRAY NOT NULL DEFAULT '{}'::uuid[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT interviews_pkey PRIMARY KEY (id),
  CONSTRAINT interviews_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT interviews_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id)
);
CREATE TABLE public.jobs (
  organization_id uuid NOT NULL,
  title character varying NOT NULL,
  description text NOT NULL,
  flow_id uuid,
  phone_screen_id uuid,
  process_stages jsonb NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT jobs_pkey PRIMARY KEY (id),
  CONSTRAINT jobs_flow_id_fkey FOREIGN KEY (flow_id) REFERENCES public.interview_flows(id),
  CONSTRAINT jobs_phone_screen_id_fkey FOREIGN KEY (phone_screen_id) REFERENCES public.phone_screen(id),
  CONSTRAINT jobs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.linkedin_integrations (
  organization_id uuid NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamp with time zone NOT NULL,
  scope text,
  linkedin_user_id text UNIQUE,
  linkedin_profile_data jsonb,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT linkedin_integrations_pkey PRIMARY KEY (id),
  CONSTRAINT linkedin_integrations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  domain text NOT NULL,
  logo_url text,
  name text DEFAULT ''::text,
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.phone_screen (
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  questions ARRAY NOT NULL DEFAULT '{}'::text[],
  CONSTRAINT phone_screen_pkey PRIMARY KEY (id)
);
CREATE TABLE public.phone_screen_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL,
  job_id uuid NOT NULL,
  phone_number character varying NOT NULL,
  scheduled_at timestamp with time zone,
  attempted_at timestamp with time zone,
  completed_at timestamp with time zone,
  failed_at timestamp with time zone,
  call_id character varying,
  status character varying NOT NULL DEFAULT 'scheduled'::character varying,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  session_id character varying,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT phone_screen_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT phone_screen_attempts_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id),
  CONSTRAINT phone_screen_attempts_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id)
);
CREATE TABLE public.session_history (
  chat_history jsonb NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  call_type character varying DEFAULT 'web_interview'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  call_id uuid,
  CONSTRAINT session_history_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role character varying NOT NULL DEFAULT 'admin'::character varying,
  organization_id uuid,
  email character varying NOT NULL UNIQUE,
  name character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.verification_tokens (
  token text NOT NULL UNIQUE,
  email text NOT NULL,
  name text NOT NULL,
  organization_id uuid NOT NULL,
  job_title text,
  interview_id uuid,
  expires_at timestamp with time zone NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT verification_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT verification_tokens_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id),
  CONSTRAINT verification_tokens_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);