"use client";
import { useState, useEffect, useRef } from "react";
import { Icons } from "@/app/lib/icons";
import usePathStore from "@/app/store/PathStore";
import Editor from "@monaco-editor/react";
import { editor } from "monaco-editor";

const SUPPORTED_LANGUAGES = [
  { name: "JavaScript", id: "js" },
  { name: "Python", id: "py" },
  { name: "Java", id: "java" },
];

interface CodeEditorProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function CodeEditor({
  isOpen = false,
  onClose,
}: CodeEditorProps) {
  const { codingProblem, sendCodeMessage, sendSubmittedMessage } =
    usePathStore();
  const [selectedLang, setSelectedLang] = useState(SUPPORTED_LANGUAGES[0].id);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({
    js: "",
    py: "",
    java: "",
  });

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

  // Debounce logic
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSentCode = useRef<Record<string, string>>({
    js: "",
    py: "",
    java: "",
  });
  const hasUnsentChanges = useRef(false);

  useEffect(() => {
    // Clear all code when a new problem arrives
    setCodes({ js: "", py: "", java: "" });
    lastSentCode.current = { js: "", py: "", java: "" };
    hasUnsentChanges.current = false;
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  }, [codingProblem]);

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
      }, 10000); // 10 seconds
    }
  };

  // On submit, send all codes immediately
  const handleSubmit = () => {
    SUPPORTED_LANGUAGES.forEach((lang) => {
      trySendCode(lang.id, codes[lang.id]);
      sendSubmittedMessage(codes[lang.id], lang.name);
    });
    alert("Submitted code:\n" + JSON.stringify(codes, null, 2));
  };

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col bg-[#181A20] text-white border-r border-gray-800 shadow-2xl overflow-hidden animate-fade-in">
      <div className="flex justify-between items-center py-4 px-6 border-b border-gray-800 bg-[#20232A]">
        <h3 className="text-white font-semibold text-lg flex items-center gap-2 tracking-tight">
          <Icons.Code className="w-5 h-5 text-blue-400" />
          <span>Coding Challenge</span>
        </h3>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Close editor"
        >
          <Icons.X className="w-5 h-5" />
        </button>
      </div>

      {codingProblem && (
        <div className="bg-[#20232A] border-b border-gray-800 px-6 py-5">
          <h4 className="font-semibold text-white mb-2 text-base">Problem</h4>
          <p className="text-gray-300 mb-4 whitespace-pre-line text-sm leading-relaxed">
            {codingProblem.description}
          </p>
          <h4 className="font-semibold text-white mb-2 text-base">
            Constraints
          </h4>
          <p className="text-gray-400 whitespace-pre-line text-sm leading-relaxed">
            {codingProblem.constraints}
          </p>
        </div>
      )}

      <div className="flex border-b border-gray-800 bg-[#20232A] px-6">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang.id}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              selectedLang === lang.id
                ? "bg-[#181A20] text-blue-400 border-b-2 border-blue-500"
                : "text-gray-400 hover:text-white"
            }`}
            onClick={() => setSelectedLang(lang.id)}
          >
            {lang.name}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto relative bg-[#181A20]">
        <Editor
          height="90vh"
          onMount={handleEditorMount}
          language={getMonacoLang(selectedLang)}
          value={codes[selectedLang]}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            fontSize: 16,
            automaticLayout: true,
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

      <div className="flex justify-end py-4 px-6 bg-[#20232A] border-t border-gray-800">
        <button
          className="bg-gradient-to-r text-sm from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-2 rounded-lg font-semibold shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={handleSubmit}
        >
          Submit Solution
        </button>
      </div>
    </div>
  );
}
