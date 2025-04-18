"use client"
import AudioClient from "./audio-client"
import ChatBox from "./chat-box"
import Presentation from "./presentation-layer"
import usePathStore from "@/app/store/PathStore"
import { useEffect, useState } from "react"
import CodeEditor from "./CodeEditor"
import { Icons } from "@/app/lib/icons"
import dynamic from "next/dynamic"
import ClientOnly from "../client-only"

export default function FlowterviewComponent() {
  const { setCurrentBotTranscript, isChatBoxOpen, showToast } = usePathStore()
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const [lastScrollTop, setLastScrollTop] = useState(0)

  const handleClearTranscripts = () => {
    console.log("Clearing transcripts")
    setCurrentBotTranscript("")
  }
  
  // Handle scroll to hide/show header
  useEffect(() => {
    const handleScroll = () => {
      const st = window.scrollY || document.documentElement.scrollTop;
      if (st > lastScrollTop && st > 50) {
        // Scroll down
        setIsHeaderVisible(false);
      } else if (st < lastScrollTop || st < 10) {
        // Scroll up or at top
        setIsHeaderVisible(true);
      }
      setLastScrollTop(st <= 0 ? 0 : st);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollTop]);

  // Room URL state and fetching logic
  const [roomUrl, setRoomUrl] = useState<string | null>(null)
  const [loadingRoom, setLoadingRoom] = useState(false)
  const [roomError, setRoomError] = useState<string | null>(null)
  const [connectionAttempts, setConnectionAttempts] = useState(0)

  const fetchRoomUrl = async () => {
    setLoadingRoom(true)
    setRoomError(null)
    try {
      showToast("Connecting to Flowterview server...", "info")
      const response = await fetch("http://localhost:8000/api/v1/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      
      if (!response.ok) {
        throw new Error("Failed to get room URL from backend")
      }
      
      const data = await response.json()
      const url = data.room_url || data.url || data.roomUrl
      
      if (!url) {
        throw new Error("Room URL missing in backend response")
      }
      
      setRoomUrl(url)
      showToast("Connection established successfully!", "success")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setRoomError(errorMessage)
      showToast(`Connection error: ${errorMessage}`, "error")
    } finally {
      setLoadingRoom(false)
    }
  }
  
  // Auto-retry connection logic
  useEffect(() => {
    if (connectionAttempts === 0) {
      fetchRoomUrl()
      setConnectionAttempts(prev => prev + 1)
    }
  }, [connectionAttempts])

  return (
    <main className="meet-layout h-full w-full bg-[--meet-background] relative overflow-hidden">
      {/* Enhanced header with smooth transition */}
      <header 
        className={`flex items-center justify-between px-6 py-3 border-b border-[--meet-border] glass-effect sticky top-0 z-50 transition-all duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}
        style={{
          background: 'linear-gradient(to right, rgba(240,248,255,0.95), rgba(240,248,255,0.95))',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 purple-glow blur-md"></div>
            <div className="relative">
              <img src="/Flowterviewlogo.svg" alt="Flowterview Logo" className="h-8 w-auto transition-transform duration-300 group-hover:scale-110" />
            </div>
          </div>
          <h1 className="golden-text text-lg font-medium hidden sm:block">Flowterview</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <ClientOnly>
            <div className="flex items-center gap-2 bg-[rgba(255,165,0,0.1)] px-3 py-1 rounded-full golden-border">
              <div className="w-2 h-2 rounded-full bg-[--meet-primary] animate-pulse"></div>
              <span className="text-xs text-[--meet-text-secondary]">Live</span>
            </div>
          </ClientOnly>
        </div>
      </header>

      {/* Main content area with improved styling */}
      <div className="meet-main-content flex">
        {/* Center: Meeting UI - Full Width */}
        <div className="flex-1 flex flex-col relative bg-gradient-to-b from-[--meet-background] to-[#121212]">
          {loadingRoom && (
            <div className="flex flex-col items-center justify-center h-full animate-fade-in">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 rounded-full golden-glow animate-glow-pulse opacity-50"></div>
                <div className="absolute inset-0 flex items-center justify-center animate-spin">
                  <Icons.Loader className="w-10 h-10 text-[--meet-primary]" />
                </div>
              </div>
              <div className="glass-effect px-6 py-3 rounded-full golden-border">
                <span className="text-[--meet-text-primary]">Establishing secure connection...</span>
              </div>
            </div>
          )}

          {roomError && (
            <div className="flex flex-col items-center justify-center h-full animate-fade-in">
              <div className="glass-effect p-8 rounded-xl golden-border max-w-md text-center">
                <span className="text-[--meet-error] mb-6 flex justify-center">
                  <Icons.CircleAlert className="w-16 h-16" />
                </span>
                <h3 className="text-xl font-bold mb-2 golden-text">Connection Error</h3>
                <p className="mb-6 text-[--meet-text-secondary] opacity-90">{roomError}</p>
                <div className="flex justify-center space-x-4">
                  <button 
                    className="meet-button meet-button-primary" 
                    onClick={() => fetchRoomUrl()}
                  >
                    <Icons.Loader className="w-5 h-5" />
                    <span>Try Again</span>
                  </button>
                  <button 
                    className="meet-button meet-button-secondary" 
                    onClick={() => window.location.reload()}
                  >
                    <Icons.CircleAlert className="w-5 h-5" />
                    <span>Reload Page</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {!loadingRoom && !roomError && roomUrl && (
            <>
              <AudioClient onClearTranscripts={handleClearTranscripts} roomUrl={roomUrl} />
              <Presentation />
              {isChatBoxOpen && (
                <div className="absolute right-0 top-0 bottom-0 w-80 glass-effect golden-border border-l shadow-lg animate-fade-in">
                  <ChatBox />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
