"use client";
import { Icons } from "@/app/lib/icons";
import usePathStore from "@/app/store/PathStore";
import { useEffect } from "react";
import ConclusionSection from "./conclusion-section";
import Controls from "./controls";
import CodeEditor from "./CodeEditor";
import QueryDisplay from "./now-answering";

const Presentation = () => {
  const {
    setCallStatus,
    showToast,
    isBotSpeaking,
    isUserSpeaking,
    currentBotTranscript,
    currentUserTranscript,
    resetStore,
    isSpeakerOn,
    setIsSpeakerOn,
    isCaptionEnabled,
    setJoiningCall,
    callStatus,
    connectionStatus,
    participants,
    isCodeEditorOpen,
    setIsCodeEditorOpen,
    codingProblem,
  } = usePathStore();

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

  useEffect(() => {
    console.log(connectionStatus);
  }, [connectionStatus]);

  return (
    <div className="flex flex-col h-full w-full transition-all duration-300 relative">
      {callStatus === "left" ? (
        <div className="w-full h-full flex items-center justify-center">
          <ConclusionSection />
        </div>
      ) : (
        <section className="relative flex-grow w-full h-full overflow-hidden bg-[#F0F8FF]">
          <div
            className={`absolute top-0 bottom-0 left-0 z-40 w-[50%] transition-transform duration-300 shadow-xl ${
              isCodeEditorOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <CodeEditor
              isOpen={isCodeEditorOpen}
              onClose={() => setIsCodeEditorOpen(false)}
            />
          </div>

          <div
            className={`absolute z-50 top-4 ${isCodeEditorOpen ? "left-[75%]" : "left-1/2"} transform -translate-x-1/2 max-w-md transition-all duration-300`}
          >
            {currentUserTranscript && isBotSpeaking && <QueryDisplay />}
          </div>

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

          {connectionStatus !== "bot_connected" ? (
            <div
              className={`absolute top-1/4 ${isCodeEditorOpen ? "left-[50%] right-0" : "left-0 right-0"} flex justify-center p-6 z-10 transition-all duration-300`}
            >
              <div
                className={`w-full ${isCodeEditorOpen ? "max-w-[350px]" : "max-w-[600px]"}`}
              >
                {participants
                  .filter((participant) => participant.id === "user")
                  .map((participant) => (
                    <div
                      key={participant.id}
                      className={`bg-[#D8E0E8] rounded-xl aspect-video relative overflow-hidden shadow-md transition-all 
                        ${participant.isTalking ? "ring-2 ring-[#774BE5] shadow-lg transform scale-[1.02]" : ""}
                        ${isUserSpeaking && participant.id === "user" ? "ring-2 ring-[#774BE5]" : ""}
                      `}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-[#323D68] flex items-center justify-center text-white font-medium text-2xl">
                          {participant.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-[#5E788F] px-4 py-1.5 rounded-lg text-white text-sm flex items-center gap-3 shadow-md">
                        {participant.isTalking && (
                          <div className="flex space-x-[2px]">
                            <div className="w-[3px] h-3 bg-[#774BE5] rounded-full animate-[sound-wave_1.2s_ease-in-out_infinite_0.2s]"></div>
                            <div className="w-[3px] h-3 bg-[#774BE5] rounded-full animate-[sound-wave_1.5s_ease-in-out_infinite_0.3s]"></div>
                            <div className="w-[3px] h-3 bg-[#774BE5] rounded-full animate-[sound-wave_1.3s_ease-in-out_infinite_0.1s]"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div
              className={`absolute inset-0 flex items-center justify-center p-6 z-10 transition-all duration-300 ${
                isCodeEditorOpen ? "left-[50%] right-0" : "left-0 right-0"
              }`}
            >
              <div
                className={`${
                  isCodeEditorOpen
                    ? "flex flex-col gap-6"
                    : "grid grid-cols-2 gap-8"
                } w-full ${isCodeEditorOpen ? "max-w-[calc(50vw-24px)]" : "max-w-[1200px]"}`}
              >
                {participants
                  .filter(
                    (participant) =>
                      participant.id === "user" ||
                      (participant.id === "bot" &&
                        connectionStatus === "bot_connected")
                  )
                  .map((participant) => (
                    <div
                      key={participant.id}
                      className={`bg-[#D8E0E8] rounded-xl relative overflow-hidden shadow-md transition-all 
                        ${participant.isTalking ? "ring-2 ring-[#774BE5] shadow-lg transform scale-[1.02]" : ""}
                        ${isUserSpeaking && participant.id === "user" ? "ring-2 ring-[#774BE5]" : ""}
                        ${isBotSpeaking && participant.id === "bot" ? "ring-2 ring-[#774BE5]" : ""}
                        ${isCodeEditorOpen ? "aspect-[4/3] max-h-[30vh]" : "aspect-video"}
                      `}
                    >
                      {participant.id === "bot" ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-24 h-24 rounded-full overflow-hidden bg-[#323D68] flex items-center justify-center border-2 border-[#774BE5]">
                            <img
                              src="/Flowterviewlogo.svg"
                              alt="AI Assistant"
                              className="w-14 h-14"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-24 h-24 rounded-full overflow-hidden bg-[#323D68] flex items-center justify-center text-white font-medium text-2xl">
                            {participant.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-[#5E788F] px-4 py-1.5 rounded-lg text-white text-sm flex items-center gap-3 shadow-md">
                        {participant.isTalking && (
                          <div className="flex space-x-[2px]">
                            <div className="w-[3px] h-3 bg-[#774BE5] rounded-full animate-[sound-wave_1.2s_ease-in-out_infinite_0.2s]"></div>
                            <div className="w-[3px] h-3 bg-[#774BE5] rounded-full animate-[sound-wave_1.5s_ease-in-out_infinite_0.3s]"></div>
                            <div className="w-[3px] h-3 bg-[#774BE5] rounded-full animate-[sound-wave_1.3s_ease-in-out_infinite_0.1s]"></div>
                          </div>
                        )}

                        {participant.id === "bot" && (
                          <span className="text-xs opacity-75">(AI)</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Transcript overlay - positioned above controls */}
      {isCaptionEnabled && currentBotTranscript && callStatus !== "left" && (
        <div
          className={`fixed z-30 ${
            isCodeEditorOpen ? "left-[75%]" : "left-1/2"
          } bottom-[108px] transform -translate-x-1/2 max-w-2xl w-[calc(100%-32px)] md:w-auto animate-fade-in transition-all duration-300`}
        >
          <div className="relative px-4">
            <div className="bg-[#0E1C29]/90 backdrop-blur-md p-4 rounded-2xl text-left shadow-lg border border-[#323D68]/30">
              <div className="flex items-start mb-2">
                <div className="w-6 h-6 rounded-full bg-[#323D68] border border-[#774BE5] flex items-center justify-center mr-2 mt-0.5">
                  <img
                    src="/Flowterviewlogo.svg"
                    alt="AI"
                    className="w-3.5 h-3.5"
                  />
                </div>
                <span className="text-white/80 text-xs font-medium">
                  Flowterview
                </span>
              </div>
              <p className="text-white text-base ml-8 leading-relaxed">
                {currentBotTranscript}
              </p>
            </div>
            <div className="w-4 h-4 bg-[#0E1C29]/90 absolute -bottom-2 left-1/2 transform -translate-x-1/2 rotate-45"></div>
          </div>
        </div>
      )}

      <div
        className={`fixed ${isCodeEditorOpen ? "left-[75%] bottom-8" : "left-1/2 bottom-8"} transform -translate-x-1/2 z-30 transition-all duration-300`}
      >
        {callStatus !== "left" && (
          <Controls
            participants={participants}
            isCodeEditorOpen={isCodeEditorOpen}
            toggleCodeEditor={toggleCodeEditor}
            style={{
              maxHeight: "80px",
              overflow: "visible",
              width: "auto",
              minWidth: isCodeEditorOpen ? "320px" : "450px",
              maxWidth: isCodeEditorOpen ? "400px" : "600px",
              background: "rgba(14, 28, 41, 0.85)",
              backdropFilter: "blur(8px)",
              borderRadius: "16px",
              padding: "0 12px",
            }}
            joinAndLeaveCallHandler={joinAndLeaveCallHandler}
          />
        )}
      </div>

      {!isCodeEditorOpen && codingProblem && (
        <div className="fixed z-10 bottom-24 right-6">
          <button
            onClick={() => setIsCodeEditorOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg flex items-center justify-center"
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
