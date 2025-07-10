import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Create a single Supabase client instance to be used throughout the app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export type Organization = {
  id: string;
  name: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  email: string;
  organization_id: string;
  role: "admin" | "recruiter" | "candidate";
  created_at: string;
  updated_at: string;
};

export type Interview = {
  id: string;
  title: string;
  organization_id: string;
  created_by: string;
  status: "draft" | "active" | "completed";
  created_at: string;
  updated_at: string;
};

export type Candidate = {
  id: string;
  email: string;
  name: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
};
