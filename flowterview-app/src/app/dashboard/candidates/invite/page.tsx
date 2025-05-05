"use client";

import { useState, useEffect } from "react";
import { useJobs, useAddCandidate } from "./supabase-hooks";
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
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";

export default function InviteCandidatesPage() {
  const router = useRouter();
  const [selectedInterview, setSelectedInterview] = useState("");
  type CandidateRow = {
    name: string;
    email: string;
    resume: File | null;
    id: number;
    status: string;
  };
  const [candidates, setCandidates] = useState<CandidateRow[]>([
    { name: "", email: "", resume: null, id: Date.now(), status: "applied" },
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
  const session = useSession();
  const orgEmail = session?.user?.email ?? "";

  useEffect(() => {
    loadJobs();
  }, []);

  const addCandidateRow = () => {
    setCandidates([
      ...candidates,
      { name: "", email: "", resume: null, id: Date.now(), status: "applied" },
    ]);
  };

  const removeCandidateRow = (id: number) => {
    if (candidates.length > 1) {
      setCandidates(candidates.filter((candidate) => candidate.id !== id));
    }
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

  const handleFileUpload = () => {
    setIsUploading(true);
    // In a real application, this would handle file upload and CSV parsing
    setTimeout(() => {
      // Simulate adding candidates from CSV
      setCandidates([
        {
          name: "John Doe",
          email: "john@example.com",
          resume: null,
          id: Date.now(),
          status: "applied",
        },
        {
          name: "Jane Smith",
          email: "jane@example.com",
          resume: null,
          id: Date.now() + 1,
          status: "applied",
        },
        {
          name: "Bob Johnson",
          email: "bob@example.com",
          resume: null,
          id: Date.now() + 2,
          status: "applied",
        },
      ]);
      setIsUploading(false);
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      for (const candidate of candidates) {
        await submitCandidate({
          name: candidate.name,
          email: candidate.email,
          orgEmail: orgEmail, // <-- Use current user's email as orgEmail
          jobTitle: jobs.find((j) => j.id === selectedInterview)?.title || "",
          resumeFile: candidate.resume || undefined,
        });
      }
      setIsSent(true);
    } catch (err) {
      // You can handle error UI here
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Link
            href="/dashboard/candidates"
            className="mr-4 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Candidates
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-6 text-center">
            <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="mt-4 text-lg font-medium tracking-tight">
              Candidates Saved Successfully
            </h2>
            <p className="mt-2 text-sm tracking-tight opacity-50">
              All candidates have been added to your organization.
            </p>
            <div className="mt-6">
              <Button
                className="cursor-pointer border border-indigo-500/80 hover:bg-indigo-500/10 text-indigo-500 hover:text-indigo-600 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
                variant="outline"
                onClick={() => router.push("/dashboard/candidates")}
              >
                Return to Candidates
              </Button>
            </div>
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

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex items-center gap-3 justify-between">
              <h2 className="text-xl font-semibold opacity-70 tracking-tight">
                Invite Candidates
              </h2>
              <div className="flex flex-row gap-5">
                <Select onValueChange={setSelectedInterview}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Interview" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Interviews</SelectLabel>
                      {jobs.map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          {job.title}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploading}
                  onClick={handleFileUpload}
                  className="cursor-pointer"
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
              </div>
            </div>

            <div className="space-y-6">
              {candidates.map((candidate) => (
                <Card key={candidate.id} className="p-4">
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
                className="text-indigo-600 cursor-pointer"
                onClick={addCandidateRow}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add another candidate
              </Button>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-end space-y-3 md:space-y-0 md:space-x-4">
              <Link
                href="/dashboard/candidates"
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Cancel
              </Link>

              <Button
                type="submit"
                disabled={isSubmitting || !selectedInterview}
                variant="outline"
                className="cursor-pointer border border-indigo-500/80 hover:bg-indigo-500/10 text-indigo-500 hover:text-indigo-600 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
              >
                {isSubmitting ? (
                  "Adding..."
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
