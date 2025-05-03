"use client";
import { Icons } from "@/app/lib/icons";
import usePathStore from "@/app/store/PathStore";
import { useEffect, useRef, useState } from "react";
import { Participant } from "../ui/AvatarStack";
import { Mic, MicOff } from "lucide-react";

const ControlTooltip = ({
  text,
  isHovered,
}: {
  text: string;
  isHovered: boolean;
}) => {
  return (
    isHovered && (
      <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs py-1 px-2 rounded shadow-md whitespace-nowrap">
        {text}
      </div>
    )
  );
};

const Controls = ({
  className,
  participants,
  joinAndLeaveCallHandler,
  style,
  isCodeEditorOpen,
  toggleCodeEditor,
}: {
  participants: Participant[];
  joinAndLeaveCallHandler: (state: "join" | "leave") => Promise<void>;
  className?: string;
  style?: React.CSSProperties;
  isCodeEditorOpen?: boolean;
  toggleCodeEditor?: () => void;
}) => {
  // State for UI interactions
  const [showParticipantsList, setShowParticipantsList] = useState(false);
  const [isHovered, setIsHovered] = useState<string | null>(null);
  const participantsRef = useRef<HTMLDivElement>(null);

  // Store states
  const { resetStore } = usePathStore();
  const { showToast } = usePathStore();
  const {
    isCaptionEnabled,
    setIsCaptionEnabled,
    callStatus,
    setCallStatus,
    isMicMuted,
    setIsMicMuted,
    isCameraOn,
    setIsCameraOn,
    permissionGranted,
    setTtsConnecting,
    setConnectionStatus,
    connectionStatus,
  } = usePathStore();

  const handleConnectCallAndPlayFirstSpeech = async () => {
    if (!permissionGranted) {
      return;
    }
    setTtsConnecting(true);
    setConnectionStatus("initializing");
    try {
      // Set call status directly to ensure UI updates
      setCallStatus("joining");
      await joinAndLeaveCallHandler("join");
      console.log("Voice agent connected successfully!");
    } catch (error) {
      console.error("Error connecting to voice chat:", error);
      setTtsConnecting(false);
    }
  };

  const handleEndCall = async () => {
    // Prevent multiple clicks
    if (callStatus === "leaving") return;

    try {
      setCallStatus("leaving");
      await joinAndLeaveCallHandler("leave");
    } catch (error) {
      console.error("Error ending call:", error);
      showToast("Error ending call", "error");
    }
  };

  useEffect(() => {
    if (callStatus === "left") return;
    if (callStatus === "joining" && permissionGranted) {
      handleConnectCallAndPlayFirstSpeech();
    }
  }, [callStatus, permissionGranted]);

  // Auto-connect on component mount if needed
  useEffect(() => {
    if (callStatus === "initial" && permissionGranted) {
      console.log("Auto-connecting on component mount");
      // Auto-start connection on first load
      handleConnectCallAndPlayFirstSpeech();
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        participantsRef.current &&
        !participantsRef.current.contains(event.target as Node)
      ) {
        setShowParticipantsList(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <section
      className="rounded-full shadow-lg flex items-center justify-center z-30 p-3 gap-5"
      style={style}
    >
      {/* Left side */}
      <button
        className="p-3.5 rounded-full bg-[#323D68] text-white hover:bg-[#262F50] relative"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowParticipantsList(!showParticipantsList);
        }}
        onMouseEnter={() => setIsHovered("participants")}
        onMouseLeave={() => setIsHovered(null)}
      >
        <Icons.Users className="w-4 h-4" />
        <span className="absolute -top-[0.5px] -right-[0.5px] bg-[#774BE5] text-white text-xs font-semibold rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
          {connectionStatus === "bot_connected" ? participants.length : 1}
        </span>

        <ControlTooltip
          text="View participants"
          isHovered={isHovered === "participants"}
        />
      </button>

      {/* Code Editor toggle button - Google Meet style */}
      <button
        className={`p-3.5 rounded-full ${isCodeEditorOpen ? "bg-[#774BE5] text-white" : "bg-[#323D68] text-white hover:bg-[#262F50]"}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleCodeEditor?.();
        }}
        onMouseEnter={() => setIsHovered("codeEditor")}
        onMouseLeave={() => setIsHovered(null)}
      >
        <Icons.Code className="h-4 w-4" />

        <ControlTooltip
          text={isCodeEditorOpen ? "Hide code editor" : "Open code editor"}
          isHovered={isHovered === "codeEditor"}
        />
      </button>

      {/* Center controls */}
      <div className="flex items-center gap-6">
        {/* Captions toggle */}
        <button
          className={`p-3.5 rounded-full ${
            isCaptionEnabled
              ? "bg-[#323D68] text-white"
              : "bg-[#0E1C29]/40 text-white/70"
          }`}
          onClick={() => setIsCaptionEnabled(!isCaptionEnabled)}
          onMouseEnter={() => setIsHovered("captions")}
          onMouseLeave={() => setIsHovered(null)}
        >
          <Icons.ClosedCaptions className="w-4 h-4" />

          <ControlTooltip
            text={isCaptionEnabled ? "Turn off captions" : "Turn on captions"}
            isHovered={isHovered === "captions"}
          />
        </button>

        {/* Microphone control */}
        <button
          className={`p-4 rounded-full ${
            callStatus === "initial" || callStatus === "left"
              ? "bg-gray-300 cursor-not-allowed"
              : isMicMuted
                ? "bg-[#0E1C29]/40 text-white/70"
                : "bg-[#323D68] text-white"
          }`}
          onClick={() => {
            if (callStatus !== "initial" && callStatus !== "left") {
              setIsMicMuted(!isMicMuted);
            }
          }}
          disabled={callStatus === "initial" || callStatus === "left"}
          onMouseEnter={() => setIsHovered("microphone")}
          onMouseLeave={() => setIsHovered(null)}
        >
          {isMicMuted ? (
            <Icons.MicOff className="w-4 h-4" />
          ) : (
            <Icons.MicrophoneIcon className="w-4 h-4" />
          )}

          <ControlTooltip
            text={isMicMuted ? "Unmute microphone" : "Mute microphone"}
            isHovered={isHovered === "microphone"}
          />
        </button>

        {/* Camera control */}
        <button
          className={`p-4 rounded-full ${
            callStatus === "initial" || callStatus === "left"
              ? "bg-gray-300 cursor-not-allowed"
              : isCameraOn
                ? "bg-[#0E1C29]/40 text-white/70"
                : "bg-[#323D68] text-white"
          }`}
          onClick={() => {
            if (callStatus !== "initial" && callStatus !== "left") {
              setIsCameraOn(!isCameraOn);
            }
          }}
          disabled={callStatus === "initial" || callStatus === "left"}
          onMouseEnter={() => setIsHovered("camera")}
          onMouseLeave={() => setIsHovered(null)}
        >
          {isCameraOn ? (
            <Icons.Video className="w-4 h-4" />
          ) : (
            <Icons.VideoOff className="w-4 h-4" />
          )}

          <ControlTooltip
            text={isCameraOn ? "Turn off camera" : "Turn on camera"}
            isHovered={isHovered === "camera"}
          />
        </button>

        <button
          className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
          onClick={handleEndCall}
          onMouseEnter={() => setIsHovered("endCall")}
          onMouseLeave={() => setIsHovered(null)}
        >
          <Icons.PhoneOff className="w-4 h-4" />

          <ControlTooltip text="End call" isHovered={isHovered === "endCall"} />
        </button>
      </div>

      {showParticipantsList && (
        <div
          ref={participantsRef}
          className="absolute bottom-20 left-4 bg-white rounded-lg p-4 z-30 animate-fade-in shadow-lg"
        >
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
            <h3 className="text-gray-800 text-sm font-medium">
              Participants (
              {connectionStatus === "bot_connected" ? participants.length : 1})
            </h3>
            <button
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
              onClick={() => setShowParticipantsList(false)}
            >
              <Icons.X className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto">
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
                  className="flex items-center justify-between py-2 px-1 hover:bg-gray-50 rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        participant.id === "bot"
                          ? "bg-[#323D68] border border-[#774BE5]"
                          : "bg-gray-200"
                      }`}
                    >
                      {participant.id === "bot" ? (
                        <img
                          src="/Flowterviewlogo.svg"
                          alt="AI Assistant"
                          className="w-5 h-5"
                        />
                      ) : (
                        <span className="text-gray-700 text-xs font-medium">
                          {participant.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-800 text-sm">
                      {participant.name}
                      {participant.id === "bot" && (
                        <span className="text-xs text-gray-500 ml-1">
                          (AI Interviewer)
                        </span>
                      )}
                    </span>
                  </div>

                  {participant.isTalking && (
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-3 bg-[#774BE5] rounded-full animate-sound-wave"></div>
                      <div className="w-1.5 h-4 bg-[#774BE5] rounded-full animate-sound-wave animation-delay-100"></div>
                      <div className="w-1.5 h-2 bg-[#774BE5] rounded-full animate-sound-wave animation-delay-200"></div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default Controls;
