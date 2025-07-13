"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import {
  X,
  Search,
  Filter,
  ArrowRight,
  MessageSquare,
  CheckSquare,
  Plus,
  Loader2,
  Save,
  RotateCcw,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DrawerHeader } from "./drawer";
import { Checkbox } from "./checkbox";

interface Candidate {
  id: string;
  name: string;
  email: string;
  status?: string;
  interview_status?: string;
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

interface CandidatePipelineProps {
  interviewedCandidates: Candidate[];
  interviewId: string;
  jobTitle: string;
  onClose: () => void;
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
          ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20"
          : isSelected
          ? "border-app-blue-500 bg-app-blue-50 dark:bg-app-blue-900/20"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
      } shadow-sm hover:shadow-md`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-selected={isSelected}
      title="Click to select candidate"
    >
      <div className="flex items-center justify-between mb-2">
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
          {hasChanges && (
            <Badge
              variant="outline"
              className="text-xs mx-1 px-1 py-0 bg-app-blue-50 text-app-blue-500 border-app-blue-300"
            >
              Modified
            </Badge>
          )}
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
        {candidate.skills && candidate.skills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {candidate.skills.slice(0, 2).map((skill, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="text-xs px-1.5 py-0.5"
              >
                {skill}
              </Badge>
            ))}
            {candidate.skills.length > 2 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                +{candidate.skills.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Score positioned at bottom right */}
      {candidate.ai_score && (
        <div className="absolute bottom-3.5 right-3.5">
          <div className="w-10 h-10">
            <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
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
                    ? "text-emerald-500"
                    : candidate.ai_score >= 6
                    ? "text-amber-500"
                    : "text-rose-500"
                }
              />
            </svg>
            {/* Score text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={`text-sm font-bold tracking-tight ${
                  candidate.ai_score >= 8
                    ? "text-emerald-600 dark:text-emerald-400"
                    : candidate.ai_score >= 6
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400"
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
      className={`flex flex-col h-full w-full min-w-[350px] border-r border-gray-200 dark:border-gray-700`}
    >
      <div
        className={`flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 ${
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
              className={`flex-1 p-3 overflow-y-auto transition-colors ${
                snapshot.isDraggingOver
                  ? "bg-app-blue-50 dark:bg-app-blue-900/20"
                  : "bg-gray-50 dark:bg-gray-800"
              }`}
            >
              {stage.candidates.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-xs text-gray-400 dark:text-gray-500">
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
        <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
          {stage.candidates.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-xs text-gray-400 dark:text-gray-500">
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

export const CandidatePipeline: React.FC<CandidatePipelineProps> = ({
  interviewedCandidates,
  interviewId,
  jobTitle,
  onClose,
}) => {
  const { toast } = useToast();
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

  // Check if drag and drop components are ready
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDragDropReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Initialize stages
  useEffect(() => {
    const initialStages: PipelineStage[] = [
      {
        id: "ai_interview",
        title: "AI Interview",
        type: "ai_interview",
        candidates: interviewedCandidates.map((c) => ({
          ...c,
          ai_score: Math.floor(Math.random() * 4) + 7, // Mock scores 7-10
          skills: ["React", "TypeScript", "Node.js"], // Mock skills
          pipeline_stage: "ai_interview",
        })),
      },
      {
        id: "human_interview_1",
        title: "Interview Round 1",
        type: "human_interview",
        round: 1,
        candidates: [],
      },
      {
        id: "accepted",
        title: "Accepted",
        type: "accepted",
        candidates: [],
      },
      {
        id: "rejected",
        title: "Rejected",
        type: "rejected",
        candidates: [],
      },
    ];
    setStages(initialStages);
    setOriginalStages(JSON.parse(JSON.stringify(initialStages))); // Deep copy for original state
  }, [interviewedCandidates]);

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

  const addPendingChange = useCallback((change: PendingChange) => {
    setPendingChanges((prev) => [...prev, change]);
  }, []);

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

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex flex-col gap-2 mx-2">
        <DrawerHeader className="flex flex-row justify-between items-center w-full p-5 py-0">
          <div className="flex flex-col gap-2 items-start">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Candidate Pipeline
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {jobTitle}
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
            <Button
              variant="ghost"
              className="cursor-pointer text-xs"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>
        <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
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
              <Button variant="outline" size="sm">
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
              <Button variant="outline" size="sm">
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

      {/* Controls */}

      {/* Pipeline Board */}
      {isDragDropReady ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-hidden">
            <div className="flex h-full overflow-x-auto">
              {filteredStages.map((stage) => {
                // Check the pending changes for this specific stage
                const addChange = pendingChanges.find(
                  (change) =>
                    change.type === "add_round" && change.stageId === stage.id
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
                      canRemove ? removeHumanInterviewRound : undefined
                    }
                  />
                );
              })}
            </div>
          </div>
        </DragDropContext>
      ) : (
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-sm text-gray-500">
              Loading pipeline...
            </span>
          </div>
        </div>
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
    </div>
  );
};
