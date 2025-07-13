"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import drag and drop components to avoid SSR issues
const DragDropContext = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.DragDropContext),
  { ssr: false }
);
const Droppable = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.Droppable),
  { ssr: false }
);
const Draggable = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.Draggable),
  { ssr: false }
);

import type { DropResult } from "@hello-pangea/dnd";
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
  Check,
  ArrowRight,
  GitBranch,
  Kanban,
  Search,
  Filter,
  MessageSquare,
  CheckSquare,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { updateInterviewStatus } from "@/lib/supabase-candidates";
import { useToast } from "@/hooks/use-toast";
import { BulkInviteDialog } from "@/components/ui/bulk-invite-dialog";
import { BulkPhoneScreenScheduler } from "@/components/ui/bulk-phone-screen-scheduler";
import { useInterviewDetails, useCandidates } from "@/hooks/useStores";
import {
  authenticatedFetch,
  getCookie,
  getUserContext,
} from "@/lib/auth-client";
import { PhoneInterviewSection } from "@/components/ui/phone-interview-section";
import { InterviewAnalytics } from "@/components/ui/interview-analytics";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Status badge color mapping using only app colors
const getCandidateStatusBadgeClass = (status: string) => {
  switch (status) {
    case "Applied":
      return "bg-app-blue-50/90 text-app-blue-600 border-app-blue-200/80";
    case "Screening":
      return "bg-app-blue-100/90 text-app-blue-700 border-app-blue-300/80";
    case "Interview_Scheduled":
    case "scheduled":
      return "bg-app-blue-200/90 text-app-blue-800 border-app-blue-400/80";
    case "Interviewed":
      return "bg-app-blue-200/80 text-app-blue-900 border-app-blue-500/80";
    case "completed":
      return "bg-app-blue-300/90 text-app-blue-900 border-app-blue-500/80";
    case "started":
      return "bg-app-blue-400/90 text-app-blue-900 border-app-blue-500/80";
    case "invited":
      return "bg-app-blue-100/90 text-app-blue-700 border-app-blue-300/80";
    case "Hired":
      return "bg-app-blue-500/90 text-white border-app-blue-600/80";
    case "On_Hold":
      return "bg-app-blue-800/20 text-app-blue-600 border-app-blue-700/50";
    case "Rejected":
      return "bg-app-blue-900/30 text-app-blue-400 border-app-blue-800/50";
    default:
      return "bg-app-blue-100/60 text-app-blue-700 border-app-blue-400/60";
  }
};

// Utility function to format status text consistently
const formatStatusText = (status: string) => {
  return status
    .replace(/_/g, " ") // Replace underscores with spaces
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Candidate View Dialog Component
const CandidateViewDialog = ({
  candidate,
  onClose,
  handleSendInvite,
  interviewId,
  candidateId,
}: {
  candidate: any;
  onClose: () => void;
  handleSendInvite: (candidate: any) => void;
  interviewId: string;
  candidateId: string;
}) => {
  const { toast } = useToast();
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const candidateStatus = candidate.status?.toLowerCase();
  const interviewStatus =
    candidateStatus === "invited"
      ? candidate.interview_status?.toLowerCase() || "invited"
      : candidateStatus;

  const siveraBackendUrl =
    process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL || "https://api.sivera.io";

  const handleShowAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const analytics = await authenticatedFetch(
        `${siveraBackendUrl}/api/v1/analytics/interview/${interviewId}/candidate/${candidateId}`
      );
      const data = await analytics.json();
      console.log("Debug - data:", data);
      setAnalyticsData(data.analytics);
      toast({
        title: "Analytics",
        description: "Analytics loaded successfully",
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics",
        variant: "destructive",
      });
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleViewMoreDetails = () => {
    toast({
      title: "More Details",
      description: "Detailed analytics view coming soon!",
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
              <Badge
                variant="outline"
                className={`${getCandidateStatusBadgeClass(
                  candidate.interview_status || candidate.status || "Applied"
                )} font-normal text-xs border-[0.5px] opacity-80`}
              >
                {formatStatusText(
                  candidate.interview_status || candidate.status || "Applied"
                )}
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
                    onClick={() => window.open(candidate.room_url, "_blank")}
                    className="cursor-pointer text-xs"
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
                {/* Analytics Section */}
                {!analyticsData ? (
                  <Button
                    variant="outline"
                    onClick={handleShowAnalytics}
                    disabled={loadingAnalytics}
                    className="cursor-pointer text-xs"
                  >
                    {loadingAnalytics ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading Analytics...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-4 w-4" />
                        Show Analytics
                      </>
                    )}
                  </Button>
                ) : (
                  <InterviewAnalytics analyticsData={analyticsData} />
                )}

                {/* View Detailed Analysis Button - Only show when analytics are displayed */}
                {analyticsData && (
                  <Button
                    variant="outline"
                    onClick={handleViewMoreDetails}
                    className="cursor-pointer text-xs"
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    View Detailed Analysis
                  </Button>
                )}
                {candidate.resume_url && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(candidate.resume_url, "_blank")}
                    className="cursor-pointer text-xs"
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
                      className="cursor-pointer text-xs"
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
                      className="cursor-pointer text-xs"
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
                      className="cursor-pointer text-xs"
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
                      className="cursor-pointer text-xs"
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
                      className="cursor-pointer text-xs"
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
                    className="cursor-pointer text-xs"
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
  ai_score?: number;
  skills?: string[];
  experience_years?: number;
  notes?: string;
  pipeline_stage?: string;
}

interface PipelineStage {
  id: string;
  title: string;
  type: "ai_interview" | "human_interview" | "accepted" | "rejected";
  candidates: Candidate[];
  round?: number;
}

interface PendingChange {
  type: "move" | "add_note" | "add_round" | "remove_round";
  candidateId?: string;
  sourceStageId?: string;
  destinationStageId?: string;
  note?: string;
  roundNumber?: number;
  stageId?: string;
  timestamp: number;
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
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);
  const [bulkPhoneScreenOpen, setBulkPhoneScreenOpen] = useState(false);
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
    humanInterview: false,
  });

  // Phone screen questions state
  const [phoneScreenQuestions, setPhoneScreenQuestions] = useState<string[]>(
    []
  );
  const [newQuestion, setNewQuestion] = useState("");

  // Pipeline state
  const [originalStages, setOriginalStages] = useState<PipelineStage[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [scoreFilter, setScoreFilter] = useState<number | null>(null);
  const [noteDialog, setNoteDialog] = useState<{
    open: boolean;
    candidate?: Candidate;
  }>({ open: false });
  const [newNote, setNewNote] = useState("");
  const [isDragDropReady, setIsDragDropReady] = useState(false);

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

  // Check if drag and drop components are ready
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDragDropReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Initialize pipeline stages
  useEffect(() => {
    if (invitedCandidates.length > 0) {
      // Categorize candidates based on their status
      const appliedCandidates: Candidate[] = [];
      const aiInterviewCandidates: Candidate[] = [];
      const humanInterviewCandidates: Candidate[] = [];
      const acceptedCandidates: Candidate[] = [];
      const rejectedCandidates: Candidate[] = [];

      invitedCandidates.forEach((candidate) => {
        const candidateWithExtras = {
          ...candidate,
          ai_score: Math.floor(Math.random() * 4) + 7, // Mock scores 7-10
          skills: ["React", "TypeScript", "Node.js"], // Mock skills
        };

        // Determine stage based on interview_status or status
        const status =
          candidate.interview_status?.toLowerCase() ||
          candidate.status?.toLowerCase();

        switch (status) {
          case "applied":
          case "screening":
          case "invited":
            appliedCandidates.push({
              ...candidateWithExtras,
              pipeline_stage: "applied",
            });
            break;
          case "interviewed":
          case "completed":
            aiInterviewCandidates.push({
              ...candidateWithExtras,
              pipeline_stage: "ai_interview",
            });
            break;
          case "interview_scheduled":
          case "scheduled":
          case "started":
            humanInterviewCandidates.push({
              ...candidateWithExtras,
              pipeline_stage: "human_interview_1",
            });
            break;
          case "hired":
            acceptedCandidates.push({
              ...candidateWithExtras,
              pipeline_stage: "accepted",
            });
            break;
          case "rejected":
          case "on_hold":
            rejectedCandidates.push({
              ...candidateWithExtras,
              pipeline_stage: "rejected",
            });
            break;
          default:
            // Default to applied for unknown statuses
            appliedCandidates.push({
              ...candidateWithExtras,
              pipeline_stage: "applied",
            });
            break;
        }
      });

      const initialStages: PipelineStage[] = [
        {
          id: "applied",
          title: "Applied",
          type: "ai_interview", // Using ai_interview type but could be a new "applied" type
          candidates: appliedCandidates,
        },
        {
          id: "ai_interview",
          title: "AI Interview",
          type: "ai_interview",
          candidates: aiInterviewCandidates,
        },
        {
          id: "human_interview_1",
          title: "Interview Round 1",
          type: "human_interview",
          round: 1,
          candidates: humanInterviewCandidates,
        },
        {
          id: "accepted",
          title: "Accepted",
          type: "accepted",
          candidates: acceptedCandidates,
        },
        {
          id: "rejected",
          title: "Rejected",
          type: "rejected",
          candidates: rejectedCandidates,
        },
      ];
      setStages(initialStages);
      setOriginalStages(JSON.parse(JSON.stringify(initialStages))); // Deep copy for original state
    }
  }, [invitedCandidates]);

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

  // Pipeline functions
  const addPendingChange = useCallback((change: PendingChange) => {
    setPendingChanges((prev) => [...prev, change]);
  }, []);

  const filteredStages = stages.map((stage) => ({
    ...stage,
    candidates: stage.candidates.filter((candidate) => {
      const matchesSearch =
        candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        candidate.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesScore =
        scoreFilter === null ||
        (candidate.ai_score && candidate.ai_score >= scoreFilter);
      return matchesSearch && matchesScore;
    }),
  }));

  const stageMoveCandidate = (
    candidate: Candidate,
    sourceStageId: string,
    destinationStageId: string
  ) => {
    // Add to pending changes
    addPendingChange({
      type: "move",
      candidateId: candidate.id,
      sourceStageId,
      destinationStageId,
      timestamp: Date.now(),
    });

    // Update visual state immediately for preview
    setStages((prev) => {
      const newStages = JSON.parse(JSON.stringify(prev)); // Deep copy
      const sourceStage = newStages.find(
        (s: PipelineStage) => s.id === sourceStageId
      );
      const destStage = newStages.find(
        (s: PipelineStage) => s.id === destinationStageId
      );

      if (sourceStage && destStage) {
        const candidateIndex = sourceStage.candidates.findIndex(
          (c: Candidate) => c.id === candidate.id
        );
        if (candidateIndex >= 0) {
          const [moved] = sourceStage.candidates.splice(candidateIndex, 1);
          destStage.candidates.push({
            ...moved,
            pipeline_stage: destinationStageId,
          });
        }
      }

      return newStages;
    });
  };

  const handleMove = (candidate: Candidate, direction: "next" | "prev") => {
    const currentStageIndex = stages.findIndex((s) =>
      s.candidates.some((c) => c.id === candidate.id)
    );

    if (currentStageIndex === -1) return;

    const targetIndex =
      direction === "next" ? currentStageIndex + 1 : currentStageIndex - 1;

    if (targetIndex < 0 || targetIndex >= stages.length) {
      toast({
        title: "Cannot move",
        description: `Cannot move ${
          direction === "next" ? "forward" : "backward"
        } from this stage`,
        variant: "destructive",
      });
      return;
    }

    const sourceStageId = stages[currentStageIndex].id;
    const destinationStageId = stages[targetIndex].id;

    stageMoveCandidate(candidate, sourceStageId, destinationStageId);
  };

  const handleSelect = (candidate: Candidate, isSelected: boolean) => {
    setSelectedCandidates((prev) => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(candidate.id);
      } else {
        newSet.delete(candidate.id);
      }
      return newSet;
    });
  };

  const handleBulkSelection = (scoreThreshold: number) => {
    const candidatesAboveScore = stages
      .flatMap((stage) => stage.candidates)
      .filter(
        (candidate) =>
          candidate.ai_score && candidate.ai_score >= scoreThreshold
      )
      .map((candidate) => candidate.id);

    setSelectedCandidates(new Set(candidatesAboveScore));
    toast({
      title: "Bulk selection",
      description: `Selected ${candidatesAboveScore.length} candidates with score ≥ ${scoreThreshold}`,
    });
  };

  const handleQuickAction = (action: string, candidate: Candidate) => {
    switch (action) {
      case "next_round":
        const currentStage = stages.find((s) =>
          s.candidates.some((c) => c.id === candidate.id)
        );
        if (currentStage) {
          const currentIndex = stages.findIndex(
            (s) => s.id === currentStage.id
          );
          const nextStage = stages[currentIndex + 1];
          if (nextStage) {
            stageMoveCandidate(candidate, currentStage.id, nextStage.id);
          } else {
            toast({
              title: "Cannot move",
              description: "No next stage available",
              variant: "destructive",
            });
          }
        }
        break;
      case "schedule":
        toast({
          title: "Schedule Interview",
          description: `Scheduling interview for ${candidate.name}`,
        });
        break;
      case "add_note":
        setNewNote(candidate.notes || ""); // Pre-populate with existing notes if any
        setNoteDialog({ open: true, candidate });
        break;
    }
  };

  const addHumanInterviewRound = () => {
    const humanInterviewStages = stages.filter(
      (s) => s.type === "human_interview"
    );

    // Find the next available round number
    const existingRounds = humanInterviewStages
      .map((s) => s.round || 0)
      .filter((r) => r > 0)
      .sort((a, b) => a - b);

    let nextRound = 1;
    for (const round of existingRounds) {
      if (round === nextRound) {
        nextRound++;
      } else {
        break;
      }
    }

    const newStageId = `human_interview_${nextRound}`;

    // Check if this stage was previously removed - if so, just remove the remove change
    const existingRemoveChange = pendingChanges.find(
      (change) =>
        change.type === "remove_round" && change.stageId === newStageId
    );

    if (existingRemoveChange) {
      // Cancel out the remove by removing it from pending changes
      setPendingChanges((prev) =>
        prev.filter((c) => c !== existingRemoveChange)
      );

      // Add the stage back to visual state if it's not already there
      const stageExists = stages.some((s) => s.id === newStageId);
      if (!stageExists) {
        setStages((prev) => {
          const newStages = [...prev];
          const insertIndex = newStages.findIndex((s) => s.id === "accepted");

          newStages.splice(insertIndex, 0, {
            id: newStageId,
            title: `Human Interview\nround ${nextRound}`,
            type: "human_interview",
            round: nextRound,
            candidates: [],
          });

          return newStages;
        });
      }
    } else {
      // Add new stage
      addPendingChange({
        type: "add_round",
        stageId: newStageId,
        roundNumber: nextRound,
        timestamp: Date.now(),
      });

      setStages((prev) => {
        const newStages = [...prev];
        const insertIndex = newStages.findIndex((s) => s.id === "accepted");

        newStages.splice(insertIndex, 0, {
          id: newStageId,
          title: `Interview Round ${nextRound}`,
          type: "human_interview",
          round: nextRound,
          candidates: [],
        });

        return newStages;
      });
    }
  };

  const removeHumanInterviewRound = (stageId: string) => {
    const stageToRemove = stages.find((s) => s.id === stageId);

    if (!stageToRemove) return;

    // Check if there are candidates in this stage
    if (stageToRemove.candidates.length > 0) {
      toast({
        title: "Cannot remove round",
        description: `Cannot remove round with ${
          stageToRemove.candidates.length
        } candidate${
          stageToRemove.candidates.length !== 1 ? "s" : ""
        }. Move candidates first.`,
        variant: "destructive",
      });
      return;
    }

    // Check if this stage was previously added - if so, just remove the add change
    const existingAddChange = pendingChanges.find(
      (change) => change.type === "add_round" && change.stageId === stageId
    );

    if (existingAddChange) {
      // Cancel out the add by removing it from pending changes
      setPendingChanges((prev) => prev.filter((c) => c !== existingAddChange));
    } else {
      // Mark existing stage for removal
      addPendingChange({
        type: "remove_round",
        stageId: stageId,
        roundNumber: stageToRemove.round,
        timestamp: Date.now(),
      });
    }

    // Remove the stage from visual state
    setStages((prev) => prev.filter((s) => s.id !== stageId));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const { source, destination, draggableId } = result;

    // If dropped in the same place, do nothing
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Find the candidate
    const sourceStage = stages.find((s) => s.id === source.droppableId);
    const candidate = sourceStage?.candidates.find((c) => c.id === draggableId);

    if (candidate) {
      stageMoveCandidate(
        candidate,
        source.droppableId,
        destination.droppableId
      );
    }
  };

  const saveNote = () => {
    if (noteDialog.candidate && newNote.trim()) {
      addPendingChange({
        type: "add_note",
        candidateId: noteDialog.candidate.id,
        note: newNote.trim(),
        timestamp: Date.now(),
      });

      // Update visual state immediately
      setStages((prev) => {
        const newStages = JSON.parse(JSON.stringify(prev)); // Deep copy
        const stageIndex = newStages.findIndex((s: PipelineStage) =>
          s.candidates.some((c: Candidate) => c.id === noteDialog.candidate?.id)
        );

        if (stageIndex >= 0) {
          const candidateIndex = newStages[stageIndex].candidates.findIndex(
            (c: Candidate) => c.id === noteDialog.candidate?.id
          );

          if (candidateIndex >= 0) {
            newStages[stageIndex].candidates[candidateIndex] = {
              ...newStages[stageIndex].candidates[candidateIndex],
              notes: newNote.trim(),
            };
          }
        }

        return newStages;
      });

      setNoteDialog({ open: false });
      setNewNote("");
    }
  };

  const saveAllChanges = async () => {
    if (pendingChanges.length === 0) {
      toast({
        title: "No changes",
        description: "No changes to save",
      });
      return;
    }

    // Here you would make API calls to save the changes
    // For now, we'll just simulate the save and update the original state
    setOriginalStages(JSON.parse(JSON.stringify(stages)));
    setPendingChanges([]);

    const addedRounds = pendingChanges.filter(
      (c) => c.type === "add_round"
    ).length;
    const removedRounds = pendingChanges.filter(
      (c) => c.type === "remove_round"
    ).length;
    const movedCandidates = pendingChanges.filter(
      (c) => c.type === "move"
    ).length;
    const addedNotes = pendingChanges.filter(
      (c) => c.type === "add_note"
    ).length;

    let description = `${pendingChanges.length} changes saved`;
    const details = [];
    if (addedRounds > 0)
      details.push(`${addedRounds} round${addedRounds !== 1 ? "s" : ""} added`);
    if (removedRounds > 0)
      details.push(
        `${removedRounds} round${removedRounds !== 1 ? "s" : ""} removed`
      );
    if (movedCandidates > 0)
      details.push(
        `${movedCandidates} candidate${movedCandidates !== 1 ? "s" : ""} moved`
      );
    if (addedNotes > 0)
      details.push(`${addedNotes} note${addedNotes !== 1 ? "s" : ""} added`);

    if (details.length > 0) {
      description = details.join(", ");
    }

    toast({
      title: "Changes saved",
      description: description,
    });
  };

  const discardChanges = () => {
    // Reset to original state
    setStages(JSON.parse(JSON.stringify(originalStages)));
    setPendingChanges([]);
    setSelectedCandidates(new Set());

    toast({
      title: "Changes discarded",
      description: "All pending changes have been discarded",
    });
  };

  const hasUnsavedChanges = pendingChanges.length > 0;

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
          humanInterview: true,
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
      const shouldSendInvites = allCandidates.filter(
        (candidate: any) => candidate.status === "Applied"
      );

      setAvailableCandidates(shouldSendInvites || []);
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

  // CandidateCard Component
  const CandidateCard: React.FC<{
    candidate: Candidate;
    index: number;
    onQuickAction: (action: string, candidate: Candidate) => void;
    onSelect: (candidate: Candidate, isSelected: boolean) => void;
    isSelected: boolean;
    onMove: (candidate: Candidate, direction: "next" | "prev") => void;
    isDragDropReady?: boolean;
    hasChanges?: boolean;
  }> = ({
    candidate,
    index,
    onQuickAction,
    onSelect,
    isSelected,
    onMove,
    isDragDropReady = false,
    hasChanges = false,
  }) => {
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(candidate, !isSelected);
      }
    };

    const handleClick = (e: React.MouseEvent) => {
      // Don't toggle selection if clicking on action buttons or dropdown menus
      const target = e.target as HTMLElement;
      if (
        target.closest("button:not([data-radix-collection-item])") ||
        target.closest('[role="menuitem"]') ||
        target.closest("[data-radix-dropdown-menu-content]")
      ) {
        return;
      }
      onSelect(candidate, !isSelected);
    };

    const cardContent = (
      <div
        className={`relative bg-white dark:bg-gray-900 rounded-lg border p-3 mb-2 cursor-pointer transition-all duration-200 group select-none ${
          hasChanges
            ? "border-orange-400/60 bg-orange-50 dark:bg-orange-900/20"
            : isSelected
            ? "border-app-blue-500/60 bg-app-blue-50 dark:bg-app-blue-900/20"
            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
        } shadow-sm hover:shadow-md`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-selected={isSelected}
        title="Click to select candidate"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) =>
                onSelect(candidate, checked as boolean)
              }
              className="cursor-pointer"
            />
            <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
              {candidate.name.length > 15
                ? candidate.name.slice(0, 15) + "..."
                : candidate.name}
            </h4>
          </div>
          <div className="flex items-center gap-3 min-w-[85px] justify-end">
            <Badge
              variant="outline"
              className="text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAction("add_note", candidate);
              }}
            >
              <MessageSquare className="h-4 w-4" />
              {candidate.notes ? "Edit Note" : "Add Note"}
            </Badge>
            <div className="gap-1 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(candidate, "prev");
                }}
                title="Move to previous stage"
              >
                <ArrowLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(candidate, "next");
                }}
                title="Move to next stage"
              >
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">
          {candidate.email}
        </p>

        {/* Content area with space for bottom-right score */}
        <div className="pr-12">
          {candidate.notes && (
            <Badge variant="outline" className="my-1">
              Has Notes
            </Badge>
          )}
        </div>

        {/* Score positioned at bottom right */}
        {candidate.ai_score && (
          <div className="absolute bottom-3.5 right-3.5">
            <div className="w-10 h-10">
              <svg
                className="w-10 h-10 transform -rotate-90"
                viewBox="0 0 36 36"
              >
                {/* Background circle */}
                <path
                  d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-slate-200 dark:text-slate-700"
                />
                {/* Progress circle */}
                <path
                  d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${(candidate.ai_score / 10) * 100}, 100`}
                  strokeLinecap="round"
                  className={
                    candidate.ai_score >= 8
                      ? "text-emerald-500/60"
                      : candidate.ai_score >= 6
                      ? "text-amber-500/60"
                      : "text-rose-500/60"
                  }
                />
              </svg>
              {/* Score text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={`text-sm font-bold tracking-tight ${
                    candidate.ai_score >= 8
                      ? "text-emerald-600/60 dark:text-emerald-400/60"
                      : candidate.ai_score >= 6
                      ? "text-amber-600/60 dark:text-amber-400/60"
                      : "text-rose-600/60 dark:text-rose-400/60"
                  }`}
                >
                  {candidate.ai_score}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );

    if (isDragDropReady) {
      return (
        <Draggable draggableId={candidate.id} index={index}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              className={snapshot.isDragging ? "rotate-2 scale-105" : ""}
            >
              {cardContent}
            </div>
          )}
        </Draggable>
      );
    }

    return cardContent;
  };

  // PipelineColumn Component
  const PipelineColumn: React.FC<{
    stage: PipelineStage;
    onQuickAction: (action: string, candidate: Candidate) => void;
    onSelect: (candidate: Candidate, isSelected: boolean) => void;
    selectedCandidates: Set<string>;
    onAddRound?: () => void;
    onRemoveRound?: (stageId: string) => void;
    onMove: (candidate: Candidate, direction: "next" | "prev") => void;
    isDragDropReady?: boolean;
    pendingChanges: PendingChange[];
    isNewStage?: boolean;
    isRemovedStage?: boolean;
    canRemove?: boolean;
  }> = ({
    stage,
    onQuickAction,
    onSelect,
    selectedCandidates,
    onAddRound,
    onRemoveRound,
    onMove,
    isDragDropReady = false,
    pendingChanges,
    isNewStage = false,
    isRemovedStage = false,
    canRemove = false,
  }) => {
    // Check if this stage has any pending changes
    const hasStageChanges = pendingChanges.some(
      (change) =>
        change.type === "add_round" ||
        change.type === "remove_round" ||
        change.destinationStageId === stage.id ||
        change.sourceStageId === stage.id
    );

    return (
      <div
        className={`flex flex-col h-full min-w-[280px] flex-1 max-w-[400px] border-r border-gray-200 dark:border-gray-700`}
      >
        <div
          className={`flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0 ${
            hasStageChanges ? "bg-orange-50 dark:bg-orange-900/20" : ""
          }`}
        >
          <div>
            <h3 className="font-semibold text-sm">{stage.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {stage.candidates.length} candidate
              {stage.candidates.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {stage.type === "human_interview" &&
              onAddRound &&
              !isRemovedStage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onAddRound}
                  className="cursor-pointer text-xs"
                  title="Add another human interview round"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            {stage.type === "human_interview" &&
              canRemove &&
              onRemoveRound &&
              !isRemovedStage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveRound(stage.id)}
                  className="cursor-pointer text-xs"
                  title="Remove this interview round"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
          </div>
        </div>
        {isDragDropReady ? (
          <Droppable droppableId={stage.id}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`flex-1 p-3 overflow-y-auto transition-colors min-h-0 ${
                  snapshot.isDraggingOver
                    ? "bg-app-blue-50 dark:bg-app-blue-900/20"
                    : "bg-gray-50 dark:bg-gray-800"
                }`}
              >
                {stage.candidates.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-xs text-gray-400 dark:text-gray-500">
                    Empty
                  </div>
                ) : (
                  stage.candidates.map((candidate, index) => {
                    // Check if this candidate has pending changes
                    const candidateHasChanges = pendingChanges.some(
                      (change) => change.candidateId === candidate.id
                    );

                    return (
                      <CandidateCard
                        key={candidate.id}
                        candidate={candidate}
                        index={index}
                        onQuickAction={onQuickAction}
                        onSelect={onSelect}
                        isSelected={selectedCandidates.has(candidate.id)}
                        onMove={onMove}
                        isDragDropReady={isDragDropReady}
                        hasChanges={candidateHasChanges}
                      />
                    );
                  })
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ) : (
          <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 overflow-y-auto min-h-0">
            {stage.candidates.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-gray-400 dark:text-gray-500">
                Empty
              </div>
            ) : (
              stage.candidates.map((candidate, index) => {
                // Check if this candidate has pending changes
                const candidateHasChanges = pendingChanges.some(
                  (change) => change.candidateId === candidate.id
                );

                return (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    index={index}
                    onQuickAction={onQuickAction}
                    onSelect={onSelect}
                    isSelected={selectedCandidates.has(candidate.id)}
                    onMove={onMove}
                    isDragDropReady={isDragDropReady}
                    hasChanges={candidateHasChanges}
                  />
                );
              })
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-auto max-w-full min-w-0">
      <div className="flex items-center m-3 ml-0">
        <Button
          onClick={() => router.push("/dashboard/interviews")}
          variant="link"
          className="mr-2 cursor-pointer text-xs"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col justify-center gap-1">
          <h2 className="text-lg font-bold dark:text-white">
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
            className="flex flex-col gap-6 px-4 max-w-full overflow-x-hidden min-w-0"
            style={{ minHeight: "calc(100vh - 100px)" }}
          >
            {/* Skills and Timer Configuration */}
            <Card className="rounded-lg bg-white dark:bg-gray-900 shadow border dark:border-gray-800">
              <div className="border-b border-gray-200 dark:border-gray-800 px-6 pb-6">
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <h2 className="text-base font-medium tracking-tight dark:text-white">
                      Interview Configuration
                    </h2>
                    <p className="text-xs text-gray-500 font-semibold dark:text-gray-300">
                      Configure your interview settings and skills assessment.
                    </p>
                  </div>
                  <div className="flex flex-row items-center gap-3">
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
                      <SelectTrigger className="w-[8rem] cursor-pointer">
                        <SelectValue>
                          {interviewStatus.charAt(0).toUpperCase() +
                            interviewStatus.slice(1)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Current Status</SelectLabel>
                          <SelectItem
                            value="draft"
                            className="cursor-pointer flex items-center justify-between"
                          >
                            <span>Draft</span>
                          </SelectItem>
                          <SelectItem
                            value="active"
                            className="cursor-pointer flex items-center justify-between"
                          >
                            <span>Active</span>
                          </SelectItem>
                          <SelectItem
                            value="completed"
                            className="cursor-pointer flex items-center justify-between"
                          >
                            <span>Completed</span>
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {firstChange && (
                      <Button
                        onClick={handleSaveChanges}
                        disabled={saving}
                        variant="outline"
                        className="cursor-pointer text-xs"
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
                    <Carousel className="w-full max-w-2xl">
                      <CarouselContent>
                        {/* Phone Interview */}
                        <CarouselItem className="basis-1/4">
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
                        <CarouselItem className="basis-1/4">
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
                        <CarouselItem className="basis-1/4">
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
                                      Interview
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </CarouselItem>

                        {/* Human Interview */}
                        <CarouselItem className="basis-1/4">
                          <div className="p-1">
                            <Card
                              className={`cursor-pointer transition-all duration-200 border border-gray-300 dark:border-gray-700 ${
                                processStages.humanInterview
                                  ? "border-app-blue-500 bg-app-blue-50 dark:bg-app-blue-900/20"
                                  : "opacity-50 hover:opacity-70 hover:border-gray-400"
                              }`}
                              onClick={() =>
                                toggleProcessStage("humanInterview")
                              }
                              title={`${
                                processStages.humanInterview
                                  ? "Disable"
                                  : "Enable"
                              } Human Interview`}
                            >
                              <CardContent className="flex aspect-square items-center justify-center p-6">
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <Users
                                    className={`h-6 w-6 ${
                                      processStages.humanInterview
                                        ? "text-app-blue-600 dark:text-app-blue-400"
                                        : "text-gray-400 dark:text-gray-500"
                                    }`}
                                  />
                                  <div className="text-center">
                                    <div
                                      className={`text-sm font-semibold ${
                                        processStages.humanInterview
                                          ? "text-app-blue-600 dark:text-app-blue-400"
                                          : "text-gray-500 dark:text-gray-400"
                                      }`}
                                    >
                                      Human
                                    </div>
                                    <div
                                      className={`text-xs ${
                                        processStages.humanInterview
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
                          {extractedSkills.filter(
                            (skill) => !selectedSkills.includes(skill)
                          ).length === 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center w-full py-2 font-medium">
                              No skills to add
                            </div>
                          )}
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
                        disabled={
                          !newSkill.trim() || selectedSkills.length >= 15
                        }
                        className="cursor-pointer text-xs"
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
                      AI Interview duration
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
                                      className={`text-lg font-semibold flex flex-col items-center justify-center ${
                                        selectedTimer === time
                                          ? "text-app-blue-600 dark:text-app-blue-400"
                                          : status.disabled
                                          ? "text-gray-400 dark:text-gray-600"
                                          : "text-gray-700 dark:text-gray-300"
                                      }`}
                                    >
                                      <div className="text-lg font-semibold">
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

            {/* Phone Interview Section */}
            {job && (
              <PhoneInterviewSection
                jobId={job.id}
                isPhoneScreenEnabled={processStages.phoneInterview}
                phoneScreenQuestions={phoneScreenQuestions}
                onQuestionsChange={setPhoneScreenQuestions}
                onFirstChange={() => setFirstChange(true)}
                isEditable={true}
                bulkPhoneScreenOpen={bulkPhoneScreenOpen}
                setBulkPhoneScreenOpen={setBulkPhoneScreenOpen}
              />
            )}

            {/* Candidate Pipeline Section */}
            <div className="rounded-lg bg-white dark:bg-gray-900 shadow border dark:border-gray-800 max-w-full overflow-hidden">
              <div className="border-b border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-medium tracking-tight dark:text-white flex items-center gap-2">
                      Candidate Pipeline
                    </CardTitle>
                    <p className="text-xs text-gray-500 font-semibold dark:text-gray-300">
                      {job?.title}
                      <span className="mx-2">•</span>
                      {stages.reduce(
                        (acc, stage) => acc + stage.candidates.length,
                        0
                      )}{" "}
                      total candidates
                      {selectedCandidates.size > 0 && (
                        <>
                          <span className="mx-2">•</span>
                          <span className="text-app-blue-600 font-medium">
                            {selectedCandidates.size} selected
                          </span>
                        </>
                      )}
                      {hasUnsavedChanges && (
                        <>
                          <span className="mx-2">•</span>
                          <span className="text-app-blue-600 font-medium">
                            {pendingChanges.length} unsaved change
                            {pendingChanges.length !== 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasUnsavedChanges && (
                      <>
                        <Button
                          variant="outline"
                          onClick={discardChanges}
                          className="cursor-pointer text-xs"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Discard
                        </Button>
                        <Button
                          variant="outline"
                          onClick={saveAllChanges}
                          className="cursor-pointer text-xs"
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save Changes
                        </Button>
                      </>
                    )}

                    {/* Interview Invitations */}
                    <Button
                      onClick={fetchAvailableCandidates}
                      disabled={loadingCandidates}
                      className="cursor-pointer text-xs"
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
                      className="cursor-pointer text-xs"
                      variant="outline"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Candidate
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search candidates by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="cursor-pointer text-xs"
                      >
                        <Filter className="mr-2 h-4 w-4" />
                        Filters
                        {scoreFilter && (
                          <Badge variant="secondary" className="ml-2">
                            ≥{scoreFilter}
                          </Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setScoreFilter(null)}>
                        All Scores
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setScoreFilter(8)}>
                        Score ≥ 8
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setScoreFilter(6)}>
                        Score ≥ 6
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="cursor-pointer text-xs"
                      >
                        <CheckSquare className="mr-2 h-4 w-4" />
                        Bulk Select
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleBulkSelection(8)}>
                        Select all with score ≥ 8
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkSelection(6)}>
                        Select all with score ≥ 6
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setSelectedCandidates(new Set())}
                      >
                        Clear selection
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="p-0 m-0">
                {invitedCandidates.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500 mb-4" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      No candidates assigned
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      Get started by adding candidates to this interview.
                    </p>
                  </div>
                ) : (
                  <div className="w-full max-w-full overflow-hidden min-w-0">
                    <div className="h-[700px] w-full overflow-hidden relative">
                      {/* Pipeline Board */}
                      {isDragDropReady ? (
                        <DragDropContext onDragEnd={handleDragEnd}>
                          <div className="flex h-full w-full overflow-x-auto overflow-y-hidden absolute inset-0 bg-gray-100 dark:bg-gray-950">
                            {filteredStages.map((stage) => {
                              // Check the pending changes for this specific stage
                              const addChange = pendingChanges.find(
                                (change) =>
                                  change.type === "add_round" &&
                                  change.stageId === stage.id
                              );

                              const removeChange = pendingChanges.find(
                                (change) =>
                                  change.type === "remove_round" &&
                                  change.stageId === stage.id
                              );

                              const isNewStage = !!addChange && !removeChange;
                              const isRemovedStage =
                                !!removeChange && !addChange;

                              // Check if this stage can be removed (only the highest round)
                              const humanStages = filteredStages.filter(
                                (s) => s.type === "human_interview"
                              );
                              const highestRoundStage = humanStages.sort(
                                (a, b) => (b.round || 0) - (a.round || 0)
                              )[0];
                              const canRemove =
                                stage.type === "human_interview" &&
                                typeof stage.round === "number" &&
                                stage.round > 1 &&
                                stage.id === highestRoundStage?.id;

                              return (
                                <PipelineColumn
                                  key={stage.id}
                                  stage={stage}
                                  onQuickAction={handleQuickAction}
                                  onSelect={handleSelect}
                                  selectedCandidates={selectedCandidates}
                                  onMove={handleMove}
                                  isDragDropReady={isDragDropReady}
                                  pendingChanges={pendingChanges}
                                  isNewStage={isNewStage}
                                  isRemovedStage={isRemovedStage}
                                  canRemove={canRemove}
                                  onAddRound={
                                    stage.type === "human_interview" &&
                                    stage.id === highestRoundStage?.id
                                      ? addHumanInterviewRound
                                      : undefined
                                  }
                                  onRemoveRound={
                                    canRemove
                                      ? removeHumanInterviewRound
                                      : undefined
                                  }
                                />
                              );
                            })}
                          </div>
                        </DragDropContext>
                      ) : (
                        <div className="flex items-center justify-center h-32">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <span className="ml-2 text-sm text-gray-500">
                            Loading pipeline...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bulk Phone Screen Scheduler */}
          <BulkPhoneScreenScheduler
            open={bulkPhoneScreenOpen}
            onOpenChange={setBulkPhoneScreenOpen}
            jobId={job?.id || ""}
            jobTitle={job?.title || "Interview"}
            onScheduled={() => {
              // Refresh the data after phone screens are scheduled
              window.location.reload();
            }}
          />

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
              interviewId={id as string}
              candidateId={selectedCandidate.id}
            />
          )}

          {/* Note Dialog */}
          <Dialog
            open={noteDialog.open}
            onOpenChange={(open) => setNoteDialog({ open })}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {noteDialog.candidate?.notes ? "Edit Note" : "Add Note"}
                </DialogTitle>
                <DialogDescription>
                  {noteDialog.candidate?.notes
                    ? "Edit the note for"
                    : "Add a note for"}{" "}
                  {noteDialog.candidate?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Textarea
                  placeholder="Enter your note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={4}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setNoteDialog({ open: false })}
                  className="cursor-pointer text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={saveNote}
                  disabled={!newNote.trim()}
                  className="cursor-pointer text-xs"
                >
                  {noteDialog.candidate?.notes ? "Update Note" : "Add Note"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
