"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Users, Loader2, Check } from "lucide-react";
import { authenticatedFetch } from "@/lib/auth-client";
import { useToast } from "@/hooks/use-toast";

interface Candidate {
  id: string;
  name: string;
  email: string;
  status?: string;
}

interface BulkInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interviewId: string;
  jobTitle: string;
  availableCandidates: Candidate[];
  onInvitesSent: () => void;
}

interface BulkInviteStatus {
  interview_id: string;
  total_candidates: number;
  scheduled_count: number;
  candidate_interviews: CandidateInterview[];
}

interface CandidateInterview {
  id: string;
  interview_id: string;
  candidate_id: string;
  status: string;
  room_url?: string;
  bot_token?: string;
  created_at: string;
  updated_at: string;
}

export function BulkInviteDialog({
  open,
  onOpenChange,
  interviewId,
  jobTitle,
  availableCandidates,
  onInvitesSent,
}: BulkInviteDialogProps) {
  const [selectedCandidates, setSelectedCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<BulkInviteStatus | null>(
    null
  );
  const [showStatus, setShowStatus] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setSelectedCandidates([]);
      setInviteStatus(null);
      setShowStatus(false);
    }
  }, [open]);

  const toggleCandidateSelection = (candidate: Candidate) => {
    setSelectedCandidates((prev) => {
      const isSelected = prev.some((c) => c.id === candidate.id);
      if (isSelected) {
        return prev.filter((c) => c.id !== candidate.id);
      } else {
        return [...prev, candidate];
      }
    });
  };

  const selectAllCandidates = () => {
    setSelectedCandidates(availableCandidates);
  };

  const clearSelection = () => {
    setSelectedCandidates([]);
  };

  const sendBulkInvites = async () => {
    if (selectedCandidates.length === 0) {
      toast({
        title: "No candidates selected",
        description: "Please select at least one candidate to send invites.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_FLOWTERVIEW_BACKEND_URL ||
        "http://localhost:8010";

      const requestData = {
        interview_id: interviewId,
        candidate_ids: selectedCandidates.map((c) => c.id),
        emails: selectedCandidates.map((c) => c.email),
        names: selectedCandidates.map((c) => c.name),
        job_title: jobTitle,
      };

      const response = await authenticatedFetch(
        `${backendUrl}/api/v1/invites/bulk-invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to send bulk invites");
      }

      await response.json();

      toast({
        title: "Bulk invites initiated!",
        description: `Processing ${selectedCandidates.length} invites.`,
      });

      setShowStatus(true);
      pollInviteStatus();
    } catch (error: unknown) {
      console.error("Error sending bulk invites:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to send invites",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const pollInviteStatus = async () => {
    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_FLOWTERVIEW_BACKEND_URL ||
        "http://localhost:8010";
      const response = await authenticatedFetch(
        `${backendUrl}/api/v1/invites/bulk-invite-status/${interviewId}`
      );

      if (response.ok) {
        const status = await response.json();
        setInviteStatus(status);

        // Continue polling if not all candidates are processed
        if (status.scheduled_count < selectedCandidates.length) {
          setTimeout(pollInviteStatus, 2000); // Poll every 2 seconds
        } else {
          // All done, notify parent component
          onInvitesSent();
        }
      }
    } catch (error) {
      console.error("Error polling invite status:", error);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Send Bulk Invites
          </DialogTitle>
          <DialogDescription>
            Select candidates to send interview invites for &quot;{jobTitle}
            &quot;.
            {availableCandidates.length > 0
              ? ` ${availableCandidates.length} candidates available.`
              : " No candidates found for this job."}
          </DialogDescription>
        </DialogHeader>

        {!showStatus ? (
          <div className="space-y-4">
            {/* Selection Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {selectedCandidates.length} of {availableCandidates.length}{" "}
                  selected
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllCandidates}
                  disabled={
                    selectedCandidates.length === availableCandidates.length
                  }
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  disabled={selectedCandidates.length === 0}
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Candidates List */}
            <Card className="max-h-60 overflow-y-auto p-0">
              <CardContent className="p-0">
                {availableCandidates.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                    <Users className="mx-auto h-8 w-8 mb-2 text-gray-400" />
                    <p className="text-sm">
                      No candidates available for this job.
                    </p>
                    <p className="text-xs mt-1">
                      Add candidates to the job first, or check if all
                      candidates have already been invited.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {availableCandidates.map((candidate) => {
                      const isSelected = selectedCandidates.some(
                        (c) => c.id === candidate.id
                      );
                      return (
                        <div
                          key={candidate.id}
                          className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                            isSelected
                              ? "bg-indigo-50 dark:bg-indigo-900/20"
                              : ""
                          }`}
                          onClick={() => toggleCandidateSelection(candidate)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                    isSelected
                                      ? "bg-indigo-600 border-indigo-600"
                                      : "border-gray-300 dark:border-gray-600"
                                  }`}
                                >
                                  {isSelected && (
                                    <Check className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {candidate.name}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {candidate.email}
                                  </p>
                                </div>
                              </div>
                            </div>
                            {candidate.status && (
                              <Badge variant="outline" className="text-xs">
                                {candidate.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Status Display */
          <div className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center gap-3 mb-4">
                  {inviteStatus?.scheduled_count ===
                  selectedCandidates.length ? (
                    <Check className="h-6 w-6 text-green-600" />
                  ) : (
                    <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
                  )}
                  <div>
                    <h3 className="font-semibold">
                      {inviteStatus?.scheduled_count ===
                      selectedCandidates.length
                        ? "All invites sent successfully!"
                        : "Processing invites..."}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {inviteStatus?.scheduled_count || 0} of{" "}
                      {selectedCandidates.length} completed
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        ((inviteStatus?.scheduled_count || 0) /
                          selectedCandidates.length) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {inviteStatus?.scheduled_count === selectedCandidates.length && (
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  All candidates have been sent their interview invites with
                  unique room URLs.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!showStatus ? (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              {availableCandidates.length > 0 && (
                <Button
                  onClick={sendBulkInvites}
                  disabled={isLoading || selectedCandidates.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send {selectedCandidates.length} Invite
                      {selectedCandidates.length !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              )}
            </>
          ) : (
            <Button
              onClick={handleClose}
              disabled={
                inviteStatus?.scheduled_count !== selectedCandidates.length
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {inviteStatus?.scheduled_count === selectedCandidates.length
                ? "Done"
                : "Processing..."}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
