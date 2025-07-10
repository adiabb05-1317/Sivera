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
  MoreHorizontal,
  ArrowRight,
  Calendar,
  MessageSquare,
  Users,
  Undo,
  Redo,
  CheckSquare,
  Plus,
  Loader2,
  Move,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface Candidate {
  id: string;
  name: string;
  email: string;
  status?: string;
  interview_status?: string;
  ai_score?: number;
  skills?: string[];
  experience_years?: number;
  notes?: string[];
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

interface HistoryAction {
  type: "move" | "bulk_move";
  sourceStageId: string;
  destinationStageId: string;
  candidateIds: string[];
  timestamp: number;
}

const getScoreColor = (score?: number) => {
  if (!score) return "bg-gray-100 text-gray-600 border-gray-300";
  if (score >= 8) return "bg-green-100 text-green-700 border-green-300";
  if (score >= 6) return "bg-yellow-100 text-yellow-700 border-yellow-300";
  return "bg-red-100 text-red-700 border-red-300";
};

const CandidateCard: React.FC<{
  candidate: Candidate;
  index: number;
  onQuickAction: (action: string, candidate: Candidate) => void;
  onSelect: (candidate: Candidate, isSelected: boolean) => void;
  isSelected: boolean;
  onMove: (candidate: Candidate, direction: "next" | "prev") => void;
  isDragDropReady?: boolean;
}> = ({
  candidate,
  index,
  onQuickAction,
  onSelect,
  isSelected,
  onMove,
  isDragDropReady = false,
}) => {
  const [showActions, setShowActions] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(candidate, !isSelected);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      onSelect(candidate, !isSelected);
    }
  };

  const cardContent = (
    <div
      className={`bg-white dark:bg-gray-900 rounded-lg border p-3 mb-2 cursor-pointer transition-all duration-200 group ${
        isSelected
          ? "border-app-blue-500 bg-app-blue-50 dark:bg-app-blue-900/20"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      } shadow-sm hover:shadow-md`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-selected={isSelected}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(candidate, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            className="rounded border-gray-300 text-app-blue-500 focus:ring-app-blue-500"
          />
          <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
            {candidate.name}
          </h4>
        </div>
        <div className="flex items-center gap-1">
          {showActions && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(candidate, "prev");
                }}
                title="Move to previous stage"
              >
                <ArrowRight className="h-3 w-3 rotate-180" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(candidate, "next");
                }}
                title="Move to next stage"
              >
                <ArrowRight className="h-3 w-3" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => onQuickAction("next_round", candidate)}
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Send to Next Round
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onQuickAction("schedule", candidate)}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Interview
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onQuickAction("add_note", candidate)}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Add Note
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">
        {candidate.email}
      </p>
      <div className="flex items-center gap-2">
        {candidate.ai_score && (
          <Badge
            variant="outline"
            className={`text-xs px-2 py-0.5 ${getScoreColor(
              candidate.ai_score
            )}`}
          >
            {candidate.ai_score}/10
          </Badge>
        )}
        {candidate.experience_years && (
          <Badge variant="outline" className="text-xs px-2 py-0.5">
            {candidate.experience_years}y exp
          </Badge>
        )}
      </div>
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
      {candidate.notes && candidate.notes.length > 0 && (
        <div className="mt-2">
          <Badge variant="outline" className="text-xs">
            {candidate.notes.length} note
            {candidate.notes.length > 1 ? "s" : ""}
          </Badge>
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
  onMove: (candidate: Candidate, direction: "next" | "prev") => void;
  isDragDropReady?: boolean;
}> = ({
  stage,
  onQuickAction,
  onSelect,
  selectedCandidates,
  onAddRound,
  onMove,
  isDragDropReady = false,
}) => {
  return (
    <div className="flex flex-col h-full min-w-[280px] max-w-[300px]">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white whitespace-pre-line">
            {stage.title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {stage.candidates.length} candidate
            {stage.candidates.length !== 1 ? "s" : ""}
          </p>
        </div>
        {stage.type === "human_interview" && onAddRound && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddRound}
            className="h-8 w-8 p-0"
            title="Add another human interview round"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
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
                <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-500">
                  <div className="text-center">
                    <Users className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No candidates</p>
                  </div>
                </div>
              ) : (
                stage.candidates.map((candidate, index) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    index={index}
                    onQuickAction={onQuickAction}
                    onSelect={onSelect}
                    isSelected={selectedCandidates.has(candidate.id)}
                    onMove={onMove}
                    isDragDropReady={isDragDropReady}
                  />
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      ) : (
        <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
          {stage.candidates.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <Users className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No candidates</p>
              </div>
            </div>
          ) : (
            stage.candidates.map((candidate, index) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                index={index}
                onQuickAction={onQuickAction}
                onSelect={onSelect}
                isSelected={selectedCandidates.has(candidate.id)}
                onMove={onMove}
                isDragDropReady={isDragDropReady}
              />
            ))
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
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [scoreFilter, setScoreFilter] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
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
          experience_years: Math.floor(Math.random() * 10) + 2, // Mock experience
          pipeline_stage: "ai_interview",
        })),
      },
      {
        id: "human_interview_1",
        title: "Human Interview\nround 1",
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

  const addHistoryAction = useCallback(
    (action: HistoryAction) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(action);
        return newHistory;
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  const moveCandidate = (
    candidate: Candidate,
    sourceStageId: string,
    destinationStageId: string
  ) => {
    setIsLoading(true);

    addHistoryAction({
      type: "move",
      sourceStageId,
      destinationStageId,
      candidateIds: [candidate.id],
      timestamp: Date.now(),
    });

    setStages((prev) => {
      const newStages = [...prev];
      const sourceStage = newStages.find((s) => s.id === sourceStageId);
      const destStage = newStages.find((s) => s.id === destinationStageId);

      if (sourceStage && destStage) {
        const candidateIndex = sourceStage.candidates.findIndex(
          (c) => c.id === candidate.id
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

    setTimeout(() => setIsLoading(false), 300);

    const destStage = stages.find((s) => s.id === destinationStageId);
    toast({
      title: "Candidate moved",
      description: `${candidate.name} moved to ${destStage?.title}`,
    });
  };

  const handleMove = (candidate: Candidate, direction: "next" | "prev") => {
    const currentStageIndex = stages.findIndex((s) =>
      s.candidates.some((c) => c.id === candidate.id)
    );

    if (currentStageIndex === -1) return;

    const targetIndex =
      direction === "next" ? currentStageIndex + 1 : currentStageIndex - 1;

    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const sourceStageId = stages[currentStageIndex].id;
    const destinationStageId = stages[targetIndex].id;

    moveCandidate(candidate, sourceStageId, destinationStageId);
  };

  const undo = useCallback(() => {
    if (historyIndex >= 0) {
      const action = history[historyIndex];
      // Reverse the action
      setStages((prev) => {
        const newStages = [...prev];
        const sourceStage = newStages.find(
          (s) => s.id === action.destinationStageId
        );
        const destStage = newStages.find((s) => s.id === action.sourceStageId);

        if (sourceStage && destStage) {
          action.candidateIds.forEach((candidateId) => {
            const candidateIndex = sourceStage.candidates.findIndex(
              (c) => c.id === candidateId
            );
            if (candidateIndex >= 0) {
              const candidate = sourceStage.candidates[candidateIndex];
              sourceStage.candidates.splice(candidateIndex, 1);
              destStage.candidates.push({
                ...candidate,
                pipeline_stage: destStage.id,
              });
            }
          });
        }
        return newStages;
      });
      setHistoryIndex((prev) => prev - 1);
      toast({
        title: "Action undone",
        description: "Last action has been undone",
      });
    }
  }, [history, historyIndex, toast]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const action = history[historyIndex + 1];
      // Reapply the action
      setStages((prev) => {
        const newStages = [...prev];
        const sourceStage = newStages.find(
          (s) => s.id === action.sourceStageId
        );
        const destStage = newStages.find(
          (s) => s.id === action.destinationStageId
        );

        if (sourceStage && destStage) {
          action.candidateIds.forEach((candidateId) => {
            const candidateIndex = sourceStage.candidates.findIndex(
              (c) => c.id === candidateId
            );
            if (candidateIndex >= 0) {
              const candidate = sourceStage.candidates[candidateIndex];
              sourceStage.candidates.splice(candidateIndex, 1);
              destStage.candidates.push({
                ...candidate,
                pipeline_stage: destStage.id,
              });
            }
          });
        }
        return newStages;
      });
      setHistoryIndex((prev) => prev + 1);
      toast({
        title: "Action redone",
        description: "Action has been redone",
      });
    }
  }, [history, historyIndex, toast]);

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
            moveCandidate(candidate, currentStage.id, nextStage.id);
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
        setNoteDialog({ open: true, candidate });
        break;
    }
  };

  const addHumanInterviewRound = () => {
    const humanInterviewStages = stages.filter(
      (s) => s.type === "human_interview"
    );
    const nextRound = humanInterviewStages.length + 1;

    setStages((prev) => {
      const newStages = [...prev];
      const insertIndex = newStages.findIndex((s) => s.id === "accepted");

      newStages.splice(insertIndex, 0, {
        id: `human_interview_${nextRound}`,
        title: `Human Interview\nround ${nextRound}`,
        type: "human_interview",
        round: nextRound,
        candidates: [],
      });

      return newStages;
    });

    toast({
      title: "Round added",
      description: `Added Human Interview Round ${nextRound}`,
    });
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
      moveCandidate(candidate, source.droppableId, destination.droppableId);
    }
  };

  const saveNote = () => {
    if (noteDialog.candidate && newNote.trim()) {
      setStages((prev) => {
        const newStages = [...prev];
        const stageIndex = newStages.findIndex((s) =>
          s.candidates.some((c) => c.id === noteDialog.candidate?.id)
        );

        if (stageIndex >= 0) {
          const candidateIndex = newStages[stageIndex].candidates.findIndex(
            (c) => c.id === noteDialog.candidate?.id
          );

          if (candidateIndex >= 0) {
            newStages[stageIndex].candidates[candidateIndex] = {
              ...newStages[stageIndex].candidates[candidateIndex],
              notes: [
                ...(newStages[stageIndex].candidates[candidateIndex].notes ||
                  []),
                newNote.trim(),
              ],
            };
          }
        }

        return newStages;
      });

      toast({
        title: "Note added",
        description: `Note added for ${noteDialog.candidate.name}`,
      });

      setNoteDialog({ open: false });
      setNewNote("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Candidate Pipeline
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {jobTitle} •{" "}
            {stages.reduce((acc, stage) => acc + stage.candidates.length, 0)}{" "}
            total candidates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={historyIndex < 0}
          >
            <Undo className="h-4 w-4 mr-1" />
            Undo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
          >
            <Redo className="h-4 w-4 mr-1" />
            Redo
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Controls */}
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
            <DropdownMenuItem onClick={() => setSelectedCandidates(new Set())}>
              Clear selection
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {selectedCandidates.size > 0 && (
          <Badge variant="secondary">{selectedCandidates.size} selected</Badge>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 p-3">
        <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <Move className="h-4 w-4" />
          Drag and drop candidates between stages or use the arrow buttons on
          cards.
          <span className="text-xs opacity-75">
            (Multi-select with Ctrl/Cmd + click)
          </span>
        </p>
      </div>

      {/* Pipeline Board */}
      {isDragDropReady ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Moving candidate...</span>
                </div>
              </div>
            )}

            <div className="flex h-full overflow-x-auto">
              {filteredStages.map((stage) => (
                <PipelineColumn
                  key={stage.id}
                  stage={stage}
                  onQuickAction={handleQuickAction}
                  onSelect={handleSelect}
                  selectedCandidates={selectedCandidates}
                  onMove={handleMove}
                  isDragDropReady={isDragDropReady}
                  onAddRound={
                    stage.type === "human_interview" &&
                    stage.id ===
                      filteredStages
                        .filter((s) => s.type === "human_interview")
                        .slice(-1)[0]?.id
                      ? addHumanInterviewRound
                      : undefined
                  }
                />
              ))}
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
          <DialogTitle>Add Note</DialogTitle>
          <DialogDescription>
            Add a note for {noteDialog.candidate?.name}
          </DialogDescription>
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
            >
              Cancel
            </Button>
            <Button onClick={saveNote} disabled={!newNote.trim()}>
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
