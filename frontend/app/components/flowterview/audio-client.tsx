"use client";

import usePathStore from "@/app/store/PathStore";
import { RTVIClient, RTVIEvent } from "@pipecat-ai/client-js";
import { DailyTransport } from "@pipecat-ai/daily-transport";
import { useEffect, useRef, useState } from "react";
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
  } = usePathStore();
  const [toasts, setToasts] = useState<
    Array<{ message: string; type: "info" | "error" }>
  >([]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const rtviClientRef = useRef<RTVIClient | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

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
            console.log("Audio playback started");
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
        console.log("Bot audio track detected:", track);
        setupAudioTrack(track);
      }
    });

    client.on(RTVIEvent.UserStartedSpeaking, () => {
      console.log("User started speaking - triggering UI update");
      setIsUserSpeaking(true);
    });

    client.on(RTVIEvent.UserStoppedSpeaking, () => {
      console.log("User stopped speaking - triggering UI update");
      setIsUserSpeaking(false);
      setBotState("thinking");
    });

    client.on(RTVIEvent.UserTranscript, (data) => {
      console.log("User:", data.text);
      // setCurrentUserTranscript(data.text);
    });

    client.on(RTVIEvent.BotTranscript, (data) => {
      console.log("Bot:", data.text);
      // Get the latest transcript value directly from the store
      const latestTranscript = usePathStore.getState().currentBotTranscript;
      // console.log("Current transcript:", latestTranscript)
      // setCurrentBotTranscript(data.text)
    });

    client.on(RTVIEvent.BotTtsText, (data) => {
      // Get the latest transcript from the store
      console.log("BotTTs", data.text);
      const latestTranscript = usePathStore.getState().currentBotTranscript;

      const isNewSentence = /[.!?]\s*$/.test(latestTranscript);

      if (isNewSentence) {
        setCurrentBotTranscript(data.text);
        return;
      }

      const concatenateWithSpacing = (
        prevText: string,
        newText: string
      ): string => {
        // If this is the first piece of text
        if (!prevText) return newText;

        const isPunctuation = /^[.,!?;:]/.test(newText);

        // Check if the previous text ends with a punctuation mark
        const endsWithPunctuation = /[.,!?;:]$/.test(prevText);

        // Check if the previous text ends with a space
        const endsWithSpace = /\s$/.test(prevText);

        // Logic for concatenation:
        // 1. If new text is punctuation, don't add space before it
        if (isPunctuation) {
          return prevText + newText;
        }

        // 2. If previous text ends with punctuation, add a space after it
        if (endsWithPunctuation && !endsWithSpace) {
          return prevText + " " + newText;
        }

        // 3. If previous text already ends with a space, just append new text
        if (endsWithSpace) {
          return prevText + newText;
        }

        // 4. Default case: add a space between words
        return prevText + " " + newText;
      };

      // Update the transcript with intelligent spacing
      const updatedTranscript = concatenateWithSpacing(
        latestTranscript,
        data.text
      );

      // Set the current transcript
      setCurrentBotTranscript(updatedTranscript);
    });

    client.on(RTVIEvent.BotStartedSpeaking, () => {
      console.log("Bot started speaking - triggering UI update");
      setIsBotSpeaking(true);
      setShowStarterQuestions(false);
      setBotState("speaking");
    });

    client.on(RTVIEvent.BotStoppedSpeaking, () => {
      console.log("Bot stopped speaking - clearing transcripts");
      setIsBotSpeaking(false);
      onClearTranscripts();
      setCurrentBotTranscript("");
      setBotState("done");
    });

    client.on(RTVIEvent.TransportStateChanged, (state) => {
      console.log("Transport state changed:", state);
      setTransportState(state);
    });
  };

  const checkPermissionAndConnect = async () => {
    try {
      showToast("Initializing audio connection...");
      setConnectionStatus("initializing");
      console.log("Starting connection to Interview Copilot backend...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      micStreamRef.current = stream;

      if (!micStreamRef.current) {
        console.error("No microphone stream available");
        showToast("Microphone not available", "error");
        setConnectionStatus("disconnected");
        return;
      }

      const microphoneTrack = micStreamRef.current.getAudioTracks()[0];
      if (!microphoneTrack) {
        console.error("No microphone track available in the stream");
        showToast("Microphone track not available", "error");
        setConnectionStatus("disconnected");
        return;
      }

      console.log(
        "Using microphone track:",
        microphoneTrack.label,
        "Enabled:",
        microphoneTrack.enabled
      );

      setConnectionStatus("audio_connected");

      const rtviClient = new RTVIClient({
        params: {
          baseUrl:
            process.env.NEXT_PUBLIC_PIPECAT_BASE_URL ||
            "http://localhost:8000/api/v1",
          audioElement: audioRef.current,
          audioTrack: microphoneTrack,
        },
        transport: new DailyTransport({
          dailyFactoryOptions: {
            subscribeToTracksAutomatically: true,
            audioSource: microphoneTrack,
            videoSource: false,
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
        enableCam: false,
        callbacks: {
          onConnected: () => {
            console.log("Connected to the server!");
            showToast("Connected to AI service");
            setConnectionStatus("service_connected");
          },
          onDisconnected: () => {
            console.log("Disconnected from the server!");
            showToast("Disconnected from AI service");
            setConnectionStatus("disconnected");
          },
          onBotConnected: () => {
            console.log("Bot connected!");
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
            console.log("Generic message received:", data);

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
                  console.log("Coding problem received:", messageData.payload);
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
            console.log("Transport state changed:", state);
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
    // if (!isMicMuted && !micStreamRef.current) {
    //   checkPermissionAndConnect();
    //   return;
    // }

    if (micStreamRef.current) {
      const audioTrack = micStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicMuted;
        console.log(`Microphone track ${!isMicMuted ? "enabled" : "disabled"}`);
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
      if (rtviClientRef.current) {
        rtviClientRef.current.disconnect().catch(console.error);
      }
      setConnectionStatus("disconnected");
    };
  }, [callStatus]);

  return (
    <div className="relative">
      <audio ref={audioRef} />
      {/* Rest of your component JSX */}
    </div>
  );
}

export default AudioClient;
