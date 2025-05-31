"use client";

import { useState, useEffect } from "react";
import {
  useJobs,
  useAddCandidate,
  useBulkAddCandidates,
} from "./supabase-hooks";
import { useSession } from "@supabase/auth-helpers-react";
import Link from "next/link";
import { ArrowLeft, Send, X, Plus, UploadCloud, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    resume: File | null;
    id: number;
    status: string;
  };
  const [candidates, setCandidates] = useState<CandidateRow[]>([
    { name: "", email: "", resume: null, id: Date.now(), status: "Applied" },
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  // Fetch jobs from backend
  const { jobs, loadJobs } = useJobs();
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
    loadJobs();
    if (interviewIdFromQuery) setSelectedInterview(interviewIdFromQuery);
  }, [interviewIdFromQuery]);

  const addCandidateRow = () => {
    setCandidates([
      ...candidates,
      { name: "", email: "", resume: null, id: Date.now(), status: "Applied" },
    ]);
  };

  const removeCandidateRow = (id: number) => {
    if (candidates.length <= 0) return;
    setCandidates(candidates.filter((candidate) => candidate.id !== id));
  };

  const updateCandidate = (
    id: number,
    field: "name" | "email" | "resume" | "status",
    value: string | File | null
  ) => {
    setCandidates(
      candidates.map((candidate) =>
        candidate.id === id ? { ...candidate, [field]: value } : candidate
      )
    );
  };

  // Check if all candidates have uploaded their resumes
  const allCandidatesHaveResumes = () => {
    return candidates.every((candidate) => candidate.resume !== null);
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
            "CSV file must contain at least a header row and one data row."
          );
          setIsUploading(false);
          return;
        }

        // Parse CSV (expecting: name, email format)
        const header = lines[0].toLowerCase();
        const nameIndex = header.includes("name")
          ? header.split(",").findIndex((col) => col.trim().includes("name"))
          : 0;
        const emailIndex = header.includes("email")
          ? header.split(",").findIndex((col) => col.trim().includes("email"))
          : 1;

        const newCandidates: CandidateRow[] = [];

        for (let i = 1; i < lines.length && i <= 101; i++) {
          // Limit to 100 candidates + header
          const values = lines[i]
            .split(",")
            .map((v) => v.trim().replace(/"/g, ""));

          if (values.length >= 2 && values[nameIndex] && values[emailIndex]) {
            newCandidates.push({
              name: values[nameIndex],
              email: values[emailIndex],
              resume: null,
              id: Date.now() + i,
              status: "Applied",
            });
          }
        }

        if (newCandidates.length > 0) {
          setCandidates(newCandidates);
          setInterviewError(
            `Imported ${newCandidates.length} candidates from CSV.`
          );
        } else {
          setInterviewError(
            "No valid candidates found in CSV. Please check the format."
          );
        }
      } catch (error) {
        setInterviewError("Error parsing CSV file. Please check the format.");
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
        resumeFile: candidate.resume || undefined,
        status: candidate.status as any, // Convert to CandidateStatus
      }));

      await submitBulkCandidates({
        candidates: candidatesData,
        jobId,
        interviewId: selectedInterview,
      });

      setIsSent(true);
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
            className="text-xs dark:text-gray-300 cursor-pointer"
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
            <h2 className="mt-4 text-lg font-medium tracking-tight dark:text-white">
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
          className="cursor-pointer"
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
              <h2 className="text-xl font-semibold opacity-70 tracking-tight dark:text-white">
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
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploading}
                    onClick={() =>
                      document.getElementById("csv-upload")?.click()
                    }
                    className="cursor-pointer border border-app-blue-500/80 dark:border-app-blue-400/80 hover:bg-app-blue-500/10 dark:hover:bg-app-blue-900/20 text-app-blue-5/00 dark:text-app-blue-3/00 hover:text-app-blue-6/00 dark:hover:text-app-blue-2/00 focus:ring-app-blue-5/00 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900"
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
                      className="cursor-pointer rounded-full"
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
                    <div className="flex items-center space-x-4">
                      <label
                        htmlFor={`resume-upload-${candidate.id}`}
                        className="cursor-pointer"
                      >
                        <Button asChild variant="outline">
                          <span>Choose File</span>
                        </Button>
                      </label>
                      <span className="text-sm text-gray-700">
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
                  </CardContent>
                </Card>
              ))}

              <Button
                type="button"
                variant="ghost"
                className="text-app-blue-6/00 cursor-pointer"
                onClick={addCandidateRow}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add another candidate
              </Button>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-end space-y-3 md:space-y-0 md:space-x-4">
              <Button
                onClick={() => router.push("/dashboard/candidates")}
                className="cursor-pointer text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
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
                className="cursor-pointer border border-app-blue-500/80 hover:bg-app-blue-500/10 text-app-blue-5/00 hover:text-app-blue-6/00 focus:ring-app-blue-5/00 focus:ring-offset-2 focus:ring-offset-gray-50"
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
