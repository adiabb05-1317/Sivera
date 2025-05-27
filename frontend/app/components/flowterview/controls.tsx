"use client";
import { Icons } from "@/app/lib/icons";
import usePathStore from "@/app/store/PathStore";
import { useEffect, useRef, useState } from "react";
import { Participant } from "../ui/AvatarStack";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ControlTooltip = ({
  text,
  isHovered,
}: {
  text: string;
  isHovered: boolean;
}) => {
  return (
    isHovered && (
      <Badge
        className="absolute bottom-[-2rem] left-1/2 transform -translate-x-1/2 text-indigo-900/70 dark:text-indigo-100 bg-white/80 dark:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-700 shadow-lg backdrop-blur-md px-3 py-1 rounded-xl font-medium transition-colors duration-200"
        variant="default"
      >
        {text}
      </Badge>
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
  const [isHovered, setIsHovered] = useState<string | null>(null);
  const participantsRef = useRef<HTMLDivElement>(null);

  // Store states
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

  return (
    <section
      className="rounded-full shadow-lg flex items-center justify-center p-3 gap-5 relative z-20 bg-white/70 dark:bg-indigo-100/20 border border-indigo-200 dark:border-indigo-400/20 backdrop-blur-xl transition-all duration-300"
      style={style}
    >
      {/* Code Editor toggle button */}
      <button
        className={`p-3.5 rounded-full text-white transition-colors duration-200 shadow-md
          ${isCodeEditorOpen ? "bg-indigo-500" : "bg-indigo-300/80 dark:bg-indigo-400/40 text-indigo-900/70 dark:text-indigo-100"}
        `}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleCodeEditor?.();
        }}
        onMouseEnter={() => setIsHovered("codeEditor")}
        onMouseLeave={() => setIsHovered(null)}
      >
        <Icons.Code className="h-4 w-4" />
        {isHovered === "codeEditor" && (
          <ControlTooltip
            text={isCodeEditorOpen ? "Hide code editor" : "Open code editor"}
            isHovered
          />
        )}
      </button>

      {/* Center controls */}
      <div className="flex items-center gap-6">
        {/* Captions toggle */}
        <button
          className={`p-3.5 rounded-full transition-colors duration-200 shadow-md
            ${isCaptionEnabled ? "bg-indigo-500 text-white" : "bg-indigo-300/80 dark:bg-indigo-400/40 text-indigo-900/70 dark:text-indigo-100"}
          `}
          onClick={() => setIsCaptionEnabled(!isCaptionEnabled)}
          onMouseEnter={() => setIsHovered("captions")}
          onMouseLeave={() => setIsHovered(null)}
        >
          <Icons.ClosedCaptions className="w-4 h-4" />
          {isHovered === "captions" && (
            <ControlTooltip
              text={isCaptionEnabled ? "Turn off captions" : "Turn on captions"}
              isHovered
            />
          )}
        </button>

        {/* Mic */}
        <button
          className={`p-4 rounded-full transition-colors duration-200 shadow-md
            ${
              callStatus === "initial" || callStatus === "left"
                ? "bg-indigo-200/80 dark:bg-indigo-400/20 cursor-not-allowed text-indigo-300 dark:text-indigo-200"
                : isMicMuted
                  ? "bg-indigo-500 text-white"
                  : "bg-indigo-300/80 dark:bg-indigo-400/40 text-indigo-900/70 dark:text-indigo-100"
            }
          `}
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
          {isHovered === "microphone" && (
            <ControlTooltip
              text={isMicMuted ? "Unmute microphone" : "Mute microphone"}
              isHovered
            />
          )}
        </button>

        {/* Camera */}
        <button
          className={`p-4 rounded-full transition-colors duration-200 shadow-md
            ${
              callStatus === "initial" || callStatus === "left"
                ? "bg-indigo-200/80 dark:bg-indigo-400/20 cursor-not-allowed text-indigo-300 dark:text-indigo-200"
                : isCameraOn
                  ? "bg-indigo-300/80 dark:bg-indigo-400/40 text-indigo-900/70 dark:text-indigo-100"
                  : "bg-indigo-500 text-white"
            }
          `}
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
          {isHovered === "camera" && (
            <ControlTooltip
              text={isCameraOn ? "Turn off camera" : "Turn on camera"}
              isHovered
            />
          )}
        </button>

        {/* End call */}
        <button
          className="p-4 rounded-full bg-red-500/90 hover:bg-red-600/90 text-white transition-colors shadow-md"
          onClick={handleEndCall}
          onMouseEnter={() => setIsHovered("endCall")}
          onMouseLeave={() => setIsHovered(null)}
        >
          <Icons.PhoneOff className="w-4 h-4" />
          {isHovered === "endCall" && (
            <ControlTooltip text="End call" isHovered />
          )}
        </button>
      </div>
    </section>
  );
};

export default Controls;
