"use client";
import { Icons } from "@/app/lib/icons";
import usePathStore from "@/app/store/PathStore";
import { useEffect, useRef } from "react";
import AvatarStack from "../ui/AvatarStack";
import ConclusionSection from "./conclusion-section";
import Controls from "./controls";
import CodeEditor from "./CodeEditor";
import QueryDisplay from "./now-answering";
import { FlowterviewAvatar } from "./path-avatar";
import VisualLayer from "./visual-layer";

const Presentation = () => {
  const {
    setCallStatus,
    showToast,
    isBotSpeaking,
    isUserSpeaking,
    currentBotTranscript,
    currentUserTranscript,
    sources,
    resetStore,
    isSpeakerOn,
    setIsSpeakerOn,
    isCaptionEnabled,
    botState,
    showStarterQuestions,
    setJoiningCall,
    ttsConnecting,
    callStatus,
    connectionStatus,
    participants,
    isCodeEditorOpen,
    setIsCodeEditorOpen,
    isTransitioning,
    setIsTransitioning,
    starterQuestionsOpacity,
    setStarterQuestionsOpacity,
  } = usePathStore();

  const starterQuestionsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debug logging
  useEffect(() => {
    console.log("Sources in Presentation:", sources);
  }, [sources]);

  // Handle transition when sources change
  useEffect(() => {
    if (sources.length > 0) {
      setIsTransitioning(true);
      // Keep transition state for a short period to ensure smooth animation
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 800); // Increased from 500ms to 800ms for better transition
      return () => clearTimeout(timer);
    }
  }, [sources, setIsTransitioning]);

  // Control audio volume based on speaker state
  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    const audioElements = document.getElementsByTagName("audio");
    for (const audio of audioElements) {
      audio.muted = !isSpeakerOn;
    }
  };

  const toggleCodeEditor = () => {
    setIsCodeEditorOpen(!isCodeEditorOpen);
  };

  const joinAndLeaveCallHandler = async (state: "join" | "leave") => {
    return new Promise<void>((resolve, reject) => {
      if (state === "join") {
        showToast("Connecting to voice agent...", "info");
        setCallStatus("joining");

        setTimeout(() => {
          setCallStatus("joined");
          setJoiningCall(true);

          showToast("Voice agent connected successfully!", "success");
          resolve();
        }, 2500);
      } else if (state === "leave") {
        showToast("Leaving call...", "info");
        setCallStatus("leaving");
        setTimeout(() => {
          resetStore();
          setCallStatus("left");
          resolve();
        }, 1200);
      }
    });
  };

  // Determine if we should show the visual content
  const hasVisualContent = sources.length > 0;

  useEffect(() => {
    // Clear any existing timers
    if (starterQuestionsTimerRef.current) {
      clearTimeout(starterQuestionsTimerRef.current);
    }

    if (showStarterQuestions) {
      // Fade in
      setStarterQuestionsOpacity(0); // Start with opacity 0
      // Small delay before starting the fade-in for a more natural effect
      starterQuestionsTimerRef.current = setTimeout(() => {
        setStarterQuestionsOpacity(1); // Animate to opacity 1
      }, 50);
    } else {
      // Fade out
      setStarterQuestionsOpacity(0);
    }
  }, [showStarterQuestions, setStarterQuestionsOpacity]);

  return (
    <div className="flex flex-col h-full w-full transition-all duration-300 relative">
      {callStatus === "left" ? (
        <div className="w-full h-full flex items-center justify-center">
          <ConclusionSection />
        </div>
      ) : (
        <section className="relative flex-grow w-full h-full overflow-hidden bg-[#F0F8FF]">
          {/* Code Editor - Takes 60% of screen when open */}
          <div
            className={`absolute top-0 bottom-0 left-0 z-40 w-[60%] transition-transform duration-300 shadow-xl ${
              isCodeEditorOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <CodeEditor
              isOpen={isCodeEditorOpen}
              onClose={() => setIsCodeEditorOpen(false)}
            />
          </div>

          {/* Query display in top center */}
          <div className="absolute z-50 top-4 left-1/2 transform -translate-x-1/2 max-w-md">
            {currentUserTranscript && isBotSpeaking && <QueryDisplay />}
          </div>

          {/* Audio controls */}
          <div className="absolute top-4 right-20 z-50">
            <div
              onClick={toggleSpeaker}
              className="cursor-pointer bg-[#D8DFE5] hover:bg-[#C6CED8] p-3 rounded-full shadow-md transition-colors"
            >
              {isSpeakerOn ? (
                <Icons.Speaker className="w-6 h-6 text-[#0E1C29]" />
              ) : (
                <Icons.SpeakerOff className="w-6 h-6 text-[#0E1C29]" />
              )}
            </div>
          </div>

          {/* Google Meet style grid of participants - moves right when code editor is open */}
          <div
            className={`absolute inset-0 flex items-center justify-center p-6 z-10 transition-all duration-300 ${
              isCodeEditorOpen ? "ml-[60%]" : "ml-0"
            }`}
          >
            <div
              className={`grid ${participants.length === 1 ? "grid-cols-1" : participants.length === 2 ? "grid-cols-2 gap-16" : "grid-cols-2 gap-16 md:grid-cols-3"} w-full max-w-[1200px]`}
            >
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className={`bg-[#D8DFE5] rounded-xl aspect-video relative overflow-hidden shadow-md transition-all 
                    ${participant.isTalking ? "ring-2 ring-[#774BE5] shadow-lg transform scale-[1.02]" : ""}
                    ${isUserSpeaking && participant.id === "user" ? "ring-2 ring-[#774BE5]" : ""}
                    ${isBotSpeaking && participant.id === "bot" ? "ring-2 ring-[#774BE5]" : ""}
                  `}
                >
                  {participant.id === "bot" ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-28 h-28 rounded-full overflow-hidden bg-[#323D68] flex items-center justify-center border-2 border-[#774BE5]">
                        <img
                          src="/Flowterviewlogo.svg"
                          alt="AI Assistant"
                          className="w-16 h-16"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-28 h-28 rounded-full overflow-hidden bg-[#323D68] flex items-center justify-center text-white font-medium text-3xl">
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-[#5E788F] px-4 py-2 rounded-lg text-white text-base flex items-center gap-3 shadow-md">
                    {participant.isTalking && (
                      <div className="flex space-x-[2px]">
                        <div className="w-[3px] h-3 bg-[#774BE5] rounded-full animate-[sound-wave_1.2s_ease-in-out_infinite_0.2s]"></div>
                        <div className="w-[3px] h-3 bg-[#774BE5] rounded-full animate-[sound-wave_1.5s_ease-in-out_infinite_0.3s]"></div>
                        <div className="w-[3px] h-3 bg-[#774BE5] rounded-full animate-[sound-wave_1.3s_ease-in-out_infinite_0.1s]"></div>
                      </div>
                    )}
                    <span>{participant.name}</span>
                    {participant.id === "bot" && (
                      <span className="text-sm opacity-75">(AI)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual content */}

          {/* Caption bar at the bottom */}
          {isCaptionEnabled && currentBotTranscript && (
            <div className="absolute left-1/2 z-30 transform -translate-x-1/2 bottom-24 max-w-2xl w-full px-4">
              <div className="bg-[#0E1C29]/85 backdrop-blur-sm p-4 rounded-lg text-center">
                <p className="text-white text-base">{currentBotTranscript}</p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Controls bar at bottom */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-30">
        <Controls
          participants={participants}
          isCodeEditorOpen={isCodeEditorOpen}
          toggleCodeEditor={toggleCodeEditor}
          style={{
            maxHeight: callStatus === "left" ? "0" : "80px",
            overflow: callStatus === "left" ? "hidden" : "visible",
            width: "auto",
            minWidth: "450px",
            maxWidth: "600px",
            background: "rgba(14, 28, 41, 0.85)",
            backdropFilter: "blur(8px)",
            borderRadius: "16px",
            padding: "0 12px",
          }}
          joinAndLeaveCallHandler={joinAndLeaveCallHandler}
        />
      </div>
    </div>
  );
};

export default Presentation;
