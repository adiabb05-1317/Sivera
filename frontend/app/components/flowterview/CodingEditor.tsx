"use client";

import { useState, useEffect, useRef } from "react";
import { Icons } from "@/app/lib/icons";
import usePathStore from "@/app/store/PathStore";
import Editor from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Fira_Code } from "next/font/google";
import { Button } from "@/components/ui/button";
import { Send, Type } from "lucide-react";
import { useTheme } from "next-themes";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { CodingAssessment } from "@/lib/types/general";

const firaCode = Fira_Code({ subsets: ["latin"], weight: "400" });

const SUPPORTED_LANGUAGES = [
  { name: "JavaScript", id: "js" },
  { name: "Python", id: "py" },
  { name: "Java", id: "java" },
];

interface CodingEditorProps {
  assessment: CodingAssessment;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function CodingEditor({
  assessment,
  isOpen = false,
  onClose,
}: CodingEditorProps) {
  const {
    sendCodeMessage,
    sendSubmittedMessage,
    editorFontSize,
    setEditorFontSize,
  } = usePathStore();
  const { resolvedTheme } = useTheme();
  const [selectedLang, setSelectedLang] = useState(SUPPORTED_LANGUAGES[0].id);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [monacoTheme, setMonacoTheme] = useState("light");
  const [codes, setCodes] = useState<Record<string, string>>({
    js: "",
    py: "",
    java: "",
  });

  // Helper to get Monaco theme based on resolved theme
  const getMonacoTheme = (currentTheme?: string) => {
    return currentTheme === "dark" ? "vs-dark" : "light";
  };

  // Initialize theme on mount
  useEffect(() => {
    const initialTheme = getMonacoTheme(resolvedTheme);
    setMonacoTheme(initialTheme);
  }, [resolvedTheme]);

  // Update Monaco theme when theme changes
  useEffect(() => {
    const newTheme = getMonacoTheme(resolvedTheme);
    setMonacoTheme(newTheme);
  }, [resolvedTheme]);

  const getMonacoLang = (lang: string) => {
    switch (lang) {
      case "js":
        return "javascript";
      case "py":
        return "python";
      case "java":
        return "java";
      default:
        return "plaintext";
    }
  };

  // Initialize starter code from assessment
  useEffect(() => {
    if (assessment.starterCode) {
      setCodes((prev) => ({
        ...prev,
        ...assessment.starterCode,
      }));
    }
  }, [assessment.starterCode]);

  // Debounce logic
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSentCode = useRef<Record<string, string>>({
    js: "",
    py: "",
    java: "",
  });
  const hasUnsentChanges = useRef(false);

  useEffect(() => {
    // Clear all code when a new assessment arrives
    setCodes({ js: "", py: "", java: "" });
    lastSentCode.current = { js: "", py: "", java: "" };
    hasUnsentChanges.current = false;
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  }, [assessment]);

  // Helper to send code if changed
  const trySendCode = (lang: string, code: string) => {
    const langName =
      SUPPORTED_LANGUAGES.find((l) => l.id === lang)?.name || lang;
    if (lastSentCode.current[lang] !== code) {
      sendCodeMessage(code, langName);
      lastSentCode.current[lang] = code;
      hasUnsentChanges.current = false;
    }
  };

  // On close, send latest code if unsent
  const handleClose = () => {
    if (hasUnsentChanges.current) {
      trySendCode(selectedLang, codes[selectedLang]);
    }
    if (onClose) onClose();
  };

  // On editor mount, set up editor reference
  const handleEditorMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  };

  // On language change, reset code
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCodes((prev) => ({ ...prev, [selectedLang]: value }));
      hasUnsentChanges.current = true;

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        trySendCode(selectedLang, value);
      }, 5000); // 5 seconds
    }
  };

  // On submit, send all codes immediately
  const handleSubmit = () => {
    SUPPORTED_LANGUAGES.forEach((lang) => {
      trySendCode(lang.id, codes[lang.id]);
      sendSubmittedMessage(codes[lang.id], lang.name);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col bg-app-blue-50 dark:bg-[--meet-surface] text-white border-r overflow-hidden animate-fade-in rounded-3xl border border-app-blue-300/50 dark:border-app-blue-700/70">
      <div className="flex justify-between items-center py-1 px-4 bg-app-blue-50 dark:bg-[--meet-surface] border-b border-app-blue-200/60 dark:border-app-blue-700/60">
        <h3 className="text-app-blue-800 dark:text-app-blue-200 font-semibold text-sm flex items-center gap-2 tracking-tight">
          <Icons.Code className="w-4 h-4 text-app-blue-500 dark:text-app-blue-300" />
          Code Editor
        </h3>
        <button
          onClick={handleClose}
          className="text-app-blue-400 dark:text-app-blue-300 hover:text-app-blue-600 dark:hover:text-app-blue-100 p-2 rounded-full hover:bg-app-blue-100 dark:hover:bg-app-blue-900 transition-colors focus:outline-none focus:ring-2 focus:ring-app-blue-500 dark:focus:ring-app-blue-400"
          aria-label="Close editor"
        >
          <Icons.X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex justify-between border-b border-app-blue-300 dark:border-app-blue-700 bg-app-blue-50 dark:bg-[--meet-surface] px-6">
        <div className="flex items-center">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors ${
                selectedLang === lang.id
                  ? "bg-white dark:bg-[--meet-surface] text-app-blue-600 dark:text-app-blue-200 border-b-2 border-app-blue-500 dark:border-app-blue-400"
                  : "text-app-blue-400 dark:text-app-blue-300 hover:text-app-blue-600 dark:hover:text-app-blue-100 hover:bg-app-blue-100 dark:hover:bg-app-blue-900"
              }`}
              onClick={() => setSelectedLang(lang.id)}
            >
              {lang.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Type className="w-3.5 h-3.5 text-app-blue-400 dark:text-app-blue-300" />
          <Select
            value={String(editorFontSize)}
            onValueChange={(value) => setEditorFontSize(Number(value))}
          >
            <SelectTrigger className="h-8 text-xs font-medium text-app-blue-400 dark:text-app-blue-300 hover:text-app-blue-600 dark:hover:text-app-blue-100 hover:bg-app-blue-100 dark:hover:bg-app-blue-900 border-0 bg-transparent focus:ring-0 focus:ring-offset-0 w-[70px]">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-900 border border-app-blue-200 dark:border-app-blue-700">
              {[12, 14, 16, 18, 20, 22, 24].map((size) => (
                <SelectItem key={size} value={String(size)} className="text-xs">
                  {size}px
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto relative bg-app-blue-50 dark:bg-[--meet-surface]">
        <Editor
          height="90vh"
          onMount={handleEditorMount}
          language={getMonacoLang(selectedLang)}
          value={codes[selectedLang]}
          onChange={handleEditorChange}
          theme={monacoTheme}
          options={{
            fontSize: editorFontSize,
            automaticLayout: true,
            fontFamily: firaCode.style.fontFamily,
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            wordWrap: "on",
            wrappingIndent: "indent",
            minimap: { enabled: false },
            tabSize: 2,
            formatOnType: true,
          }}
        />
      </div>

      <div className="flex justify-end py-4 px-6 bg-app-blue-50 dark:bg-[--meet-surface] border-t border-app-blue-200 dark:border-app-blue-700">
        <Button
          className="cursor-pointer text-xs text-black dark:text-white"
          variant="outline"
          onClick={handleSubmit}
        >
          <Send className="mr-2 h-3.5 w-3.5" />
          Submit Code
        </Button>
      </div>
    </div>
  );
}
