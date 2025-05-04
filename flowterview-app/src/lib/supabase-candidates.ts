import { supabase } from "./supabase";

// Utility: Upload resume to Supabase Storage
export async function uploadResume(file: File, candidateName: string): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  // Upload directly to the root of the bucket (no subfolder!)
  const filePath = `${candidateName.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.${fileExt}`;
  const { error } = await supabase.storage.from("resumes").upload(filePath, file);
  if (error) {
    console.error("Error uploading file:", error);
    return null;
  }
  // Generate a signed URL valid for 1 year (365 days)
  const secondsInYear = 60 * 60 * 24 * 365;
  const { data: signedData, error: signedError } = await supabase.storage.from("resumes").createSignedUrl(filePath, secondsInYear);
  if (signedError) {
    console.error("Error creating signed URL:", signedError);
    return null;
  }
  return signedData?.signedUrl || null;
}

// API: Add a candidate
/**
 * Get the organization_id for the currently logged-in user.
 * Fetches the email from the Supabase Auth session directly.
 * @returns The organization_id or null if not found or not logged in.
 */
export async function getOrganizationIdForCurrentUser(): Promise<string | null> {
  // Import the Supabase Auth client
  // (Assumes you have a supabase client instance with auth enabled)
  const user = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : null;
  const email = user?.email?.trim();
  if (!email) {
    console.error("No logged-in user found when fetching organization_id");
    return null;
  }
  console.log("Looking up organization for current logged-in user email:", email);
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("email", email)
    .single();
  if (error || !data) {
    console.error("Error fetching organization_id from organizations:", error, "Data:", data);
    return null;
  }
  console.log("Found organization_id:", data.id);
  return data.id;
}

// Utility: Get job_id from jobs table using title and organization_id
export async function getJobIdByTitle(title: string, organization_id: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("jobs")
    .select("id")
    .eq("title", title)
    .eq("organization_id", organization_id)
    .single();
  if (error) {
    console.error("Error fetching job_id:", error);
    return null;
  }
  
  return data?.id || null;
}

/**
 * Add a candidate to the database. Uses the current logged-in user to look up the organization.
 * @param name - Candidate's name
 * @param email - Candidate's email
 * @param jobTitle - The job title to look up job_id
 * @param resumeFile - Optional resume file to upload
 */
export type CandidateStatus =
  | "Applied"
  | "Screening"
  | "Interview_Scheduled"
  | "Interviewed"
  | "Hired"
  | "On_Hold"
  | "Rejected";

export async function addCandidate({ name, email, jobTitle, resumeFile, status = "Applied" }: { name: string; email: string; jobTitle: string; resumeFile?: File; status?: CandidateStatus }) {
  // 1. Get organization_id for current user
  const organization_id = await getOrganizationIdForCurrentUser();
  if (!organization_id) throw new Error("Could not determine organization_id for current user.");

  // 2. Get job_id
  const job_id = await getJobIdByTitle(jobTitle, organization_id);
  if (!job_id) throw new Error("Could not determine job_id for selected job title.");

  // 3. Upload resume (optional)
  let resume_url = null;
  if (resumeFile) {
    resume_url = await uploadResume(resumeFile, name);
  } else {
    // No resume file provided; resume_url remains null
  }

  // 4. Insert candidate (resume_url will be null if no file was uploaded)
  const { data, error } = await supabase.from("candidates").insert([
    { name, email, job_id, organization_id, resume_url, status }
  ]);
  if (error) throw error;
  return data;
}


// API: Fetch all jobs (for job role dropdown)
export async function fetchJobs() {
  const { data, error } = await supabase.from("jobs").select("id, title").order("title");
  if (error) throw error;
  return data;
}

// API: Fetch candidates sorted/grouped by job
export async function fetchCandidatesSortedByJob() {
  const { data, error } = await supabase
    .from("candidates")
    .select("*, jobs(title)")
    .order("job_id")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
