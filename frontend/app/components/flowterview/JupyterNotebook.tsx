"use client";

import { Icons } from "@/app/lib/icons";
import usePathStore from "@/app/store/PathStore";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { NotebookAssessment } from "@/lib/types/general";
import { useTheme } from "next-themes";
import { useMemo, useState, useEffect } from "react";

interface JupyterNotebookProps {
  assessment: NotebookAssessment;
  isOpen?: boolean;
  onClose?: () => void;
  id: string;
}

export default function JupyterNotebook({
  id,
  assessment,
  isOpen = false,
  onClose,
}: JupyterNotebookProps) {
  const { sendSubmittedMessage } = usePathStore();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  const jupyterLiteUrl = useMemo(() => {
    if (!mounted) return "";
    if (!resolvedTheme) return "";

    const baseUrl = "https://jupyterlite.rtfd.io/en/stable/try/lab";

    const urlParams = new URLSearchParams({
      kernel: "python",
      theme: resolvedTheme,
    });

    return `${baseUrl}?${urlParams.toString()}`;
  }, [mounted]);

  const handleSubmit = () => {
    const message = `Jupyter Python assessment submitted for SiveraAssessment-${id}.ipynb\n\nNote: Please save your work in the notebook above.`;
    sendSubmittedMessage(message, "python");
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  // Keep component mounted but hidden to preserve state
  const containerClasses = `h-full flex flex-col bg-app-blue-50 dark:bg-[--meet-surface] text-white border-r overflow-hidden animate-fade-in rounded-3xl border border-app-blue-300/50 dark:border-app-blue-700/70 ${!isOpen ? "hidden" : ""}`;

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="flex justify-between items-center py-1 px-4 bg-app-blue-50 dark:bg-[--meet-surface] border-b border-app-blue-200/60 dark:border-app-blue-700/60">
        <h3 className="text-app-blue-800 dark:text-app-blue-200 font-semibold text-sm flex items-center gap-2 tracking-tight">
          <Icons.Notebook className="w-4 h-4 text-app-blue-500 dark:text-app-blue-300" />
          Notebook
        </h3>
        <button
          onClick={handleClose}
          className="text-app-blue-400 dark:text-app-blue-300 hover:text-app-blue-600 dark:hover:text-app-blue-100 p-2 rounded-full hover:bg-app-blue-100 dark:hover:bg-app-blue-900 transition-colors focus:outline-none focus:ring-2 focus:ring-app-blue-500 dark:focus:ring-app-blue-400"
          aria-label="Close notebook"
        >
          <Icons.X className="w-5 h-5" />
        </button>
      </div>

      {/* JupyterLite Iframe */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-[--meet-surface]">
        <iframe
          key={jupyterLiteUrl} // Force reload when URL changes (theme changes)
          src={jupyterLiteUrl}
          title="JupyterLite Python Environment"
          width="100%"
          height="100%"
          style={{
            border: "none",
            borderRadius: "0 0 0 0",
          }}
          allow="cross-origin-isolated"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        />
      </div>

      {/* Instructions & Submit */}
      <div className="bg-app-blue-50 dark:bg-[--meet-surface] border-t border-app-blue-200 dark:border-app-blue-700 px-6 py-3">
        <div className="flex justify-end items-center">
          <Button
            className="cursor-pointer text-xs text-black dark:text-white"
            variant="outline"
            onClick={handleSubmit}
          >
            <Send className="mr-2 h-3.5 w-3.5" />
            Submit Notebook
          </Button>
        </div>
      </div>
    </div>
  );
}
