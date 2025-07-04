"use client";

import React, { useEffect, useRef, useMemo, memo } from "react";
import { Icons } from "@/app/lib/icons";
import usePathStore from "@/app/store/PathStore";
import ConclusionSection from "./conclusion-section";
import Controls from "./controls";
import CodeEditor from "./CodeEditor";
import TranscriptionInterface from "@/components/ui/transcription-interface";

const UserTile = ({
  participant,
  isUserSpeaking,
  isCameraOn,
  localVideoStream,
  videoRef,
}: {
  participant: {
    id: string;
    name: string;
    isTalking: boolean;
    color?: string;
  };
  isUserSpeaking: boolean;
  isCameraOn: boolean;
  localVideoStream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) => {
  // Ensure video stream is connected when component mounts or stream changes
  useEffect(() => {
    if (videoRef.current && localVideoStream && isCameraOn) {
      if (videoRef.current.srcObject !== localVideoStream) {
        videoRef.current.srcObject = localVideoStream;
      }
    }
  }, [localVideoStream, isCameraOn, videoRef]);

  return (
    <div
      className={`h-full w-full bg-app-blue-50 dark:bg-[--meet-surface] border border-app-blue-300/50 dark:border-app-blue-700/70 shadow-xl rounded-3xl relative overflow-hidden transition-all duration-500 ease-in-out animate-fade-in
        ${isUserSpeaking ? "ring-2 ring-app-blue-400 scale-[1.02]" : ""}
      `}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {isCameraOn && localVideoStream && videoRef ? (
          <video
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            ref={videoRef}
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-app-blue-500/50 text-white text-2xl font-medium flex items-center justify-center border-2 border-app-blue-500">
            {participant.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Header similar to coding challenge */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center py-3 px-4 bg-app-blue-50/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-app-blue-200/60 dark:border-slate-600/60">
        <h3 className="text-app-blue-800 dark:text-slate-100 font-semibold text-sm flex items-center gap-2 tracking-tight">
          <Icons.Video className="w-4 h-4 text-app-blue-500 dark:text-app-blue-400" />
          <span>Video Feed</span>
        </h3>
      </div>
    </div>
  );
};

const TranscriptionsBox = memo(() => {
  const {
    currentBotTranscript,
    currentUserTranscript,
    currentChatHistory,
    isBotSpeaking,
    isUserSpeaking,
  } = usePathStore();

  // Memoize messages conversion to prevent unnecessary recalculations
  const messages = useMemo(
    () =>
      currentChatHistory.map((msg, index) => ({
        id: `${index}`,
        sender: msg.role === "assistant" ? ("Sia" as const) : ("You" as const),
        content: msg.content,
        timestamp: new Date().toISOString(),
      })),
    [currentChatHistory]
  );

  // Memoize speaker logic to prevent unnecessary recalculations
  const { currentSpeaker, liveTranscription, isTranscribing } = useMemo(() => {
    let speaker: "Sia" | "You" | null = null;
    let transcript = "";

    if (isUserSpeaking && currentUserTranscript) {
      speaker = "You";
      transcript = currentUserTranscript;
    } else if (isBotSpeaking && currentBotTranscript) {
      speaker = "Sia";
      transcript = currentBotTranscript;
    }

    return {
      currentSpeaker: speaker,
      liveTranscription: transcript,
      isTranscribing: isBotSpeaking || isUserSpeaking,
    };
  }, [
    isUserSpeaking,
    currentUserTranscript,
    isBotSpeaking,
    currentBotTranscript,
  ]);

  return (
    <div className="h-full flex flex-col bg-app-blue-50 dark:bg-[--meet-surface] border border-app-blue-300/50 dark:border-app-blue-700/70 shadow-xl rounded-3xl overflow-hidden transition-all duration-500 ease-in-out animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center py-3 px-4 bg-app-blue-50 dark:bg-[--meet-surface] border-b border-app-blue-200/60 dark:border-app-blue-700/60">
        <h3 className="text-app-blue-800 dark:text-app-blue-200 font-semibold text-sm flex items-center gap-2 tracking-tight">
          <Icons.Chat className="w-4 h-4 text-app-blue-500 dark:text-app-blue-300" />
          <span>Conversation</span>
        </h3>
      </div>

      {/* Content area with TranscriptionInterface */}
      <TranscriptionInterface
        messages={messages}
        liveTranscription={liveTranscription}
        isTranscribing={isTranscribing}
        currentSpeaker={currentSpeaker}
        className="flex-1 min-h-0"
      />
    </div>
  );
});

TranscriptionsBox.displayName = "TranscriptionsBox";

const Presentation = () => {
  const {
    setCallStatus,
    showToast,
    isCameraOn,
    isUserSpeaking,
    currentUserTranscript,
    resetStore,
    isCaptionEnabled,
    setJoiningCall,
    callStatus,
    connectionStatus,
    participants,
    isCodeEditorOpen,
    setIsCodeEditorOpen,
    codingProblem,
    localVideoStream,
    transportState,
  } = usePathStore();

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

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isCameraOn && videoRef.current && localVideoStream) {
      if (videoRef.current.srcObject !== localVideoStream) {
        videoRef.current.srcObject = localVideoStream;
      }
    } else if (!isCameraOn && videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [isCameraOn, localVideoStream]);

  useEffect(() => {
    if (videoRef.current && localVideoStream && isCameraOn) {
      if (videoRef.current.srcObject !== localVideoStream) {
        videoRef.current.srcObject = localVideoStream;
      }
    }
  }, [localVideoStream, isCameraOn, isCodeEditorOpen]);

  return (
    <div className="flex flex-col h-full w-full transition-all duration-300 relative">
      {true ||
        (transportState !== "ready" && callStatus !== "left" && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-[--meet-surface] dark:bg-[--meet-surface] bg-opacity-60 dark:bg-opacity-80 backdrop-blur-sm">
            <div className="w-10 h-10 border-4 border-app-blue-500/70 border-t-transparent rounded-full animate-spin" />
          </div>
        ))}
      {callStatus === "left" ? (
        <div className="w-full h-full flex items-center justify-center">
          <ConclusionSection />
        </div>
      ) : (
        <section className="relative flex-grow w-full h-full overflow-hidden bg-transparent">
          <div
            className={`absolute inset-0 p-6 z-10 transition-all duration-500 ease-in-out ${
              isCodeEditorOpen ? "left-0 right-0" : "left-0 right-0"
            }`}
          >
            {!isCodeEditorOpen ? (
              // Normal Mode Layout
              <div className="w-full h-full grid grid-cols-12 grid-rows-12 gap-6">
                {/* Transcriptions - Left side, smaller width */}
                <div className="col-span-3 row-span-12">
                  <TranscriptionsBox />
                </div>

                {/* Video Feed - Top right, more space */}
                <div className="col-span-9 row-span-10">
                  {participants
                    .filter((p) => p.id === "user")
                    .map((p) => (
                      <UserTile
                        key={`normal-${p.id}`}
                        participant={p}
                        isUserSpeaking={isUserSpeaking}
                        isCameraOn={isCameraOn}
                        localVideoStream={localVideoStream}
                        videoRef={videoRef}
                      />
                    ))}
                </div>

                {/* Controls - Bottom right */}
                <div className="col-span-9 row-span-2 flex items-center justify-center">
                  <Controls
                    participants={participants}
                    isCodeEditorOpen={isCodeEditorOpen}
                    toggleCodeEditor={toggleCodeEditor}
                    style={{ overflow: "visible" }}
                    joinAndLeaveCallHandler={joinAndLeaveCallHandler}
                  />
                </div>
              </div>
            ) : (
              // Coding Mode Layout
              <div className="w-full h-full grid grid-cols-12 grid-rows-12 gap-6">
                {/* Left Column - Video Feed (top) + Transcriptions (bottom) */}
                <div className="col-span-3 row-span-12 flex flex-col gap-3">
                  {/* Video Feed - Top left */}
                  <div className="h-56">
                    <div className="h-full w-full">
                      {participants
                        .filter((p) => p.id === "user")
                        .map((p) => (
                          <UserTile
                            key={`coding-${p.id}`}
                            participant={p}
                            isUserSpeaking={isUserSpeaking}
                            isCameraOn={isCameraOn}
                            localVideoStream={localVideoStream}
                            videoRef={videoRef}
                          />
                        ))}
                    </div>
                  </div>

                  {/* Transcriptions - Bottom left - constrained height */}
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <TranscriptionsBox />
                  </div>
                </div>

                {/* Code Editor - Right side, more space */}
                <div className="col-span-9 row-span-10">
                  <CodeEditor
                    isOpen={isCodeEditorOpen}
                    onClose={() => setIsCodeEditorOpen(false)}
                  />
                </div>

                {/* Controls - Bottom right */}
                <div className="col-span-9 row-span-2 flex items-center justify-center">
                  <Controls
                    participants={participants}
                    isCodeEditorOpen={isCodeEditorOpen}
                    toggleCodeEditor={toggleCodeEditor}
                    style={{ overflow: "visible" }}
                    joinAndLeaveCallHandler={joinAndLeaveCallHandler}
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default Presentation;
