// Store types for state management
export interface User {
  id: string;
  email: string;
  organization_id: string;
  role: "admin" | "interviewer" | "candidate";
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  title: string;
  description?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  email: string;
  name: string;
  organization_id: string;
  job_id: string;
  status: CandidateStatus;
  resume_url?: string;
  created_at: string;
  updated_at: string;
  jobs?: Job; // Populated when fetched with job data
  is_invited?: boolean;
  interview_status?: string;
  room_url?: string;
  bot_token?: string;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
}

export interface Interview {
  id: string;
  title: string;
  organization_id: string;
  created_by: string;
  status: "draft" | "active" | "completed";
  job_id: string;
  candidates: number;
  date: string;
  updated_at: string;
}

export type CandidateStatus =
  | "Applied"
  | "Screening"
  | "Interview_scheduled"
  | "Interviewed"
  | "Hired"
  | "On_hold"
  | "Rejected";

// Data loading states
export interface DataState<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  isStale: boolean;
}

// Cache configuration
export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  staleTime: number; // Time after which data is considered stale
}

// API response types
export interface CandidatesByJobResponse {
  [jobId: string]: Candidate[];
}

export interface InterviewDataResponse {
  job: Job;
  interview: Interview;
  candidates: {
    invited: Candidate[];
    available: Candidate[];
    total_job_candidates: number;
    invited_count: number;
    available_count: number;
  };
  skills: string[];
  duration: number;
}

// Pagination support
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Filter and search options
export interface CandidateFilters {
  searchTerm?: string;
  jobIds?: string[];
  statuses?: CandidateStatus[];
  organization_id?: string;
}

export interface InterviewFilters {
  searchTerm?: string;
  statuses?: Interview["status"][];
  organization_id?: string;
}
