import { Message, TConnectionStatus, TSource } from "@/lib/types/general";
import { create } from "zustand";

type CallStatus =
  | "initial"
  | "joined"
  | "left"
  | "joining"
  | "leaving"
  | "connecting"
  | "connected";

type BotState = "initial" | "speaking" | "listening" | "thinking" | "done";

type TTransportState =
  | "disconnected"
  | "initializing"
  | "initialized"
  | "authenticating"
  | "connecting"
  | "connected"
  | "ready"
  | "disconnecting"
  | "error";

type Participant = {
  id: string;
  name: string;
  isTalking: boolean;
  color?: string;
};

type CodingProblem = {
  description: string;
  constraints: string;
};

type TPathStore = {
  // Toast management
  showToast: (message: string, type: "info" | "success" | "error") => void;
  toasts: Array<{ message: string; type: "info" | "success" | "error" }>;
  setToasts: (
    toasts: Array<{ message: string; type: "info" | "success" | "error" }>
  ) => void;

  // UI States
  isHeaderVisible: boolean;
  setIsHeaderVisible: (isVisible: boolean) => void;
  isTransitioning: boolean;
  setIsTransitioning: (isTransitioning: boolean) => void;
  isCodeEditorOpen: boolean;
  setIsCodeEditorOpen: (isOpen: boolean) => void;
  starterQuestionsOpacity: number;
  setStarterQuestionsOpacity: (opacity: number) => void;

  // Visual Layer States
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  imageLoaded: boolean;
  setImageLoaded: (loaded: boolean) => void;
  currentImageSrc: string;
  setCurrentImageSrc: (src: string) => void;
  displayedSource: TSource | null;
  setDisplayedSource: (source: TSource | null) => void;

  // Chat States
  chatInput: string;
  setChatInput: (input: string) => void;
  activeTab: "chat" | "notes";
  setActiveTab: (tab: "chat" | "notes") => void;

  // Multi-user participants
  participants: Participant[];
  setParticipants: (participants: Participant[]) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (id: string) => void;

  // New properties

  ttsConnecting: boolean;
  setTtsConnecting: (ttsConnecting: boolean) => void;
  isUserSpeaking: boolean;
  setIsUserSpeaking: (isUserSpeaking: boolean) => void;
  isChatBoxOpen: boolean;
  setIsChatBoxOpen: (isChatBoxOpen: boolean) => void;

  isCaptionEnabled: boolean;
  setIsCaptionEnabled: (isCaptionEnabled: boolean) => void;

  currentChatHistory: Message[];
  setCurrentChatHistory: (currentChatHistory: Message[]) => void;
  currentBotTranscript: string;
  setCurrentBotTranscript: (currentTranscript: string) => void;
  isNowAnswering: boolean;
  setIsNowAnswering: (isNowAnswering: boolean) => void;
  currentUserTranscript: string;
  setCurrentUserTranscript: (currentUserTranscript: string) => void;
  isSpeakerOn: boolean;
  setIsSpeakerOn: (isSpeakerOn: boolean) => void;
  callStatus: CallStatus;
  setCallStatus: (callStatus: CallStatus) => void;
  isMicMuted: boolean;
  setIsMicMuted: (isMicMuted: boolean) => void;
  isCameraOn: boolean;
  setIsCameraOn: (isCameraOn: boolean) => void;
  permissionGranted: boolean;
  setPermissionGranted: (permissionGranted: boolean) => void;

  botState: BotState;
  setBotState: (botState: BotState) => void;
  showStarterQuestions: boolean;
  setShowStarterQuestions: (showStarterQuestions: boolean) => void;
  joiningCall: boolean;
  setJoiningCall: (joiningCall: boolean) => void;

  connectionStatus: TConnectionStatus;
  setConnectionStatus: (connectionStatus: TConnectionStatus) => void;

  transportState: TTransportState;
  setTransportState: (transportState: TTransportState) => void;

  // Bot States
  isBotSpeaking: boolean;
  setIsBotSpeaking: (isBotSpeaking: boolean) => void;
  sources: TSource[];
  setSources: (sources: TSource[]) => void;

  // Coding problem properties
  codingProblem: CodingProblem | null;
  setCodingProblem: (codingProblem: CodingProblem | null) => void;

  // RTVI client
  rtviClient: any; // Replace 'any' with 'RTVIClient' if you have the type
  setRtviClient: (client: any) => void;

  // clear
  resetStore: () => void;

  sendCodeMessage: (code: string, language: string) => void;

  sendSubmittedMessage: (code: string, language: string) => void;

  // Local video stream
  localVideoStream: MediaStream | null;
  setLocalVideoStream: (stream: MediaStream | null) => void;

  // Editor settings
  editorFontSize: number;
  setEditorFontSize: (size: number) => void;
};

export const usePathStore = create<TPathStore>((set, get) => ({
  // UI States
  isHeaderVisible: true,
  setIsHeaderVisible: (isVisible) => set({ isHeaderVisible: isVisible }),
  isTransitioning: false,
  setIsTransitioning: (isTransitioning) => set({ isTransitioning }),
  isCodeEditorOpen: false,
  setIsCodeEditorOpen: (isOpen) => set({ isCodeEditorOpen: isOpen }),
  starterQuestionsOpacity: 0,
  setStarterQuestionsOpacity: (opacity) =>
    set({ starterQuestionsOpacity: opacity }),

  // Visual Layer States
  isLoading: true,
  setIsLoading: (isLoading) => set({ isLoading }),
  imageLoaded: false,
  setImageLoaded: (loaded) => set({ imageLoaded: loaded }),
  currentImageSrc: "",
  setCurrentImageSrc: (src) => set({ currentImageSrc: src }),
  displayedSource: null,
  setDisplayedSource: (source) => set({ displayedSource: source }),

  // Chat States
  chatInput: "",
  setChatInput: (input) => set({ chatInput: input }),
  activeTab: "chat",
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Multi-user participants state
  participants: [
    { id: "user", name: "User", isTalking: false, color: "#FFA500" },
    { id: "bot", name: "Flotia", isTalking: false, color: "#29e9ac" },
  ],
  setParticipants: (participants: Participant[]) => set({ participants }),
  addParticipant: (participant: Participant) =>
    set((state) => ({ participants: [...state.participants, participant] })),
  removeParticipant: (id: string) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.id !== id),
    })),

  showToast: (message: string, type: "info" | "success" | "error") =>
    set((state) => ({
      toasts: [...state.toasts, { message, type }],
    })),
  toasts: [],
  setToasts: (
    toasts: Array<{ message: string; type: "info" | "success" | "error" }>
  ) => set({ toasts }),
  isBotSpeaking: false,
  setIsBotSpeaking: (isBotSpeaking: boolean) => set({ isBotSpeaking }),
  sources: [],
  setSources: (sources: TSource[]) => set({ sources }),
  isUserSpeaking: false,
  setIsUserSpeaking: (isUserSpeaking: boolean) => set({ isUserSpeaking }),
  isChatBoxOpen: false,
  setIsChatBoxOpen: (isChatBoxOpen: boolean) => set({ isChatBoxOpen }),
  isCaptionEnabled: true,
  setIsCaptionEnabled: (isCaptionEnabled: boolean) => set({ isCaptionEnabled }),
  currentChatHistory: [],
  setCurrentChatHistory: (currentChatHistory: Message[]) =>
    set({ currentChatHistory }),
  currentBotTranscript: "",
  setCurrentBotTranscript: (currentBotTranscript: string) =>
    set({ currentBotTranscript }),
  ttsConnecting: false,
  setTtsConnecting: (ttsConnecting: boolean) => set({ ttsConnecting }),
  isNowAnswering: false,
  setIsNowAnswering: (isNowAnswering: boolean) => set({ isNowAnswering }),

  currentUserTranscript: "",
  setCurrentUserTranscript: (currentUserTranscript: string) =>
    set({ currentUserTranscript }),
  isSpeakerOn: true,
  setIsSpeakerOn: (isSpeakerOn: boolean) => set({ isSpeakerOn }),
  callStatus: "joining",
  setCallStatus: (callStatus: CallStatus) => set({ callStatus }),
  isMicMuted: false,
  isCameraOn: true,
  setIsMicMuted: (isMicMuted: boolean) => set({ isMicMuted }),
  setIsCameraOn: (isCameraOn: boolean) => set({ isCameraOn }),
  permissionGranted: false,
  setPermissionGranted: (permissionGranted: boolean) =>
    set({ permissionGranted }),
  botState: "initial",
  setBotState: (botState: BotState) => set({ botState }),
  showStarterQuestions: false,
  setShowStarterQuestions: (showStarterQuestions: boolean) =>
    set({ showStarterQuestions }),
  joiningCall: false,
  setJoiningCall: (joiningCall: boolean) => set({ joiningCall }),
  connectionStatus: "disconnected",
  setConnectionStatus: (connectionStatus: TConnectionStatus) =>
    set({ connectionStatus }),
  transportState: "disconnected",
  setTransportState: (transportState: TTransportState) =>
    set({ transportState }),

  // Coding problem properties
  codingProblem: null,
  setCodingProblem: (codingProblem: CodingProblem | null) =>
    set({ codingProblem }),

  rtviClient: null,
  setRtviClient: (client: any) => set({ rtviClient: client }),

  // Local video stream
  localVideoStream: null,
  setLocalVideoStream: (stream: MediaStream | null) =>
    set({ localVideoStream: stream }),

  // Editor settings
  editorFontSize: 18,
  setEditorFontSize: (size: number) => set({ editorFontSize: size }),

  resetStore: () => {
    set({
      participants: [
        { id: "user", name: "User", isTalking: false, color: "#FFA500" },
        { id: "bot", name: "Flotia", isTalking: false, color: "#29e9ac" },
      ],
      toasts: [],
      sources: [],
      isUserSpeaking: false,
      isChatBoxOpen: false,
      isCaptionEnabled: true,
      currentChatHistory: [],
      currentBotTranscript: "",
      isNowAnswering: false,
      ttsConnecting: false,
      currentUserTranscript: "",
      isSpeakerOn: true,
      isMicMuted: false,
      isCameraOn: true,
      botState: "initial",
      showStarterQuestions: false,
      joiningCall: false,
      isHeaderVisible: true,
      isTransitioning: false,
      isCodeEditorOpen: false,
      starterQuestionsOpacity: 0,
      isLoading: true,
      imageLoaded: false,
      currentImageSrc: "",
      displayedSource: null,
      chatInput: "",
      activeTab: "chat",
      isBotSpeaking: false,
      connectionStatus: "disconnected",
      transportState: "disconnected",
      permissionGranted: false,
      callStatus: "initial",
      codingProblem: null,
      rtviClient: null,
      localVideoStream: null,
      editorFontSize: 18,
    });
  },

  sendCodeMessage: async (code: string, language: string) => {
    const { rtviClient } = get();
    if (!rtviClient || !code.trim()) return;
    try {
      await rtviClient.action({
        service: "llm",
        action: "append_to_messages",
        arguments: [
          {
            name: "messages",
            value: [
              {
                role: "user",
                content: `Language: ${language}\n\n${code}`,
              },
            ],
          },
        ],
      });
    } catch (error) {
      console.error("Error sending code message:", error);
    }
  },

  sendSubmittedMessage: async (code: string, _: string) => {
    const { rtviClient } = get();
    if (!rtviClient || !code.trim()) return;
    try {
      await rtviClient.action({
        service: "llm",
        action: "append_to_messages",
        arguments: [
          {
            name: "messages",
            value: [
              {
                role: "user",
                content: `Code Submitted. {"submitted_code": ${code}}`,
              },
            ],
          },
        ],
      });
    } catch (error) {
      console.error("Error sending submitted code message:", error);
    }
  },
}));

export default usePathStore;
