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
import { CheckSquare, Users, Target } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "../ui/slider";

interface Candidate {
  id: string;
  name: string;
  email: string;
  ai_score?: number;
  status?: string;
}

interface Stage {
  id: string;
  title: string;
  candidates: Candidate[];
}

interface BulkSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: Stage[];
  onBulkSelect: (
    candidateIds: string[],
    stageTitle: string,
    scoreThreshold: number
  ) => void;
}

export const BulkSelectDialog: React.FC<BulkSelectDialogProps> = ({
  open,
  onOpenChange,
  stages,
  onBulkSelect,
}) => {
  const [selectedStageId, setSelectedStageId] = useState<string>("applied");
  const [scoreThreshold, setScoreThreshold] = useState<number>(8);
  const [previewCandidates, setPreviewCandidates] = useState<Candidate[]>([]);

  // Include all stages
  const availableStages = stages;

  useEffect(() => {
    if (!open) return;

    const stagesToSearch =
      selectedStageId === "all"
        ? availableStages.filter((stage) => stage.id !== "applied")
        : availableStages.filter((stage) => stage.id === selectedStageId);

    let candidates;

    if (selectedStageId === "applied") {
      // For applied stage, select all candidates without score filtering
      candidates = stagesToSearch.flatMap((stage) => stage.candidates);
    } else {
      // For other stages, filter by score
      candidates = stagesToSearch
        .flatMap((stage) => stage.candidates)
        .filter(
          (candidate) =>
            candidate.ai_score && candidate.ai_score >= scoreThreshold
        );
    }

    setPreviewCandidates(candidates);
  }, [selectedStageId, scoreThreshold, stages, open]);

  const handleSelect = () => {
    const candidateIds = previewCandidates.map((candidate) => candidate.id);
    const stageTitle =
      selectedStageId === "all"
        ? "all stages (excluding Applied)"
        : availableStages.find((s) => s.id === selectedStageId)?.title || "";

    const effectiveScoreThreshold =
      selectedStageId === "applied" ? 0 : scoreThreshold;

    onBulkSelect(candidateIds, stageTitle, effectiveScoreThreshold);
    onOpenChange(false);
  };

  const handleReset = () => {
    setSelectedStageId("all");
    setScoreThreshold(8);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Bulk Select Candidates
          </DialogTitle>
          <DialogDescription>
            Select candidates from specific stages based on their AI interview
            scores
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Stage Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Stage</label>
            <Select value={selectedStageId} onValueChange={setSelectedStageId}>
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue placeholder="Choose a stage" />
              </SelectTrigger>
              <SelectContent className="cursor-pointer">
                {availableStages.map((stage) => (
                  <SelectItem
                    key={stage.id}
                    value={stage.id}
                    className="cursor-pointer"
                  >
                    {stage.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Score Threshold Selection - Hide for Applied stage */}
          {selectedStageId !== "applied" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Minimum Score</label>
              </div>
              <div className="px-3 pb-3 pt-1">
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[scoreThreshold]}
                  onValueChange={(value) => setScoreThreshold(value[0])}
                  className="w-full"
                />
                <div className="relative mt-2 mx-2 h-4">
                  <div className="absolute left-0 text-xs text-gray-400 transform -translate-x-1/2">
                    1
                  </div>
                  <div className="absolute left-1/2 text-sm text-app-blue-600 transform -translate-x-1/2">
                    {scoreThreshold}
                  </div>
                  <div className="absolute right-0 text-xs text-gray-400 transform translate-x-1/2">
                    10
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Applied Stage Info */}
          {selectedStageId === "applied" && (
            <div className="bg-app-blue-50 dark:bg-app-blue-900/20 border border-app-blue-200 dark:border-app-blue-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-app-blue-400 dark:text-app-blue-300">
                  All candidates from Applied stage will be selected
                </span>
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Preview</label>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-app-blue-600" />
                <span className="text-sm font-medium text-app-blue-700 bg-app-blue-50 dark:bg-app-blue-900/20 dark:text-app-blue-300 px-2 py-1 rounded">
                  {previewCandidates.length} selected
                </span>
              </div>
            </div>

            {previewCandidates.length > 0 ? (
              <div className="bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700">
                <div className="space-y-3">
                  {previewCandidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="group relative bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-app-blue-300 dark:hover:border-app-blue-600 transition-all duration-200 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 bg-gradient-to-br from-app-blue-500 to-app-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                              {candidate.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {candidate.name}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {candidate.email}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Show score only for non-applied stages */}
                        {selectedStageId !== "applied" &&
                          candidate.ai_score && (
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Score
                                </div>
                                <div className="text-sm font-bold text-app-blue-600 dark:text-app-blue-400">
                                  {candidate.ai_score}/10
                                </div>
                              </div>
                            </div>
                          )}

                        {/* Applied stage indicator */}
                        {selectedStageId === "applied" && (
                          <div className="flex items-center gap-1">
                            <CheckSquare className="h-4 w-4 text-app-blue-600" />
                            <span className="text-xs text-app-blue-600 dark:text-app-blue-400 font-medium">
                              Will be selected
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  No candidates found
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedStageId === "applied"
                    ? "No candidates in Applied stage"
                    : "Try adjusting the score threshold or selecting a different stage"}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-3 pt-6">
          <Button
            variant="outline"
            onClick={handleReset}
            className="cursor-pointer text-xs"
          >
            Reset
          </Button>
          <Button
            onClick={handleSelect}
            disabled={previewCandidates.length === 0}
            className="cursor-pointer text-xs"
            variant="outline"
          >
            Select {previewCandidates.length} Candidate
            {previewCandidates.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
