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
 * @param jobId - The job ID to associate the candidate with
 * @param resumeFile - Optional resume file to upload
 */
export type CandidateStatus =
  | "Applied"
  | "Screening"
  | "Interview_scheduled"
  | "Interviewed"
  | "Hired"
  | "On_hold"
  | "Rejected";

export async function generateInterviewFlow(jobDescription: string): Promise<{ flow: any; react_flow: any } | { error: string }> {
  try {
    if (!jobDescription) {
      return { error: "Job description is required" };
    }

    if (jobDescription.length < 50) {
      return { error: "Job description should be at least 50 characters long" };
    }

    // Call your backend service
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_CORE_BACKEND_URL}/api/v1/generate_interview_flow`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_description: jobDescription,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || "Failed to generate interview flow" };
    }

    if (data.flow && data.react_flow) {
      // Validate the standard flow format
      if (
        !data.flow.initial_node ||
        !data.flow.nodes ||
        typeof data.flow.nodes !== "object"
      ) {
        return { error: "Invalid flow data received from backend" };
      }

      // Validate the React Flow format
      if (
        !Array.isArray(data.react_flow.nodes) ||
        !Array.isArray(data.react_flow.edges)
      ) {
        return { error: "Invalid React Flow data received from backend" };
      }
    }

    // Legacy format validation
    if (!data.flow.initial_node || !data.react_flow.nodes || typeof data.react_flow.nodes !== "object") {
      return { error: "Invalid flow data received from backend" };
    }

    return data;
  } catch (error) {
    console.error("Error generating flow:", error);
    return { error: "Internal server error" };
  }
}

export async function addCandidate({ name, email, jobId, resumeFile, status = "Applied", interviewId }: { name: string; email: string; jobId: string; resumeFile?: File; status?: CandidateStatus; interviewId: string }) {
  // 1. Get organization_id for current user
  const organization_id = await getOrganizationIdForCurrentUser();
  if (!organization_id) throw new Error("Could not determine organization_id for current user.");
  console.log("Organization ID:", organization_id);

  // 2. Use jobId directly
  if (!jobId) throw new Error("Could not determine job_id for selected job.");
  console.log("Job ID:", jobId);

  // 3. Upload resume (optional)
  let resume_url = null;
  if (resumeFile) {
    resume_url = await uploadResume(resumeFile, name);
  }

  // 4. Insert candidate (resume_url will be null if no file was uploaded)
  console.log("Candidate insert payload:", { name, email, job_id: jobId, organization_id, resume_url, status });
  const { data, error } = await supabase.from("candidates").insert([
    { name, email, job_id: jobId, organization_id, resume_url, status }
  ]).select();
  if (error) {
    console.error("Supabase insert error (full):", JSON.stringify(error, null, 2));
    console.log("Supabase insert response:", { data, error });
    throw error;
  }
  const candidate = data && data[0];
  if (!candidate) throw new Error("Candidate insert did not return a candidate record.");

  // 5. Append candidate_id to candidates_invited in the interviews table
  if (interviewId) {
    // Fetch current candidates_invited array
    const { data: interview, error: interviewError } = await supabase
      .from("interviews")
      .select("candidates_invited")
      .eq("id", interviewId)
      .single();
    if (interviewError) {
      console.error("Error fetching interview for candidates_invited update:", interviewError);
      throw interviewError;
    }
    const currentInvited = interview?.candidates_invited || [];
    // Only append if not already present
    const updatedInvited = currentInvited.includes(candidate.id) ? currentInvited : [...currentInvited, candidate.id];
    const { error: updateError } = await supabase
      .from("interviews")
      .update({ candidates_invited: updatedInvited })
      .eq("id", interviewId);
    if (updateError) {
      console.error("Error updating candidates_invited in interviews table:", updateError);
      throw updateError;
    }
  }
  console.log("Candidate added and interview updated:", candidate);
  return candidate;
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

// Utility: Fetch interview by ID to get job_id
export async function fetchInterviewById(interviewId: string): Promise<{ id: string; job_id: string } | null> {
  const { data, error } = await supabase
    .from("interviews")
    .select("id, job_id")
    .eq("id", interviewId)
    .single();
  if (error) {
    console.error("Error fetching interview by ID:", error);
    return null;
  }
  return data;
}
