"use client";

import usePathStore from "@/app/store/PathStore";
import { RTVIClient, RTVIEvent } from "@pipecat-ai/client-js";
import { DailyTransport } from "@pipecat-ai/daily-transport";
import { useEffect, useRef, useState, useCallback } from "react";
import { Message } from "@/lib/types/general";

export interface AudioClientProps {
  onClearTranscripts: () => void;
}

/**
 * AudioClient - Component for handling audio processing, transcription and voice interactions
 */
export function AudioClient({ onClearTranscripts }: AudioClientProps) {
  const { isBotSpeaking, setIsBotSpeaking } = usePathStore();
  const { isUserSpeaking, setIsUserSpeaking } = usePathStore();
  const { sources, setSources } = usePathStore();
  const { setCurrentChatHistory } = usePathStore();
  const { currentBotTranscript, setCurrentBotTranscript } = usePathStore();
  const { setCurrentUserTranscript } = usePathStore();
  const { isSpeakerOn, isMicMuted } = usePathStore();
  const { connectionStatus, setConnectionStatus } = usePathStore();
  const {
    callStatus,
    permissionGranted,
    setPermissionGranted,
    botState,
    setBotState,
    joiningCall,
    setJoiningCall,
    setShowStarterQuestions,
    setTransportState,
    codingProblem,
    setCodingProblem,
    isCodeEditorOpen,
    setIsCodeEditorOpen,
    setRtviClient,
    setLocalVideoStream,
  } = usePathStore();
  const [toasts, setToasts] = useState<
    Array<{ message: string; type: "info" | "error" }>
  >([]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const rtviClientRef = useRef<RTVIClient | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Track the current messages being built
  const currentBotMessageRef = useRef<string>("");
  const latestUserTranscriptRef = useRef<string>("");
  const accumulatedUserTranscriptRef = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (gainNodeRef.current && audioContextRef.current) {
      if (isSpeakerOn) {
        gainNodeRef.current.connect(audioContextRef.current.destination);
      } else {
        gainNodeRef.current.disconnect();
      }
    }
  }, [isSpeakerOn]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isSpeakerOn ? 1.0 : 0;
    }
    if (audioRef.current) {
      audioRef.current.volume = isSpeakerOn ? 1 : 0;
      if (isSpeakerOn) {
        audioRef.current
          .play()
          .then(() => {
            // Audio playback started
          })
          .catch((err) => {
            if (err.name !== "NotAllowedError") {
              console.error("Play failed:", err);
              showToast("Audio playback error occurred", "error");
            }
          });
      }
    }
  }, [isSpeakerOn]);

  const showToast = (message: string, type: "info" | "error" = "info") => {
    const toast = { message, type };
    setToasts((prev) => [...prev, toast]);
    setTimeout(
      () => {
        setToasts((prev) => prev.filter((t) => t !== toast));
      },
      type === "error" ? 5000 : 3000
    );
  };

  const getOriginUrl = (url: string): string => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("data:")) return url;
    return url.startsWith("/") ? url : `/${url}`;
  };

  const formatImageUrl = (url: string): string => {
    return getOriginUrl(url);
  };

  const setupAudioTrack = (track: MediaStreamTrack) => {
    if (!track || typeof window === "undefined") {
      console.error("No audio track provided or not in browser environment");
      showToast("Audio setup failed", "error");
      return;
    }

    try {
      const stream = new MediaStream([track]);
      const audioEl = audioRef.current;

      if (!audioEl) {
        console.error("Audio element missing");
        showToast("Audio element missing", "error");
        return;
      }

      audioEl.srcObject = stream;
      audioEl.muted = false;
      audioEl.volume = 1.0;

      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const gainNode = audioContext.createGain();
      gainNodeRef.current = gainNode;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;

      source.connect(gainNode);
      gainNode.connect(analyser);

      audioEl.play().catch((err) => {
        if (err.name !== "NotAllowedError") {
          console.error("Play failed:", err);
          showToast("Audio playback error occurred", "error");
        }
      });
    } catch (error) {
      console.error("Error in setupAudioTrack:", error);
      showToast(
        `Error setting up audio: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
    }
  };

  const setupEventListeners = (client: RTVIClient) => {
    client.on(RTVIEvent.TrackStarted, (track, participant) => {
      if (track.kind === "audio" && !participant?.local) {
        setupAudioTrack(track);
      }
    });

    client.on(RTVIEvent.UserStartedSpeaking, () => {
      setIsUserSpeaking(true);
      // Clear any previous transcript when user starts speaking
      setCurrentUserTranscript("");
      latestUserTranscriptRef.current = "";
      // Don't clear accumulated transcript here - we want to build it up during the session
    });

    client.on(RTVIEvent.UserTranscript, (data) => {
      // Only process final transcripts
      if (data.final) {
        latestUserTranscriptRef.current = data.text;
        setCurrentUserTranscript(data.text);
        setIsUserSpeaking(false);
        setBotState("thinking");

        // Accumulate the transcript instead of immediately adding to chat history
        const finalTranscript = latestUserTranscriptRef.current.trim();
        if (finalTranscript) {
          // Add to accumulated transcript with a space if there's already content
          if (accumulatedUserTranscriptRef.current) {
            accumulatedUserTranscriptRef.current += " " + finalTranscript;
          } else {
            accumulatedUserTranscriptRef.current = finalTranscript;
          }
        }

        // Clear the current transcript display
        setCurrentUserTranscript("");
        latestUserTranscriptRef.current = "";
      }
    });

    client.on(RTVIEvent.UserStoppedSpeaking, () => {});

    client.on(RTVIEvent.BotStartedSpeaking, () => {
      setIsBotSpeaking(true);
      setShowStarterQuestions(false);
      setBotState("speaking");

      // Add accumulated user transcript to chat history when bot starts speaking
      const accumulatedTranscript = accumulatedUserTranscriptRef.current.trim();
      if (accumulatedTranscript) {
        const currentHistory = usePathStore.getState().currentChatHistory;
        const newMessage: Message = {
          role: "user",
          content: accumulatedTranscript,
        };
        setCurrentChatHistory([...currentHistory, newMessage]);

        // Clear the accumulated transcript
        accumulatedUserTranscriptRef.current = "";
      }

      // Reset the message being built
      currentBotMessageRef.current = "";
    });

    client.on(RTVIEvent.BotTranscript, (data) => {
      // We ignore transcript events - only using TTS
    });

    client.on(RTVIEvent.BotTtsText, (data) => {
      // Append the TTS text to our message
      currentBotMessageRef.current +=
        (currentBotMessageRef.current ? " " : "") + data.text;

      // Update the live display
      setCurrentBotTranscript(currentBotMessageRef.current);
    });

    client.on(RTVIEvent.BotStoppedSpeaking, () => {
      setIsBotSpeaking(false);
      setBotState("done");

      // Add the complete message to chat history
      const completeMessage = currentBotMessageRef.current.trim();

      if (completeMessage) {
        const currentHistory = usePathStore.getState().currentChatHistory;
        const newMessage: Message = {
          role: "assistant",
          content: completeMessage,
        };
        setCurrentChatHistory([...currentHistory, newMessage]);
      }

      // Clear everything
      onClearTranscripts();
      setCurrentBotTranscript("");
      currentBotMessageRef.current = "";
      // Also clear accumulated user transcript after bot finishes
      accumulatedUserTranscriptRef.current = "";
    });

    client.on(RTVIEvent.TransportStateChanged, (state) => {
      setTransportState(state);
    });
  };

  const checkPermissionAndConnect = async () => {
    try {
      showToast("Initializing audio connection...");
      setConnectionStatus("initializing");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: true,
      });

      micStreamRef.current = stream;
      setLocalVideoStream(stream);

      if (!micStreamRef.current) {
        console.error("No microphone stream available");
        showToast("Microphone not available", "error");
        setConnectionStatus("disconnected");
        return;
      }

      const microphoneTrack = stream.getAudioTracks()[0];
      if (!microphoneTrack) {
        showToast("No microphone found", "error");
        setConnectionStatus("disconnected");
        return;
      }

      setConnectionStatus("audio_connected");

      const videoTrack = stream.getVideoTracks()[0];

      const pipecat_base_url =
        process.env.NEXT_PUBLIC_PIPECAT_BASE_URL || "https://core.sivera.io";

      const rtviClient = new RTVIClient({
        params: {
          baseUrl: `${pipecat_base_url}/api/v1`,
          audioElement: audioRef.current,
          audioTrack: microphoneTrack,
          videoTrack: videoTrack,
          requestData: {
            job_id: usePathStore.getState().jobId,
            candidate_id: usePathStore.getState().candidateId,
            linkedin_profile: usePathStore.getState().linkedin_profile,
            additional_links: usePathStore.getState().additional_links,
          },
        },
        transport: new DailyTransport({
          dailyFactoryOptions: {
            subscribeToTracksAutomatically: true,
            audioSource: microphoneTrack,
            videoSource: videoTrack,
            dailyConfig: {
              micAudioMode: "speech",
              userMediaAudioConstraints: {
                echoCancellation: { ideal: true },
                noiseSuppression: { ideal: true },
                autoGainControl: { ideal: true },
              },
            },
          },
        }),
        enableMic: true,
        enableCam: true,
        callbacks: {
          onConnected: () => {
            showToast("Connected to AI service");
            setConnectionStatus("service_connected");
          },
          onDisconnected: () => {
            showToast("Disconnected from AI service");
            setConnectionStatus("disconnected");
          },
          onBotConnected: () => {
            showToast("AI assistant connected");
            setConnectionStatus("bot_connected");
          },
          onError: (err: any) => {
            console.error("RTVIClient error:", err);
            showToast(
              `Connection error: ${err instanceof Error ? err.message : String(err)}`,
              "error"
            );
          },
          onGenericMessage: (data: any) => {
            try {
              const message =
                typeof data === "string" ? JSON.parse(data) : data;
              if (message?.text && message?.text !== "") {
                setCurrentUserTranscript(message.text);
              }

              if (message && typeof message === "object") {
                if (message?.sources?.length > 0) {
                  setSources(message.sources);
                }
                if (message?.chatHistory?.length > 0) {
                  setCurrentChatHistory(message.chatHistory);
                }

                // Handle coding problem messages - check both direct and wrapped formats
                const messageData = message.message || message;

                if (
                  messageData &&
                  typeof messageData === "object" &&
                  messageData.type === "coding-problem"
                ) {
                  const {
                    problem_description,
                    problem_constraints,
                    open_editor,
                  } = messageData.payload;

                  // Store the coding problem in the PathStore
                  setCodingProblem({
                    description: problem_description,
                    constraints: problem_constraints,
                  });

                  // Open the code editor if requested
                  if (open_editor) {
                    setIsCodeEditorOpen(true);
                  }
                  const problemMessage: Message = {
                    role: "assistant",
                    content: `**Coding Problem:**\n\n${problem_description}\n\n**Constraints:**\n\n${problem_constraints}`,
                  };
                }
              }
            } catch (error) {
              console.error("Error processing generic message:", error);
              if (error instanceof Error) {
                console.error("Error details:", error.message);
                console.error("Error stack:", error.stack);
              }
            }
          },
          onTransportStateChanged: (state) => {
            setTransportState(state);
          },
        },
      });
      setRtviClient(rtviClient);
      rtviClientRef.current = rtviClient;

      setupEventListeners(rtviClient);
      await rtviClient.connect();
    } catch (error) {
      console.error("Connection failed:", error);
      showToast(
        `Connection failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
      setConnectionStatus("disconnected");
    }
  };

  useEffect(() => {
    const checkAndGrantMicrophonePermission = async () => {
      try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        // If we get here, permission was granted
        setPermissionGranted(true);
        // Clean up the temporary stream
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        // console.error('Microphone permission denied:', err);
        setPermissionGranted(false);
        showToast(
          "Please enable microphone access in your browser settings to use voice features",
          "error"
        );
      }
    };

    // Check microphone permission when component mounts
    checkAndGrantMicrophonePermission();
  }, []);

  useEffect(() => {
    if (callStatus !== "joined" || !permissionGranted) {
      return;
    }

    if (micStreamRef.current) {
      const audioTrack = micStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicMuted;
      }
    }
  }, [isMicMuted, callStatus, permissionGranted]);

  useEffect(() => {
    if (joiningCall) {
      checkPermissionAndConnect();
      setJoiningCall(false);
    }
  }, [joiningCall]);

  useEffect(() => {
    if (callStatus === "leaving") {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      setLocalVideoStream(null);
      if (rtviClientRef.current) {
        rtviClientRef.current
          .disconnect()
          .then(() => {
            setConnectionStatus("disconnected");
          })
          .catch(console.error);
      } else {
        setConnectionStatus("disconnected");
      }
    }
    return () => {
      // Cleanup on unmount
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      setLocalVideoStream(null);
      if (rtviClientRef.current) {
        rtviClientRef.current.disconnect().catch(console.error);
      }
      setConnectionStatus("disconnected");
      // Clear accumulated transcript on cleanup
      accumulatedUserTranscriptRef.current = "";
    };
  }, [callStatus]);

  return (
    <div className="relative">
      <audio ref={audioRef} />
      {/* Remove video element here if it exists - we'll show it in Presentation instead */}
    </div>
  );
}

export default AudioClient;
