"use client";
import { cn } from "@/app/lib/utils";
import usePathStore from "@/app/store/PathStore";

const QueryDisplay = ({ className }: { className?: string }) => {
  const { currentUserTranscript } = usePathStore();

  if (!currentUserTranscript) return null;

  return (
    <div
      className={cn(
        "meet-card max-w-md py-2 px-3 flex items-center gap-2 bg-opacity-90 shadow-md transition-all animate-fade-in",
        className
      )}
    >
      <div className="flex-1 overflow-hidden">
        <p className="text-[--meet-text-primary] text-sm font-medium truncate">
          {currentUserTranscript}
        </p>
      </div>
    </div>
  );
};

export default QueryDisplay;
