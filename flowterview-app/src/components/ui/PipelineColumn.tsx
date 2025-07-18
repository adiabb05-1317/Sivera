import React from "react";
import { Button } from "./button";
import { Plus, Trash2 } from "lucide-react";
import { Droppable } from "@hello-pangea/dnd";
import CandidateCard from "./CandidateCard";

export interface PipelineColumnProps {
  stage: any;
  onQuickAction: (action: string, candidate: any) => void;
  onSelect: (candidate: any, isSelected: boolean) => void;
  selectedCandidates: Set<string>;
  onAddRound?: () => void;
  onRemoveRound?: (stageId: string) => void;
  onMove: (candidate: any, direction: "next" | "prev") => void;
  isDragDropReady?: boolean;
  pendingChanges: any[];
  isNewStage?: boolean;
  isRemovedStage?: boolean;
  canRemove?: boolean;
}

const PipelineColumn: React.FC<PipelineColumnProps> = React.memo(
  ({
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
                  title="Add another interview round"
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
                  stage.candidates.map((candidate: any, index: number) => {
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
                        stageId={stage.id}
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
              stage.candidates.map((candidate: any, index: number) => {
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
                    stageId={stage.id}
                  />
                );
              })
            )}
          </div>
        )}
      </div>
    );
  }
);

export default PipelineColumn;
