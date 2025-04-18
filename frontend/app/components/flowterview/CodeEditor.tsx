"use client";
import { useState } from "react";
import { Icons } from "@/app/lib/icons";

interface CodeEditorProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function CodeEditor({
  isOpen = false,
  onClose,
}: CodeEditorProps) {
  const [code, setCode] = useState(`// Write your code here
function greet(name) {
  return \`Hello, \${name}!\`;
}

const result = greet('Flowterview user');
console.log(result);
`);

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-white border-r border-gray-700">
      <div className="flex justify-between items-center py-3 px-4 border-b border-gray-700 bg-[#252526]">
        <h3 className="text-white font-medium flex items-center gap-2">
          <Icons.Code className="w-4 h-4" />
          <span>Code Editor</span>
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
          aria-label="Close editor"
        >
          <Icons.X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-2 py-2 flex items-center gap-2 border-b border-gray-700 bg-[#252526]">
        <div className="text-xs text-gray-400 bg-gray-800 rounded px-2 py-1">
          JavaScript
        </div>
        <div className="text-xs text-gray-400">Line: 1, Col: 1</div>
      </div>

      <div className="flex-1 overflow-auto relative">
        <div className="absolute left-0 top-0 bottom-0 w-10 z-10 flex flex-col bg-[#1e1e1e] border-r border-gray-700 text-right pr-2 pt-4">
          {code.split("\n").map((_, i) => (
            <div key={i} className="text-gray-500 text-xs select-none">
              {i + 1}
            </div>
          ))}
        </div>
        <textarea
          className="w-full h-full bg-[#1e1e1e] text-gray-200 p-4 pl-12 font-mono text-sm focus:outline-none resize-none"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          style={{
            minHeight: "calc(100vh - 96px)",
            caretColor: "#fff",
          }}
        />
      </div>
    </div>
  );
}
