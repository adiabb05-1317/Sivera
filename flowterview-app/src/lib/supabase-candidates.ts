import { supabase } from "./supabase";
import { authenticatedFetch, getUserContext } from "./auth-client";

// Utility: Upload resume to Supabase Storage
export async function uploadResume(
  file: File,
  candidateName: string
): Promise<string | null> {
  const fileExt = file.name.split(".").pop();
  // Upload directly to the root of the bucket (no subfolder!)
  const filePath = `${candidateName
    .replace(/\s+/g, "_")
    .toLowerCase()}_${Date.now()}.${fileExt}`;
  const { error } = await supabase.storage
    .from("resumes")
    .upload(filePath, file);
  if (error) {
    console.error("Error uploading file:", error);
    return null;
  }
  // Generate a signed URL valid for 1 year (365 days)
  const secondsInYear = 60 * 60 * 24 * 365;
  const { data: signedData, error: signedError } = await supabase.storage
    .from("resumes")
    .createSignedUrl(filePath, secondsInYear);
  if (signedError) {
    console.error("Error creating signed URL:", signedError);
    return null;
  }
  return signedData?.signedUrl || null;
}

// Get the organization_id for the currently logged-in user (via cookies)
export async function getOrganizationIdForCurrentUser(): Promise<
  string | null
> {
  const userContext = getUserContext();
  if (!userContext?.organization_id) {
    console.error("No organization_id found in user context");
    return null;
  }
  return userContext.organization_id;
}

// Get job_id from jobs table using title and organization_id (via backend)
export async function getJobIdByTitle(
  title: string,
  organization_id: string
): Promise<string | null> {
  const response = await authenticatedFetch(
    `${
      process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL
    }/api/v1/interviews/job-id?title=${encodeURIComponent(
      title
    )}&organization_id=${encodeURIComponent(organization_id)}`
  );
  if (!response.ok) return null;
  const data = await response.json();
  return data.id || null;
}

export type CandidateStatus =
  | "Applied"
  | "Screening"
  | "Interview_scheduled"
  | "Interviewed"
  | "Hired"
  | "On_hold"
  | "Rejected";

export async function generateInterviewFlow(
  jobDescription: string
): Promise<
  | { flow: Record<string, unknown>; react_flow: Record<string, unknown> }
  | { error: string }
> {
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
    if (
      !data.flow.initial_node ||
      !data.react_flow.nodes ||
      typeof data.react_flow.nodes !== "object"
    ) {
      return { error: "Invalid flow data received from backend" };
    }

    return data;
  } catch (error) {
    console.error("Error generating flow:", error);
    return { error: "Internal server error" };
  }
}

export async function addCandidate({
  name,
  email,
  jobId,
  resumeFile,
  status = "Applied",
  interviewId,
}: {
  name: string;
  email: string;
  jobId: string;
  resumeFile?: File;
  status?: CandidateStatus;
  interviewId: string;
}) {
  const organization_id = await getOrganizationIdForCurrentUser();
  if (!organization_id)
    throw new Error("Could not determine organization_id for current user.");
  if (!jobId) throw new Error("Could not determine job_id for selected job.");
  let resume_url = null;
  if (resumeFile) {
    resume_url = await uploadResume(resumeFile, name);
  }
  // 1. Insert candidate via backend
  const response = await authenticatedFetch(
    `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/candidates/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        organization_id,
        job_id: jobId,
        resume_url,
        status,
      }),
    }
  );
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Failed to add candidate");
  }
  const candidate = await response.json();

  // 2. Append candidate_id to candidates_invited in the interviews table
  if (interviewId) {
    const addResp = await authenticatedFetch(
      `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/interviews/${interviewId}/add-candidate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_id: candidate.id }),
      }
    );
    if (!addResp.ok) {
      const err = await addResp.json();
      throw new Error(
        err.detail || "Failed to update interview with candidate"
      );
    }
  }

  return candidate;
}

export async function fetchJobs() {
  const response = await authenticatedFetch(
    `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/interviews/jobs-list`
  );
  if (!response.ok) throw new Error("Failed to fetch jobs");
  return await response.json();
}

export async function fetchCandidatesSortedByJob() {
  const response = await authenticatedFetch(
    `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/candidates/by-job`
  );
  if (!response.ok) throw new Error("Failed to fetch candidates");
  return await response.json();
}

export async function fetchInterviewIdFromJobId(jobId: string) {
  const response = await authenticatedFetch(
    `${
      process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL
    }/api/v1/interviews?job_id=${encodeURIComponent(jobId)}&status=active`
  );
  if (!response.ok) throw new Error("Failed to fetch interview id");
  const data = await response.json();
  if (Array.isArray(data) && data.length > 0) {
    return data[0].id;
  }
  return null;
}

export async function fetchInterviewById(
  interviewId: string
): Promise<{ id: string; job_id: string } | null> {
  console.log("interviewId", interviewId);
  const response = await authenticatedFetch(
    `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/interviews/${interviewId}/job`
  );
  if (!response.ok) return null;
  return await response.json();
}

/**
 * Update the status of an interview.
 *
 * Backend PATCH /api/v1/interviews/{interview_id} expects a JSON body:
 *   { status: "draft" | "active" | "completed" }
 * Only send the status field. The backend uses InterviewUpdate Pydantic model.
 *
 * Requires authentication (cookies/headers).
 */
export async function updateInterviewStatus(
  interviewId: string,
  status: "draft" | "active" | "completed"
) {
  const response = await authenticatedFetch(
    `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/interviews/${interviewId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }), // Only send the status field
    }
  );
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Failed to update interview status");
  }
  return await response.json();
}

export async function addBulkCandidates({
  candidates,
  jobId,
  interviewId,
}: {
  candidates: Array<{
    name: string;
    email: string;
    resumeFile?: File;
    status?: CandidateStatus;
  }>;
  jobId: string;
  interviewId: string;
}) {
  const organization_id = await getOrganizationIdForCurrentUser();
  if (!organization_id)
    throw new Error("Could not determine organization_id for current user.");
  if (!jobId) throw new Error("Could not determine job_id for selected job.");

  // Step 1: Upload all resumes in parallel
  console.log("Uploading resumes in parallel...");
  const resumeUploadPromises = candidates.map(async (candidate, index) => {
    if (candidate.resumeFile) {
      const resume_url = await uploadResume(
        candidate.resumeFile,
        candidate.name
      );
      return { index, resume_url };
    }
    return { index, resume_url: null };
  });

  const resumeResults = await Promise.all(resumeUploadPromises);

  // Step 2: Create all candidates using bulk API
  console.log("Creating candidates using bulk API...");
  const candidatesData = candidates.map((candidate, index) => {
    const resumeResult = resumeResults.find((r) => r.index === index);
    return {
      name: candidate.name,
      email: candidate.email,
      organization_id,
      job_id: jobId,
      resume_url: resumeResult?.resume_url || null,
      status: candidate.status || "Applied",
    };
  });

  const bulkResponse = await authenticatedFetch(
    `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/candidates/bulk`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidates: candidatesData }),
    }
  );

  if (!bulkResponse.ok) {
    const err = await bulkResponse.json();
    throw new Error(err.detail || "Failed to create candidates in bulk");
  }

  const bulkResult = await bulkResponse.json();
  console.log(
    `Bulk created ${bulkResult.created_count} candidates successfully`
  );

  if (bulkResult.failed_candidates.length > 0) {
    console.warn(
      `${bulkResult.failed_candidates.length} candidates failed to create:`,
      bulkResult.failed_candidates
    );
  }

  // Step 3: Update interview with all candidate IDs using bulk API
  if (interviewId && bulkResult.candidates.length > 0) {
    console.log("Updating interview with all candidates using bulk API...");
    const candidateIds = bulkResult.candidates.map((c: any) => c.id);

    const addResp = await authenticatedFetch(
      `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/interviews/${interviewId}/add-candidates-bulk`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_ids: candidateIds }),
      }
    );

    if (!addResp.ok) {
      // Fallback to individual updates if bulk endpoint fails
      console.log(
        "Bulk interview update failed, falling back to individual updates..."
      );
      const updatePromises = candidateIds.map((candidateId: string) =>
        authenticatedFetch(
          `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/interviews/${interviewId}/add-candidate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ candidate_id: candidateId }),
          }
        )
      );

      await Promise.all(updatePromises);
    } else {
      const addResult = await addResp.json();
      console.log(
        `Added ${addResult.added_count} candidates to interview successfully`
      );
    }
  }

  return bulkResult.candidates;
}
