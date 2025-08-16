import React, { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { useRouter } from "next/navigation";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./dropdown-menu";
import {
  FileText,
  Linkedin,
  Eye,
  MoreVertical,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { Checkbox } from "./checkbox";
import { Badge } from "./badge";

export interface CandidateCardProps {
  candidate: any;
  index: number;
  onQuickAction: (action: string, candidate: any) => void;
  onSelect: (candidate: any, isSelected: boolean) => void;
  isSelected: boolean;
  onMove: (candidate: any, direction: "next" | "prev") => void;
  isDragDropReady?: boolean;
  hasChanges?: boolean;
  stageId?: string;
}

const CandidateCard: React.FC<CandidateCardProps> = React.memo(
  ({
    candidate,
    index,
    onQuickAction,
    onSelect,
    isSelected,
    onMove,
    isDragDropReady = false,
    hasChanges = false,
    stageId,
  }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const router = useRouter();

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(candidate, !isSelected);
      }
    };

    const handleClick = (e: React.MouseEvent) => {
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
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-semibold text-xs mb-1 text-left">
              {candidate.name}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate text-left opacity-70">
              {candidate.email}
            </p>
            {candidate.phone && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate text-left opacity-70">
                {candidate.phone}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-[85px] justify-end">
            <Checkbox
              checked={isSelected}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(candidate, !isSelected);
              }}
            />
            <Badge
              variant="outline"
              className={`text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                candidate.notes
                  ? "opacity-100"
                  : isDropdownOpen
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              } transition-opacity`}
              onClick={(e) => {
                e.stopPropagation();
                onQuickAction("add_note", candidate);
              }}
            >
              <MessageSquare className="h-4 w-4" />
              {candidate.notes ? "Edit Note" : "Add Note"}
            </Badge>
          </div>
        </div>

        {/* Three dots menu positioned at bottom right - adjust position if AI score is present */}
        <div className="absolute bottom-2 right-2">
          <DropdownMenu onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`h-6 w-6 p-0 text-xs cursor-pointer ${
                  isDropdownOpen
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                } transition-opacity`}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-xs cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickAction("view_resume", candidate);
                }}
              >
                <FileText className="h-4 w-4" />
                View Resume
              </DropdownMenuItem>
              {candidate.linkedin_profile && (
                <DropdownMenuItem
                  className="text-xs cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(candidate.linkedin_profile, "_blank");
                  }}
                >
                  <Linkedin className="h-4 w-4 mr-2" />
                  View LinkedIn Profile
                </DropdownMenuItem>
              )}
              {candidate.status === "Invited" &&
                candidate.interview_status === "Started" &&
                candidate.room_url && (
                  <DropdownMenuItem
                    className="text-xs cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(candidate.room_url, "_blank");
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Join Interview
                  </DropdownMenuItem>
                )}
              {candidate.status === "Interviewed" && (
                <DropdownMenuItem
                  className="text-xs cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(
                      `/dashboard/analytics/${candidate.job_id}/${candidate.id}`
                    );
                  }}
                >
                  <Eye className="h-4 w-4" />
                  Show Analytics
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {stageId === "ai_interview" &&
          candidate.interview_status &&
          candidate.interview_status.toLowerCase() === "completed" && (
            <div className="absolute top-3.5 right-3.5">
              {typeof candidate.ai_score === "number" ? (
                <div className="w-10 h-10">
                  <svg
                    className="w-10 h-10 transform -rotate-90"
                    viewBox="0 0 36 36"
                  >
                    <path
                      d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-slate-200 dark:text-slate-700"
                    />
                    <path
                      d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={`${
                        (candidate.ai_score / 10) * 100
                      }, 100`}
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
                      {candidate.ai_score === 0
                        ? "F"
                        : candidate.ai_score === 10
                        ? "A+"
                        : candidate.ai_score}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-10 h-10 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-gray-500" />
                </div>
              )}
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
  }
);

export default CandidateCard;
