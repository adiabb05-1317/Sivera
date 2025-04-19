"use client";
import { useState, useEffect } from "react";
import { Icons } from "@/app/lib/icons";
import usePathStore from "@/app/store/PathStore";

interface CodeEditorProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function CodeEditor({
  isOpen = false,
  onClose,
}: CodeEditorProps) {
  const { codingProblem } = usePathStore();
  const [code, setCode] = useState(`// Write your code here to solve the problem
function solution() {
  // Your code here
}
`);

  useEffect(() => {
    if (codingProblem) {
      // When a new problem arrives, reset the code to a template with the problem context
      setCode(`// Problem: ${codingProblem.description.split("\n")[0]}
// Write your code here to solve the problem

function solution() {
  // Your code here
}
`);
    }
  }, [codingProblem]);

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-white border-r border-gray-700">
      <div className="flex justify-between items-center py-3 px-4 border-b border-gray-700 bg-[#252526]">
        <h3 className="text-white font-medium flex items-center gap-2">
          <Icons.Code className="w-4 h-4" />
          <span>Coding Challenge</span>
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
          aria-label="Close editor"
        >
          <Icons.X className="w-5 h-5" />
        </button>
      </div>

      {codingProblem && (
        <div className="bg-[#252526] border-b border-gray-700 p-3 max-h-[300px] overflow-auto">
          <h4 className="font-medium text-white mb-2">Problem:</h4>
          <p className="text-gray-300 mb-3 whitespace-pre-line">
            {codingProblem.description}
          </p>
          <h4 className="font-medium text-white mb-2">Constraints:</h4>
          <p className="text-gray-300 whitespace-pre-line">
            {codingProblem.constraints}
          </p>
        </div>
      )}

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

      <div className="flex justify-end py-2 px-4 bg-[#252526] border-t border-gray-700">
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
          onClick={() => {
            // Handle code submission
            // This could send the code back to the server for evaluation
            alert("Code submitted successfully!");
          }}
        >
          Submit Solution
        </button>
      </div>
    </div>
  );
}
