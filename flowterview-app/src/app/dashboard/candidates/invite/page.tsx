"use client";

import { useState, useEffect } from "react";
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
  const [selectedInterview, setSelectedInterview] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [interviewError, setInterviewError] = useState("");
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
    if (candidates.length <= 0) return;
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split("\n").filter((line) => line.trim());

        if (lines.length < 2) {
          setInterviewError(
            "CSV file must contain at least a header row and one data row. Expected format: full_name, email_address, phone_number, resume_url"
          );
          setIsUploading(false);
          return;
        }

        // Parse CSV (expecting: full_name, email_address, phone_number, resume_url format)
        const header = lines[0].toLowerCase();
        const headerColumns = header.split(",").map((col) => col.trim());

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

        for (let i = 1; i < lines.length && i <= 101; i++) {
          // Limit to 100 candidates + header
          const values = lines[i]
            .split(",")
            .map((v) => v.trim().replace(/"/g, ""));

          // Check if we have at least name and email (required fields)
          if (
            nameIndex !== -1 &&
            emailIndex !== -1 &&
            values[nameIndex] &&
            values[emailIndex]
          ) {
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
          setInterviewError(
            "No valid candidates found in CSV. Please ensure the format is: full_name, email_address, phone_number, resume_url"
          );
        }
      } catch (error) {
        setInterviewError(
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
    setInterviewError("");
    setIsSubmitting(true);
    try {
      const interviewId = await fetchInterviewIdFromJobId(jobId);
      if (interviewId) {
        setSelectedInterview(interviewId);
        setSelectedJobId(jobId); // Store the selected job ID
      } else {
        setInterviewError(
          "No active interview found for this job. Please create one first."
        );
        setSelectedInterview("");
        setSelectedJobId(""); // Clear job ID if no interview found
      }
    } catch (err) {
      setInterviewError("Failed to fetch interview for selected job.");
      setSelectedInterview("");
      setSelectedJobId(""); // Clear job ID on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInterviewError("");
    setIsSubmitting(true);

    try {
      // Require interview selection if not from query
      if (!selectedInterview) {
        setInterviewError("Please select an interview/job before submitting.");
        setIsSubmitting(false);
        return;
      }

      let jobId = "";

      // If we have a selectedJobId (from job selection), use it directly
      if (selectedJobId) {
        jobId = selectedJobId;
      } else if (
        interviewIdFromQuery &&
        selectedInterview === interviewIdFromQuery
      ) {
        // For direct interview links, we need to fetch the job info
        const interview = await fetchInterviewById(selectedInterview);
        if (interview && interview.job_id) {
          jobId = interview.job_id;
        }
      }

      if (!jobId) {
        setInterviewError(
          "Could not determine job for the selected interview."
        );
        setIsSubmitting(false);
        return;
      }

      // Use bulk submission for much better performance
      const candidatesData = candidates.map((candidate) => ({
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        resumeFile: candidate.resume || undefined,
        resume_url: candidate.resume_url,
        status: candidate.status as any, // Convert to CandidateStatus
      }));

      await submitBulkCandidates({
        candidates: candidatesData,
        jobId,
        interviewId: selectedInterview,
      });

     
      
      setIsSent(true);
      setTimeout(() => {
        refreshCandidates();
        refreshInterviews();
      }, 2000);
    } catch (err) {
      console.error("Error in handleSubmit:", err);
      setInterviewError(
        bulkError || "Failed to submit candidates. Please try again."
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

      <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-900 shadow border dark:border-gray-800">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex items-center gap-3 justify-between">
              <h2 className="text-lg font-semibold opacity-70 tracking-tight dark:text-white">
                Invite Candidates
              </h2>
              <div className="flex flex-row gap-5">
                {!interviewIdFromQuery && (
                  <div className="flex flex-col">
                    <Select onValueChange={handleJobSelect}>
                      <SelectTrigger className="w-[180px] dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200">
                        <SelectValue placeholder="Select Interview" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-900 dark:border-gray-700">
                        <SelectGroup>
                          <SelectLabel className="dark:text-gray-300">
                            Interviews
                          </SelectLabel>
                          {jobs.map((job) => (
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
                    {interviewError && (
                      <span className="text-red-500 text-xs mt-1">
                        {interviewError}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploading}
                    onClick={() =>
                      document.getElementById("csv-upload")?.click()
                    }
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
                            Your CSV file should have the following columns
                            (exact names):
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
                                All candidates will be added to your
                                organization
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
                      <X className="h-4 w-4 text-red-400" />
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
                      type="text"
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
                            <Button
                              asChild
                              variant="outline"
                              className="text-xs"
                            >
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
                          accept=".pdf,.doc,.docx"
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
                  (!interviewIdFromQuery && !selectedInterview) ||
                  !allCandidatesHaveResumes()
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
    </div>
  );
}
