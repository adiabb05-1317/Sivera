"use client";
import { Icons } from "@/app/lib/icons";
import usePathStore from "@/app/store/PathStore";
import { useEffect, useRef, useState } from "react";
import { Participant } from "../ui/AvatarStack";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Codesandbox, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Separator } from "@/components/ui/separator";

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
        className="absolute w-max top-[-2rem] left-1/2 transform -translate-x-1/2 text-app-blue-900/70 dark:text-app-blue-100 bg-white/80 dark:bg-app-blue-900/80 border border-app-blue-200 dark:border-app-blue-700 shadow-lg backdrop-blur-md px-3 py-1 rounded-xl font-semibold text-xs transition-colors duration-200"
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
  isAssessmentOpen,
  toggleAssessment,
}: {
  participants: Participant[];
  joinAndLeaveCallHandler: (state: "join" | "leave") => Promise<void>;
  className?: string;
  style?: React.CSSProperties;
  isAssessmentOpen?: boolean;
  toggleAssessment?: () => void;
}) => {
  // State for UI interactions
  const [isHovered, setIsHovered] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
    currentAssessment,
  } = usePathStore();

  // Theme states
  const { theme, setTheme } = useTheme();

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
      // Auto-connect logic can be added here if needed
    }
  }, []);

  return (
    <section
      className="rounded-full shadow-lg flex items-center justify-center p-3 gap-4 relative z-20 bg-white dark:bg-slate-800 border border-app-blue-100 dark:border-slate-700"
      style={style}
    >
      {/* Left group: Assessment and captions */}
      {currentAssessment && (
        <div className="flex items-center gap-4">
          {/* Assessment toggle */}
          <button
            className={`p-4 rounded-full w-12 h-12 flex items-center justify-center transition-colors duration-200
            ${
              isAssessmentOpen
                ? "bg-app-blue-500 text-white"
                : "bg-app-blue-100 dark:bg-app-blue-500/20 text-app-blue-500 dark:text-app-blue-400 hover:bg-app-blue-200 dark:hover:bg-app-blue-500/30"
            }
          `}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleAssessment?.();
            }}
            onMouseEnter={() => setIsHovered("assessment")}
            onMouseLeave={() => setIsHovered(null)}
          >
            <Codesandbox className="h-5 w-5" />
            {isHovered === "assessment" && (
              <ControlTooltip
                text={isAssessmentOpen ? "Hide assessment" : "Open assessment"}
                isHovered
              />
            )}
          </button>
        </div>
      )}

      {/* Middle group: Settings and theme */}
      <div className="flex items-center gap-4">
        {/* Settings */}
        <Popover open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`p-4 rounded-full w-12 h-12 flex items-center justify-center transition-colors duration-200
                ${
                  isSettingsOpen
                    ? "bg-app-blue-500 text-white hover:bg-app-blue-500 hover:text-white"
                    : "bg-app-blue-100 dark:bg-app-blue-500/20 text-app-blue-500 dark:text-app-blue-400 hover:bg-app-blue-200 hover:text-app-blue-500 dark:hover:bg-app-blue-500/30 dark:hover:text-app-blue-400"
                }`}
              onMouseEnter={() => setIsHovered("settings")}
              onMouseLeave={() => setIsHovered(null)}
            >
              <Icons.Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
              {isHovered === "settings" && (
                <ControlTooltip text="Settings" isHovered />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[400px] overflow-hidden rounded-2xl shadow-lg p-0 border border-app-blue-300/50 dark:border-app-blue-700/70 shadow-xl0"
            align="end"
          >
            <div className="flex justify-between items-center py-2.5 px-3 bg-app-blue-50 dark:bg-[--meet-surface] border-b border-app-blue-200/60 dark:border-app-blue-700/60">
              <h3 className="text-app-blue-800 dark:text-app-blue-200 font-semibold text-xs flex items-center gap-2 tracking-tight">
                <Icons.Settings className="w-4 h-4 text-app-blue-500 dark:text-app-blue-300" />
                <span>Settings</span>
              </h3>
            </div>

            <div className="p-5">
              {/* Theme Settings */}
              <div className="flex flex-row gap-3 items-center">
                <div className="opacity-50 text-app-blue-500 dark:text-app-blue-300">
                  {theme === "dark" ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground/70 mb-1.5 block">
                    Theme
                  </Label>
                  <Select
                    value={theme}
                    onValueChange={(value) => setTheme(value)}
                  >
                    <SelectTrigger className="w-full h-8 text-sm bg-white dark:bg-slate-900 border-input/50 rounded-lg">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-input/50">
                      <SelectItem value="light" className="text-sm">
                        Light
                      </SelectItem>
                      <SelectItem value="dark" className="text-sm">
                        Dark
                      </SelectItem>
                      <SelectItem value="system" className="text-sm">
                        System
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Separator
        orientation="vertical"
        className="h-8 bg-app-blue-200 dark:bg-app-blue-700"
      />

      {/* Right group: Call controls */}
      <div className="flex items-center gap-4">
        {/* Mic */}
        <button
          className={`p-4 rounded-full w-12 h-12 flex items-center justify-center transition-colors duration-200
            ${
              callStatus === "initial" || callStatus === "left"
                ? "bg-app-blue-100/50 dark:bg-app-blue-500/10 cursor-not-allowed text-app-blue-300 dark:text-app-blue-500/40"
                : isMicMuted
                  ? "bg-app-blue-500 text-white"
                  : "bg-app-blue-100 dark:bg-app-blue-500/20 text-app-blue-500 dark:text-app-blue-400 hover:bg-app-blue-200 dark:hover:bg-app-blue-500/30"
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
            <Icons.MicOff className="w-5 h-5" />
          ) : (
            <Icons.MicrophoneIcon className="w-5 h-5" />
          )}
          {isHovered === "microphone" && (
            <ControlTooltip
              text={isMicMuted ? "Mute microphone" : "Unmute microphone"}
              isHovered
            />
          )}
        </button>

        {/* End call */}
        <button
          className="p-4 rounded-full w-12 h-12 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white transition-colors"
          onClick={handleEndCall}
          onMouseEnter={() => setIsHovered("endCall")}
          onMouseLeave={() => setIsHovered(null)}
        >
          <Icons.PhoneOff className="w-5 h-5" />
          {isHovered === "endCall" && (
            <ControlTooltip text="End call" isHovered />
          )}
        </button>
      </div>
    </section>
  );
};

export default Controls;
