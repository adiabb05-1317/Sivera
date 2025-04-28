"use client";
import { useState, useEffect } from "react";
import { Icons } from "@/app/lib/icons";
import usePathStore from "@/app/store/PathStore";

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
  const { codingProblem, sendCodeMessage } = usePathStore();
  const [selectedLang, setSelectedLang] = useState(SUPPORTED_LANGUAGES[0].id);
  const [codes, setCodes] = useState<Record<string, string>>({
    js: "",
    py: "",
    java: "",
  });

  useEffect(() => {
    // Clear all code when a new problem arrives
    setCodes({ js: "", py: "", java: "" });
  }, [codingProblem]);

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col bg-[#181A20] text-white border-r border-gray-800 shadow-2xl rounded-lg overflow-hidden animate-fade-in">
      <div className="flex justify-between items-center py-4 px-6 border-b border-gray-800 bg-[#20232A]">
        <h3 className="text-white font-semibold text-lg flex items-center gap-2 tracking-tight">
          <Icons.Code className="w-5 h-5 text-blue-400" />
          <span>Coding Challenge</span>
        </h3>
        <button
          onClick={onClose}
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
          <h4 className="font-semibold text-white mb-2 text-base">Constraints</h4>
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
        <textarea
          className="w-full h-full bg-transparent text-gray-100 p-6 font-mono text-base focus:outline-none resize-none rounded-none placeholder-gray-600 transition-shadow focus:shadow-outline-blue min-h-[300px]"
          value={codes[selectedLang]}
          onChange={(e) => {
            const newCode = e.target.value;
            setCodes((prev) => ({ ...prev, [selectedLang]: newCode }));
            const langName = SUPPORTED_LANGUAGES.find(l => l.id === selectedLang)?.name || selectedLang;
            sendCodeMessage(newCode, langName);
          }}
          spellCheck={false}
          placeholder={`// Write your ${SUPPORTED_LANGUAGES.find(l => l.id === selectedLang)?.name} solution here...`}
          style={{ minHeight: "calc(100vh - 300px)", caretColor: "#60a5fa" }}
        />
      </div>

      <div className="flex justify-end py-4 px-6 bg-[#20232A] border-t border-gray-800">
        <button
          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-2 rounded-lg text-base font-semibold shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={() => {
            alert("Submitted code:\n" + JSON.stringify(codes, null, 2));
          }}
        >
          Submit Solution
        </button>
      </div>
    </div>
  );
}
