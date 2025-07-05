"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Plus,
  Mail,
  Users,
  Brain,
  Clock,
  X,
  Save,
  Loader2,
  Phone,
  FileText,
  Bot,
  Route,
  Eye,
  Send,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { updateInterviewStatus } from "@/lib/supabase-candidates";
import { useToast } from "@/hooks/use-toast";
import { BulkInviteDialog } from "@/components/ui/bulk-invite-dialog";
import { useInterviewDetails, useCandidates } from "@/hooks/useStores";
import {
  authenticatedFetch,
  getCookie,
  getUserContext,
} from "@/lib/auth-client";

// Candidate View Dialog Component
const CandidateViewDialog = ({
  candidate,
  onClose,
  handleSendInvite,
}: {
  candidate: any;
  onClose: () => void;
  handleSendInvite: (candidate: any) => void;
}) => {
  const { toast } = useToast();

  const candidateStatus = candidate.status?.toLowerCase();
  const interviewStatus =
    candidateStatus === "invited"
      ? candidate.interview_status?.toLowerCase() || "invited"
      : candidateStatus;

  // Debug log
  console.log("Debug - candidate.status:", candidate.status);
  console.log("Debug - candidateStatus:", candidateStatus);
  console.log("Debug - interviewStatus:", interviewStatus);

  const handleShowAnalytics = () => {
    toast({
      title: "Analytics",
      description: "Opening interview analytics... (Mock implementation)",
    });
  };

  return (
    <Dialog open={!!candidate} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="tracking-tight">
            Candidate Details
          </DialogTitle>
          <DialogDescription>{candidate.name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm font-medium">Email:</label>
            <div className="col-span-3 text-sm text-gray-600">
              {candidate.email}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm font-medium">Status:</label>
            <div className="col-span-3">
              <Badge variant="outline" className="text-xs">
                {candidate.interview_status || candidate.status}
              </Badge>
            </div>
          </div>
          {interviewStatus?.toLowerCase() === "started" &&
            candidate.room_url && (
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm font-medium">
                  Interview:
                </label>
                <div className="col-span-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(candidate.room_url, "_blank")}
                    className="cursor-pointer"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Join Interview
                  </Button>
                </div>
              </div>
            )}
        </div>
        <DialogFooter>
          <div className="flex flex-col gap-2 w-full">
            {/* Completed status - Show Analytics and optionally Resume */}
            {(interviewStatus?.toLowerCase() === "completed" ||
              candidate.status?.toLowerCase() === "completed" ||
              candidate.interview_status?.toLowerCase() === "completed") && (
              <>
                <Button
                  variant="outline"
                  onClick={handleShowAnalytics}
                  className="cursor-pointer"
                >
                  <Brain className="mr-2 h-4 w-4" />
                  Show Analytics
                </Button>
                {candidate.resume_url && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(candidate.resume_url, "_blank")}
                    className="cursor-pointer"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Resume
                  </Button>
                )}
              </>
            )}

            {/* Scheduled status - Show only View Resume */}
            {interviewStatus?.toLowerCase() === "scheduled" &&
              candidate.status?.toLowerCase() !== "completed" &&
              candidate.interview_status?.toLowerCase() !== "completed" && (
                <>
                  {candidate.resume_url ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        window.open(candidate.resume_url, "_blank")
                      }
                      className="cursor-pointer"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Resume
                    </Button>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No resume available.
                    </p>
                  )}
                </>
              )}

            {/* Started status - Show only Resume (Join button is above) */}
            {interviewStatus?.toLowerCase() === "started" &&
              candidate.status?.toLowerCase() !== "completed" &&
              candidate.interview_status?.toLowerCase() !== "completed" && (
                <>
                  {candidate.resume_url && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        window.open(candidate.resume_url, "_blank")
                      }
                      className="cursor-pointer"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Resume
                    </Button>
                  )}
                </>
              )}

            {/* Invited status - Show only View Resume (NO invite button) */}
            {interviewStatus?.toLowerCase() === "invited" &&
              candidate.status?.toLowerCase() !== "completed" &&
              candidate.interview_status?.toLowerCase() !== "completed" && (
                <>
                  {candidate.resume_url ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        window.open(candidate.resume_url, "_blank")
                      }
                      className="cursor-pointer"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Resume
                    </Button>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No resume available.
                    </p>
                  )}
                </>
              )}

            {/* Applied and Screening statuses - Show both Resume and Invite */}
            {(interviewStatus?.toLowerCase() === "applied" ||
              interviewStatus?.toLowerCase() === "screening") &&
              candidate.status?.toLowerCase() !== "completed" &&
              candidate.interview_status?.toLowerCase() !== "completed" && (
                <>
                  {candidate.resume_url && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        window.open(candidate.resume_url, "_blank")
                      }
                      className="cursor-pointer"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Resume
                    </Button>
                  )}
                  {!candidate.resume_url && (
                    <p className="text-sm text-gray-500">
                      No resume available.
                    </p>
                  )}
                  <Button
                    onClick={() => handleSendInvite(candidate)}
                    variant="outline"
                    className="cursor-pointer border border-app-blue-500/80 hover:bg-app-blue-500/10 text-app-blue-5/00 hover:text-app-blue-6/00 focus:ring-app-blue-5/00 focus:ring-offset-2 focus:ring-offset-gray-50"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Invite for Interview
                  </Button>
                </>
              )}

            {/* Fallback for any other statuses */}
            {![
              "completed",
              "scheduled",
              "started",
              "applied",
              "screening",
              "invited",
            ].includes(interviewStatus?.toLowerCase()) &&
              candidate.status?.toLowerCase() !== "completed" &&
              candidate.interview_status?.toLowerCase() !== "completed" && (
                <>
                  {candidate.resume_url && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        window.open(candidate.resume_url, "_blank")
                      }
                      className="cursor-pointer"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Resume
                    </Button>
                  )}
                  {!candidate.resume_url && (
                    <p className="text-sm text-gray-500">
                      No resume available.
                    </p>
                  )}
                  <Button
                    onClick={() => handleSendInvite(candidate)}
                    variant="outline"
                    className="cursor-pointer border border-app-blue-500/80 hover:bg-app-blue-500/10 text-app-blue-5/00 hover:text-app-blue-6/00 focus:ring-app-blue-5/00 focus:ring-offset-2 focus:ring-offset-gray-50"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Invite for Interview
                  </Button>
                </>
              )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Move nodeTypes outside the component to prevent recreation on every render
interface Candidate {
  id: string;
  name: string;
  email: string;
  status?: string;
  job_id?: string;
  is_invited?: boolean;
  interview_status?: string;
  room_url?: string;
  bot_token?: string;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
  resume_url?: string;
}

interface Job {
  id: string;
  title: string;
  description?: string;
  organization_id?: string;
}

interface Interview {
  id: string;
  status: "draft" | "active" | "completed";
  candidates_invited: string[];
  job_id: string;
}

interface CandidatesData {
  invited: Candidate[];
  available: Candidate[];
  total_job_candidates: number;
  invited_count: number;
  available_count: number;
}

interface InterviewData {
  job: Job;
  interview: Interview;
  candidates: CandidatesData;
  skills: string[];
  duration: number;
}

export default function InterviewDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  // Use our store hooks instead of manual API calls
  const {
    details,
    isLoading: loading,
    error,
  } = useInterviewDetails(id as string);

  // Get all candidates to merge with interview candidates for complete data
  const { candidates: allCandidates } = useCandidates();
  const [job, setJob] = useState<Job | null>(null);
  const [invitedCandidates, setInvitedCandidates] = useState<Candidate[]>([]);
  const [availableCandidates, setAvailableCandidates] = useState<Candidate[]>(
    []
  );
  const [showAllCandidates, setShowAllCandidates] = useState(false);
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [interviewStatus, setInterviewStatus] = useState<
    "draft" | "active" | "completed"
  >("draft");
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);

  // Skills and timer state
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [selectedTimer, setSelectedTimer] = useState(10);
  const [saving, setSaving] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [firstChange, setFirstChange] = useState(false);

  // Process toggle states - initialize with defaults, will be updated from DB
  const [processStages, setProcessStages] = useState({
    phoneInterview: false,
    assessments: false,
    aiInterviewer: false,
  });

  // Phone screen questions state
  const [phoneScreenQuestions, setPhoneScreenQuestions] = useState<string[]>(
    []
  );
  const [newQuestion, setNewQuestion] = useState("");

  const { toast } = useToast();

  const siveraBackendUrl =
    process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL || "https://api.sivera.io";
  const coreBackendUrl =
    process.env.NEXT_PUBLIC_CORE_BACKEND_URL || "https://core.sivera.io";

  // Timer options and logic
  const timerOptions = [10, 20, 30];

  const getTimerStatus = (time: number) => {
    const skillCount = selectedSkills.length;
    if (time === 10 && skillCount >= 6)
      return { disabled: true, reason: "10 mins is too short for 6+ skills" };
    if (time === 20 && skillCount >= 11)
      return { disabled: true, reason: "20 mins is too short for 11+ skills" };
    return { disabled: false, reason: "" };
  };

  // Auto-adjust timer based on skill count
  useEffect(() => {
    if (firstChange === false) return;
    const skillCount = selectedSkills.length;
    if (skillCount >= 11) {
      setSelectedTimer(30);
    } else if (skillCount >= 6) {
      setSelectedTimer(20);
    } else {
      setSelectedTimer(10);
    }
  }, [selectedSkills.length]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) => {
      if (prev.includes(skill)) {
        return prev.filter((s) => s !== skill);
      } else {
        // Limit to 15 skills maximum
        if (prev.length >= 15) {
          toast({
            title: "Maximum skills reached",
            description: "You can select up to 15 skills maximum.",
          });
          return prev;
        }
        return [...prev, skill];
      }
    });
  };

  const addCustomSkill = () => {
    setFirstChange(true);
    if (newSkill.trim() && !selectedSkills.includes(newSkill.trim())) {
      // Limit to 15 skills maximum
      if (selectedSkills.length >= 15) {
        toast({
          title: "Maximum skills reached",
          description: "You can select up to 15 skills maximum.",
        });
        return;
      }
      setSelectedSkills((prev) => [...prev, newSkill.trim()]);
      setExtractedSkills((prev) => [...prev, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills((prev) => prev.filter((s) => s !== skill));
  };

  const toggleProcessStage = (stage: keyof typeof processStages) => {
    setProcessStages((prev) => ({
      ...prev,
      [stage]: !prev[stage],
    }));
    setFirstChange(true);
  };

  // Phone screen question management functions
  const addPhoneScreenQuestion = () => {
    if (newQuestion.trim() && phoneScreenQuestions.length < 5) {
      if (!phoneScreenQuestions.includes(newQuestion.trim())) {
        setPhoneScreenQuestions((prev) => [...prev, newQuestion.trim()]);
        setNewQuestion("");
        setFirstChange(true);
      }
    }
  };

  const removePhoneScreenQuestion = (index: number) => {
    setPhoneScreenQuestions((prev) => prev.filter((_, i) => i !== index));
    setFirstChange(true);
  };

  const handleQuestionKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addPhoneScreenQuestion();
    }
  };

  // Update local state when store data changes
  useEffect(() => {
    if (details) {
      setJob(details.job);
      setInterviewStatus(details.interview.status || "draft");

      // Merge invited candidates from interview details with complete candidate data
      if (details.candidates.invited && allCandidates) {
        const mergedInvitedCandidates = details.candidates.invited.map(
          (invitedCandidate: any) => {
            // Find the complete candidate data by matching email or id
            const completeCandidateData = allCandidates.find(
              (candidate: any) =>
                candidate.id === invitedCandidate.id ||
                candidate.email === invitedCandidate.email
            );

            // Merge interview-specific data with complete candidate data
            return {
              ...completeCandidateData, // Complete candidate data (including resume_url)
              ...invitedCandidate, // Interview-specific data (interview_status, room_url, etc.)
            };
          }
        );
        setInvitedCandidates(mergedInvitedCandidates);
      } else {
        setInvitedCandidates(details.candidates.invited || []);
      }

      // Don't set availableCandidates from backend - we fetch them manually

      // Set skills and duration from the flow data
      if (details.skills && details.skills.length > 0) {
        setSelectedSkills(details.skills);
        setExtractedSkills(details.skills);
      }

      // Set timer duration from flow data
      if (details.duration) {
        setSelectedTimer(details.duration);
      }

      // Set process stages from the job data (stored in jobs table as jsonb)
      if (details.job && (details.job as any).process_stages) {
        setProcessStages((details.job as any).process_stages);
      } else {
        // If no process stages are stored, set reasonable defaults
        setProcessStages({
          phoneInterview: true,
          assessments: true,
          aiInterviewer: true,
        });
      }

      // Set phone screen questions from the job data (stored in jobs table as jsonb)
      if (details.job && (details.job as any).phone_screen_questions) {
        setPhoneScreenQuestions((details.job as any).phone_screen_questions);
      } else {
        setPhoneScreenQuestions([]);
      }
    }
  }, [details, allCandidates]);

  const handleSaveChanges = async () => {
    const user_id = getCookie("user_id");
    const organization_id = getCookie("organization_id");

    if (!user_id || !organization_id) {
      toast({
        title: "Authentication Error",
        description: "Missing user or organization information",
      });
      return;
    }

    setSaving(true);

    try {
      // Generate new flow data with updated skills and duration
      const flowData = await fetch(
        `${coreBackendUrl}/api/v1/generate_interview_flow_from_description`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            job_role: job?.title || "",
            job_description: job?.description || "",
            skills: selectedSkills,
            duration: selectedTimer,
          }),
        }
      );

      if (!flowData.ok) {
        throw new Error(`Flow generation failed: ${flowData.status}`);
      }

      const flowDataJson = await flowData.json();

      // Update the interview flow with new skills, duration and flow_json
      const flowUpdateData = {
        skills: selectedSkills,
        duration: selectedTimer,
        flow_json: flowDataJson,
      };

      // Find the flow_id from the job details
      const flowId = (details?.job as any)?.flow_id;
      if (!flowId) {
        throw new Error("Could not find interview flow ID");
      }

      const flowResponse = await authenticatedFetch(
        `${siveraBackendUrl}/api/v1/interviews/interview-flows/${flowId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(flowUpdateData),
        }
      );

      if (!flowResponse.ok) {
        const errorText = await flowResponse.text();
        throw new Error(
          `Flow update failed: ${flowResponse.status} - ${errorText}`
        );
      }

      // Update the job with process stages and phone screen questions (stored as JSONB in jobs table)
      const jobUpdateData = {
        process_stages: processStages,
        phone_screen_questions: phoneScreenQuestions,
      };

      const jobResponse = await authenticatedFetch(
        `${siveraBackendUrl}/api/v1/interviews/jobs/${job?.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(jobUpdateData),
        }
      );

      if (!jobResponse.ok) {
        const errorText = await jobResponse.text();
        throw new Error(
          `Job update failed: ${jobResponse.status} - ${errorText}`
        );
      }

      toast({
        title: "Success!",
        description: "Interview settings updated successfully",
      });

      // Refresh the data
      window.location.reload();
    } catch (error) {
      console.error("Error updating interview:", error);
      toast({
        title: "Error updating interview",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInvitesSent = () => {
    // Refresh the data after invites are sent
    window.location.reload();
  };

  // Fetch available candidates for bulk invite
  const fetchAvailableCandidates = async () => {
    if (!job?.id) {
      toast({
        title: "Error",
        description: "No job_id found for this interview",
      });
      return;
    }

    setLoadingCandidates(true);
    try {
      // Directly fetch candidates by job_id - much simpler approach
      const candidatesResp = await authenticatedFetch(
        `${siveraBackendUrl}/api/v1/candidates/by-job/${job.id}`
      );

      if (!candidatesResp.ok) {
        if (candidatesResp.status === 404) {
          // No candidates found for this job
          setAvailableCandidates([]);
          setBulkInviteOpen(true);
          return;
        }
        throw new Error(`Failed to fetch candidates: ${candidatesResp.status}`);
      }

      const allCandidates = await candidatesResp.json();

      // Show all candidates - the dialog can handle filtering if needed
      setAvailableCandidates(allCandidates || []);
      setBulkInviteOpen(true);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch candidates";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoadingCandidates(false);
    }
  };

  // Get candidates available for bulk invite (not already invited)
  const getAvailableCandidates = () => {
    return availableCandidates;
  };

  // Handle sending interview invite to a candidate
  const handleSendInvite = async (candidate: any) => {
    toast({
      title: "Sending invitation...",
      description: `Sending interview invitation to ${candidate.email}`,
    });

    try {
      // Get current user context from cookies
      const userContext = getUserContext();
      const organizationId =
        candidate.organization_id || userContext?.organization_id;
      const senderId = userContext?.user_id;

      if (!organizationId) {
        toast({
          title: "Organization not found",
          description:
            "Your organization information is missing. Please log in again.",
        });
        return;
      }

      const res = await authenticatedFetch(
        `${siveraBackendUrl}/api/v1/interviews/send-invite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: candidate.email,
            name: candidate.name,
            job: job?.title || "",
            organization_id: organizationId,
            sender_id: senderId || "system",
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        toast({
          title: "Interview invitation sent",
          description: `Interview invitation sent to ${candidate.email}`,
        });
        // Close the dialog after successful invite
        setSelectedCandidate(null);
        // Refresh the data
        window.location.reload();
      } else {
        toast({
          title: "Failed to send invite",
          description: data.error || "Unknown error",
        });
      }
    } catch (err: any) {
      toast({
        title: "Failed to send invite",
        description: err.message,
      });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="flex items-center m-3 ml-0">
        <Button
          onClick={() => router.push("/dashboard/interviews")}
          variant="link"
          className="mr-2 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col justify-center gap-1">
          <h2 className="text-xl font-bold dark:text-white">
            {job?.title || "Loading..."}
          </h2>
          <h4 className="text-xs font-semibold opacity-50 dark:text-gray-300">
            Interview Details
          </h4>
        </div>
      </div>
      {loading ? (
        <div
          className="p-6 text-center text-gray-500 dark:text-gray-300 text-xs"
          style={{
            fontFamily: "KyivType Sans",
          }}
        >
          Loading interview...
        </div>
      ) : error ? (
        <div className="p-6 text-center text-red-500 dark:text-red-400">
          {error}
        </div>
      ) : (
        <>
          <div
            className="flex flex-col gap-6 px-4"
            style={{ minHeight: "calc(100vh - 100px)" }}
          >
            {/* Skills and Timer Configuration */}
            <Card className="rounded-lg bg-white dark:bg-gray-900 shadow border dark:border-gray-800">
              <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium tracking-tight dark:text-white">
                      Interview Configuration
                    </h2>
                    <p className="text-xs text-gray-500 font-semibold dark:text-gray-300">
                      Configure your interview settings and skills assessment.
                    </p>
                  </div>
                  {firstChange && (
                    <Button
                      onClick={handleSaveChanges}
                      disabled={saving}
                      variant="outline"
                      className="cursor-pointer border border-app-blue-500/80 dark:border-app-blue-400/80 hover:bg-app-blue-500/10 dark:hover:bg-app-blue-900/20 text-app-blue-5/00 dark:text-app-blue-3/00 hover:text-app-blue-6/00 dark:hover:text-app-blue-2/00 focus:ring-app-blue-5/00 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900"
                    >
                      {saving && (
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      )}
                      {!saving && <Save className="mr-2 h-4 w-4" />}
                      Save Changes
                    </Button>
                  )}
                </div>
              </div>
              <CardContent className="pt-6 space-y-6">
                {/* Process Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Route className="h-4 w-4" />
                    <label className="text-sm font-medium dark:text-gray-200">
                      Interview Process
                    </label>
                  </div>

                  <div className="flex justify-center">
                    <Carousel className="w-full max-w-md">
                      <CarouselContent>
                        {/* Phone Interview */}
                        <CarouselItem className="basis-1/3">
                          <div className="p-1">
                            <Card
                              className={`cursor-pointer transition-all duration-200 border border-gray-300 dark:border-gray-700 ${
                                processStages.phoneInterview
                                  ? "border-app-blue-500 bg-app-blue-50 dark:bg-app-blue-900/20"
                                  : "opacity-50 hover:opacity-70 hover:border-gray-400"
                              }`}
                              onClick={() =>
                                toggleProcessStage("phoneInterview")
                              }
                              title={`${
                                processStages.phoneInterview
                                  ? "Disable"
                                  : "Enable"
                              } Phone Interview`}
                            >
                              <CardContent className="flex aspect-square items-center justify-center p-6">
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <Phone
                                    className={`h-6 w-6 ${
                                      processStages.phoneInterview
                                        ? "text-app-blue-600 dark:text-app-blue-400"
                                        : "text-gray-400 dark:text-gray-500"
                                    }`}
                                  />
                                  <div className="text-center">
                                    <div
                                      className={`text-sm font-semibold ${
                                        processStages.phoneInterview
                                          ? "text-app-blue-600 dark:text-app-blue-400"
                                          : "text-gray-500 dark:text-gray-400"
                                      }`}
                                    >
                                      Phone
                                    </div>
                                    <div
                                      className={`text-xs ${
                                        processStages.phoneInterview
                                          ? "text-app-blue-500 dark:text-app-blue-300"
                                          : "text-gray-400 dark:text-gray-500"
                                      }`}
                                    >
                                      Interview
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </CarouselItem>

                        {/* Assessments */}
                        <CarouselItem className="basis-1/3">
                          <div className="p-1">
                            <Card
                              className={`cursor-pointer transition-all duration-200 border border-gray-300 dark:border-gray-700 ${
                                processStages.assessments
                                  ? "border-app-blue-500 bg-app-blue-50 dark:bg-app-blue-900/20"
                                  : "opacity-50 hover:opacity-70 hover:border-gray-400"
                              }`}
                              onClick={() => toggleProcessStage("assessments")}
                              title={`${
                                processStages.assessments ? "Disable" : "Enable"
                              } Technical Assessment`}
                            >
                              <CardContent className="flex aspect-square items-center justify-center p-6">
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <FileText
                                    className={`h-6 w-6 ${
                                      processStages.assessments
                                        ? "text-app-blue-600 dark:text-app-blue-400"
                                        : "text-gray-400 dark:text-gray-500"
                                    }`}
                                  />
                                  <div className="text-center">
                                    <div
                                      className={`text-sm font-semibold ${
                                        processStages.assessments
                                          ? "text-app-blue-600 dark:text-app-blue-400"
                                          : "text-gray-500 dark:text-gray-400"
                                      }`}
                                    >
                                      Technical
                                    </div>
                                    <div
                                      className={`text-xs ${
                                        processStages.assessments
                                          ? "text-app-blue-500 dark:text-app-blue-300"
                                          : "text-gray-400 dark:text-gray-500"
                                      }`}
                                    >
                                      Assessment
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </CarouselItem>

                        {/* AI Interviewer */}
                        <CarouselItem className="basis-1/3">
                          <div className="p-1">
                            <Card
                              className={`cursor-pointer transition-all duration-200 border border-gray-300 dark:border-gray-700 ${
                                processStages.aiInterviewer
                                  ? "border-app-blue-500 bg-app-blue-50 dark:bg-app-blue-900/20"
                                  : "opacity-50 hover:opacity-70 hover:border-gray-400"
                              }`}
                              onClick={() =>
                                toggleProcessStage("aiInterviewer")
                              }
                              title={`${
                                processStages.aiInterviewer
                                  ? "Disable"
                                  : "Enable"
                              } AI Interviewer`}
                            >
                              <CardContent className="flex aspect-square items-center justify-center p-6">
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <Bot
                                    className={`h-6 w-6 ${
                                      processStages.aiInterviewer
                                        ? "text-app-blue-600 dark:text-app-blue-400"
                                        : "text-gray-400 dark:text-gray-500"
                                    }`}
                                  />
                                  <div className="text-center">
                                    <div
                                      className={`text-sm font-semibold ${
                                        processStages.aiInterviewer
                                          ? "text-app-blue-600 dark:text-app-blue-400"
                                          : "text-gray-500 dark:text-gray-400"
                                      }`}
                                    >
                                      AI
                                    </div>
                                    <div
                                      className={`text-xs ${
                                        processStages.aiInterviewer
                                          ? "text-app-blue-500 dark:text-app-blue-300"
                                          : "text-gray-400 dark:text-gray-500"
                                      }`}
                                    >
                                      Interviewer
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </CarouselItem>
                      </CarouselContent>
                    </Carousel>
                  </div>

                  {/* Process Flow Indicator */}
                  <div className="flex justify-center">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium dark:text-gray-200">
                          Toggle the process stages you want.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phone Screen Questions Section */}
                {processStages.phoneInterview && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-app-blue-600 dark:text-app-blue-400" />
                        <label className="text-sm font-medium dark:text-gray-200">
                          Phone Screen Questions
                        </label>
                      </div>
                      {phoneScreenQuestions.length >= 5 && (
                        <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md">
                          Maximum questions reached (5)
                        </div>
                      )}
                    </div>

                    {/* Questions Container */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 p-4 space-y-4">
                      {/* Current Questions Display */}
                      {phoneScreenQuestions.length > 0 && (
                        <div className="space-y-3">
                          {phoneScreenQuestions.map((question, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow"
                            >
                              <span className="text-xs font-semibold text-app-blue-600 dark:text-app-blue-400 bg-app-blue-50 dark:bg-app-blue-900/30 rounded-full min-w-[24px] h-6 flex items-center justify-center mt-0.5">
                                {index + 1}
                              </span>
                              <span className="flex-1 text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                                {question}
                              </span>
                              <Button
                                onClick={() => removePhoneScreenQuestion(index)}
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 rounded-full shrink-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Empty State */}
                      {phoneScreenQuestions.length === 0 && (
                        <div className="text-center py-8">
                          <Phone className="mx-auto h-8 w-8 mb-3 text-gray-300 dark:text-gray-600" />
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                            No questions added yet
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Add up to 5 questions for phone screening
                          </p>
                        </div>
                      )}

                      {/* Add New Question */}
                      <div className="flex gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <Input
                          placeholder="Enter a phone screen question..."
                          value={newQuestion}
                          onChange={(e) => setNewQuestion(e.target.value)}
                          onKeyPress={handleQuestionKeyPress}
                          className="flex-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:border-app-blue-500 dark:focus:border-app-blue-400"
                          disabled={phoneScreenQuestions.length >= 5}
                        />
                        <Button
                          onClick={addPhoneScreenQuestion}
                          variant="outline"
                          size="sm"
                          disabled={
                            !newQuestion.trim() ||
                            phoneScreenQuestions.length >= 5
                          }
                          className="cursor-pointer border border-app-blue-500/80 dark:border-app-blue-400/80 hover:bg-app-blue-500/10 dark:hover:bg-app-blue-900/20 text-app-blue-600 dark:text-app-blue-400 hover:text-app-blue-700 dark:hover:text-app-blue-300 px-4"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Skills Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-app-blue-600 dark:text-app-blue-400" />
                      <label className="text-sm font-medium dark:text-gray-200">
                        Skills
                      </label>
                    </div>
                    {selectedSkills.length >= 15 && (
                      <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md">
                        Maximum skills reached
                      </div>
                    )}
                  </div>

                  {/* Skills Container */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 p-4 space-y-4">
                    {/* Selected Skills Display */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2 min-h-[40px] items-center justify-center p-3">
                        {selectedSkills.map((skill) => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-app-blue-50 text-app-blue-700 dark:bg-app-blue-900/40 dark:text-app-blue-300 border-app-blue-200 dark:border-app-blue-700 text-xs font-medium hover:bg-app-blue-100 dark:hover:bg-app-blue-900/60 transition-colors"
                          >
                            {skill}
                            <button
                              onClick={() => removeSkill(skill)}
                              className="ml-0.5 hover:bg-app-blue-200 dark:hover:bg-app-blue-800 rounded-full p-0.5 cursor-pointer transition-colors"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        ))}
                        {selectedSkills.length === 0 && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center w-full py-2 font-medium">
                            No skills selected
                          </div>
                        )}
                      </div>

                      {/* Divider */}
                      <div className="border-t border-gray-200 dark:border-gray-700"></div>
                    </div>

                    {/* Available Skills */}
                    {extractedSkills.length > 0 && (
                      <div className="space-y-3">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          Available Skills (click to add)
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {extractedSkills
                            .filter((skill) => !selectedSkills.includes(skill))
                            .map((skill) => (
                              <Badge
                                key={skill}
                                variant="outline"
                                className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-700 ${
                                  selectedSkills.length >= 15
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                                onClick={() => toggleSkill(skill)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {skill}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Add Custom Skill */}
                    <div className="flex gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <Input
                        placeholder="Add custom skill..."
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" && addCustomSkill()
                        }
                        className="flex-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:border-app-blue-500 dark:focus:border-app-blue-400"
                        disabled={selectedSkills.length >= 15}
                      />
                      <Button
                        onClick={addCustomSkill}
                        variant="outline"
                        size="sm"
                        disabled={
                          !newSkill.trim() || selectedSkills.length >= 15
                        }
                        className="cursor-pointer border border-app-blue-500/80 dark:border-app-blue-400/80 hover:bg-app-blue-500/10 dark:hover:bg-app-blue-900/20 text-app-blue-600 dark:text-app-blue-400 hover:text-app-blue-700 dark:hover:text-app-blue-300 px-4"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Timer Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium dark:text-gray-200 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Interview duration
                    </label>
                  </div>

                  <div className="flex justify-center">
                    <Carousel className="w-full max-w-xs">
                      <CarouselContent>
                        {timerOptions.map((time) => {
                          const status = getTimerStatus(time);
                          return (
                            <CarouselItem key={time} className="basis-1/3">
                              <div className="p-1">
                                <Card
                                  className={`cursor-pointer transition-all duration-200 border border-gray-300 dark:border-gray-700 ${
                                    selectedTimer === time
                                      ? "border-app-blue-500 bg-app-blue-50 dark:bg-app-blue-900/20"
                                      : status.disabled
                                      ? "opacity-40 cursor-not-allowed border-gray-200 bg-gray-50 dark:bg-gray-800/30 dark:border-gray-800"
                                      : "hover:border-gray-400"
                                  }`}
                                  onClick={() => {
                                    if (!status.disabled) {
                                      setSelectedTimer(time);
                                      setFirstChange(true);
                                    }
                                  }}
                                  title={
                                    status.disabled
                                      ? status.reason
                                      : `Select ${time} minutes`
                                  }
                                >
                                  <CardContent className="flex aspect-square items-center justify-center p-6">
                                    <span
                                      className={`text-2xl font-semibold flex flex-col items-center justify-center ${
                                        selectedTimer === time
                                          ? "text-app-blue-600 dark:text-app-blue-400"
                                          : status.disabled
                                          ? "text-gray-400 dark:text-gray-600"
                                          : "text-gray-700 dark:text-gray-300"
                                      }`}
                                    >
                                      <div className="text-2xl font-semibold">
                                        {time}
                                      </div>
                                      <div className="text-xs">minutes</div>
                                    </span>
                                  </CardContent>
                                </Card>
                              </div>
                            </CarouselItem>
                          );
                        })}
                      </CarouselContent>
                    </Carousel>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Candidates Section */}
            <div className="w-full">
              <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                <CardContent className="py-4 px-3">
                  <div className="m-5 mt-0 flex items-center justify-between">
                    <h3 className="font-semibold mb-2 dark:text-white">
                      Candidates
                    </h3>
                    <div className="flex items-center gap-2">
                      <Select
                        value={interviewStatus}
                        onValueChange={async (
                          value: "draft" | "active" | "completed"
                        ) => {
                          try {
                            await updateInterviewStatus(id as string, value);
                            setInterviewStatus(value);
                            toast({
                              title: "Interview status updated",
                              description: `Status set to ${value}`,
                            });
                          } catch (err) {
                            const errorMessage =
                              err instanceof Error
                                ? err.message
                                : "Failed to update status";
                            toast({
                              title: "Failed to update status",
                              description: errorMessage,
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="w-[140px] ml-2">
                          <SelectValue placeholder="Interview Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Bulk Invite Button */}
                      <Button
                        onClick={fetchAvailableCandidates}
                        disabled={loadingCandidates}
                        className="cursor-pointer border border-app-blue-500/80 dark:border-app-blue-400/80 hover:bg-app-blue-500/10 dark:hover:bg-app-blue-900/20 text-app-blue-5/00 dark:text-app-blue-3/00 hover:text-app-blue-6/00 dark:hover:text-app-blue-2/00 focus:ring-app-blue-5/00 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        variant="outline"
                      >
                        {loadingCandidates ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Invitations
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={() =>
                          router.push(
                            `/dashboard/candidates/invite?interview=${id}`
                          )
                        }
                        className="cursor-pointer border border-app-blue-500/80 dark:border-app-blue-400/80 hover:bg-app-blue-500/10 dark:hover:bg-app-blue-900/20 text-app-blue-5/00 dark:text-app-blue-3/00 hover:text-app-blue-6/00 dark:hover:text-app-blue-2/00 focus:ring-app-blue-5/00 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900"
                        variant="outline"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Candidate
                      </Button>
                    </div>
                  </div>
                  {invitedCandidates.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No candidates assigned
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        Get started by adding candidates to this interview.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table
                        className="min-w-full rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-800 table-fixed"
                        style={{ borderRadius: 12, overflow: "hidden" }}
                      >
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300 w-1/4 max-w-[180px] truncate">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300 w-1/3 max-w-[220px] truncate">
                              Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300 w-1/5 max-w-[120px] truncate">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                          {(showAllCandidates
                            ? invitedCandidates
                            : invitedCandidates.slice(0, 3)
                          ).map((candidate) => (
                            <tr
                              key={candidate.id}
                              className="transition-colors cursor-pointer hover:bg-app-blue-50/20 dark:hover:bg-app-blue-900/30"
                              onClick={() => setSelectedCandidate(candidate)}
                            >
                              <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white max-w-[180px] truncate overflow-hidden">
                                {candidate.name}
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 max-w-[220px] truncate overflow-hidden">
                                {candidate.email}
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap text-sm max-w-[120px] truncate overflow-hidden">
                                <span className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 rounded-full px-2 py-1 text-xs font-semibold truncate inline-block max-w-[100px] overflow-hidden">
                                  {candidate.interview_status ||
                                    candidate.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {invitedCandidates.length > 3 && !showAllCandidates && (
                        <div className="flex justify-center mt-2">
                          <Button
                            variant="outline"
                            className="text-app-blue-6/00 dark:text-app-blue-3/00 border-app-blue-400/80 hover:bg-app-blue-50/40 dark:hover:bg-app-blue-900/40 cursor-pointer"
                            onClick={() => setShowAllCandidates(true)}
                          >
                            View all
                          </Button>
                        </div>
                      )}
                      {invitedCandidates.length > 3 && showAllCandidates && (
                        <div className="flex justify-center mt-2">
                          <Button
                            variant="ghost"
                            className="text-gray-500 dark:text-gray-300 cursor-pointer"
                            onClick={() => setShowAllCandidates(false)}
                          >
                            Show less
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bulk Invite Dialog */}
          <BulkInviteDialog
            open={bulkInviteOpen}
            onOpenChange={setBulkInviteOpen}
            interviewId={id as string}
            jobTitle={job?.title || "Interview"}
            availableCandidates={getAvailableCandidates()}
            onInvitesSent={handleInvitesSent}
            organizationId={getUserContext()?.organization_id || ""}
          />

          {/* Candidate View Dialog */}
          {selectedCandidate && (
            <CandidateViewDialog
              candidate={selectedCandidate}
              onClose={() => setSelectedCandidate(null)}
              handleSendInvite={handleSendInvite}
            />
          )}
        </>
      )}
    </div>
  );
}
