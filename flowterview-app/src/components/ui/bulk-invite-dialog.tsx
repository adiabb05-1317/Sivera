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
import { Users, Loader2, Check, ArrowRight } from "lucide-react";
import { authenticatedFetch } from "@/lib/auth-client";
import { useToast } from "@/hooks/use-toast";

interface Candidate {
  id: string;
  name: string;
  email: string;
  status?: string;
}

interface CandidateGroup {
  nextStage: { id: string; title: string };
  candidates: Candidate[];
  currentStage: string;
}

interface BulkInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interviewId: string;
  jobTitle: string;
  availableCandidates: Candidate[];
  onCandidatesMoved: () => void;
  organizationId: string;
  nextStageTitle?: string;
  candidateGroups?: CandidateGroup[];
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
  onCandidatesMoved,
  organizationId,
  nextStageTitle,
  candidateGroups = [],
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
    } else {
      // Auto-select all available candidates when dialog opens
      setSelectedCandidates(availableCandidates);
    }
  }, [open, availableCandidates]);

  const moveToNextStage = async () => {
    if (selectedCandidates.length === 0) {
      toast({
        title: "No candidates selected",
        description: "Please select at least one candidate to move.",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Just move candidates to next stage - emails will be sent when user clicks Save Changes
      toast({
        title: "Candidates moved!",
        description: `Successfully moved ${selectedCandidates.length} candidates to next stage. Click 'Save Changes' to send emails.`,
      });

      // Close dialog and let parent handle the actual movement
      onCandidatesMoved();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Error moving candidates:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to move candidates",
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
        process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL || "https://api.sivera.io";
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
          onCandidatesMoved();
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
          <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white">
            Move to Next Stage
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-600 dark:text-gray-400">
            {showStatus
              ? "Moving candidates to next stage. Please wait..."
              : `Moving selected candidates to ${
                  nextStageTitle || "Rejected"
                }.`}
          </DialogDescription>
        </DialogHeader>

        {!showStatus ? (
          <div className="space-y-6">
            {/* Candidates List */}
            <div className="max-h-96 overflow-y-auto">
              {availableCandidates.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    No candidates selected
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Select candidates from the pipeline first
                  </p>
                </div>
              ) : candidateGroups.length > 0 ? (
                // Display grouped candidates
                <div className="space-y-6">
                  {candidateGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="space-y-3">
                      <div className="flex items-center gap-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                          <span className="font-medium">
                            {group.currentStage}
                          </span>
                          <ArrowRight className="h-4 w-4 text-gray-400 mx-2" />
                          <span className="font-medium">
                            {group.nextStage.title}
                          </span>
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-xs font-normal bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        >
                          {group.candidates.length} candidate
                          {group.candidates.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {group.candidates.map((candidate) => (
                          <div
                            key={candidate.id}
                            className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {candidate.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {candidate.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {candidate.email}
                                </p>
                              </div>
                            </div>
                            <Check className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Display ungrouped candidates (fallback)
                <div className="space-y-2">
                  {availableCandidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {candidate.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {candidate.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {candidate.email}
                          </p>
                        </div>
                      </div>
                      <Check className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Status Display */
          <div className="py-6 space-y-4">
            <div className="flex items-center gap-3">
              {inviteStatus?.scheduled_count === selectedCandidates.length ? (
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <Loader2 className="h-5 w-5 text-gray-600 dark:text-gray-400 animate-spin" />
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  {inviteStatus?.scheduled_count === selectedCandidates.length
                    ? "All candidates moved successfully"
                    : "Moving candidates..."}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {inviteStatus?.scheduled_count || 0} of{" "}
                  {selectedCandidates.length} completed
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gray-900 dark:bg-gray-100 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    ((inviteStatus?.scheduled_count || 0) /
                      selectedCandidates.length) *
                    100
                  }%`,
                }}
              />
            </div>

            {inviteStatus?.scheduled_count === selectedCandidates.length && (
              <div className="text-center pt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  All candidates have been moved to the next stage successfully.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-3">
          {!showStatus ? (
            <>
              <Button
                onClick={handleClose}
                disabled={isLoading}
                className="text-xs cursor-pointer"
                variant="outline"
              >
                Cancel
              </Button>
              {availableCandidates.length > 0 && (
                <Button
                  onClick={moveToNextStage}
                  disabled={isLoading || selectedCandidates.length === 0}
                  className="text-xs cursor-pointer"
                  variant="outline"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Moving...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-4 w-4" />
                      Send to Next Stage
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
              className="text-xs cursor-pointer"
              variant="outline"
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
