"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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

  Bot,
  Route,
  Search,
  Filter,
  CheckSquare,
  RotateCcw,
  ArrowRight,
  Check,
  Calendar as CalendarIcon,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
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
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { BulkInviteDialog } from "@/components/ui/bulk-invite-dialog";
import { BulkPhoneScreenScheduler } from "@/components/ui/bulk-phone-screen-scheduler";
import { BulkSelectDialog } from "@/components/ui/bulk-select-dialog";
import {
  useInterviewDetails,
  useCandidates,
  useInterviews,
} from "@/hooks/useStores";
import { useQueryClient } from "@tanstack/react-query";
import {
  authenticatedFetch,
  getCookie,
  getUserContext,
} from "@/lib/auth-client";
import { PhoneInterviewSection } from "@/components/ui/phone-interview-section";

import { useInterviewAnalytics } from "@/hooks/queries/useAnalytics";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAnalyticsStore } from "@/store/analytics-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PipelineColumn from "@/components/ui/PipelineColumn";

interface Candidate {
  id: string;
  name: string;
  phone?: string;
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
  linkedin_profile?: string;
}

interface PipelineStage {
  id: string;
  title: string;
  type: "ai_interview" | "human_interview" | "accepted" | "rejected";
  candidates: Candidate[];
  round?: number;
}

interface PendingChange {
  type:
    | "move"
    | "add_note"
    | "add_round"
    | "remove_round"
    | "send_email"
    | "update_status"
    | "update_num_rounds";
  candidateId?: string;
  sourceStageId?: string;
  destinationStageId?: string;
  note?: string;
  roundNumber?: number;
  stageId?: string;
  timestamp: number;
  // Email-specific fields
  email?: string;
  name?: string;
  emailType?: "ai_interview" | "human_interview" | "acceptance" | "rejection";
  stageType?: "ai_interview" | "human_interview" | "acceptance" | "rejection";
  // Status update fields
  newStatus?: string;
  // Num rounds update fields
  newNumRounds?: number;
  // Scheduling data for human interviews
  schedulingData?: InterviewSchedule;
}

interface Job {
  id: string;
  title: string;
  description?: string;
  organization_id?: string;
  num_rounds?: number;
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

// Human Interview Scheduling Interfaces
interface InterviewerAssignment {
  candidateId: string;
  interviewerId: string;
  interviewerName: string;
  interviewerEmail: string;
}

interface InterviewSchedule {
  interviewId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  date: string;
  time: string;
  duration: number; // in minutes
  interviewerName: string;
  interviewerEmail: string;
  timeZone: string;
  // Additional fields for global scheduling
  startDateTime: string; // ISO string for precise timezone handling
  endTime: string;
  intervalGap: number; // in minutes
  roundNumber: number;
}

interface CalculatedTimeSlot {
  interviewId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  interviewerName: string;
  date: Date;
  startTime: string;
  endTime: string;
  interviewerEmail: string;
  roundNumber: number;
}

interface HumanInterviewDialogData {
  interviewId: string;
  candidates: Candidate[];
  destinationStage: {
    id: string;
    title: string;
    round: number;
  };
  sourceStage: {
    id: string;
    title: string;
  };
  assignments: InterviewerAssignment[];
  schedules: InterviewSchedule[];
}

// Human Interview Scheduling Dialog Component
const HumanInterviewSchedulingDialog = ({
  open,
  onOpenChange,
  data,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: HumanInterviewDialogData | null;
  onComplete: (schedules: InterviewSchedule[]) => void;
}) => {
  // Using sonner toast directly
  const siveraBackendUrl =
    process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL || "https://api.sivera.io";
  const [currentPage, setCurrentPage] = useState<"assignments" | "scheduling">(
    "assignments"
  );
  const [assignments, setAssignments] = useState<InterviewerAssignment[]>([]);
  const [schedules, setSchedules] = useState<InterviewSchedule[]>([]);
  const [availableInterviewers, setAvailableInterviewers] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
    }>
  >([]);
  const [selectedInterviewers, setSelectedInterviewers] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
    }>
  >([]);
  const [isLoadingInterviewers, setIsLoadingInterviewers] = useState(false);

  // Scheduling state
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to?: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [commonDuration, setCommonDuration] = useState<number>(60);
  const [intervalTime, setIntervalTime] = useState<number>(10);
  const [calculatedSlots, setCalculatedSlots] = useState<CalculatedTimeSlot[]>(
    []
  );
  const [schedulingError, setSchedulingError] = useState<string>("");

  // Fetch organization users when dialog opens
  useEffect(() => {
    const fetchInterviewers = async () => {
      if (open && data) {
        setIsLoadingInterviewers(true);
        try {
          const userContext = getUserContext();
          if (userContext?.organization_id) {
            const response = await authenticatedFetch(
              `${siveraBackendUrl}/api/v1/organizations/${userContext.organization_id}/users`,
              { method: "GET" }
            );

            if (response.ok) {
              const users = await response.json();
              // Filter for users who could be interviewers (not just candidates)
              const interviewers = users.filter(
                (user: any) =>
                  user.role === "recruiter" ||
                  user.role === "admin" ||
                  user.role === "interviewer"
              );
              setAvailableInterviewers(interviewers);
            }
          }
        } catch (error) {
          console.error("Error fetching interviewers:", error);
          toast.error("Error loading interviewers", {
            description: "Could not load available interviewers",
          });
        } finally {
          setIsLoadingInterviewers(false);
        }
      }
    };

    fetchInterviewers();
  }, [open, data, siveraBackendUrl, toast]);

  // Initialize assignments and schedules when data changes
  useEffect(() => {
    if (data?.candidates) {
      const initialAssignments = data.candidates.map((candidate) => ({
        candidateId: candidate.id,
        interviewerId: "",
        interviewerName: "",
        interviewerEmail: "",
      }));

      const initialSchedules = data.candidates.map((candidate) => ({
        interviewId: data.interviewId,
        candidateId: candidate.id,
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        date: "",
        time: "",
        duration: 60, // Default 60 minutes
        interviewerName: "",
        interviewerEmail: "",
        timeZone: "",
        startDateTime: "",
        endTime: "",
        intervalGap: 10, // Default 10 minutes
        roundNumber: data.destinationStage.round,
      }));

      setAssignments(initialAssignments);
      setSchedules(initialSchedules);
    }
  }, [data]);

  const handleAddInterviewer = (interviewer: {
    id: string;
    name: string;
    email: string;
  }) => {
    // Check if interviewer is already in the selected list
    if (!selectedInterviewers.find((i) => i.id === interviewer.id)) {
      setSelectedInterviewers((prev) => [...prev, interviewer]);
    }
  };

  const handleRemoveInterviewer = (interviewerId: string) => {
    setSelectedInterviewers((prev) =>
      prev.filter((i) => i.id !== interviewerId)
    );
  };

  /**
   * Global Interview Scheduling Algorithm
   *
   * This algorithm creates a bulletproof schedule for sending interview links worldwide:
   * 1. Even distribution: Uses round-robin to balance interviewer workload
   * 2. Parallel interviews: Different interviewers can interview simultaneously
   * 3. No conflicts: Same interviewer never has overlapping interviews
   * 4. Proper gaps: Respects interval time between back-to-back interviews
   * 5. Timezone-aware: Generates ISO datetime strings for global compatibility
   * 6. Weekdays only: Automatically excludes weekends
   * 7. Business hours: Operates within 9 AM - 5 PM working hours
   */
  const calculateTimeSlots = useCallback(() => {
    if (
      !dateRange.from ||
      !dateRange.to ||
      !data?.candidates ||
      selectedInterviewers.length === 0
    ) {
      setCalculatedSlots([]);
      setSchedulingError("");
      return;
    }

    const startDate = new Date(dateRange.from);
    const endDate = new Date(dateRange.to);
    const candidates = data.candidates;
    const interviewers = selectedInterviewers;

    // Working hours configuration (9 AM to 5 PM)
    const workingStartHour = 9;
    const workingEndHour = 17;
    const workingMinutesPerDay = (workingEndHour - workingStartHour) * 60; // 480 minutes

    // Calculate available working days (excluding weekends)
    const availableDays: Date[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Exclude Sunday (0) and Saturday (6)
        availableDays.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate capacity
    const interviewsPerDayPerInterviewer = Math.floor(
      workingMinutesPerDay / (commonDuration + intervalTime)
    );
    const totalInterviewSlots =
      availableDays.length *
      interviewsPerDayPerInterviewer *
      interviewers.length;

    // Validate inputs for global scheduling
    if (candidates.length === 0) {
      setSchedulingError("No candidates to schedule interviews for.");
      setCalculatedSlots([]);
      return;
    }

    if (interviewers.length === 0) {
      setSchedulingError(
        "No interviewers selected. Please select at least one interviewer."
      );
      setCalculatedSlots([]);
      return;
    }

    if (availableDays.length === 0) {
      setSchedulingError(
        "No available working days in the selected date range. Please select a date range that includes weekdays."
      );
      setCalculatedSlots([]);
      return;
    }

    // Check if we have enough slots
    if (totalInterviewSlots < candidates.length) {
      setSchedulingError(
        `Not enough time slots available. Need ${candidates.length} slots but only ${totalInterviewSlots} available. ` +
          `Try increasing the date range (currently ${availableDays.length} working days), adding more interviewers (currently ${interviewers.length}), or reducing interview duration.`
      );
      setCalculatedSlots([]);
      return;
    }

    // Step 1: Distribute candidates evenly across interviewers using round-robin
    const candidateAssignments: Array<{
      candidate: any;
      interviewer: any;
    }> = [];

    candidates.forEach((candidate, index) => {
      const interviewerIndex = index % interviewers.length;
      candidateAssignments.push({
        candidate,
        interviewer: interviewers[interviewerIndex],
      });
    });

    // Step 2: Group assignments by interviewer for scheduling
    const interviewerSchedules: Map<
      string,
      Array<{ candidate: any; interviewer: any }>
    > = new Map();

    candidateAssignments.forEach((assignment) => {
      const interviewerKey = assignment.interviewer.id;
      if (!interviewerSchedules.has(interviewerKey)) {
        interviewerSchedules.set(interviewerKey, []);
      }
      interviewerSchedules.get(interviewerKey)!.push(assignment);
    });

    // Step 3: Schedule interviews for each interviewer across available days
    const slots: CalculatedTimeSlot[] = [];
    const currentDayIndex = 0;
    const currentSlotIndex = 0;

    // Create a schedule tracker for each interviewer
    const interviewerSlotTrackers: Map<
      string,
      { dayIndex: number; slotIndex: number }
    > = new Map();
    interviewers.forEach((interviewer) => {
      interviewerSlotTrackers.set(interviewer.id, {
        dayIndex: 0,
        slotIndex: 0,
      });
    });

    candidateAssignments.forEach((assignment) => {
      const { candidate, interviewer } = assignment;
      const tracker = interviewerSlotTrackers.get(interviewer.id)!;

      // Find next available slot for this interviewer
      let dayIndex = tracker.dayIndex;
      let slotIndex = tracker.slotIndex;

      // If we've exceeded slots for current day, move to next day
      if (slotIndex >= interviewsPerDayPerInterviewer) {
        dayIndex++;
        slotIndex = 0;
      }

      // Ensure we don't exceed available days
      if (dayIndex >= availableDays.length) {
        // This shouldn't happen if capacity calculation is correct
        console.warn(
          "Exceeded available days for interviewer:",
          interviewer.name
        );
        return;
      }

      const day = availableDays[dayIndex];
      const startTimeMinutes =
        workingStartHour * 60 + slotIndex * (commonDuration + intervalTime);
      const endTimeMinutes = startTimeMinutes + commonDuration;

      const startHour = Math.floor(startTimeMinutes / 60);
      const startMinute = startTimeMinutes % 60;
      const endHour = Math.floor(endTimeMinutes / 60);
      const endMinute = endTimeMinutes % 60;

      const startTime = `${startHour.toString().padStart(2, "0")}:${startMinute
        .toString()
        .padStart(2, "0")}`;
      const endTime = `${endHour.toString().padStart(2, "0")}:${endMinute
        .toString()
        .padStart(2, "0")}`;

      slots.push({
        interviewId: data.interviewId,
        candidateId: candidate.id,
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        interviewerName: interviewer.name,
        interviewerEmail: interviewer.email,
        date: new Date(day),
        startTime,
        endTime,
        roundNumber: data.destinationStage.round,
      });

      // Update tracker for this interviewer
      tracker.slotIndex = slotIndex + 1;
      tracker.dayIndex = dayIndex;
      interviewerSlotTrackers.set(interviewer.id, tracker);
    });

    setCalculatedSlots(slots);

    // Automatically update assignments based on calculated slots
    const autoAssignments = slots.map((slot) => ({
      interviewId: slot.interviewId,
      candidateId: slot.candidateId,
      interviewerId:
        selectedInterviewers.find((i) => i.name === slot.interviewerName)?.id ||
        "",
      interviewerName: slot.interviewerName,
      interviewerEmail: slot.interviewerEmail,
    }));
    setAssignments(autoAssignments);

    setSchedulingError("");
  }, [
    dateRange,
    commonDuration,
    intervalTime,
    data?.candidates,
    selectedInterviewers,
  ]);

  // Recalculate slots when dependencies change
  useEffect(() => {
    calculateTimeSlots();
  }, [calculateTimeSlots]);

  const updateAssignment = (candidateId: string, interviewerId: string) => {
    const interviewer = selectedInterviewers.find(
      (i) => i.id === interviewerId
    );
    if (!interviewer) return;

    setAssignments((prev) =>
      prev.map((assignment) =>
        assignment.candidateId === candidateId
          ? {
              ...assignment,
              interviewerId: interviewer.id,
              interviewerName: interviewer.name,
              interviewerEmail: interviewer.email,
            }
          : assignment
      )
    );
  };

  const updateSchedule = (
    candidateId: string,
    field: keyof InterviewSchedule,
    value: string | number
  ) => {
    setSchedules((prev) =>
      prev.map((schedule) =>
        schedule.candidateId === candidateId
          ? { ...schedule, [field]: value }
          : schedule
      )
    );
  };

  const canProceedToScheduling = selectedInterviewers.length > 0;
  const canComplete =
    dateRange.from &&
    dateRange.to &&
    calculatedSlots.length > 0 &&
    schedulingError === "" &&
    canProceedToScheduling;

  const handleComplete = () => {
    if (canComplete) {
      // Get the user's timezone for proper scheduling across timezones
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const convertedSchedules: InterviewSchedule[] = calculatedSlots.map(
        (slot) => {
          // Create a proper datetime object for the interview
          // This ensures consistent timezone handling for global scheduling
          const [hours, minutes] = slot.startTime.split(":").map(Number);
          const interviewDateTime = new Date(slot.date);
          interviewDateTime.setHours(hours, minutes, 0, 0);

          // Validate datetime for global reliability
          if (isNaN(interviewDateTime.getTime())) {
            console.error("Invalid interview datetime:", slot);
            // Fallback to current time if parsing fails
            const fallbackDateTime = new Date();
            fallbackDateTime.setHours(hours, minutes, 0, 0);
            interviewDateTime.setTime(fallbackDateTime.getTime());
          }

          return {
            interviewId: slot.interviewId,
            candidateId: slot.candidateId,
            candidateName: slot.candidateName,
            candidateEmail: slot.candidateEmail,
            date: slot.date.toISOString().split("T")[0],
            time: slot.startTime,
            duration: commonDuration,
            interviewerName: slot.interviewerName,
            interviewerEmail: slot.interviewerEmail,
            timeZone: userTimeZone,
            startDateTime: interviewDateTime.toISOString(),
            endTime: slot.endTime,
            intervalGap: intervalTime,
            roundNumber: slot.roundNumber,
          };
        }
      );

      onComplete(convertedSchedules);
      onOpenChange(false);
      setCurrentPage("assignments");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setCurrentPage("assignments");
    setAssignments([]);
    setSchedules([]);
    setIsLoadingInterviewers(false);
  };

  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-app-blue-600" />
            Schedule {data.destinationStage.title}
          </DialogTitle>
          <DialogDescription>
            Configure interviewer assignments and scheduling.
          </DialogDescription>
        </DialogHeader>

        {/* Page Navigation */}
        <div className="flex items-center justify-center my-4">
          <div className="flex items-center space-x-7">
            <div
              className={`flex items-center space-x-2 ${
                currentPage === "assignments"
                  ? "text-app-blue-600"
                  : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentPage === "assignments"
                    ? "bg-app-blue-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                1
              </div>
              <span className="text-sm font-medium">Select Interviewers</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div
              className={`flex items-center space-x-2 ${
                currentPage === "scheduling"
                  ? "text-app-blue-600"
                  : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentPage === "scheduling"
                    ? "bg-app-blue-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                2
              </div>
              <span className="text-sm font-medium">Schedule Interviews</span>
            </div>
          </div>
        </div>

        {/* Page 1: Interviewer Assignments */}
        {currentPage === "assignments" && (
          <div className="space-y-6">
            {/* Available Organization Members */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-medium mb-3">Organization Members</h3>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {isLoadingInterviewers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-xs text-gray-500">
                      Loading interviewers...
                    </span>
                  </div>
                ) : (
                  <>
                    {availableInterviewers
                      .filter(
                        (interviewer) =>
                          !selectedInterviewers.find(
                            (selected) => selected.id === interviewer.id
                          )
                      )
                      .map((interviewer) => (
                        <div
                          key={interviewer.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <div>
                            <div className="text-xs font-medium">
                              {interviewer.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {interviewer.email}
                            </div>
                          </div>
                          <Button
                            onClick={() => handleAddInterviewer(interviewer)}
                            variant="outline"
                            size="sm"
                            className="cursor-pointer text-xs"
                          >
                            Add
                          </Button>
                        </div>
                      ))}

                    {availableInterviewers.filter(
                      (interviewer) =>
                        !selectedInterviewers.find(
                          (selected) => selected.id === interviewer.id
                        )
                    ).length === 0 && (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        All members have been added as interviewers
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Interviewer selection and random assignment */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-medium mb-3">
                Interviewer Selection
              </h3>

              {/* Selected interviewers list */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Selected Interviewers
                  </h4>
                </div>

                {selectedInterviewers.length === 0 ? (
                  <div className="text-xs text-gray-500 italic py-2 text-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded">
                    No interviewers selected. Add interviewers from above.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedInterviewers.map((interviewer) => (
                      <div
                        key={interviewer.id}
                        className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded-md border"
                      >
                        <div>
                          <div className="text-xs font-medium">
                            {interviewer.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {interviewer.email}
                          </div>
                        </div>
                        <Button
                          onClick={() =>
                            handleRemoveInterviewer(interviewer.id)
                          }
                          variant="ghost"
                          size="sm"
                          className="cursor-pointer text-xs"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary of selected interviewers */}
              <div className="mt-4 p-3 bg-app-blue-50 dark:bg-app-blue-900/20 rounded-lg border">
                <div className="text-xs text-app-blue-700 dark:text-app-blue-300">
                  <strong>{selectedInterviewers.length}</strong> interviewer
                  {selectedInterviewers.length !== 1 ? "s" : ""} selected.
                  Proceed to scheduling to assign them to candidates.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Page 2: Scheduling */}
        {currentPage === "scheduling" && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Interview Scheduling</h3>

            {/* Common duration and interval settings */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Duration
                    </label>
                    <Select
                      value={String(commonDuration)}
                      onValueChange={(value) =>
                        setCommonDuration(parseInt(value))
                      }
                    >
                      <SelectTrigger className="w-34 h-8 cursor-pointer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30" className="cursor-pointer">
                          30 minutes
                        </SelectItem>
                        <SelectItem value="45" className="cursor-pointer">
                          45 minutes
                        </SelectItem>
                        <SelectItem value="60" className="cursor-pointer">
                          60 minutes
                        </SelectItem>
                        <SelectItem value="90" className="cursor-pointer">
                          90 minutes
                        </SelectItem>
                        <SelectItem value="120" className="cursor-pointer">
                          120 minutes
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Interval Gap
                    </label>
                    <Select
                      value={String(intervalTime)}
                      onValueChange={(value) =>
                        setIntervalTime(parseInt(value))
                      }
                    >
                      <SelectTrigger className="w-28 h-8 cursor-pointer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5" className="cursor-pointer">
                          5 mins
                        </SelectItem>
                        <SelectItem value="10" className="cursor-pointer">
                          10 mins
                        </SelectItem>
                        <SelectItem value="15" className="cursor-pointer">
                          15 mins
                        </SelectItem>
                        <SelectItem value="20" className="cursor-pointer">
                          20 mins
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  9AM-5PM, weekdays only
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Calendar Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Date Range
                </h4>
                <div className="border rounded-lg p-2 flex flex-col">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) =>
                      setDateRange(range || { from: undefined, to: undefined })
                    }
                    disabled={(date) => date < new Date()}
                    numberOfMonths={1}
                    className="rounded-md w-full scale-90 origin-top p-0 px-2 mt-3 mb-0 pb-0"
                  />
                  <div className="p-2 pt-0 -mt-5">
                    {dateRange.from && dateRange.to && (
                      <div className="mt-2 pt-2 border-t text-xs text-gray-600 dark:text-gray-400">
                        <div>
                          {dateRange.from.toLocaleDateString()} -{" "}
                          {dateRange.to.toLocaleDateString()}
                        </div>
                        <div className="mt-1 text-xs text-app-blue-600 font-medium">
                          {calculatedSlots.length > 0 &&
                            `${calculatedSlots.length} slots assigned`}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Candidates Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Interviews
                </h4>

                {schedulingError && (
                  <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <div>{schedulingError}</div>
                  </div>
                )}

                <div className="border rounded-lg max-h-112 overflow-y-auto">
                  {calculatedSlots.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      {schedulingError
                        ? "Adjust settings above"
                        : "Select date range to calculate schedule"}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {calculatedSlots.map((slot, index) => (
                        <div
                          key={index}
                          className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-medium">
                                {slot.candidateName}
                              </div>
                              <div className="text-xs text-gray-500">
                                with {slot.interviewerEmail}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-medium">
                                {slot.date.toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {slot.startTime} - {slot.endTime}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          {currentPage !== "scheduling" && (
            <Button
              variant="outline"
              onClick={handleClose}
              className="cursor-pointer text-xs"
            >
              Cancel
            </Button>
          )}

          <div className="flex gap-2">
            {currentPage === "scheduling" && (
              <Button
                variant="outline"
                onClick={() => setCurrentPage("assignments")}
                className="cursor-pointer text-xs"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}

            {currentPage === "assignments" ? (
              <Button
                onClick={() => setCurrentPage("scheduling")}
                disabled={!canProceedToScheduling}
                className="cursor-pointer text-xs"
                variant="outline"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={!canComplete}
                className="cursor-pointer text-xs"
                variant="outline"
              >
                <Check className="h-4 w-4 mr-2" />
                Schedule Interviews
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function InterviewDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const queryClient = useQueryClient();

  // Use our store hooks instead of manual API calls
  const {
    interviewDetails: details,
    isLoading: loading,
    error,
    refetch: refreshInterviewDetails,
  } = useInterviewDetails(id as string);

  // Get interviews hook for mutations
  const { updateInterviewStatus } = useInterviews();

  // Get all candidates to merge with interview candidates for complete data
  const { candidates: allCandidates, refresh: refreshCandidates } =
    useCandidates();

  // React Query will handle data fetching automatically - no manual refresh needed

  // Simplified visibility handling - React Query will handle most refetching automatically
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Only invalidate candidates since they might change from invite actions
        queryClient.invalidateQueries({ queryKey: ['candidates'] });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient]);

  const [job, setJob] = useState<Job | null>(null);
  const [invitedCandidates, setInvitedCandidates] = useState<Candidate[]>([]);
  const [hasReadWarning, setHasReadWarning] = useState(false);
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);
  const [bulkPhoneScreenOpen, setBulkPhoneScreenOpen] = useState(false);
  const [bulkSelectOpen, setBulkSelectOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [candidateDialogOpen, setCandidateDialogOpen] = useState(false);
  const [candidateGroups, setCandidateGroups] = useState<
    Array<{
      nextStage: { id: string; title: string };
      candidates: Candidate[];
      currentStage: string;
    }>
  >([]);

  // Skills and timer state
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [selectedTimer, setSelectedTimer] = useState<30 | 45 | 60>(30); // Default to first option in timerOptions
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);

  // Process toggle states - initialize with defaults, will be updated from DB
  const [processStages, setProcessStages] = useState({
    phoneInterview: false,
    aiInterviewer: false,
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

  // Number of rounds state
  const [currentNumRounds, setCurrentNumRounds] = useState<number>(1);
  const [originalNumRounds, setOriginalNumRounds] = useState<number>(1);
  const [noteDialog, setNoteDialog] = useState<{
    open: boolean;
    candidate?: Candidate;
  }>({ open: false });
  const [newNote, setNewNote] = useState("");

  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Human Interview Scheduling Dialog State
  const [humanInterviewDialogOpen, setHumanInterviewDialogOpen] =
    useState(false);
  const [humanInterviewDialogData, setHumanInterviewDialogData] =
    useState<HumanInterviewDialogData | null>(null);

  // Using sonner toast directly

  const siveraBackendUrl =
    process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL || "https://api.sivera.io";
  const coreBackendUrl =
    process.env.NEXT_PUBLIC_CORE_BACKEND_URL || "https://core.sivera.io";

  // Status badge color mapping using only app colors
  const getCandidateStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Applied":
        return "bg-app-blue-100/90 text-app-blue-600 border-app-blue-200/80";
      case "Screening":
        return "bg-app-blue-100/90 text-app-blue-700 border-app-blue-300/80";
      case "Interview_Scheduled":
        return "bg-app-blue-200/90 text-app-blue-800 border-app-blue-400/80";
      case "Interviewed":
        return "bg-app-blue-200/80 text-app-blue-900 border-app-blue-500/80";
      case "Hired":
        return "bg-app-blue-500/80 text-white border-app-blue-600/80";
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

  // Timer options and logic
  const timerOptions = [30, 45, 60];

  const getTimerStatus = (time: number) => {
    const skillCount = selectedSkills.length;
    if (time === 10 && skillCount >= 6)
      return { disabled: true, reason: "10 mins is too short for 6+ skills" };
    if (time === 20 && skillCount >= 11)
      return { disabled: true, reason: "20 mins is too short for 11+ skills" };
    return { disabled: false, reason: "" };
  };

  // Helper function to sort candidates by AI score (high to low)
  const sortCandidatesByScore = (candidates: Candidate[]) => {
    return candidates.sort((a, b) => {
      // Candidates with scores come first, then those without
      if (a.ai_score && b.ai_score) {
        return b.ai_score - a.ai_score; // High to low
      } else if (a.ai_score && !b.ai_score) {
        return -1; // a (with score) comes first
      } else if (!a.ai_score && b.ai_score) {
        return 1; // b (with score) comes first
      } else {
        return 0; // Both without scores, maintain order
      }
    });
  };

  // Auto-adjust timer based on skill count
  useEffect(() => {
    const skillCount = selectedSkills.length;
    if (skillCount >= 11) {
      setSelectedTimer(60);
    } else if (skillCount >= 6) {
      setSelectedTimer(45);
    } else {
      setSelectedTimer(30);
    }
  }, [selectedSkills.length]);

  // Clear candidate groups when bulk invite dialog closes
  useEffect(() => {
    if (!bulkInviteOpen) {
      setCandidateGroups([]);
    }
  }, [bulkInviteOpen]);

  // Reset note saving state when note dialog closes
  useEffect(() => {
    if (!noteDialog.open) {
      setIsSavingNote(false);
    }
  }, [noteDialog.open]);



  // Use React Query to fetch analytics for all candidates in this interview
  const {
    analytics: interviewAnalytics,
    isLoading: isLoadingAnalytics,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useInterviewAnalytics(id as string);

  // Get analytics store
  const {
    interviewAnalytics: storedAnalytics,
    setInterviewAnalytics,
    getCandidateScore,
    hasAnalytics: hasStoredAnalytics,
  } = useAnalyticsStore();

  // Update stages with analytics data when it's available
  useEffect(() => {
    if (isLoadingAnalytics) {
      console.log("⏳ Analytics still loading, skipping update");
      return;
    }

    const analyticsArray = interviewAnalytics?.analytics || [];
    const hasStoredData = hasStoredAnalytics(id as string);
    const totalCandidates = stages.reduce((acc, stage) => acc + stage.candidates.length, 0);
    
    console.log("🔍 Analytics effect triggered:", {
      analyticsFromQuery: analyticsArray.length,
      hasStoredData,
      candidatesCount: totalCandidates
    });

    // Don't process analytics if we don't have candidates loaded yet
    if (totalCandidates === 0) {
      console.log("⏳ No candidates loaded yet, skipping analytics processing");
      return;
    }

    // Process if we have either fresh analytics OR stored analytics
    if (analyticsArray.length > 0 || hasStoredData) {
      // Prioritize fresh React Query data, fallback to stored data
      const effectiveAnalytics = analyticsArray.length > 0 
        ? analyticsArray 
        : (storedAnalytics[id as string] || []);

      if (effectiveAnalytics.length === 0) {
        console.log("❌ No analytics data available from any source");
        return;
      }

      console.log("✅ Processing analytics:", {
        source: analyticsArray.length > 0 ? 'React Query' : 'Zustand Store',
        count: effectiveAnalytics.length,
        analyticsData: effectiveAnalytics
      });

      // Debug: Log candidate IDs and analytics candidate IDs for matching
      const candidateIds = stages.flatMap(stage => stage.candidates.map(c => c.id));
      const analyticsCandidateIds = effectiveAnalytics.map((a: any) => a.candidate_id);
      console.log("🔍 Debug matching:", {
        candidateIds,
        analyticsCandidateIds,
        matches: analyticsCandidateIds.filter(id => candidateIds.includes(id))
      });
      // Store fresh analytics in Zustand if we got them from React Query
      if (analyticsArray.length > 0) {
        setInterviewAnalytics(id as string, analyticsArray);
      }

      // Check if any candidate needs an AI score update before triggering setState
      const needsUpdate = stages.some(stage =>
        stage.candidates.some(candidate => {
          const analytics = effectiveAnalytics.find((a: any) => a.candidate_id === candidate.id);
          if (analytics && analytics.data) {
            let data = analytics.data;
            if (typeof data === 'string') {
              try {
                data = JSON.parse(data);
              } catch (e) {
                return false;
              }
            }
            return data && typeof data.overall_score === 'number' && candidate.ai_score !== data.overall_score;
          }
          return false;
        })
      );

      if (!needsUpdate) {
        console.log("🔄 No analytics updates needed - all AI scores already match");
        return;
      }

      console.log("🔍 Processing analytics for stages update");
      
      setStages((currentStages) => {
        return currentStages.map((stage) => {
          const updatedCandidates = stage.candidates.map((candidate) => {
            const analytics = effectiveAnalytics.find(
              (a: any) => a.candidate_id === candidate.id
            );

            if (analytics && analytics.data) {
              let data = analytics.data;
              if (typeof data === 'string') {
                try {
                  data = JSON.parse(data);
                } catch (e) {
                  return candidate;
                }
              }

              if (data && typeof data.overall_score === 'number') {
                console.log(`🎯 Setting AI score for candidate ${candidate.name}:`, data.overall_score);
                return {
                  ...candidate,
                  ai_score: data.overall_score,
                };
              }
            }

            return candidate;
          });

          return {
            ...stage,
            candidates: updatedCandidates,
          };
        });
      });
    } else if (hasStoredAnalytics(id as string) && !isLoadingAnalytics) {
      // Use stored analytics if available
      console.log("📦 Using stored analytics data");
      
      setStages((currentStages) => {
        // Check if stages already have the correct AI scores from stored data
        const needsUpdate = currentStages.some(stage => 
          stage.candidates.some(candidate => {
            const score = getCandidateScore(id as string, candidate.id);
            return score !== null && candidate.ai_score !== score;
          })
        );

        if (!needsUpdate) {
          console.log("🔄 No update needed - stored AI scores already match");
          return currentStages;
        }

        return currentStages.map((stage) => {
          const updatedCandidates = stage.candidates.map((candidate) => {
            const score = getCandidateScore(id as string, candidate.id);
            if (score !== null) {
              console.log(`🎯 Found stored AI score for candidate ${candidate.name}:`, score);
              return {
                ...candidate,
                ai_score: score,
              };
            }
            return candidate;
          });

          // Sort candidates by AI score (descending: high to low)
          const sortedCandidates = sortCandidatesByScore([
            ...updatedCandidates,
          ]);

          return {
            ...stage,
            candidates: sortedCandidates,
          };
        });
      });
    } else if (!isLoadingAnalytics) {
      console.log("❌ No analytics data available or analytics array is empty");
    }
  }, [interviewAnalytics, isLoadingAnalytics, id, stages]);

  // Log analytics loading state for debugging
  useEffect(() => {
    console.log("Analytics loading state:", isLoadingAnalytics);
    if (analyticsError) {
      console.error("Analytics error:", analyticsError);
    }
    if (interviewAnalytics) {
      console.log("Interview analytics received:", interviewAnalytics);
    }
  }, [isLoadingAnalytics, analyticsError, interviewAnalytics]);

  // React Query will handle refetching automatically with proper cache settings
  // No manual refetch needed here

  // Add cache invalidation when candidates are moved (in stageMoveCandidate)
  // This is already added in the stageMoveCandidate function above

  // Invalidate analytics cache on component mount to ensure fresh data
  useEffect(() => {
    if (id) {
      console.log("🔄 Invalidating analytics cache on mount");
      queryClient.invalidateQueries({
        queryKey: ["analytics", "interview", id],
      });
    }
  }, [id, queryClient]);

  // Initialize pipeline stages
  useEffect(() => {
    if (invitedCandidates.length > 0) {
      // Categorize candidates based on their status
      const appliedCandidates: Candidate[] = [];
      const aiInterviewCandidates: Candidate[] = [];
      const humanInterviewCandidates: { [key: string]: Candidate[] } = {};
      const acceptedCandidates: Candidate[] = [];
      const rejectedCandidates: Candidate[] = [];

      invitedCandidates.forEach((candidate) => {
        const candidateWithExtras = {
          ...candidate,
          skills: ["React", "TypeScript", "Node.js"], // Mock skills
        };

        // Use the actual status from backend
        const status = candidate.status;

        // Map backend statuses to pipeline stages
        if (status === "Applied") {
          appliedCandidates.push({
            ...candidateWithExtras,
            pipeline_stage: "applied",
          });
        } else if (status === "Invited" || status === "Interviewed") {
          aiInterviewCandidates.push({
            ...candidateWithExtras,
            pipeline_stage: "ai_interview",
          });
        } else if (
          status?.startsWith("Invited_Meeting_") ||
          status?.startsWith("Interviewed_Meeting_") ||
          status?.startsWith("Invited_Round_") ||
          status?.startsWith("Interviewed_Round_")
        ) {
          // Extract round number from status like "Invited_Meeting_1", "Interviewed_Meeting_2", "Invited_Round_1", or "Interviewed_Round_2"
          const roundMatch = status.match(/_(Meeting_|Round_)?(\d+)$/);
          const roundNumber = roundMatch ? parseInt(roundMatch[2]) : 1;
          const stageId = `human_interview_${roundNumber}`;

          if (!humanInterviewCandidates[stageId]) {
            humanInterviewCandidates[stageId] = [];
          }
          humanInterviewCandidates[stageId].push({
            ...candidateWithExtras,
            pipeline_stage: stageId,
          });
        } else if (status === "Accepted") {
          acceptedCandidates.push({
            ...candidateWithExtras,
            pipeline_stage: "accepted",
          });
        } else if (status === "Rejected") {
          rejectedCandidates.push({
            ...candidateWithExtras,
            pipeline_stage: "rejected",
          });
        } else {
          // Default to applied for unknown statuses
          appliedCandidates.push({
            ...candidateWithExtras,
            pipeline_stage: "applied",
          });
        }
      });

      // Create initial stages with sorted candidates
      const initialStages: PipelineStage[] = [
        {
          id: "applied",
          title: "Applied",
          type: "ai_interview",
          candidates: sortCandidatesByScore([...appliedCandidates]),
        },
        {
          id: "ai_interview",
          title: "AI Interview",
          type: "ai_interview",
          candidates: sortCandidatesByScore([...aiInterviewCandidates]),
        },
      ];

      // Add human interview stages - use num_rounds from database, with minimum of 1
      const maxRound = Math.max(1, currentNumRounds);

      // Create human interview stages from 1 to maxRound
      for (let round = 1; round <= maxRound; round++) {
        const stageId = `human_interview_${round}`;
        initialStages.push({
          id: stageId,
          title: `Interview Round ${round}`,
          type: "human_interview",
          round: round,
          candidates: sortCandidatesByScore([
            ...(humanInterviewCandidates[stageId] || []),
          ]),
        });
      }

      // Add final stages
      initialStages.push(
        {
          id: "accepted",
          title: "Accepted",
          type: "accepted",
          candidates: sortCandidatesByScore([...acceptedCandidates]),
        },
        {
          id: "rejected",
          title: "Rejected",
          type: "rejected",
          candidates: sortCandidatesByScore([...rejectedCandidates]),
        }
      );

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
          toast.error("Maximum skills reached", {
            description: "You can select up to 15 skills maximum.",
          });
          return prev;
        }
        return [...prev, skill];
      }
    });
  };

  const addCustomSkill = () => {
    if (newSkill.trim() && !selectedSkills.includes(newSkill.trim())) {
      // Limit to 15 skills maximum
      if (selectedSkills.length >= 15) {
        toast.error("Maximum skills reached", {
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
  };

  // Phone screen question management functions
  const addPhoneScreenQuestion = () => {
    if (newQuestion.trim() && phoneScreenQuestions.length < 5) {
      if (!phoneScreenQuestions.includes(newQuestion.trim())) {
        setPhoneScreenQuestions((prev) => [...prev, newQuestion.trim()]);
        setNewQuestion("");
      }
    }
  };

  const removePhoneScreenQuestion = (index: number) => {
    setPhoneScreenQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuestionKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addPhoneScreenQuestion();
    }
  };

  // Helper function to map stage IDs to backend statuses
  const getBackendStatusFromStageId = (stageId: string): string => {
    if (stageId === "applied") {
      return "Applied";
    } else if (stageId === "ai_interview") {
      return "Invited"; // Start with Invited, will become Interviewed after completion
    } else if (stageId.startsWith("human_interview_")) {
      const roundNumber = parseInt(stageId.split("_")[2]);
      return `Invited_Round_${roundNumber}`; // Start with Invited_Round_X, will become Interviewed_Round_X after completion
    } else if (stageId === "accepted") {
      return "Accepted";
    } else if (stageId === "rejected") {
      return "Rejected";
    }
    return "Applied"; // Default fallback
  };

  // Pipeline functions
  const addPendingChange = useCallback((change: PendingChange) => {
    setPendingChanges((prev) => {
      // If this is an email action, remove any existing email actions for the same candidate
      if (change.type === "send_email") {
        const filtered = prev.filter(
          (existingChange) =>
            !(
              existingChange.type === "send_email" &&
              existingChange.candidateId === change.candidateId
            )
        );
        return [...filtered, change];
      }

      // If this is a status update, remove any existing status updates for the same candidate
      if (change.type === "update_status") {
        const filtered = prev.filter(
          (existingChange) =>
            !(
              existingChange.type === "update_status" &&
              existingChange.candidateId === change.candidateId
            )
        );
        return [...filtered, change];
      }

      // For other types, just add normally
      return [...prev, change];
    });
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
    // Check if moving to a human interview round
    if (destinationStageId.startsWith("human_interview_")) {
      // Find the destination stage to get round info
      const destStage = stages.find((s) => s.id === destinationStageId);
      const sourceStage = stages.find((s) => s.id === sourceStageId);

      if (destStage && sourceStage) {
        setHumanInterviewDialogData({
          interviewId: id as string,
          candidates: [candidate],
          destinationStage: {
            id: destStage.id,
            title: destStage.title,
            round: destStage.round || 1,
          },
          sourceStage: {
            id: sourceStage.id,
            title: sourceStage.title,
          },
          assignments: [],
          schedules: [],
        });
        setHumanInterviewDialogOpen(true);
        return; // Don't proceed with immediate move
      }
    }

    // Original move logic for non-human interview stages
    performCandidateMove(candidate, sourceStageId, destinationStageId);
    
    // Invalidate analytics cache when candidate is moved
    queryClient.invalidateQueries({
      queryKey: ["analytics", "interview", id],
    });
  };

  // Helper function to perform the actual candidate move
  const performCandidateMove = (
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

    // Add status update to pending changes
    const newBackendStatus = getBackendStatusFromStageId(destinationStageId);
    addPendingChange({
      type: "update_status",
      candidateId: candidate.id,
      newStatus: newBackendStatus,
      timestamp: Date.now(),
    });

    // Determine email type and stage based on destination stage
    let emailType:
      | "ai_interview"
      | "human_interview"
      | "acceptance"
      | "rejection" = "ai_interview";
    let stageType:
      | "ai_interview"
      | "human_interview"
      | "acceptance"
      | "rejection" = "ai_interview";
    let roundNumber: number | undefined = undefined;

    // Find the destination stage info
    const destStage = stages.find((s) => s.id === destinationStageId);
    if (destStage) {
      if (destStage.id === "ai_interview") {
        emailType = "ai_interview";
        stageType = "ai_interview";
      } else if (destStage.type === "human_interview") {
        emailType = "human_interview";
        stageType = "human_interview";
        roundNumber = destStage.round || 1;
      } else if (destStage.id === "accepted") {
        emailType = "acceptance";
        stageType = "acceptance";
      } else if (destStage.id === "rejected") {
        emailType = "rejection";
        stageType = "rejection";
      }

      // Add email action to pending changes (only if not moving to applied stage)
      // The addPendingChange function will automatically remove any existing email actions for this candidate
      if (destinationStageId !== "applied") {
        addPendingChange({
          type: "send_email",
          candidateId: candidate.id,
          email: candidate.email,
          name: candidate.name,
          emailType,
          stageType,
          roundNumber,
          timestamp: Date.now(),
        });
      }
    }

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
            status: newBackendStatus, // Update the status in the visual state too
          });

          // Re-sort destination stage candidates by AI score
          destStage.candidates = sortCandidatesByScore([
            ...destStage.candidates,
          ]);
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
      toast.error("Cannot move", {
        description: `Cannot move ${
          direction === "next" ? "forward" : "backward"
        } from this stage`,
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

  const handleBulkSelection = (
    candidateIds: string[],
    stageTitle: string,
    scoreThreshold: number
  ) => {
    setSelectedCandidates(new Set(candidateIds));

    toast.success("Bulk selection", {
      description: `Selected ${candidateIds.length} candidates with score ≥ ${scoreThreshold} from ${stageTitle}`,
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
            toast.error("Cannot move", {
              description: "No next stage available",
            });
          }
        }
        break;
      case "schedule":
        toast.success("Schedule Interview", {
          description: `Scheduling interview for ${candidate.name}`,
        });
        break;
      case "add_note":
        setNewNote(candidate.notes || ""); // Pre-populate with existing notes if any
        setNoteDialog({ open: true, candidate });
        break;
      case "view_resume":
        if (candidate.resume_url) {
          // Open resume in new tab
          window.open(candidate.resume_url, "_blank", "noopener,noreferrer");
          toast.success("Resume opened", {
            description: `Opened resume for ${candidate.name}`,
          });
        } else {
          // Show message that no resume is available
          toast.error("No resume available", {
            description: `${candidate.name} has not uploaded a resume yet.`,
          });
        }
        break;
    }
  };

  const addHumanInterviewRound = () => {
    const newNumRounds = currentNumRounds + 1;
    const newStageId = `human_interview_${newNumRounds}`;

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
            title: `Interview Round ${newNumRounds}`,
            type: "human_interview",
            round: newNumRounds,
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
        roundNumber: newNumRounds,
        timestamp: Date.now(),
      });

      setStages((prev) => {
        const newStages = [...prev];
        const insertIndex = newStages.findIndex((s) => s.id === "accepted");

        newStages.splice(insertIndex, 0, {
          id: newStageId,
          title: `Interview Round ${newNumRounds}`,
          type: "human_interview",
          round: newNumRounds,
          candidates: [],
        });

        return newStages;
      });
    }

    // Update the current number of rounds and track the change
    setCurrentNumRounds(newNumRounds);

    // Add pending change to update num_rounds in database
    addPendingChange({
      type: "update_num_rounds",
      newNumRounds: newNumRounds,
      timestamp: Date.now(),
    });
  };

  const removeHumanInterviewRound = (stageId: string) => {
    const stageToRemove = stages.find((s) => s.id === stageId);

    if (!stageToRemove) return;

    // Check if there are candidates in this stage
    if (stageToRemove.candidates.length > 0) {
      toast.error("Cannot remove round", {
        description: `Cannot remove round with ${
          stageToRemove.candidates.length
        } candidate${
          stageToRemove.candidates.length !== 1 ? "s" : ""
        }. Move candidates first.`,
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

    // Update the current number of rounds and track the change
    const newNumRounds = Math.max(1, currentNumRounds - 1);
    setCurrentNumRounds(newNumRounds);

    // Add pending change to update num_rounds in database
    addPendingChange({
      type: "update_num_rounds",
      newNumRounds: newNumRounds,
      timestamp: Date.now(),
    });
  };

  const saveNote = async () => {
    if (noteDialog.candidate && newNote.trim()) {
      const candidateId = noteDialog.candidate.id;
      const noteText = newNote.trim();

      setIsSavingNote(true);

      try {
        // Save note to database immediately
        await authenticatedFetch(
          `${siveraBackendUrl}/api/v1/candidates/${candidateId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              notes: noteText,
            }),
          }
        );

        // Update visual state immediately after successful save
        setStages((prev) => {
          const newStages = JSON.parse(JSON.stringify(prev)); // Deep copy
          const stageIndex = newStages.findIndex((s: PipelineStage) =>
            s.candidates.some((c: Candidate) => c.id === candidateId)
          );

          if (stageIndex >= 0) {
            const candidateIndex = newStages[stageIndex].candidates.findIndex(
              (c: Candidate) => c.id === candidateId
            );

            if (candidateIndex >= 0) {
              newStages[stageIndex].candidates[candidateIndex] = {
                ...newStages[stageIndex].candidates[candidateIndex],
                notes: noteText,
              };
            }
          }

          return newStages;
        });

        // Show success message
        toast.success("Note saved", {
          description: `Note has been updated for ${noteDialog.candidate.name}`,
        });

        setNoteDialog({ open: false });
        setNewNote("");
        setIsSavingNote(false);
      } catch (error) {
        console.error("Failed to save note:", error);
        toast.success("Failed to save note", {
          description: "Please try again or save changes later.",
        });

        // Still add to pending changes as fallback
        addPendingChange({
          type: "add_note",
          candidateId: candidateId,
          note: noteText,
          timestamp: Date.now(),
        });

        // Update visual state even if API call failed
        setStages((prev) => {
          const newStages = JSON.parse(JSON.stringify(prev)); // Deep copy
          const stageIndex = newStages.findIndex((s: PipelineStage) =>
            s.candidates.some((c: Candidate) => c.id === candidateId)
          );

          if (stageIndex >= 0) {
            const candidateIndex = newStages[stageIndex].candidates.findIndex(
              (c: Candidate) => c.id === candidateId
            );

            if (candidateIndex >= 0) {
              newStages[stageIndex].candidates[candidateIndex] = {
                ...newStages[stageIndex].candidates[candidateIndex],
                notes: noteText,
              };
            }
          }

          return newStages;
        });

        setNoteDialog({ open: false });
        setNewNote("");
        setIsSavingNote(false);
      }
    }
  };

  const saveAllChanges = async () => {
    if (pendingChanges.length === 0) {
      toast.success("No changes", { description: "No changes to save" });
      return;
    }

    try {
      // Process status updates first
      const statusChanges = pendingChanges.filter(
        (c) => c.type === "update_status"
      );
      if (statusChanges.length > 0) {
        toast.success("Processing changes...", {
          description: `Updating ${statusChanges.length} candidate statuses and sending emails...`,
        });

        // Update candidate statuses
        for (const statusChange of statusChanges) {
          try {
            await authenticatedFetch(
              `${siveraBackendUrl}/api/v1/candidates/${statusChange.candidateId}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  status: statusChange.newStatus,
                }),
              }
            );
          } catch (error) {
            console.error(
              `Failed to update status for candidate ${statusChange.candidateId}:`,
              error
            );
            // Continue with other updates even if one fails
          }
        }
      }

      // Process note changes
      const noteChanges = pendingChanges.filter((c) => c.type === "add_note");
      if (noteChanges.length > 0) {
        if (statusChanges.length === 0) {
          toast.success("Processing changes...", {
            description: `Saving ${noteChanges.length} note${
              noteChanges.length !== 1 ? "s" : ""
            }...`,
          });
        }

        // Save notes to database
        for (const noteChange of noteChanges) {
          try {
            await authenticatedFetch(
              `${siveraBackendUrl}/api/v1/candidates/${noteChange.candidateId}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  notes: noteChange.note,
                }),
              }
            );
          } catch (error) {
            console.error(
              `Failed to save note for candidate ${noteChange.candidateId}:`,
              error
            );
            // Continue with other notes even if one fails
          }
        }
      }

      // Process num_rounds updates
      const numRoundsChanges = pendingChanges.filter(
        (c) => c.type === "update_num_rounds"
      );
      if (numRoundsChanges.length > 0) {
        const latestNumRoundsChange =
          numRoundsChanges[numRoundsChanges.length - 1];
        try {
          await authenticatedFetch(
            `${siveraBackendUrl}/api/v1/interviews/jobs/${job?.id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                num_rounds: latestNumRoundsChange.newNumRounds,
              }),
            }
          );

          // Update the original num_rounds state
          setOriginalNumRounds(latestNumRoundsChange.newNumRounds!);
        } catch (error) {
          console.error("Failed to update num_rounds:", error);
          // Continue with other updates even if this fails
        }
      }

      // Process email actions - group by email type for batch sending
      const emailChanges = pendingChanges.filter(
        (c) => c.type === "send_email"
      );
      if (emailChanges.length > 0) {
        if (
          statusChanges.length === 0 &&
          noteChanges.length === 0 &&
          numRoundsChanges.length === 0
        ) {
          toast.success("Processing changes...", {
            description: `Sending ${emailChanges.length} emails...`,
          });
        }

        // Group email changes by type (human interviews with scheduling vs basic emails)
        const humanInterviewEmails = emailChanges.filter(
          (c) => c.emailType === "human_interview" && c.schedulingData
        );
        const basicEmails = emailChanges.filter(
          (c) => c.emailType !== "human_interview" || !c.schedulingData
        );

        const userContext = getUserContext();
        const organizationId = userContext?.organization_id;

        if (!organizationId) {
          throw new Error("Organization ID not found");
        }

        // Send human interview emails with full scheduling data (candidates + recruiters)
        if (humanInterviewEmails.length > 0) {
          try {
            const candidates = humanInterviewEmails.map((emailChange) => ({
              email: emailChange.email!,
              name: emailChange.name!,
              scheduling: emailChange.schedulingData!,
            }));

            await authenticatedFetch(
              `${siveraBackendUrl}/api/v1/interviews/send-invite`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  job: job?.title || "",
                  organization_id: organizationId,
                  sender_id: userContext?.user_id || "system",
                  email_type: "human_interview",
                  stage_type: "human_interview",
                  candidates: candidates,
                  // Include scheduling data to trigger recruiter emails
                  has_scheduling: true,
                  interview_id: id as string,
                }),
              }
            );
          } catch (error) {
            console.error("Failed to send human interview emails:", error);
          }
        }

        // Send basic emails (AI interview, acceptance, rejection)
        if (basicEmails.length > 0) {
          try {
            const candidates = basicEmails.map((emailChange) => ({
              email: emailChange.email!,
              name: emailChange.name!,
            }));

            await authenticatedFetch(
              `${siveraBackendUrl}/api/v1/interviews/send-invite`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  job: job?.title || "",
                  organization_id: organizationId,
                  sender_id: userContext?.user_id || "system",
                  email_type: basicEmails[0]?.emailType || "ai_interview",
                  stage_type: basicEmails[0]?.stageType || "ai_interview",
                  candidates: candidates,
                  has_scheduling: false,
                  interview_id: id as string,
                }),
              }
            );
          } catch (error) {
            console.error("Failed to send basic emails:", error);
          }
        }
      }

      // Update the original state and clear pending changes
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
      const sentEmails = pendingChanges.filter(
        (c) => c.type === "send_email"
      ).length;
      const updatedStatuses = pendingChanges.filter(
        (c) => c.type === "update_status"
      ).length;
      const updatedNumRounds = pendingChanges.filter(
        (c) => c.type === "update_num_rounds"
      ).length;

      let description = `${pendingChanges.length} changes saved`;
      const details = [];
      if (addedRounds > 0)
        details.push(
          `${addedRounds} round${addedRounds !== 1 ? "s" : ""} added`
        );
      if (removedRounds > 0)
        details.push(
          `${removedRounds} round${removedRounds !== 1 ? "s" : ""} removed`
        );
      if (movedCandidates > 0)
        details.push(
          `${movedCandidates} candidate${
            movedCandidates !== 1 ? "s" : ""
          } moved`
        );
      if (addedNotes > 0)
        details.push(`${addedNotes} note${addedNotes !== 1 ? "s" : ""} added`);
      if (sentEmails > 0)
        details.push(`${sentEmails} email${sentEmails !== 1 ? "s" : ""} sent`);
      if (updatedStatuses > 0)
        details.push(
          `${updatedStatuses} status${
            updatedStatuses !== 1 ? "es" : ""
          } updated`
        );
      if (updatedNumRounds > 0) details.push("rounds updated");

      if (details.length > 0) {
        description = details.join(", ");
      }

      toast.success("Changes saved", { description: description });
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.success("Error", {
        description: "Failed to save some changes. Please try again.",
      });
    }
  };

  const discardChanges = () => {
    // Reset to original state
    setStages(JSON.parse(JSON.stringify(originalStages)));
    setPendingChanges([]);
    setSelectedCandidates(new Set());
    setCurrentNumRounds(originalNumRounds);

    // Re-fetch AI scores after stages are reset (handled automatically by React Query)
    setTimeout(() => {
              refetchAnalytics();
    }, 0);

    toast.success("Changes discarded", {
      description: "All pending changes have been discarded",
    });
  };

  const hasUnsavedChanges = pendingChanges.length > 0;

  // Update local state when store data changes
  useEffect(() => {
    if (details) {
      setJob(details.job);

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

            // Merge with interview-specific data taking precedence (especially interview_status from candidate_interviews)
            return {
              ...completeCandidateData, // Complete candidate data (including resume_url)
              ...invitedCandidate, // Interview-specific data (interview_status, room_url, etc.)
              // Ensure interview_status from candidate_interviews table is preserved
              interview_status:
                invitedCandidate.interview_status ||
                completeCandidateData?.interview_status,
            };
          }
        );

        setInvitedCandidates(mergedInvitedCandidates);
      } else {
        setInvitedCandidates(details.candidates.invited || []);
      }

      // Set skills and duration from the flow data
      if (details.skills && details.skills.length > 0) {
        setSelectedSkills(details.skills);
        setExtractedSkills(details.skills);
      }

      // Set timer duration from flow data
      if (details.duration) {
        const durationAsNumber = Number(details.duration);
        setSelectedTimer(durationAsNumber as 30 | 45 | 60);
      }

      // Set process stages from the job data (stored in jobs table as jsonb)
      if (details.job && (details.job as any).process_stages) {
        setProcessStages((details.job as any).process_stages);
      } else {
        // If no process stages are stored, set reasonable defaults
        setProcessStages({
          phoneInterview: true,
          aiInterviewer: true,
        });
      }

      // Set phone screen questions from the job data (stored in jobs table as jsonb)
      if (details.job && (details.job as any).phone_screen_questions) {
        setPhoneScreenQuestions((details.job as any).phone_screen_questions);
      } else {
        setPhoneScreenQuestions([]);
      }

      // Set number of rounds from the job data
      const numRounds = (details.job as any)?.num_rounds || 1;
      setCurrentNumRounds(numRounds);
      setOriginalNumRounds(numRounds);
    }
  }, [details, allCandidates?.length]); // Use length instead of the array itself to prevent infinite loops

  const handleSaveChanges = async () => {
    const user_id = getCookie("user_id");
    const organization_id = getCookie("organization_id");

    if (!user_id || !organization_id) {
      toast.success("Authentication Error", {
        description: "Missing user or organization information",
      });
      return;
    }

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

      toast.success("Success!", {
        description: "Interview settings updated successfully",
      });

      // Refresh the data via store invalidation
      refreshInterviewDetails();
      refreshCandidates();
    } catch (error) {
      console.error("Error updating interview:", error);
      toast.success("Error updating interview", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const handleInvitesSent = () => {
    // Refresh the data after invites are sent
    refreshInterviewDetails();
    refreshCandidates();
  };

  // Get the next stage for selected candidates - now handles multiple stages
  const getNextStageForCandidates = (selectedCandidates: Set<string>) => {
    if (selectedCandidates.size === 0) return null;

    // Find unique next stages for all selected candidates
    const nextStages = new Set<string>();

    for (const candidateId of selectedCandidates) {
      // Find current stage of this candidate
      let currentStage = null;
      for (const stage of stages) {
        if (stage.candidates.some((c) => c.id === candidateId)) {
          currentStage = stage;
          break;
        }
      }

      if (currentStage) {
        const nextStage = getNextStageForStage(currentStage.id);
        if (nextStage) {
          nextStages.add(nextStage.title);
        }
      }
    }

    // If only one unique next stage, return it with specific title
    if (nextStages.size === 1) {
      return { title: Array.from(nextStages)[0] };
    }

    // If multiple next stages, return a generic label
    if (nextStages.size > 1) {
      return { title: "Next Stages" };
    }

    return null;
  };

  // Helper function to get next stage for a specific stage
  const getNextStageForStage = (stageId: string) => {
    // Find the current stage in the stages array
    const currentStageIndex = stages.findIndex((s) => s.id === stageId);

    if (currentStageIndex === -1 || currentStageIndex === stages.length - 1) {
      return null; // Stage not found or already at the last stage
    }

    // Return the next stage
    return {
      id: stages[currentStageIndex + 1].id,
      title: stages[currentStageIndex + 1].title,
    };
  };

  // Prepare candidates for bulk invite based on selection
  const prepareSelectedCandidatesForInvite = () => {
    if (selectedCandidates.size === 0) {
      toast.success("No candidates selected", {
        description: "Please select candidates to move.",
      });
      return;
    }

    // Group candidates by their current stage and next stage
    const candidatesByNextStage: Array<{
      nextStage: { id: string; title: string };
      candidates: Candidate[];
      currentStage: string;
    }> = [];

    for (const candidateId of selectedCandidates) {
      // Find current stage of this candidate
      let currentStage: PipelineStage | null = null;
      let candidate: Candidate | null = null;

      for (const stage of stages) {
        const foundCandidate = stage.candidates.find(
          (c) => c.id === candidateId
        );
        if (foundCandidate) {
          currentStage = stage;
          candidate = foundCandidate;
          break;
        }
      }

      if (currentStage && candidate) {
        const nextStage = getNextStageForStage(currentStage.id);
        if (nextStage) {
          // Find existing group or create new one based on both current and next stage
          let group = candidatesByNextStage.find(
            (g) =>
              g.nextStage.id === nextStage.id &&
              g.currentStage === currentStage?.title
          );
          if (!group) {
            group = {
              nextStage,
              candidates: [],
              currentStage: currentStage.title,
            };
            candidatesByNextStage.push(group);
          }
          group.candidates.push(candidate);
        }
      }
    }

    if (candidatesByNextStage.length === 0) {
      toast.success("No next stage", {
        description: "Selected candidates are already at the final stage.",
      });
      return;
    }

    // Set the candidate groups and open the dialog
    setCandidateGroups(candidatesByNextStage);
    setBulkInviteOpen(true);
  };

  // Get candidates available for bulk invite (not already invited)
  const getAvailableCandidates = () => {
    // If we have selected candidates, return those for moving
    if (selectedCandidates.size > 0) {
      const selectedCandidatesList: Candidate[] = [];
      for (const candidateId of selectedCandidates) {
        for (const stage of stages) {
          const foundCandidate = stage.candidates.find(
            (c) => c.id === candidateId
          );
          if (foundCandidate) {
            selectedCandidatesList.push(foundCandidate);
            break;
          }
        }
      }
      return selectedCandidatesList;
    }
    // Otherwise return all invited candidates
    return invitedCandidates;
  };

  // Handle sending interview invite to a candidate
  const handleSendInvite = async (candidate: any) => {
    try {
      // Find the candidate's current stage
      const currentStage = stages.find((stage) =>
        stage.candidates.some((c) => c.id === candidate.id)
      );

      if (!currentStage) {
        toast.success("Error", {
          description: "Could not find candidate's current stage",
        });
        return;
      }

      // Get the next stage for this candidate
      const nextStage = getNextStageForStage(currentStage.id);
      if (!nextStage) {
        toast.success("No next stage", {
          description: "This candidate is already at the final stage",
        });
        return;
      }

      // Move the candidate to the next stage (this will queue the email)
      stageMoveCandidate(candidate, currentStage.id, nextStage.id);

      toast.success("Candidate moved", {
        description: `${candidate.name} moved to ${nextStage.title}. Click 'Save Changes' to send email.`,
      });

      // Close the dialog
      setSelectedCandidate(null);
    } catch (err: any) {
      toast.success("Failed to move candidate", { description: err.message });
    }
  };

  const handleBulkCandidateMovement = () => {
    // Group candidates by their destination stage
    const movementGroups: {
      [destinationStageId: string]: {
        candidates: Candidate[];
        sourceStages: string[];
      };
    } = {};

    for (const candidateId of selectedCandidates) {
      // Find current stage of this candidate
      let currentStage: PipelineStage | null = null;
      let candidate: Candidate | null = null;

      for (const stage of stages) {
        const foundCandidate = stage.candidates.find(
          (c) => c.id === candidateId
        );
        if (foundCandidate) {
          currentStage = stage;
          candidate = foundCandidate;
          break;
        }
      }

      if (currentStage && candidate) {
        const nextStage = getNextStageForStage(currentStage.id);
        if (nextStage) {
          if (!movementGroups[nextStage.id]) {
            movementGroups[nextStage.id] = { candidates: [], sourceStages: [] };
          }
          movementGroups[nextStage.id].candidates.push(candidate);
          if (
            !movementGroups[nextStage.id].sourceStages.includes(currentStage.id)
          ) {
            movementGroups[nextStage.id].sourceStages.push(currentStage.id);
          }
        }
      }
    }

    // Check if any destination is a human interview round
    const humanInterviewDestinations = Object.keys(movementGroups).filter(
      (stageId) => stageId.startsWith("human_interview_")
    );

    if (humanInterviewDestinations.length > 0) {
      // For now, handle only the first human interview destination
      // TODO: Could be enhanced to handle multiple different human interview rounds
      const destinationStageId = humanInterviewDestinations[0];
      const group = movementGroups[destinationStageId];

      const destStage = stages.find((s) => s.id === destinationStageId);
      // Use the first source stage for the dialog title (could be enhanced)
      const sourceStage = stages.find((s) => s.id === group.sourceStages[0]);

      if (destStage && sourceStage) {
        setHumanInterviewDialogData({
          interviewId: id as string,
          candidates: group.candidates,
          destinationStage: {
            id: destStage.id,
            title: destStage.title,
            round: destStage.round || 1,
          },
          sourceStage: {
            id: sourceStage.id,
            title:
              group.sourceStages.length > 1
                ? "Multiple Stages"
                : sourceStage.title,
          },
          assignments: [],
          schedules: [],
        });
        setHumanInterviewDialogOpen(true);

        // Clear selection
        setSelectedCandidates(new Set());
        return;
      }
    }

    // Original bulk movement logic for non-human interview stages
    for (const candidateId of selectedCandidates) {
      // Find current stage of this candidate
      let currentStage: PipelineStage | null = null;
      let candidate: Candidate | null = null;

      for (const stage of stages) {
        const foundCandidate = stage.candidates.find(
          (c) => c.id === candidateId
        );
        if (foundCandidate) {
          currentStage = stage;
          candidate = foundCandidate;
          break;
        }
      }

      if (currentStage && candidate) {
        const nextStage = getNextStageForStage(currentStage.id);
        if (nextStage) {
          // Use the existing performCandidateMove function which handles non-human interviews
          performCandidateMove(candidate, currentStage.id, nextStage.id);
        }
      }
    }

    // Clear selection
    setSelectedCandidates(new Set());

    toast.success("Candidates moved to pipeline", {
      description:
        "All selected candidates have been moved. Click 'Save Changes' to update statuses and send emails.",
    });
  };

  // Handle completion of human interview scheduling dialog
  const handleHumanInterviewComplete = (schedules: InterviewSchedule[]) => {
    if (!humanInterviewDialogData) return;

    // Move candidates to the destination stage and store scheduling data
    humanInterviewDialogData.candidates.forEach((candidate) => {
      performCandidateMove(
        candidate,
        humanInterviewDialogData.sourceStage.id,
        humanInterviewDialogData.destinationStage.id
      );

      // Add scheduling data to pending changes for this candidate
      const candidateSchedule = schedules.find(
        (s) => s.candidateId === candidate.id
      );
      if (candidateSchedule) {
        addPendingChange({
          type: "send_email",
          candidateId: candidate.id,
          email: candidate.email,
          name: candidate.name,
          emailType: "human_interview",
          stageType: "human_interview",
          timestamp: Date.now(),
          // Store complete scheduling data for batch sending
          schedulingData: candidateSchedule,
        });
      }
    });

    // Show success message
    toast.success("Interviews scheduled", {
      description: `${humanInterviewDialogData.candidates.length} candidate${
        humanInterviewDialogData.candidates.length !== 1 ? "s" : ""
      } scheduled for ${
        humanInterviewDialogData.destinationStage.title
      }. Click 'Save Changes' to send invitations.`,
    });

    // Reset dialog state
    setHumanInterviewDialogData(null);
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
        <div className="p-6 text-center text-gray-500 dark:text-gray-300 text-xs">
          Loading interview...
        </div>
      ) : error ? (
        <div className="p-6 text-center text-red-500 dark:text-red-400">
          {error.message}
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
                      value={
                        details?.interview?.status
                          ? String(details.interview.status)
                          : "draft"
                      }
                      onValueChange={async (
                        value: "draft" | "active" | "completed"
                      ) => {
                        try {
                          await updateInterviewStatus({
                            interviewId: id as string,
                            status: value,
                          });
                          // Refetch the interview details to get the updated data
                          refreshInterviewDetails();
                        } catch (err) {
                          const errorMessage =
                            err instanceof Error
                              ? err.message
                              : "Failed to update status";
                          toast.error("Failed to update status", {
                            description: errorMessage,
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="w-[8rem] cursor-pointer">
                        <SelectValue>
                          {details?.interview?.status &&
                          typeof details.interview.status === "string" &&
                          details.interview.status.length > 0
                            ? details.interview.status.charAt(0).toUpperCase() +
                              details.interview.status.slice(1)
                            : "Draft"}
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
                    {pendingChanges.length > 0 && (
                      <Button
                        onClick={() => setSaveConfirmOpen(true)}
                        variant="outline"
                        className="cursor-pointer text-xs"
                      >
                        <Save className="mr-2 h-4 w-4" />
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
                    <Carousel className="w-full max-w-sm">
                      <CarouselContent>
                        {/* Phone Interview */}
                        <CarouselItem className="basis-1/2">
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

                        {/* AI Interviewer */}
                        <CarouselItem className="basis-1/2">
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
                          const isSelected = selectedTimer === time;
                          return (
                            <CarouselItem key={time} className="basis-1/3">
                              <div className="p-1">
                                <Card
                                  className={`cursor-pointer transition-all duration-200 border border-gray-300 dark:border-gray-700 ${
                                    isSelected
                                      ? "border-app-blue-500 bg-app-blue-50 dark:bg-app-blue-900/20"
                                      : status.disabled
                                      ? "opacity-40 cursor-not-allowed border-gray-200 bg-gray-50 dark:bg-gray-800/30 dark:border-gray-800"
                                      : "hover:border-gray-400"
                                  }`}
                                  onClick={() => {
                                    if (!status.disabled) {
                                      setSelectedTimer(time as 30 | 45 | 60);
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
                                        isSelected
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
                onFirstChange={() =>
                  setPendingChanges((prev) => [
                    ...prev,
                    { type: "add_note", timestamp: Date.now() },
                  ])
                }
                isEditable={true}
                bulkPhoneScreenOpen={bulkPhoneScreenOpen}
                setBulkPhoneScreenOpen={setBulkPhoneScreenOpen}
              />
            )}

            {/* Candidate Section - Pipeline for Active, List for Draft/Completed */}
            {details?.interview.status === "active" ? (
              /* Candidate Pipeline Section - Active Interview */
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
                        <span className="mx-2">•</span>
                        {/* +1 because we have a AI default round */}
                        {currentNumRounds + 1} interview rounds
                        {selectedCandidates.size > 0 && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="text-app-blue-600 font-medium">
                              {String(selectedCandidates.size)} selected
                            </span>
                          </>
                        )}
                        {hasUnsavedChanges && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="text-app-blue-600 font-medium">
                              {String(pendingChanges.length)} unsaved change
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
                            onClick={() => setSaveConfirmOpen(true)}
                            className="cursor-pointer text-xs"
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Save Changes
                          </Button>
                        </>
                      )}

                      {selectedCandidates.size > 0 && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedCandidates(new Set());
                            }}
                            className="cursor-pointer text-xs"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Deselect All
                          </Button>
                        </>
                      )}

                      {/* Interview Invitations */}
                      <Button
                        onClick={prepareSelectedCandidatesForInvite}
                        disabled={selectedCandidates.size === 0}
                        className="cursor-pointer text-xs"
                        variant="outline"
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        {(() => {
                          const nextStageInfo =
                            getNextStageForCandidates(selectedCandidates);
                          if (
                            nextStageInfo?.title &&
                            nextStageInfo.title !== "Next Stages"
                          ) {
                            return `Move to ${nextStageInfo.title}`;
                          }
                          return "Move to Next Stage";
                        })()}
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

                    <Button
                      variant="outline"
                      className="cursor-pointer text-xs"
                      onClick={() => setBulkSelectOpen(true)}
                    >
                      <CheckSquare className="mr-2 h-4 w-4" />
                      Bulk Select
                    </Button>
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
                            const isRemovedStage = !!removeChange && !addChange;

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
                                isDragDropReady={false}
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
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Candidate List Section - Draft/Completed Interview */
              <div className="rounded-lg bg-white dark:bg-gray-900 shadow border dark:border-gray-800 max-w-full overflow-hidden">
                <div className="border-b border-gray-200 dark:border-gray-800 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-medium tracking-tight dark:text-white flex items-center gap-2">
                        Candidates
                      </CardTitle>
                      <p className="text-xs text-gray-500 font-semibold dark:text-gray-300">
                        {job?.title}
                        <span className="mx-2">•</span>
                        {invitedCandidates.length} candidate
                        {invitedCandidates.length !== 1 ? "s" : ""}
                        <span className="mx-2">•</span>
                        Interview is {details?.interview.status || "draft"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                          Job Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                          Date Added
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                      {invitedCandidates.length > 0 ? (
                        invitedCandidates
                          .filter((candidate) => {
                            const matchesSearch =
                              candidate.name
                                .toLowerCase()
                                .includes(searchQuery.toLowerCase()) ||
                              candidate.email
                                .toLowerCase()
                                .includes(searchQuery.toLowerCase());
                            return matchesSearch;
                          })
                          .map((candidate) => (
                            <tr
                              key={candidate.id}
                              className="transition-colors cursor-pointer hover:bg-app-blue-50/20 dark:hover:bg-app-blue-900/30"
                              onClick={() => {
                                setSelectedCandidate(candidate);
                                setCandidateDialogOpen(true);
                              }}
                            >
                              <td className="px-6 py-6 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                {candidate.name}
                              </td>
                              <td className="px-6 py-6 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                {candidate.email}
                              </td>
                              <td className="px-6 py-6 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                {job?.title || "-"}
                              </td>
                              <td className="px-6 py-6 whitespace-nowrap text-sm">
                                <Badge
                                  variant="outline"
                                  className={`${getCandidateStatusBadgeClass(
                                    candidate.status || "Applied"
                                  )} font-normal text-xs border-[0.5px] opacity-80`}
                                >
                                  {formatStatusText(
                                    candidate.status || "Applied"
                                  )}
                                </Badge>
                              </td>
                              <td className="px-6 py-6 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                {candidate.created_at
                                  ? new Date(
                                      candidate.created_at
                                    ).toLocaleDateString()
                                  : "-"}
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-300"
                          >
                            <div className="py-8">
                              <Users className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500 mb-4" />
                              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                No candidates assigned
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                Add candidates to this interview to get started.
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Bulk Phone Screen Scheduler */}
          <BulkPhoneScreenScheduler
            open={bulkPhoneScreenOpen}
            onOpenChange={setBulkPhoneScreenOpen}
            jobId={job?.id || ""}
            jobTitle={job?.title || "Interview"}
            onScheduled={() => {
              // Refresh the data after phone screens are scheduled
              refreshInterviewDetails();
              refreshCandidates();
            }}
          />

          {/* Bulk Invite Dialog */}
          <BulkInviteDialog
            open={bulkInviteOpen}
            onOpenChange={setBulkInviteOpen}
            interviewId={id as string}
            jobTitle={job?.title || "Interview"}
            availableCandidates={getAvailableCandidates()}
            onCandidatesMoved={handleBulkCandidateMovement}
            organizationId={getUserContext()?.organization_id || ""}
            nextStageTitle={
              getNextStageForCandidates(selectedCandidates)?.title
            }
            candidateGroups={candidateGroups}
          />

          {/* Note Dialog */}
          <Dialog
            open={noteDialog.open}
            onOpenChange={(open) => {
              if (!isSavingNote) {
                setNoteDialog({ open });
              }
            }}
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
                  disabled={isSavingNote}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setNoteDialog({ open: false })}
                  disabled={isSavingNote}
                  className="cursor-pointer text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={saveNote}
                  disabled={!newNote.trim() || isSavingNote}
                  className="cursor-pointer text-xs"
                >
                  {isSavingNote ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : noteDialog.candidate?.notes ? (
                    "Update Note"
                  ) : (
                    "Add Note"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Save Confirmation Dialog */}
          <Dialog open={saveConfirmOpen} onOpenChange={setSaveConfirmOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader className="text-center sm:text-left">
                <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                  Confirm Changes & Send Notifications
                </DialogTitle>
                <DialogDescription className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Your changes will be saved and email notifications will be
                  automatically sent to affected candidates about their
                  application status updates.
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <Checkbox
                  checked={hasReadWarning}
                  onCheckedChange={(checked) =>
                    setHasReadWarning(
                      checked === "indeterminate" ? false : checked
                    )
                  }
                  className="cursor-pointer"
                  id="confirm-warning"
                />
                <label
                  htmlFor="confirm-warning"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none"
                >
                  I understand that email notifications will be sent to
                  candidates and this action cannot be undone.
                </label>
              </div>

              <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSaveConfirmOpen(false);
                    setHasReadWarning(false);
                  }}
                  className="w-full sm:w-auto cursor-pointer text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    setSaveConfirmOpen(false);
                    setHasReadWarning(false);
                    // Check if this is pipeline changes or configuration changes
                    if (pendingChanges.length > 0) {
                      await saveAllChanges();
                    }
                  }}
                  disabled={!hasReadWarning}
                  className="w-full sm:w-auto cursor-pointer text-xs"
                  variant="outline"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes & Send Emails
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Bulk Select Dialog */}
          <BulkSelectDialog
            open={bulkSelectOpen}
            onOpenChange={setBulkSelectOpen}
            stages={stages}
            onBulkSelect={handleBulkSelection}
          />

          {/* Human Interview Scheduling Dialog */}
          <HumanInterviewSchedulingDialog
            open={humanInterviewDialogOpen}
            onOpenChange={setHumanInterviewDialogOpen}
            data={humanInterviewDialogData}
            onComplete={handleHumanInterviewComplete}
          />

          {/* Candidate View Dialog */}
          <Dialog
            open={candidateDialogOpen}
            onOpenChange={(open) => {
              setCandidateDialogOpen(open);
              if (!open) setSelectedCandidate(null);
            }}
          >
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="tracking-tight">Candidate</DialogTitle>
                <DialogDescription>{selectedCandidate?.name}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <div className="flex gap-2 w-full">
                  {selectedCandidate?.resume_url && (
                    <Button
                      onClick={() =>
                        window.open(
                          selectedCandidate.resume_url,
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                      variant="outline"
                      className="cursor-pointer text-xs w-full"
                    >
                      <Eye className="h-4 w-4" />
                      View Resume
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
