"use client";

import { Icons } from "@/app/lib/icons";
import usePathStore from "@/app/store/PathStore";
import { useEffect, useRef } from "react";
import ConclusionSection from "./conclusion-section";
import Controls from "./controls";
import CodeEditor from "./CodeEditor";
import QueryDisplay from "./now-answering";
import { Logo } from "@/logos";

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
}) => (
  <div
    className={`bg-indigo-200/40 rounded-xl aspect-video relative overflow-hidden shadow-md border transition-all
      ${isUserSpeaking ? "ring-2 ring-indigo-400 scale-[1.02]" : ""}
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
        <div className="w-24 h-24 rounded-full bg-indigo-500/50 text-white text-2xl font-medium flex items-center justify-center border-2 border-indigo-500">
          {participant.name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  </div>
);

const BotTile = ({
  isBotSpeaking,
}: {
  isBotSpeaking: boolean;
  isCameraOn: boolean;
  localVideoStream: MediaStream | null;
  currentUserTranscript: string | null;
  currentBotTranscript: string | null;
}) => (
  <div
    className={`bg-indigo-200/40 rounded-xl aspect-video relative overflow-hidden shadow-md border transition-all
      ${isBotSpeaking ? "ring-2 ring-[#774BE5] scale-[1.02]" : ""}
    `}
  >
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-24 h-24 rounded-full bg-indigo-500/50 flex items-center justify-center border-2 border-[#774BE5]">
        <Logo width="60" height="60" />
      </div>
    </div>
    <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-indigo-600/70 px-4 py-1.5 rounded-lg text-white text-sm flex items-center gap-3 shadow-md">
      {isBotSpeaking && <SoundWave />}
      <span className="text-xs opacity-75">Flotia</span>
    </div>
  </div>
);

const SoundWave = () => (
  <div className="flex space-x-[2px]">
    {[1.2, 1.5, 1.3].map((d, i) => (
      <div
        key={i}
        className={`w-[3px] h-3 bg-[#774BE5] rounded-full animate-[sound-wave_${d}s_ease-in-out_infinite_${0.2 + i * 0.1}s]`}
      />
    ))}
  </div>
);

const Presentation = () => {
  const {
    setCallStatus,
    showToast,
    isBotSpeaking,
    isCameraOn,
    isUserSpeaking,
    currentBotTranscript,
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

  useEffect(() => {
    console.log(connectionStatus);
  }, [connectionStatus]);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isCameraOn) {
      if (videoRef.current) {
        videoRef.current.srcObject = localVideoStream;
      }
    } else {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [isCameraOn]);

  useEffect(() => {
    if (videoRef.current && localVideoStream) {
      if (videoRef.current.srcObject !== localVideoStream) {
        videoRef.current.srcObject = localVideoStream;
      }
    }
  }, [localVideoStream]);

  return (
    <div className="flex flex-col h-full w-full transition-all duration-300 relative">
      {callStatus === "left" ? (
        <div className="w-full h-full flex items-center justify-center">
          <ConclusionSection />
        </div>
      ) : (
        <section className="relative flex-grow w-full h-full overflow-hidden bg-[#F0F8FF]">
          <div
            className={`absolute top-0 bottom-0 left-0 z-40 w-[65%] transition-transform duration-300 p-5 ${
              isCodeEditorOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <CodeEditor
              isOpen={isCodeEditorOpen}
              onClose={() => setIsCodeEditorOpen(false)}
            />
          </div>

          <div
            className={`absolute z-50 top-4 ${isCodeEditorOpen ? "left-[82.5%]" : "left-1/2"} transform -translate-x-1/2 max-w-md transition-all duration-300`}
          >
            {currentUserTranscript && isBotSpeaking && <QueryDisplay />}
          </div>

          {connectionStatus !== "bot_connected" ? (
            <div
              className={`absolute p-4 z-10 transition-all duration-300 flex justify-center -m-16 ${
                isCodeEditorOpen ? "left-[50%] right-0" : "left-0 right-0"
              }`}
            >
              <div className="w-full flex justify-center">
                {participants
                  .filter((p) => p.id === "user")
                  .map((p) => (
                    <UserTile
                      key={p.id}
                      participant={p}
                      isUserSpeaking={isUserSpeaking}
                      isCameraOn={isCameraOn}
                      localVideoStream={localVideoStream}
                      videoRef={videoRef}
                    />
                  ))}
              </div>
            </div>
          ) : (
            <div
              className={`absolute inset-0 p-4 z-10 transition-all duration-300 flex justify-center items-center -mt-16 ${
                isCodeEditorOpen ? "left-[65%] right-0" : "left-0 right-0"
              }`}
            >
              <div
                className={`w-full ${
                  isCodeEditorOpen
                    ? "flex flex-col gap-6"
                    : "grid grid-cols-2 gap-6"
                }`}
              >
                {participants
                  .filter((p) => p.id === "user" || p.id === "bot")
                  .map((p) =>
                    p.id === "user" ? (
                      <UserTile
                        key={p.id}
                        participant={p}
                        isUserSpeaking={isUserSpeaking}
                        isCameraOn={isCameraOn}
                        localVideoStream={localVideoStream}
                        videoRef={videoRef}
                      />
                    ) : (
                      <BotTile
                        key={p.id}
                        isBotSpeaking={isBotSpeaking}
                        isCameraOn={isCameraOn}
                        localVideoStream={localVideoStream}
                        currentUserTranscript={currentUserTranscript}
                        currentBotTranscript={currentBotTranscript}
                      />
                    )
                  )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Transcript overlay - positioned above controls */}
      {isCaptionEnabled && currentBotTranscript && callStatus !== "left" && (
        <div
          className={`fixed z-30 ${
            isCodeEditorOpen ? "left-[82.5%]" : "left-1/2"
          } bottom-[130px] transform -translate-x-1/2 max-w-2xl w-[calc(100%-32px)] md:w-auto animate-fade-in transition-all duration-300`}
        >
          <div className="relative px-4">
            <div className="bg-indigo-300/30 backdrop-blur-md p-4 rounded-2xl text-left shadow-lg border border-indigo-600/40">
              <div className="flex items-center mb-2">
                <div className="w-6 h-6 rounded-full bg-indigo-700 border border-indigo-500 flex items-center justify-center mr-2 mt-0.5">
                  <Logo width="13" height="13" />
                </div>
                <span className="text-indigo-900 text-sm font-medium tracking-tight">
                  Flotia
                </span>
              </div>
              <p className="text-indigo-900 text-xs ml-8 leading-relaxed tracking-tight">
                {currentBotTranscript}
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        className={`fixed ${isCodeEditorOpen ? "left-[82.5%] bottom-8" : "left-1/2 bottom-8"} transform -translate-x-1/2 z-30 transition-all duration-300`}
      >
        {callStatus !== "left" && (
          <Controls
            participants={participants}
            isCodeEditorOpen={isCodeEditorOpen}
            toggleCodeEditor={toggleCodeEditor}
            style={{
              overflow: "visible",
            }}
            joinAndLeaveCallHandler={joinAndLeaveCallHandler}
          />
        )}
      </div>

      {!isCodeEditorOpen && codingProblem && (
        <div className="fixed z-10 bottom-24 right-6">
          <button
            onClick={() => setIsCodeEditorOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-3 shadow-lg flex items-center justify-center"
            title="Open Code Editor"
          >
            <span className="mr-2">Open Code Editor</span>
            <Icons.Code className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Presentation;
