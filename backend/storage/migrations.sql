-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.candidate_interviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  status character varying NOT NULL DEFAULT 'scheduled'::character varying,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  room_url character varying NOT NULL UNIQUE,
  bot_token character varying NOT NULL UNIQUE,
  scheduled_at timestamp with time zone,
  CONSTRAINT candidate_interviews_pkey PRIMARY KEY (id),
  CONSTRAINT candidate_interviews_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id),
  CONSTRAINT candidate_interviews_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id)
);
CREATE TABLE public.candidates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name character varying NOT NULL,
  email character varying NOT NULL,
  phone character varying,
  resume_url character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  job_id uuid NOT NULL,
  status text DEFAULT 'Applied'::text,
  linkedin_profile text,
  additional_links jsonb,
  CONSTRAINT candidates_pkey PRIMARY KEY (id),
  CONSTRAINT candidates_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id),
  CONSTRAINT candidates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.interview_analytics (
  candidate_interview_id uuid NOT NULL,
  data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  CONSTRAINT interview_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT interview_analytics_candidate_interview_id_fkey FOREIGN KEY (candidate_interview_id) REFERENCES public.candidate_interviews(id),
  CONSTRAINT interview_analytics_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT interview_analytics_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id),
  CONSTRAINT interview_analytics_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id)
);
CREATE TABLE public.interview_flows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  flow_json jsonb NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  skills ARRAY,
  duration smallint DEFAULT 10,
  CONSTRAINT interview_flows_pkey PRIMARY KEY (id),
  CONSTRAINT interview_flows_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.interview_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  candidate_interview_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  session_history uuid,
  status text,
  analytics uuid NOT NULL,
  CONSTRAINT interview_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT interview_sessions_session_history_fkey FOREIGN KEY (session_history) REFERENCES public.session_history(id),
  CONSTRAINT interview_sessions_candidate_interview_id_fkey FOREIGN KEY (candidate_interview_id) REFERENCES public.candidate_interviews(id),
  CONSTRAINT interview_sessions_analytics_fkey FOREIGN KEY (analytics) REFERENCES public.interview_analytics(id)
);
CREATE TABLE public.interviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  status character varying NOT NULL DEFAULT 'open'::character varying,
  candidates_invited ARRAY NOT NULL DEFAULT '{}'::uuid[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT interviews_pkey PRIMARY KEY (id),
  CONSTRAINT interviews_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id),
  CONSTRAINT interviews_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  title character varying NOT NULL,
  description text NOT NULL,
  flow_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  phone_screen_id uuid,
  process_stages jsonb NOT NULL,
  CONSTRAINT jobs_pkey PRIMARY KEY (id),
  CONSTRAINT jobs_phone_screen_id_fkey FOREIGN KEY (phone_screen_id) REFERENCES public.phone_screen(id),
  CONSTRAINT jobs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT jobs_flow_id_fkey FOREIGN KEY (flow_id) REFERENCES public.interview_flows(id)
);
CREATE TABLE public.linkedin_integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamp with time zone NOT NULL,
  scope text,
  linkedin_user_id text UNIQUE,
  linkedin_profile_data jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT linkedin_integrations_pkey PRIMARY KEY (id),
  CONSTRAINT linkedin_integrations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
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
CREATE TABLE public.session_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chat_history jsonb NOT NULL,
  call_type character varying DEFAULT 'web_interview'::character varying,
  call_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT session_history_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  email character varying NOT NULL UNIQUE,
  name character varying,
  role character varying NOT NULL DEFAULT 'admin'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.verification_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  email text NOT NULL,
  name text NOT NULL,
  organization_id uuid NOT NULL,
  job_title text,
  interview_id uuid,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT verification_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT verification_tokens_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT verification_tokens_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id)
);
