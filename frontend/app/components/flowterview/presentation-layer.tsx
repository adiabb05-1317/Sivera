"use client"
import { Icons } from "@/app/lib/icons"
import usePathStore from "@/app/store/PathStore"
import { useEffect, useRef, useState } from "react"
import AvatarStack from "../ui/AvatarStack"
import ConclusionSection from "./conclusion-section"
import Controls from "./controls"
import CodeEditor from "./CodeEditor"
import QueryDisplay from "./now-answering"
import { FlowterviewAvatar } from "./path-avatar"
import VisualLayer from "./visual-layer"

const Presentation = () => {
  const setCallStatus = usePathStore((state) => state.setCallStatus)
  const [showThankYouMessage, setShowThankYouMessage] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const showToast = usePathStore((state) => state.showToast)
  const { isBotSpeaking, setIsBotSpeaking } = usePathStore()
  const { isUserSpeaking, setIsUserSpeaking } = usePathStore()
  const { currentBotTranscript, currentUserTranscript } = usePathStore()
  const { sources, resetStore } = usePathStore()
  const {
    isSpeakerOn,
    setIsSpeakerOn,
    isCaptionEnabled,
    botState,
    setBotState,
    showStarterQuestions,
    setJoiningCall,
    ttsConnecting,
    callStatus,
    connectionStatus,
  } = usePathStore()
  const participants = usePathStore((state) => state.participants)

  // Google Meet style theme
  const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false);
  
  const toggleCodeEditor = () => {
    setIsCodeEditorOpen(!isCodeEditorOpen);
  };

  // Debug logging
  useEffect(() => {
    console.log("Sources in Presentation:", sources)
  }, [sources])

  // Handle transition when sources change
  useEffect(() => {
    if (sources.length > 0) {
      setIsTransitioning(true)
      // Keep transition state for a short period to ensure smooth animation
      const timer = setTimeout(() => {
        setIsTransitioning(false)
      }, 800) // Increased from 500ms to 800ms for better transition
      return () => clearTimeout(timer)
    }
  }, [sources])

  // Control audio volume based on speaker state
  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn)
    const audioElements = document.getElementsByTagName("audio")
    for (const audio of audioElements) {
      audio.muted = !isSpeakerOn
    }
  }

  const joinAndLeaveCallHandler = async (state: "join" | "leave") => {
    return new Promise<void>((resolve, reject) => {
      if (state === "join") {
        showToast("Connecting to voice agent...", "info")
        setCallStatus("joining")

        setTimeout(() => {
          setCallStatus("joined")
          setJoiningCall(true)

          showToast("Voice agent connected successfully!", "success")
          resolve()
        }, 2500)
      } else if (state === "leave") {
        showToast("Leaving call...", "info")
        setCallStatus("leaving")
        setTimeout(() => {
          resetStore()
          setCallStatus("left")
          resolve()
        }, 1200)
      }
    })
  }

  // Determine if we should show the visual content
  const hasVisualContent = sources.length > 0

  const [starterQuestionsOpacity, setStarterQuestionsOpacity] = useState(0)
  const starterQuestionsTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Clear any existing timers
    if (starterQuestionsTimerRef.current) {
      clearTimeout(starterQuestionsTimerRef.current)
    }

    if (showStarterQuestions) {
      // Fade in
      setStarterQuestionsOpacity(0) // Start with opacity 0
      // Small delay before starting the fade-in for a more natural effect
      starterQuestionsTimerRef.current = setTimeout(() => {
        setStarterQuestionsOpacity(1) // Animate to opacity 1
      }, 50)
    } else {
      // Fade out
      setStarterQuestionsOpacity(0)
    }
  }, [showStarterQuestions])

  return (
    <div
      className={`flex flex-col h-full w-full transition-all relative ${
        isCodeEditorOpen ? 'pl-[360px]' : ''
      }`}
    >
      {callStatus !== "left" ? (
        <section className="relative flex-grow w-full h-full overflow-hidden bg-[#232323]">
          {/* Code Editor */}
          <CodeEditor isOpen={isCodeEditorOpen} onClose={() => setIsCodeEditorOpen(false)} />
          {/* Connection status in top left */}
          {connectionStatus !== "bot_connected" && connectionStatus !== "service_connected" && (
            <div className="absolute top-4 left-4 z-30">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm text-white px-3 py-2 rounded-lg animate-fade-in">
                {connectionStatus === "disconnected" ? (
                  <>
                    <Icons.CircleAlert className="text-red-500 w-4 h-4 animate-pulse" />
                    <span className="text-white text-sm">Disconnected</span>
                  </>
                ) : (
                  <>
                    <div className="animate-spin">
                      <Icons.Loader className="text-white w-4 h-4" />
                    </div>
                    <span className="text-white text-sm">Connecting</span>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Query display in top center */}
          <div className="absolute z-50 top-4 left-1/2 transform -translate-x-1/2 max-w-md">
            {currentUserTranscript && isBotSpeaking && <QueryDisplay />}
          </div>
          
          {/* Audio controls */}
          <div className="absolute top-4 right-20 z-50">
            <div onClick={toggleSpeaker} className="meet-button-icon text-[--meet-text-primary] cursor-pointer">
              {isSpeakerOn ? <Icons.Speaker className="w-5 h-5" /> : <Icons.SpeakerOff className="w-5 h-5" />}
            </div>
          </div>
          
          {/* Google Meet style grid of participants */}
          <div className="absolute inset-0 flex items-center justify-center p-6 z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl"> 
              {participants.map((participant) => (
                <div 
                  key={participant.id} 
                  className={`bg-black/80 rounded-lg aspect-video relative overflow-hidden ${participant.isTalking ? 'ring-2 ring-blue-500' : ''}`}
                >
                  {participant.id === 'bot' ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-[#323D68] flex items-center justify-center border-2 border-[#774BE5]">
                        <img src="/Flowterviewlogo.svg" alt="AI Assistant" className="w-12 h-12" />
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-[#323D68] flex items-center justify-center text-white font-medium text-2xl">
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded text-white text-sm">
                    {participant.name}
                    {participant.id === 'bot' && ' (AI Interviewer)'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual content and captions */}
          {hasVisualContent && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="w-full h-full max-w-4xl">
                <VisualLayer />
              </div>
            </div>
          )}
          
          {/* Caption bar at the bottom */}
          {isCaptionEnabled && currentBotTranscript && (
            <div className="absolute left-1/2 z-20 transform -translate-x-1/2 bottom-24 max-w-2xl w-full px-4">
              <div className="bg-black/60 backdrop-blur-sm p-3 rounded-lg text-center">
                <p className="text-white text-sm md:text-base">{currentBotTranscript}</p>
              </div>
            </div>
          )}
        </section>
      ) : (
        <ConclusionSection />
      )}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-30">
        <Controls
          participants={participants}
          isCodeEditorOpen={isCodeEditorOpen}
          toggleCodeEditor={toggleCodeEditor}
          style={{
            maxHeight: callStatus === "left" ? "0" : "70px",
            overflow: callStatus === "left" ? "hidden" : "visible",
            width: 'auto',
            minWidth: '300px',
            maxWidth: '480px',
            background: 'rgba(32, 33, 36, 0.9)',
            backdropFilter: 'blur(8px)',
          }}
          joinAndLeaveCallHandler={joinAndLeaveCallHandler}
        />
      </div>
    </div>
  )
}

export default Presentation
