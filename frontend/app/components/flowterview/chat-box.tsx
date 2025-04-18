"use client"

import { cn } from "@/app/lib/utils"
import usePathStore from "@/app/store/PathStore"
import { Message } from "@/lib/types/general"
import { Send, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

type Tab = "chat" | "notes"

const ChatBox = ({ className }: { className?: string }) => {
  const { currentChatHistory, setCurrentChatHistory } = usePathStore()
  const [input, setInput] = useState("")
  const [activeTab, setActiveTab] = useState<Tab>("chat")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { isChatBoxOpen, setIsChatBoxOpen } = usePathStore()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [currentChatHistory])

  const handleSend = () => {
    if (!input.trim()) return

    const newMessage: Message = {
      content: input,
      role: "user",
    }

    setCurrentChatHistory([...currentChatHistory, newMessage])
    setInput("")
  }

  return (
    <div
      className={cn(
        "fixed bottom-8 right-8 w-[430px] z-20 bg-black rounded-xl overflow-hidden flex flex-col shadow-2xl transition-all duration-300",
        "h-[500px]",
        className
      )}
      role="region"
      aria-label="Chat interface"
    >
      <div className="flex relative items-center justify-between border-gray-800">
        <div
          className="grid grid-cols-2 px-10 pt-5 justify-between w-full gap-2"
          role="tablist"
        >
          <button
            role="tab"
            aria-selected={activeTab === "chat"}
            onClick={() => setActiveTab("chat")}
            className={cn(
              "px-4 py-2 transition-colors",
              activeTab === "chat"
                ? "border-b border-[#41E1C4] text-[#41E1C4]"
                : ""
            )}
          >
            Chat
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "notes"}
            onClick={() => setActiveTab("notes")}
            className={cn(
              "px-4 py-2 transition-colors",
              activeTab === "notes"
                ? "border-b border-[#41E1C4] text-[#41E1C4]"
                : ""
            )}
          >
            AI notes
          </button>
        </div>
        <div className="flex absolute right-5 items-center gap-2">
          <button
            onClick={() => {
              setIsChatBoxOpen(false)
            }}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg"
            aria-label="Clear chat history"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {
        <>
          {activeTab === "chat" ? (
            <>
              <div
                className="flex-1 overflow-y-auto p-4 space-y-4"
                role="log"
                aria-live="polite"
                aria-label="Chat messages"
              >
                {currentChatHistory.map((message, i) => (
                  <div
                    key={i}
                    className={cn(
                      "max-w-[80%] p-3 rounded-xl",
                      message.role === "assistant"
                        ? "bg-gray-800 text-white mr-auto"
                        : message.role === "system"
                          ? "bg-gray-700 text-gray-300 mx-auto italic"
                          : "bg-emerald-400 text-black ml-auto"
                    )}
                    role={message.role === "assistant" ? "article" : "note"}
                    aria-label={`${message.role} message`}
                  >
                    {message.content}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-gray-800">
                <div className="flex items-center gap-2 border border-[#2D3035] bg-[#1B1B1B] rounded-full px-4 py-2">
                  <input
                    ref={inputRef}
                    type="text"
                    disabled
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Show me the pricing plan"
                    className="flex-1 bg-transparent text-white outline-none"
                    aria-label="Chat input"
                  />
                  <button
                    onClick={handleSend}
                    className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                    aria-label="Send message"
                    disabled={true}
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div
              className="flex-1 flex items-center justify-center text-gray-400"
              role="tabpanel"
              aria-label="AI notes content"
            >
              AI notes
            </div>
          )}
        </>
      }
    </div>
  )
}

export default ChatBox
