"use client";

import { useState, useEffect, useRef } from "react";
import { useAddCandidate, useBulkAddCandidates } from "./supabase-hooks";
import { useJobs, useCandidates, useInterviews } from "@/hooks/useStores";
import { useSession } from "@supabase/auth-helpers-react";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  X,
  Plus,
  UploadCloud,
  Check,
  Info,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  fetchInterviewById,
  fetchInterviewIdFromJobId,
} from "@/lib/supabase-candidates";

export default function InviteCandidatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const interviewIdFromQuery = searchParams.get("interview");

  // CRITICAL: Use ref to track current request and prevent race conditions
  const currentJobSelectionRef = useRef<string | null>(null);

  const [selectedInterview, setSelectedInterview] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [isLoadingJobSelection, setIsLoadingJobSelection] = useState(false);
  const [interviewError, setInterviewError] = useState("");
  const [csvError, setCsvError] = useState("");
  const [formError, setFormError] = useState("");

  // Store job-interview pair atomically to prevent mismatches
  const [jobInterviewPair, setJobInterviewPair] = useState<{
    jobId: string;
    interviewId: string;
  } | null>(null);
  type CandidateRow = {
    name: string;
    email: string;
    phone: string;
    resume: File | null;
    resume_url: string;
    id: number;
    status: string;
  };
  const [candidates, setCandidates] = useState<CandidateRow[]>([
    {
      name: "",
      email: "",
      phone: "",
      resume: null,
      resume_url: "",
      id: Date.now(),
      status: "Applied",
    },
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  // Fetch jobs from backend
  const { jobs, isLoading: jobsLoading, error: jobsError } = useJobs();

  // Additional hooks for cache invalidation
  const { refresh: refreshCandidates } = useCandidates();
  const { refresh: refreshInterviews } = useInterviews();
  const {
    submitCandidate,
    loading: addLoading,
    error: addError,
    success: addSuccess,
  } = useAddCandidate();

  // Bulk submission hook
  const {
    submitBulkCandidates,
    loading: bulkLoading,
    error: bulkError,
    success: bulkSuccess,
    progress: bulkProgress,
  } = useBulkAddCandidates();

  const session = useSession();
  const orgEmail = session?.user?.email ?? "";

  useEffect(() => {
    if (interviewIdFromQuery) setSelectedInterview(interviewIdFromQuery);
  }, [interviewIdFromQuery]);

  const addCandidateRow = () => {
    setCandidates([
      ...candidates,
      {
        name: "",
        email: "",
        phone: "",
        resume: null,
        resume_url: "",
        id: Date.now(),
        status: "Applied",
      },
    ]);
  };

  const removeCandidateRow = (id: number) => {
    if (candidates.length <= 1) return; // Fixed: prevent removing all candidates
    setCandidates(candidates.filter((candidate) => candidate.id !== id));
  };

  const updateCandidate = (
    id: number,
    field: "name" | "email" | "phone" | "resume" | "resume_url" | "status",
    value: string | File | null
  ) => {
    setCandidates(
      candidates.map((candidate) =>
        candidate.id === id ? { ...candidate, [field]: value } : candidate
      )
    );
  };

  // Check if all candidates have uploaded their resumes or have resume URLs
  const allCandidatesHaveResumes = () => {
    return candidates.every(
      (candidate) =>
        candidate.resume !== null || candidate.resume_url.trim() !== ""
    );
  };

  // Fixed: Better validation that checks all required fields, not just resumes
  const validateCandidates = () => {
    const errors: string[] = [];
    const emails = new Set<string>();

    for (const candidate of candidates) {
      // Check required fields
      if (!candidate.name.trim()) {
        errors.push("All candidates must have a name");
        break;
      }

      if (!candidate.email.trim()) {
        errors.push("All candidates must have an email address");
        break;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(candidate.email)) {
        errors.push("All email addresses must be valid");
        break;
      }

      // Check for duplicate emails
      if (emails.has(candidate.email.toLowerCase())) {
        errors.push("Duplicate email addresses are not allowed");
        break;
      }
      emails.add(candidate.email.toLowerCase());

      // Check resume requirement
      if (!candidate.resume && !candidate.resume_url.trim()) {
        errors.push("All candidates must have a resume file or URL");
        break;
      }
    }

    return errors;
  };

  // Helper function to parse CSV properly handling quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result.map((field) => field.replace(/^"|"$/g, "")); // Remove surrounding quotes
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setCsvError(""); // Clear previous errors

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split("\n").filter((line) => line.trim());

        if (lines.length < 2) {
          setCsvError(
            "CSV file must contain at least a header row and one data row. Expected format: full_name, email_address, phone_number, resume_url"
          );
          setIsUploading(false);
          return;
        }

        // Parse CSV with proper quoted field handling
        const headerColumns = parseCSVLine(lines[0].toLowerCase());

        // Look for exact matches first, then fallback to partial matches
        const findColumnIndex = (
          exactNames: string[],
          partialNames: string[]
        ) => {
          // Try exact matches first
          for (const exactName of exactNames) {
            const index = headerColumns.indexOf(exactName);
            if (index !== -1) return index;
          }
          // Fallback to partial matches
          for (const partialName of partialNames) {
            const index = headerColumns.findIndex((col) =>
              col.includes(partialName)
            );
            if (index !== -1) return index;
          }
          return -1;
        };

        const nameIndex = findColumnIndex(["full_name"], ["name"]);
        const emailIndex = findColumnIndex(["email_address"], ["email"]);
        const phoneIndex = findColumnIndex(["phone_number"], ["phone"]);
        const resumeUrlIndex = findColumnIndex(["resume_url"], ["resume"]);

        const newCandidates: CandidateRow[] = [];
        const processedEmails = new Set<string>();

        for (let i = 1; i < lines.length && i <= 101; i++) {
          const values = parseCSVLine(lines[i]);

          // Check if we have at least name and email (required fields)
          if (
            nameIndex !== -1 &&
            emailIndex !== -1 &&
            values[nameIndex] &&
            values[emailIndex]
          ) {
            const email = values[emailIndex].toLowerCase();

            // Skip duplicates
            if (processedEmails.has(email)) {
              continue;
            }
            processedEmails.add(email);

            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(values[emailIndex])) {
              continue; // Skip invalid emails
            }

            newCandidates.push({
              name: values[nameIndex],
              email: values[emailIndex],
              phone: phoneIndex !== -1 ? values[phoneIndex] || "" : "",
              resume: null,
              resume_url:
                resumeUrlIndex !== -1 ? values[resumeUrlIndex] || "" : "",
              id: Date.now() + i,
              status: "Applied",
            });
          }
        }

        if (newCandidates.length > 0) {
          setCandidates(newCandidates);
        } else {
          setCsvError(
            "No valid candidates found in CSV. Please ensure the format is: full_name, email_address, phone_number, resume_url and that email addresses are valid."
          );
        }
      } catch (error) {
        setCsvError(
          "Error parsing CSV file. Please ensure the format is: full_name, email_address, phone_number, resume_url"
        );
      } finally {
        setIsUploading(false);
      }
    };

    reader.readAsText(file);
  };

  // Dropdown handler: when a job is selected, fetch the interview ID for that job
  const handleJobSelect = async (jobId: string) => {
    // Clear all errors and previous state
    setInterviewError("");
    setCsvError("");
    setFormError("");
    setIsLoadingJobSelection(true);

    // CRITICAL: Set current request ID to track this specific request
    const requestId = `${jobId}-${Date.now()}`;
    currentJobSelectionRef.current = requestId;

    // Clear previous state immediately to prevent stale data
    setSelectedInterview("");
    setSelectedJobId("");
    setJobInterviewPair(null);

    try {
      const interviewId = await fetchInterviewIdFromJobId(jobId);

      // CRITICAL: Check if this request is still the current one
      // If user selected another job while this was loading, ignore this result
      if (currentJobSelectionRef.current !== requestId) {
        console.log(`Ignoring stale job selection result for ${jobId}`);
        return;
      }

      if (interviewId) {
        // CRITICAL: Set all related state atomically to prevent mismatches
        const pair = { jobId, interviewId };
        setJobInterviewPair(pair);
        setSelectedInterview(interviewId);
        setSelectedJobId(jobId);

        console.log(
          `Successfully selected job ${jobId} with interview ${interviewId}`
        );
      } else {
        setInterviewError(
          "No active interview found for this job. Please create one first."
        );
        setSelectedInterview("");
        setSelectedJobId("");
        setJobInterviewPair(null);
      }
    } catch (err) {
      // Only show error if this is still the current request
      if (currentJobSelectionRef.current === requestId) {
        setInterviewError("Failed to fetch interview for selected job.");
        setSelectedInterview("");
        setSelectedJobId("");
        setJobInterviewPair(null);
      }
    } finally {
      // Only clear loading if this is still the current request
      if (currentJobSelectionRef.current === requestId) {
        setIsLoadingJobSelection(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("handleSubmit");
    e.preventDefault();
    setInterviewError("");
    setFormError("");

    // Validate candidates before submitting
    const validationErrors = validateCandidates();
    if (validationErrors.length > 0) {
      setFormError(validationErrors[0]);
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Submitting candidates");

      // CRITICAL: Determine jobId and interviewId with bulletproof validation
      let jobId = "";
      let interviewId = "";

      if (jobInterviewPair) {
        // Use atomic pair for job selection
        jobId = jobInterviewPair.jobId;
        interviewId = jobInterviewPair.interviewId;

        // CRITICAL: Double-check that the pair is still valid
        if (jobId !== selectedJobId || interviewId !== selectedInterview) {
          throw new Error(
            "Job-Interview mismatch detected. Please reselect the job."
          );
        }

        console.log(`Using job-interview pair: ${jobId} -> ${interviewId}`);
      } else if (
        interviewIdFromQuery &&
        selectedInterview === interviewIdFromQuery
      ) {
        // For direct interview links, fetch the job info
        const interview = await fetchInterviewById(selectedInterview);
        if (interview && interview.job_id) {
          jobId = interview.job_id;
          interviewId = selectedInterview;
          console.log(`Using interview from query: ${jobId} -> ${interviewId}`);
        } else {
          throw new Error("Could not fetch job information for the interview.");
        }
      } else {
        throw new Error("Please select an interview/job before submitting.");
      }

      if (!jobId || !interviewId) {
        throw new Error("Could not determine both job ID and interview ID.");
      }

      // CRITICAL: Final validation - ensure we have matching job and interview
      console.log(
        `Final validation - Job ID: ${jobId}, Interview ID: ${interviewId}`
      );

      // Additional safety check: verify the interview belongs to this job
      const verificationInterview = await fetchInterviewById(interviewId);
      if (verificationInterview && verificationInterview.job_id !== jobId) {
        throw new Error(
          `Interview ${interviewId} does not belong to job ${jobId}. This is a critical error.`
        );
      }

      const candidatesData = candidates.map((candidate) => ({
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        resumeFile: candidate.resume || undefined,
        resume_url: candidate.resume_url,
        status: candidate.status as any,
      }));

      console.log("Submitting bulk candidates with verified IDs:", {
        jobId,
        interviewId,
      });
      await submitBulkCandidates({
        candidates: candidatesData,
        jobId,
        interviewId,
      });
      console.log("Bulk candidates submitted successfully");

      setIsSent(true);
      refreshCandidates();
      refreshInterviews();

      console.log("Refreshing candidates and interviews");
    } catch (err) {
      console.error("Error in handleSubmit:", err);
      setFormError(
        err instanceof Error
          ? err.message
          : "Failed to submit candidates. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button
            variant="link"
            className="cursor-pointer text-xs"
            onClick={() => {
              router.push("/dashboard/candidates");
            }}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Return to Candidates
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-900 shadow dark:border dark:border-gray-800">
          <div className="p-6 text-center">
            <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="mt-4 text-base font-medium tracking-tight dark:text-white">
              Candidates Saved Successfully
            </h2>
            <p className="mt-2 mb-6 text-sm tracking-tight opacity-50 dark:text-gray-300 dark:opacity-70">
              All candidates have been added to your organization.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button
          onClick={() => router.push("/dashboard/candidates")}
          className="cursor-pointer text-xs"
          variant="link"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Candidates
        </Button>
      </div>

      <div className="p-2 max-w-full overflow-x-hidden min-w-0">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-3 justify-between">
            <h2 className="text-lg font-semibold opacity-70 tracking-tight dark:text-white">
              <div className="flex flex-col">
                <span>Invite Candidates</span>
                {interviewError && (
                  <span className="text-red-500 text-xs mt-1">
                    {interviewError}
                  </span>
                )}
                {csvError && (
                  <span className="text-red-500 text-xs mt-1">{csvError}</span>
                )}
                {formError && (
                  <span className="text-red-500 text-xs mt-1">{formError}</span>
                )}
              </div>
            </h2>
            <div className="flex flex-row gap-5">
              {!interviewIdFromQuery && (
                <div className="flex flex-col">
                  <Select
                    onValueChange={handleJobSelect}
                    disabled={isLoadingJobSelection}
                  >
                    <SelectTrigger className="w-[180px] dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200">
                      <SelectValue
                        placeholder={
                          isLoadingJobSelection
                            ? "Loading..."
                            : "Select Interview"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-900 dark:border-gray-700">
                      <SelectGroup>
                        <SelectLabel className="dark:text-gray-300">
                          Interviews
                        </SelectLabel>
                        {jobs.map((job: any) => (
                          <SelectItem
                            key={job.id}
                            value={job.id}
                            className="dark:text-gray-200"
                          >
                            {job.title}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploading}
                  onClick={() => document.getElementById("csv-upload")?.click()}
                  className="cursor-pointer text-xs"
                >
                  {isUploading ? (
                    "Uploading..."
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4 mr-2" />
                      Import CSV
                    </>
                  )}
                </Button>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                      type="button"
                    >
                      <Info className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96 p-5" align="end">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-gray-900 dark:text-gray-100">
                          CSV Format Requirements
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                          Your CSV file should have the following columns (exact
                          names):
                        </p>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-xs font-mono border">
                          full_name, email_address, phone_number, resume_url
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-gray-900 dark:text-gray-100">
                          Example CSV Content:
                        </h4>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-xs font-mono whitespace-pre-line leading-relaxed border overflow-x-auto">
                          {`full_name,email_address,phone_number,resume_url
John Doe,john@example.com,+1234567890,https://example.com/resume.pdf
Jane Smith,jane@example.com,+1987654321,https://example.com/jane-cv.pdf`}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-sm mb-3 text-gray-900 dark:text-gray-100">
                          Bulk Onboarding Process:
                        </h4>
                        <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-2">
                          <li className="flex items-start gap-2">
                            <span className="text-app-blue-500 font-semibold">
                              •
                            </span>
                            <span>
                              All candidates will be added to your organization
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-app-blue-500 font-semibold">
                              •
                            </span>
                            <span>
                              Candidates will be linked to the selected
                              interview
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-app-blue-500 font-semibold">
                              •
                            </span>
                            <span>
                              Resume URLs should be publicly accessible PDF
                              links
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-app-blue-500 font-semibold">
                              •
                            </span>
                            <span>
                              Invalid entries will be skipped automatically
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {candidates.map((candidate) => (
              <Card
                key={candidate.id}
                className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
              >
                <CardHeader className="flex items-center justify-between p-0 px-1">
                  <h3 className="text-md font-medium tracking-tight">
                    Candidate
                  </h3>
                  <Button
                    variant="outline"
                    size="icon"
                    className="cursor-pointer rounded-full text-xs"
                    onClick={() => removeCandidateRow(candidate.id)}
                  >
                    <X className="h-4 w-4 opacity-60" />
                  </Button>
                </CardHeader>

                <CardContent className="space-y-5 p-3">
                  <span className="text-xs opacity-75 mb-3">
                    Name of the candidate
                  </span>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={candidate.name}
                    onChange={(e) =>
                      updateCandidate(candidate.id, "name", e.target.value)
                    }
                  />
                  <span className="text-xs opacity-75 mb-3">
                    Email address of the candidate
                  </span>
                  <Input
                    type="email"
                    placeholder="johndoe@example.com"
                    value={candidate.email}
                    onChange={(e) =>
                      updateCandidate(candidate.id, "email", e.target.value)
                    }
                  />
                  <span className="text-xs opacity-75 mb-3">
                    Phone number of the candidate
                  </span>
                  <Input
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={candidate.phone}
                    onChange={(e) =>
                      updateCandidate(candidate.id, "phone", e.target.value)
                    }
                  />

                  {/* Resume Section - Show URL if exists, otherwise show file upload */}
                  {candidate.resume_url ? (
                    <div className="space-y-2">
                      <span className="text-xs opacity-75 mb-3">Resume</span>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Provided via CSV upload
                          </p>
                          <a
                            href={candidate.resume_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-app-blue-600 dark:text-app-blue-400 hover:text-app-blue-700 dark:hover:text-app-blue-300 underline truncate block"
                          >
                            {candidate.resume_url}
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <span className="text-xs opacity-75 mb-3">
                        Upload Resume File
                      </span>
                      <div className="flex items-center space-x-4">
                        <label
                          htmlFor={`resume-upload-${candidate.id}`}
                          className="cursor-pointer"
                        >
                          <Button asChild variant="outline" className="text-xs">
                            <span>Choose File</span>
                          </Button>
                        </label>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {candidate.resume?.name || "No file chosen"}
                        </span>
                      </div>

                      <Input
                        id={`resume-upload-${candidate.id}`}
                        type="file"
                        accept=".pdf"
                        onChange={(e) =>
                          updateCandidate(
                            candidate.id,
                            "resume",
                            e.target.files?.[0] ?? null
                          )
                        }
                        className="hidden"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Button
              type="button"
              variant="outline"
              className="text-app-blue-6/00 cursor-pointer text-xs"
              onClick={addCandidateRow}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add another candidate
            </Button>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-end space-y-3 md:space-y-0 md:space-x-4">
            <Button
              onClick={() => router.push("/dashboard/candidates")}
              className="cursor-pointer text-xs"
              variant="outline"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={
                isSubmitting ||
                bulkLoading ||
                isLoadingJobSelection ||
                (!interviewIdFromQuery && !jobInterviewPair) ||
                validateCandidates().length > 0
              }
              variant="outline"
              className="cursor-pointer text-xs"
            >
              {isSubmitting || bulkLoading ? (
                "Processing..."
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Save Candidate(s)
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
