"use client"
import { useState } from "react"
import { Icons } from "@/app/lib/icons"

interface CodeEditorProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function CodeEditor({ isOpen = false, onClose }: CodeEditorProps) {
  const [code, setCode] = useState("")
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed left-0 top-0 bottom-0 w-[360px] bg-white shadow-lg flex flex-col z-40 transition-all duration-300 ease-in-out">
      <div className="flex justify-between items-center py-3 px-4 border-b border-[--meet-border]">
        <h3 className="text-[--meet-text-primary] font-medium">Code Editor</h3>
        <button 
          onClick={onClose}
          className="text-[--meet-text-secondary] hover:text-[--meet-primary] p-1 rounded-full hover:bg-[--meet-hover]"
        >
          <Icons.X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <textarea
          className="w-full h-full bg-[#F8F9FA] text-[--meet-text-primary] p-4 font-mono text-sm focus:outline-none resize-none"
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="Write code here..."
          style={{ minHeight: "calc(100vh - 57px)" }}
        />
      </div>
    </div>
  )
}
