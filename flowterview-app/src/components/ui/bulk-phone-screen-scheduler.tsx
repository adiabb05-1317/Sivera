"use client";

import React, { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Phone,
  Calendar as CalendarIcon,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Loader2,
  Filter,
  UserCheck,
  Phone as PhoneIcon,
} from "lucide-react";
import { authenticatedFetch, getUserContext } from "@/lib/auth-client";
import { CheckboxIndicator } from "@radix-ui/react-checkbox";
import { toast } from "sonner";

// Status badge color mapping using only app colors
const getCandidateStatusBadgeClass = (status: string) => {
  switch (status) {
    case "Applied":
      return "bg-app-blue-100/90 text-app-blue-600 border-app-blue-200/80";
    case "Screening":
      return "bg-app-blue-100/90 text-app-blue-700 border-app-blue-300/80";
    case "Interview_Scheduled":
    case "scheduled":
      return "bg-app-blue-200/90 text-app-blue-800 border-app-blue-400/80";
    case "Interviewed":
      return "bg-app-blue-200/80 text-app-blue-900 border-app-blue-500/80";
    case "completed":
      return "bg-app-blue-200/90 text-app-blue-900 border-app-blue-500/80";
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

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  original_phone: string;
  status: string;
  created_at: string;
  resume_url?: string;
}

interface ScheduledCandidate {
  phone_screen_id: string;
  candidate_id: string;
  candidate_name: string;
  phone_number: string;
  scheduled_at: string;
}

interface BulkPhoneScreenSchedulerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
  onScheduled: () => void;
}

export function BulkPhoneScreenScheduler({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  onScheduled,
}: BulkPhoneScreenSchedulerProps) {
  const [step, setStep] = useState<"select" | "schedule" | "confirm">("select");
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(
    new Set()
  );
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState("09:00");
  const [interval, setInterval] = useState(15); // minutes between calls
  const [scheduledCandidates, setScheduledCandidates] = useState<
    ScheduledCandidate[]
  >([]);
  const [filters, setFilters] = useState({
    status: "all",
    hasPhone: true,
  });

  const siveraBackendUrl =
    process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL || "https://api.sivera.io";

  // Fetch eligible candidates when dialog opens
  useEffect(() => {
    if (open && jobId) {
      fetchEligibleCandidates();
    }
  }, [open, jobId]);

  const fetchEligibleCandidates = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch(
        `${siveraBackendUrl}/api/v1/phone-screens/candidates/select`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            job_id: jobId,
            filters: {
              has_phone: filters.hasPhone,
              status: filters.status !== "all" ? filters.status : undefined,
            },
            sort_by: "created_at",
            sort_order: "desc",
            limit: 50,
          }),
        },
        false
      );

      if (response.ok) {
        const data = await response.json();
        setCandidates(data.eligible_candidates || []);
        toast.success("Candidates Loaded", {
          description: `Found ${data.eligible_count} eligible candidates for phone screening`,
        });
      } else {
        throw new Error("Failed to fetch candidates");
      }
    } catch (error) {
      console.error("Error fetching candidates:", error);
      toast.error("Error", {
        description: "Failed to load candidates",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCandidateSelection = (candidateId: string, selected: boolean) => {
    const newSelection = new Set(selectedCandidates);
    if (selected) {
      newSelection.add(candidateId);
    } else {
      newSelection.delete(candidateId);
    }
    setSelectedCandidates(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedCandidates.size === candidates.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(candidates.map((c) => c.id)));
    }
  };

  const generateTimeSlots = (): string[] => {
    if (!selectedDate || !startTime) return [];

    const slots: string[] = [];
    const baseDateTime = new Date(selectedDate);
    const [hours, minutes] = startTime.split(":").map(Number);
    baseDateTime.setUTCHours(hours, minutes, 0, 0);

    Array.from(selectedCandidates).forEach((_, index) => {
      const slotTime = new Date(baseDateTime);
      slotTime.setUTCMinutes(slotTime.getUTCMinutes() + index * interval);
      slots.push(slotTime.toISOString());
    });

    return slots;
  };

  const handleSchedulePhoneScreens = async () => {
    if (!selectedDate || !startTime || selectedCandidates.size === 0) {
      toast.error("Missing Information", {
        description: "Please select date, time, and candidates",
      });
      return;
    }

    setLoading(true);
    try {
      // Create UTC datetime from selected date and time
      const baseDateTime = new Date(selectedDate);
      const [hours, minutes] = startTime.split(":").map(Number);
      baseDateTime.setUTCHours(hours, minutes, 0, 0);

      const timeSlots = generateTimeSlots();

      const response = await authenticatedFetch(
        `${siveraBackendUrl}/api/v1/phone-screens/bulk-schedule`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidate_ids: Array.from(selectedCandidates),
            scheduled_at: baseDateTime.toISOString(),
            time_slots: timeSlots,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setScheduledCandidates(data.scheduled_screens || []);
        setStep("confirm");

        toast.success("Phone Screens Scheduled", {
          description: `Successfully scheduled ${data.scheduled_count} phone screens`,
        });

        if (data.failed_count > 0) {
          toast.error("Some Scheduling Failed", {
            description: `${data.failed_count} candidates could not be scheduled`,
          });
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to schedule phone screens");
      }
    } catch (error) {
      console.error("Error scheduling phone screens:", error);
      toast.error("Scheduling Failed", {
        description:
          error instanceof Error
            ? error.message
            : "Failed to schedule phone screens",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    onScheduled();
    onOpenChange(false);
    // Reset state
    setStep("select");
    setSelectedCandidates(new Set());
    setSelectedDate(undefined);
    setStartTime("09:00");
    setScheduledCandidates([]);
  };

  const renderCandidateSelection = () => (
    <div className="space-y-4">
      {/* Selection Summary */}
      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium">
            {selectedCandidates.size} of {candidates.length} candidates selected
          </span>
        </div>
        <Button
          onClick={handleSelectAll}
          variant="outline"
          size="sm"
          className="cursor-pointer text-xs"
        >
          {selectedCandidates.size === candidates.length
            ? "Deselect All"
            : "Select All"}
        </Button>
      </div>

      {/* Candidates List */}
      <div className="max-h-60 overflow-y-auto space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">
              Loading candidates...
            </span>
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <PhoneIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No eligible candidates found</p>
            <p className="text-xs text-gray-400">
              Candidates need phone numbers to be eligible
            </p>
          </div>
        ) : (
          candidates.map((candidate) => (
            <div
              key={candidate.id}
              className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <Checkbox
                checked={selectedCandidates.has(candidate.id)}
                onCheckedChange={(checked: boolean) =>
                  handleCandidateSelection(candidate.id, !!checked)
                }
                className="cursor-pointer !border-app-blue-600"
              >
                <CheckboxIndicator />
              </Checkbox>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {candidate.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {candidate.email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`${getCandidateStatusBadgeClass(
                    candidate.status
                  )} font-normal text-xs border-0 opacity-80`}
                >
                  {formatStatusText(candidate.status)}
                </Badge>
                <span className="text-xs text-gray-500 font-mono">
                  {candidate.phone}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderScheduleSettings = () => (
    <div className="space-y-6 flex flex-row gap-2 justify-between p-3">
      {/* Calendar */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          Select Date <span className="text-red-500">*</span>
        </Label>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          disabled={(date) =>
            date < new Date() || date.getDay() === 0 || date.getDay() === 6
          }
          className="rounded-md border"
        />
      </div>

      {/* Time Settings */}
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Start Time (UTC) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              min="00:00"
              max="23:59"
            />
            <p className="text-xs text-muted-foreground mt-1">
              UTC time - Current UTC: {new Date().toISOString().slice(11, 16)}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">Interval</Label>
            <Select
              value={interval.toString()}
              onValueChange={(value) => setInterval(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="20">20 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Schedule Preview */}
        {selectedDate && startTime && selectedCandidates.size > 0 && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Schedule Preview (UTC Times)
            </h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {generateTimeSlots()
                .slice(0, 5)
                .map((slot, index) => {
                  const candidate = candidates.find((c) =>
                    Array.from(selectedCandidates)[index]
                      ? c.id === Array.from(selectedCandidates)[index]
                      : false
                  );
                  return (
                    <div
                      key={index}
                      className="flex justify-between items-center text-xs"
                    >
                      <span className="font-mono">
                        {new Date(slot).toISOString().slice(11, 16)} UTC
                      </span>
                      <span className="text-gray-600">
                        {candidate?.name || "Unknown"}
                      </span>
                    </div>
                  );
                })}
              {selectedCandidates.size > 5 && (
                <div className="text-xs text-gray-500 text-center">
                  +{selectedCandidates.size - 5} more calls scheduled
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="space-y-4">
      <div className="text-center p-6">
        <CheckCircle className="h-8 w-8 text-app-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Phone Screens Scheduled Successfully!
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {scheduledCandidates.length} phone screens have been scheduled
        </p>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2">
        {scheduledCandidates.map((scheduled) => (
          <div
            key={scheduled.phone_screen_id}
            className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
          >
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {scheduled.candidate_name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {scheduled.phone_number}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                {new Date(scheduled.scheduled_at).toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(scheduled.scheduled_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            Phone Screen Scheduler
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Schedule phone screening calls for multiple candidates for{" "}
            <span className="font-medium">{jobTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-5 my-3">
              <div
                className={`flex items-center ${
                  step === "select" ? "text-app-blue-600" : "text-gray-400"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === "select"
                      ? "bg-app-blue-600 text-white"
                      : step === "schedule" || step === "confirm"
                      ? "bg-app-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  1
                </div>
                <span className="ml-2 text-sm font-medium">Select</span>
              </div>
              <div className="w-8 h-px bg-gray-300"></div>
              <div
                className={`flex items-center ${
                  step === "schedule" ? "text-app-blue-600" : "text-gray-400"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === "schedule"
                      ? "bg-app-blue-600 text-white"
                      : step === "confirm"
                      ? "bg-app-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  2
                </div>
                <span className="ml-2 text-sm font-medium">Schedule</span>
              </div>
              <div className="w-8 h-px bg-gray-300"></div>
              <div
                className={`flex items-center ${
                  step === "confirm" ? "text-app-blue-600" : "text-gray-400"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === "confirm"
                      ? "bg-app-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  3
                </div>
                <span className="ml-2 text-sm font-medium">Confirm</span>
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="overflow-y-auto max-h-96">
            {step === "select" && renderCandidateSelection()}
            {step === "schedule" && renderScheduleSettings()}
            {step === "confirm" && renderConfirmation()}
          </div>
        </div>

        <DialogFooter>
          {step === "select" && (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="cursor-pointer text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setStep("schedule")}
                disabled={selectedCandidates.size === 0}
                className="cursor-pointer text-xs"
                variant="outline"
              >
                Schedule
              </Button>
            </>
          )}
          {step === "schedule" && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("select")}
                className="cursor-pointer text-xs"
              >
                Back
              </Button>
              <Button
                onClick={handleSchedulePhoneScreens}
                disabled={!selectedDate || !startTime || loading}
                className="cursor-pointer text-xs"
                variant="outline"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  "Schedule Phone Screens"
                )}
              </Button>
            </>
          )}
          {step === "confirm" && (
            <Button
              onClick={handleComplete}
              className="w-full cursor-pointer text-xs"
              variant="outline"
            >
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
