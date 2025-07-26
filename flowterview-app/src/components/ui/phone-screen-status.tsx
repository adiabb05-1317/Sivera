"use client";

import React, { useState, useEffect } from "react";
import {
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Calendar,
  PhoneCall,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { authenticatedFetch } from "@/lib/auth-client";
import { toast } from "sonner";

// Utility function to format status text consistently
const formatStatusText = (status: string) => {
  return status
    .replace(/_/g, " ") // Replace underscores with spaces
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

interface PhoneScreenAttempt {
  id: string;
  candidate_id: string;
  job_id: string;
  phone_number: string;
  status: "scheduled" | "in_progress" | "completed" | "failed";
  scheduled_at?: string;
  attempted_at?: string;
  completed_at?: string;
  failed_at?: string;
  retry_count: number;
  max_retries: number;
  notes?: string;
  candidates: {
    name: string;
    email: string;
  };
}

interface PhoneScreenStatusProps {
  jobId: string;
  isPhoneScreenEnabled: boolean;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "scheduled":
      return <Clock className="h-4 w-4 text-blue-500" />;
    case "in_progress":
      return <PhoneCall className="h-4 w-4 text-orange-500 animate-pulse" />;
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "scheduled":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "in_progress":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "completed":
      return "bg-green-50 text-green-700 border-green-200";
    case "failed":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

const formatPhoneNumber = (phone: string) => {
  // Simple formatting for display
  if (phone.startsWith("+1") && phone.length === 12) {
    return `+1 (${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`;
  }
  return phone;
};

export function PhoneScreenStatus({
  jobId,
  isPhoneScreenEnabled,
}: PhoneScreenStatusProps) {
  const [phoneScreens, setPhoneScreens] = useState<PhoneScreenAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScreen, setSelectedScreen] =
    useState<PhoneScreenAttempt | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    candidate_id: "",
    phone_number: "",
    scheduled_at: "",
  });

  const siveraBackendUrl =
    process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL || "https://api.sivera.io";

  const fetchPhoneScreens = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch(
        `${siveraBackendUrl}/api/v1/phone-screens/job/${jobId}`
      );

      if (response.ok) {
        const data = await response.json();
        setPhoneScreens(data.phone_screens || []);
      } else {
        console.error("Failed to fetch phone screens");
      }
    } catch (error) {
      console.error("Error fetching phone screens:", error);
    } finally {
      setLoading(false);
    }
  };

  const updatePhoneScreenStatus = async (
    phoneScreenId: string,
    status: string,
    notes?: string
  ) => {
    try {
      const response = await authenticatedFetch(
        `${siveraBackendUrl}/api/v1/phone-screens/${phoneScreenId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, notes }),
        }
      );

      if (response.ok) {
        toast.success("Status Updated", {
          description: `Phone screen status updated to ${status}`,
        });
        fetchPhoneScreens();
      } else {
        throw new Error("Failed to update status");
      }
    } catch (error) {
      toast.error("Error", {
        description: "Failed to update phone screen status",
      });
    }
  };

  const schedulePhoneScreen = async () => {
    try {
      const response = await authenticatedFetch(
        `${siveraBackendUrl}/api/v1/phone-screens/schedule`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scheduleData),
        }
      );

      if (response.ok) {
        toast.success("Phone Screen Scheduled", {
          description: "Phone screen has been scheduled successfully",
        });
        setShowScheduleDialog(false);
        setScheduleData({
          candidate_id: "",
          phone_number: "",
          scheduled_at: "",
        });
        fetchPhoneScreens();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to schedule phone screen");
      }
    } catch (error) {
      toast.error("Error", {
        description:
          error instanceof Error
            ? error.message
            : "Failed to schedule phone screen",
      });
    }
  };

  const triggerScheduledProcessing = async () => {
    try {
      const response = await authenticatedFetch(
        `${siveraBackendUrl}/api/v1/phone-screens/process-scheduled`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        toast.success("Processing Triggered", {
          description: "Scheduled phone screens are being processed",
        });
        fetchPhoneScreens();
      }
    } catch (error) {
      toast.error("Error", {
        description: "Failed to trigger processing",
      });
    }
  };

  useEffect(() => {
    if (isPhoneScreenEnabled) {
      fetchPhoneScreens();
    }
  }, [jobId, isPhoneScreenEnabled]);

  if (!isPhoneScreenEnabled) {
    return (
      <Card className="bg-gray-50 dark:bg-gray-800/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Phone className="mx-auto h-8 w-8 text-gray-400 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Phone screening is not enabled for this interview
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">
              Loading phone screens...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            Phone Screen Status
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={triggerScheduledProcessing}
              className="text-xs cursor-pointer"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Process Scheduled
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowScheduleDialog(true)}
              className="text-xs cursor-pointer"
            >
              <Calendar className="h-3 w-3 mr-1" />
              Schedule New
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {phoneScreens.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="mx-auto h-8 w-8 text-gray-400 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                No phone screens scheduled yet
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Phone screens will be automatically scheduled when the interview
                becomes active
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {phoneScreens.map((screen) => (
                <div
                  key={screen.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedScreen(screen)}
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(screen.status)}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {screen.candidates.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatPhoneNumber(screen.phone_number)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {screen.retry_count > 0 && (
                      <span className="text-xs text-orange-600 dark:text-orange-400">
                        Retry {screen.retry_count}/{screen.max_retries}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={getStatusColor(screen.status)}
                    >
                      {formatStatusText(screen.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phone Screen Details Dialog */}
      {selectedScreen && (
        <Dialog
          open={!!selectedScreen}
          onOpenChange={() => setSelectedScreen(null)}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Screen Details
              </DialogTitle>
              <DialogDescription>
                {selectedScreen.candidates.name} -{" "}
                {selectedScreen.candidates.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-gray-500">
                    Status
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(selectedScreen.status)}
                    <Badge
                      variant="outline"
                      className={getStatusColor(selectedScreen.status)}
                    >
                      {formatStatusText(selectedScreen.status)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500">
                    Phone Number
                  </Label>
                  <p className="text-sm font-mono mt-1">
                    {formatPhoneNumber(selectedScreen.phone_number)}
                  </p>
                </div>
              </div>

              {selectedScreen.scheduled_at && (
                <div>
                  <Label className="text-xs font-medium text-gray-500">
                    Scheduled At
                  </Label>
                  <p className="text-sm mt-1">
                    {new Date(selectedScreen.scheduled_at).toLocaleString()}
                  </p>
                </div>
              )}

              {selectedScreen.attempted_at && (
                <div>
                  <Label className="text-xs font-medium text-gray-500">
                    Attempted At
                  </Label>
                  <p className="text-sm mt-1">
                    {new Date(selectedScreen.attempted_at).toLocaleString()}
                  </p>
                </div>
              )}

              {selectedScreen.retry_count > 0 && (
                <div>
                  <Label className="text-xs font-medium text-gray-500">
                    Retry Count
                  </Label>
                  <p className="text-sm mt-1">
                    {selectedScreen.retry_count} / {selectedScreen.max_retries}
                  </p>
                </div>
              )}

              {selectedScreen.notes && (
                <div>
                  <Label className="text-xs font-medium text-gray-500">
                    Notes
                  </Label>
                  <p className="text-sm mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    {selectedScreen.notes}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter className="flex gap-2">
              {selectedScreen.status === "in_progress" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() =>
                      updatePhoneScreenStatus(selectedScreen.id, "completed")
                    }
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Completed
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      updatePhoneScreenStatus(selectedScreen.id, "failed")
                    }
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Mark Failed
                  </Button>
                </>
              )}
              {selectedScreen.status === "failed" &&
                selectedScreen.retry_count < selectedScreen.max_retries && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      updatePhoneScreenStatus(selectedScreen.id, "scheduled")
                    }
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Schedule Phone Screen Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Schedule Phone Screen</DialogTitle>
            <DialogDescription>
              Schedule a new phone screen for a candidate
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="candidate_id">Candidate ID</Label>
              <Input
                id="candidate_id"
                value={scheduleData.candidate_id}
                onChange={(e) =>
                  setScheduleData({
                    ...scheduleData,
                    candidate_id: e.target.value,
                  })
                }
                placeholder="Enter candidate ID"
              />
            </div>
            <div>
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input
                id="phone_number"
                value={scheduleData.phone_number}
                onChange={(e) =>
                  setScheduleData({
                    ...scheduleData,
                    phone_number: e.target.value,
                  })
                }
                placeholder="+1234567890"
              />
            </div>
            <div>
              <Label htmlFor="scheduled_at">Scheduled At (Optional)</Label>
              <Input
                id="scheduled_at"
                type="datetime-local"
                value={scheduleData.scheduled_at}
                onChange={(e) =>
                  setScheduleData({
                    ...scheduleData,
                    scheduled_at: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowScheduleDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={schedulePhoneScreen}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
