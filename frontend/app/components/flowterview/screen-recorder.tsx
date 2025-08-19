"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import usePathStore from "@/app/store/PathStore";
import { toast } from "sonner";

interface ScreenRecorderProps {
  onRecordingStart?: () => void;
  onRecordingStop?: (recordingBlob: Blob) => void;
  onRecordingError?: (error: string) => void;
  existingStream?: MediaStream | null;
}

export function ScreenRecorder({
  onRecordingStart,
  onRecordingStop,
  onRecordingError,
  existingStream = null,
}: ScreenRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [hasStarted, setHasStarted] = useState(false); // Track if recording has been initiated
  const [isRecovering, setIsRecovering] = useState(false); // Track recovery attempts

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { callStatus } = usePathStore();

  const isDevelopment = process.env.NODE_ENV === "development";

  const startRecordingWithStream = useCallback(
    async (screenStream: MediaStream) => {
      if (isRecording || hasStarted) {
        if (isDevelopment) {
          console.log("Recording already in progress or already started");
        }
        return;
      }

      try {
        if (isDevelopment) {
          console.log("🎥 Starting recording with existing screen stream...");
        }

        // Validate stream is still active
        const videoTracks = screenStream.getVideoTracks();
        const audioTracks = screenStream.getAudioTracks();

        console.log("📺 Stream validation:", {
          videoTracks: videoTracks.length,
          audioTracks: audioTracks.length,
          videoEnabled: videoTracks[0]?.enabled,
          videoReadyState: videoTracks[0]?.readyState,
        });

        if (videoTracks.length === 0 || videoTracks[0].readyState === "ended") {
          throw new Error("Screen stream is no longer active");
        }

        // Simplified and reliable audio handling
        let finalAudioTrack: MediaStreamTrack | null = null;

        // Get microphone audio for voice capture with sync-optimized settings
        let micStream: MediaStream | null = null;
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: false, // Disable AGC to prevent audio artifacts
              sampleRate: 48000, // 48kHz for better quality and sync
              channelCount: 1, // Mono to prevent sync issues and reduce file size
            },
          });
          console.log(
            "✅ Microphone access granted with sync-optimized settings"
          );
        } catch {
          console.log("No microphone access, will try screen audio");
        }

        // Prioritize microphone audio over screen audio and prevent duplication
        const screenAudioTracks = screenStream.getAudioTracks();
        const micAudioTracks = micStream?.getAudioTracks() || [];

        // Stop all screen audio tracks to prevent duplication
        screenAudioTracks.forEach((track) => {
          track.stop();
          console.log("🔇 Stopped screen audio track to prevent duplication");
        });

        if (micAudioTracks.length > 0) {
          finalAudioTrack = micAudioTracks[0];
          console.log("✅ Using microphone audio only (no duplication)");
        } else {
          console.warn("⚠️ No microphone audio - video only recording");
          finalAudioTrack = null;
        }

        // Combine video with the final audio track
        const combinedTracks = [
          ...screenStream.getVideoTracks(),
          ...(finalAudioTrack ? [finalAudioTrack] : []),
        ];

        const combinedStream = new MediaStream(combinedTracks);
        streamRef.current = combinedStream;

        let options: MediaRecorderOptions = {};

        const mimeTypes = [
          "video/webm;codecs=h264", // H.264 in WebM container - best compatibility
          "video/webm;codecs=vp9", // VP9 codec - excellent compression
          "video/webm;codecs=vp8", // VP8 codec - wide compatibility
          "video/webm", // WebM fallback
          "video/mp4;codecs=h264", // MP4 fallback (rarely supported)
          "video/mp4", // MP4 fallback
        ];

        for (const mimeType of mimeTypes) {
          if (MediaRecorder.isTypeSupported(mimeType)) {
            options.mimeType = mimeType;
            if (isDevelopment) {
              console.log("✅ Using mimeType:", mimeType);
            }
            break;
          }
        }

        if (!options.mimeType) {
          throw new Error("No supported video codec found for recording");
        }

        // Sync-optimized bitrate settings for crisp screen recording without lag
        if (options.mimeType?.includes("h264")) {
          // H.264 codec - excellent browser compatibility and hardware acceleration
          options.videoBitsPerSecond = 3500000; // 3.5Mbps - balanced quality/performance
          options.audioBitsPerSecond = 96000; // 96Kbps - optimal for sync stability
        } else if (options.mimeType?.includes("vp9")) {
          // VP9 codec - excellent compression for screen content
          options.videoBitsPerSecond = 2800000; // 2.8Mbps - VP9 compresses efficiently
          options.audioBitsPerSecond = 96000; // 96Kbps - prevents sync drift
        } else if (options.mimeType?.includes("vp8")) {
          // VP8 codec - good compression
          options.videoBitsPerSecond = 3200000; // 3.2Mbps - balanced for VP8
          options.audioBitsPerSecond = 96000; // 96Kbps - sync-optimized
        } else if (options.mimeType?.includes("webm")) {
          // Generic WebM fallback
          options.videoBitsPerSecond = 2500000; // 2.5Mbps - stable fallback
          options.audioBitsPerSecond = 96000; // 96Kbps - reliable sync
        }

        // Set total bitrate and quality parameters
        if (options.videoBitsPerSecond && options.audioBitsPerSecond) {
          options.bitsPerSecond =
            options.videoBitsPerSecond + options.audioBitsPerSecond;
        }

        // Enhanced quality settings for crisp screen recording
        if (options.mimeType?.includes("h264")) {
          // Optimize H.264 for high-quality screen recording
          (options as any).videoKeyFrameIntervalDuration = 1000; // Keyframes every 1 second for better quality
        } else if (options.mimeType?.includes("webm")) {
          // Optimize WebM for high-quality screen recording
          (options as any).videoKeyFrameIntervalDuration = 500; // More frequent keyframes for crisp quality
        }

        console.log("📹 MediaRecorder options:", options);

        const mediaRecorder = new MediaRecorder(combinedStream, options);
        mediaRecorderRef.current = mediaRecorder;
        recordedChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (isDevelopment) {
            console.log(
              "📹 Data available event:",
              event.data.size,
              "bytes",
              "total chunks:",
              recordedChunksRef.current.length
            );
          }

          if (event.data && event.data.size > 0) {
            // Create a new Blob from the data to ensure it's properly stored
            const chunkBlob = new Blob([event.data], { type: event.data.type });
            recordedChunksRef.current.push(chunkBlob);

            if (isDevelopment) {
              const totalSize = recordedChunksRef.current.reduce(
                (sum, chunk) => sum + chunk.size,
                0
              );
              console.log(
                "✅ Added chunk, total size:",
                (totalSize / 1024 / 1024).toFixed(2),
                "MB"
              );

              // Memory management warning
              if (totalSize > 500 * 1024 * 1024) {
                // 500MB warning
                console.warn(
                  "⚠️ Large recording detected:",
                  (totalSize / 1024 / 1024).toFixed(2),
                  "MB"
                );
              }
            }
          } else {
            if (isDevelopment) {
              console.warn("⚠️ Received empty or invalid data chunk");
            }
          }

          // Validate stream is still active
          const videoTracks = screenStream.getVideoTracks();
          if (videoTracks.length > 0 && videoTracks[0].readyState === "ended") {
            console.warn(
              "⚠️ Video track ended during recording - this may cause corruption"
            );
          }
        };

        mediaRecorder.onstop = () => {
          const endTime = Date.now();
          const duration = recordingStartTimeRef.current
            ? (endTime - recordingStartTimeRef.current) / 1000
            : 0;

          console.log("🛑 CRITICAL: MediaRecorder.onstop fired!", {
            duration: `${duration.toFixed(1)}s`,
            callStatus,
            chunksCollected: recordedChunksRef.current.length,
            stackTrace: new Error().stack?.split("\n").slice(0, 5),
            timestamp: new Date().toISOString(),
          });

          // Validate chunks before creating blob
          const validChunks = recordedChunksRef.current.filter(
            (chunk) => chunk && chunk.size > 0
          );

          if (validChunks.length === 0) {
            console.error(
              "❌ Recording completed but no valid data chunks collected"
            );
            onRecordingError?.("Recording failed - no data collected");
            return;
          }

          // Create blob with proper MIME type matching the MediaRecorder
          const mimeType = options.mimeType || "video/webm";

          // Ensure chunks are properly ordered and complete
          const recordingBlob = new Blob(validChunks, {
            type: mimeType,
          });

          console.log("✅ Screen recording completed:", {
            size: recordingBlob.size,
            sizeMB: (recordingBlob.size / 1024 / 1024).toFixed(2),
            duration: `${duration.toFixed(1)}s`,
            chunks: validChunks.length,
            mimeType: mimeType,
            endTime: new Date().toISOString(),
            wasShortRecording: duration < 10,
          });

          // Enhanced blob validation for upload reliability
          if (recordingBlob.size > 0) {
            // Additional validation for minimum expected size (prevent tiny corrupted files)
            const minExpectedSize = duration * 50000; // ~50KB per second minimum (more lenient)
            if (recordingBlob.size < minExpectedSize && duration > 10) {
              console.warn(
                `⚠️ Recording size (${recordingBlob.size}) seems small for duration (${duration}s)`
              );
            }

            // Validate blob type matches expected format
            if (!recordingBlob.type || !recordingBlob.type.includes("video")) {
              console.warn(
                "⚠️ Blob type validation failed:",
                recordingBlob.type
              );
            }

            // Test blob readability before upload
            try {
              const testSlice = recordingBlob.slice(0, 100);
              if (testSlice.size === 0) {
                throw new Error("Blob slice test failed");
              }
              console.log("✅ Blob validation passed - ready for upload");
              onRecordingStop?.(recordingBlob);
            } catch (blobError) {
              console.error("❌ Blob validation failed:", blobError);
              onRecordingError?.(
                "Recording validation failed - corrupted file detected"
              );
            }
          } else {
            console.error("❌ Recording blob is empty after creation");
            onRecordingError?.("Recording failed - empty file created");
          }
        };

        mediaRecorder.onerror = (event) => {
          console.error("❌ MediaRecorder error:", event);
          onRecordingError?.("Recording failed");
          stopRecording(); // Error handler - fire and forget
        };

        mediaRecorder.onstart = () => {
          recordingStartTimeRef.current = Date.now();
          if (isDevelopment) {
            console.log(
              "🎬 MediaRecorder started successfully at",
              new Date().toISOString()
            );
          }

          // Gentle health monitoring (non-intrusive)
          healthCheckIntervalRef.current = setInterval(() => {
            const videoTracks = screenStream.getVideoTracks();
            if (videoTracks.length > 0) {
              const track = videoTracks[0];
              const duration = recordingStartTimeRef.current
                ? (Date.now() - recordingStartTimeRef.current) / 1000
                : 0;

              // Only log status, never interfere with recording
              if (
                isDevelopment &&
                Math.floor(duration) % 30 === 0 &&
                duration > 0
              ) {
                console.log(
                  `📹 Recording status: ${duration.toFixed(1)}s recorded`,
                  {
                    trackState: track.readyState,
                    mediaRecorderState: mediaRecorderRef.current?.state,
                    chunksCollected: recordedChunksRef.current.length,
                    callStatus,
                  }
                );
              }

              // Log track state changes but don't react to them
              if (track.readyState === "ended") {
                console.log(
                  "📊 Health check detected ended track - event listener will handle"
                );
              }
            }
          }, 10000); // Check every 10 seconds - less frequent to avoid interference
        };

        mediaRecorder.onpause = () => {
          console.log("⏸️ MediaRecorder paused");
        };

        mediaRecorder.onresume = () => {
          console.log("▶️ MediaRecorder resumed");
        };

        // Simplified and robust video track monitoring (NO PREMATURE STOPPING)
        const videoTrack = screenStream.getVideoTracks()[0];
        if (videoTrack) {
          console.log("🎯 Setting up video track monitoring:", {
            initialState: videoTrack.readyState,
            trackId: videoTrack.id,
            trackKind: videoTrack.kind,
          });

          videoTrack.addEventListener("ended", async () => {
            const duration = recordingStartTimeRef.current
              ? (Date.now() - recordingStartTimeRef.current) / 1000
              : 0;

            console.log("🚨 CRITICAL: Video track ended event fired!", {
              duration: `${duration.toFixed(1)}s`,
              callStatus,
              isRecovering,
              mediaRecorderState: mediaRecorderRef.current?.state,
              timestamp: new Date().toISOString(),
            });

            // If screen sharing ends for any reason, end the interview immediately
            console.log(
              "🛑 Screen sharing ended - ending interview immediately"
            );
            console.log("📊 Final recording state:", {
              duration,
              callStatus,
              recordingState: mediaRecorderRef.current?.state,
              chunksCollected: recordedChunksRef.current.length,
            });

            // Stop recording and end interview
            await stopRecording();

            // Trigger interview end through the store
            const { setCallStatus } = usePathStore.getState();
            setCallStatus("left");

            // Show message to user
            alert(
              "Interview ended: Screen sharing was stopped. The interview has been terminated."
            );
          });

          // Enhanced track event monitoring
          videoTrack.addEventListener("mute", () => {
            console.warn(
              "⚠️ Video track muted - screen sharing may be restricted"
            );
            // Don't stop recording on mute - just log it
          });

          videoTrack.addEventListener("unmute", () => {
            console.log("✅ Video track unmuted - screen sharing restored");
          });

          // Prevent track ending due to tab visibility changes
          const handleVisibilityChange = () => {
            if (document.hidden) {
              console.log("🕵️ Tab became hidden - maintaining recording");
            } else {
              console.log("✅ Tab became visible - recording continues");
            }
          };

          document.addEventListener("visibilitychange", handleVisibilityChange);

          // Monitor for browser-level interruptions
          window.addEventListener("beforeunload", (_e) => {
            if (mediaRecorderRef.current?.state === "recording") {
              console.warn(
                "⚠️ Page unloading during recording - attempting to save"
              );
              // Try to stop recording gracefully
              try {
                mediaRecorderRef.current.stop();
              } catch (error) {
                console.error(
                  "Error stopping recording on page unload:",
                  error
                );
              }
            }
          });
        }

        // Set states before starting to prevent multiple calls
        setIsRecording(true);
        setHasStarted(true);

        // Start recording with optimized settings for screen content
        console.log(
          "🚀 About to start MediaRecorder with optimized settings for screen recording..."
        );

        // Use 500ms chunks for optimal audio-video sync and data integrity
        mediaRecorder.start(500); // 500ms chunks - prevents sync drift and ensures complete data collection

        console.log(
          "✅ MediaRecorder.start() called, state:",
          mediaRecorder.state
        );
        onRecordingStart?.();

        console.log("🎥 Screen recording started successfully with audio");

        // Add a timeout to detect if recording fails to start
        setTimeout(() => {
          if (mediaRecorder.state !== "recording") {
            console.error(
              "❌ MediaRecorder failed to start recording after 1 second, state:",
              mediaRecorder.state
            );
            onRecordingError?.("Recording failed to start");
          }
        }, 1000);
      } catch (error) {
        console.error("❌ Error starting screen recording:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to start recording";
        onRecordingError?.(errorMessage);
      }
    },
    [isRecording, onRecordingStart, onRecordingStop, onRecordingError]
  );

  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current && isRecording) {
      const duration = recordingStartTimeRef.current
        ? (Date.now() - recordingStartTimeRef.current) / 1000
        : 0;

      if (isDevelopment) {
        console.log(
          `Screen recording stopping after ${duration.toFixed(1)} seconds`
        );
      }

      // Clear health check interval
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }

      // Ensure MediaRecorder is properly stopped and finalized
      try {
        if (mediaRecorderRef.current.state === "recording") {
          console.log("🔄 Stopping MediaRecorder and finalizing...");

          // Request final data collection BEFORE stopping to ensure complete recording
          try {
            mediaRecorderRef.current.requestData();
            // Longer delay to ensure all data is properly collected and processed
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (requestError) {
            console.warn("Could not request final data:", requestError);
          }

          // Now stop the recorder
          mediaRecorderRef.current.stop();
        } else if (mediaRecorderRef.current.state === "paused") {
          console.log("🔄 Resuming and stopping paused MediaRecorder...");
          mediaRecorderRef.current.resume();
          // Wait a bit longer to ensure resume happens
          setTimeout(() => {
            if (mediaRecorderRef.current?.state === "recording") {
              try {
                mediaRecorderRef.current.requestData();
              } catch (e) {
                console.warn("Could not request final data after resume:", e);
              }
              setTimeout(() => {
                if (mediaRecorderRef.current?.state === "recording") {
                  mediaRecorderRef.current.stop();
                }
              }, 100);
            }
          }, 200);
        } else {
          console.log(
            "🔄 MediaRecorder already in state:",
            mediaRecorderRef.current.state
          );
        }
      } catch (error) {
        console.error("Error stopping MediaRecorder:", error);
      }

      setIsRecording(false);
      setHasStarted(false); // Reset state
      setIsRecovering(false); // Reset recovery state

      // Stop all tracks after a brief delay to allow MediaRecorder to finalize
      setTimeout(() => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      }, 100);

      if (isDevelopment) {
        console.log("Screen recording stopped and finalized");
      }
    }
  }, [isRecording, isDevelopment]);

  // Start recording immediately when existing stream is provided
  useEffect(() => {
    const shouldSkipRecording =
      isDevelopment && process.env.NEXT_PUBLIC_SKIP_RECORDING === "true";

    if (existingStream && !isRecording && !hasStarted && !shouldSkipRecording) {
      console.log("🎥 Starting recording with provided stream...");
      startRecordingWithStream(existingStream);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingStream]); // Only depend on existingStream to prevent infinite loops

  // Auto-stop recording ONLY when call definitively ends
  useEffect(() => {
    const currentDuration = recordingStartTimeRef.current
      ? (Date.now() - recordingStartTimeRef.current) / 1000
      : 0;

    if (isDevelopment) {
      console.log("🔍 Call status effect triggered:", {
        callStatus,
        isRecording,
        duration: `${currentDuration.toFixed(1)}s`,
        chunksCollected: recordedChunksRef.current.length,
        timestamp: new Date().toISOString(),
      });
    }

    // Handle both 'leaving' and 'left' statuses to ensure recording stops and uploads
    if (
      (callStatus === "leaving" || callStatus === "left") &&
      isRecording &&
      hasStarted
    ) {
      console.log(
        `✅ Call end detected (${callStatus}) - stopping recording to ensure upload`
      );
      console.log("📊 Final recording stats:", {
        duration: `${currentDuration.toFixed(1)}s`,
        chunks: recordedChunksRef.current.length,
        totalSize: recordedChunksRef.current.reduce(
          (sum, chunk) => sum + chunk.size,
          0
        ),
      });

      // Set hasStarted to false to prevent multiple stop attempts
      setHasStarted(false);

      // Immediate stop for 'leaving' status, short delay for 'left'
      const delay = callStatus === "leaving" ? 500 : 1000;
      setTimeout(() => {
        console.log(`🔚 Executing recording stop (${callStatus})...`);
        stopRecording(); // This triggers upload via onRecordingStop callback
      }, delay);
    } else if (
      isRecording &&
      !["leaving", "left"].includes(callStatus) &&
      isDevelopment
    ) {
      console.log(
        `📝 Recording continues - call status "${callStatus}" is not a stop condition`
      );
    }
  }, [callStatus, isRecording, stopRecording, hasStarted, isDevelopment]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (isDevelopment) {
        console.log("🧹 ScreenRecorder component unmounting - cleaning up...");
      }

      // Clear health check interval
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isDevelopment]); // No dependencies - only run on unmount

  // Silent background recording - no UI shown to candidate
  return null;
}

export default ScreenRecorder;
