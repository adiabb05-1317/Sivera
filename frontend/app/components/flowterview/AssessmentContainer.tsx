"use client";

import usePathStore from "@/app/store/PathStore";
import CodingEditor from "./CodingEditor";
import JupyterNotebook from "./JupyterNotebook";
import { Button } from "@/components/ui/button";

interface AssessmentContainerProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AssessmentContainer({
  isOpen = false,
  onClose,
}: AssessmentContainerProps) {
  const { currentAssessment } = usePathStore();

  const handleClose = () => {
    if (onClose) onClose();
  };

  // Don't render anything if no assessment exists
  if (!currentAssessment) return null;

  // Render the appropriate assessment component based on type
  const renderAssessment = () => {
    switch (currentAssessment.type) {
      case "code-editor":
        return (
          <CodingEditor
            assessment={currentAssessment}
            isOpen={isOpen}
            onClose={handleClose}
          />
        );
      case "notebook":
        return (
          <JupyterNotebook
            id={currentAssessment.id}
            assessment={currentAssessment}
            isOpen={isOpen}
            onClose={handleClose}
          />
        );
      default:
        return (
          <div className="h-full flex items-center justify-center bg-app-blue-50 dark:bg-[--meet-surface] text-app-blue-800 dark:text-app-blue-200">
            <p>Unknown assessment type: {(currentAssessment as any).type}</p>
          </div>
        );
    }
  };

  return (
    <div className={`h-full w-full ${!isOpen ? "hidden" : ""}`}>
      {renderAssessment()}
    </div>
  );
}
