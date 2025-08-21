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
  const [hasUploadedRef] = useState({ current: false }); // Prevent multiple uploads

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
        return;
      }

      try {
        // Validate stream is still active
        const videoTracks = screenStream.getVideoTracks();
        const audioTracks = screenStream.getAudioTracks();

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
        } catch {
          // No microphone access, will try screen audio
        }

        // Prioritize microphone audio over screen audio and prevent duplication
        const screenAudioTracks = screenStream.getAudioTracks();
        const micAudioTracks = micStream?.getAudioTracks() || [];

        // Stop all screen audio tracks to prevent duplication
        screenAudioTracks.forEach((track) => {
          track.stop();
        });

        if (micAudioTracks.length > 0) {
          finalAudioTrack = micAudioTracks[0];
        } else {
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

        const mediaRecorder = new MediaRecorder(combinedStream, options);
        mediaRecorderRef.current = mediaRecorder;
        recordedChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            // Create a new Blob from the data to ensure it's properly stored
            const chunkBlob = new Blob([event.data], { type: event.data.type });
            recordedChunksRef.current.push(chunkBlob);
          }

          // Validate stream is still active
          const videoTracks = screenStream.getVideoTracks();
          if (videoTracks.length > 0 && videoTracks[0].readyState === "ended") {
            // Video track ended during recording - this may cause corruption
          }
        };

        mediaRecorder.onstop = () => {
          // Prevent multiple uploads
          if (hasUploadedRef.current) {
            console.log("Upload already triggered, skipping duplicate");
            return;
          }

          const endTime = Date.now();
          const duration = recordingStartTimeRef.current
            ? (endTime - recordingStartTimeRef.current) / 1000
            : 0;

          // Validate chunks before creating blob
          const validChunks = recordedChunksRef.current.filter(
            (chunk) => chunk && chunk.size > 0
          );

          if (validChunks.length === 0) {
            onRecordingError?.("Recording failed - no data collected");
            return;
          }

          // Create blob with proper MIME type matching the MediaRecorder
          const mimeType = options.mimeType || "video/webm";

          // Ensure chunks are properly ordered and complete
          const recordingBlob = new Blob(validChunks, {
            type: mimeType,
          });

          // Enhanced blob validation for upload reliability
          if (recordingBlob.size > 0) {
            // Additional validation for minimum expected size (prevent tiny corrupted files)
            const minExpectedSize = duration * 50000; // ~50KB per second minimum (more lenient)
            if (recordingBlob.size < minExpectedSize && duration > 10) {
              // Recording size seems small for duration
            }

            // Validate blob type matches expected format
            if (!recordingBlob.type || !recordingBlob.type.includes("video")) {
              // Blob type validation failed
            }

            // Test blob readability before upload
            try {
              const testSlice = recordingBlob.slice(0, 100);
              if (testSlice.size === 0) {
                throw new Error("Blob slice test failed");
              }
              
              // Mark as uploaded before triggering callback
              hasUploadedRef.current = true;
              onRecordingStop?.(recordingBlob);
            } catch (blobError) {
              onRecordingError?.(
                "Recording validation failed - corrupted file detected"
              );
            }
          } else {
            onRecordingError?.("Recording failed - empty file created");
          }
        };

        mediaRecorder.onerror = (event) => {
          onRecordingError?.("Recording failed");
          stopRecording(); // Error handler - fire and forget
        };

        mediaRecorder.onstart = () => {
          recordingStartTimeRef.current = Date.now();

          // Gentle health monitoring (non-intrusive)
          healthCheckIntervalRef.current = setInterval(() => {
            const videoTracks = screenStream.getVideoTracks();
            if (videoTracks.length > 0) {
              const track = videoTracks[0];
              const duration = recordingStartTimeRef.current
                ? (Date.now() - recordingStartTimeRef.current) / 1000
                : 0;

              // Log track state changes but don't react to them
              if (track.readyState === "ended") {
                // Health check detected ended track - event listener will handle
              }
            }
          }, 10000); // Check every 10 seconds - less frequent to avoid interference
        };

        mediaRecorder.onpause = () => {
          // MediaRecorder paused
        };

        mediaRecorder.onresume = () => {
          // MediaRecorder resumed
        };

        // Simplified and robust video track monitoring (NO PREMATURE STOPPING)
        const videoTrack = screenStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.addEventListener("ended", async () => {
            const duration = recordingStartTimeRef.current
              ? (Date.now() - recordingStartTimeRef.current) / 1000
              : 0;

            // If screen sharing ends for any reason, end the interview immediately
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
            // Video track muted - screen sharing may be restricted
            // Don't stop recording on mute - just log it
          });

          videoTrack.addEventListener("unmute", () => {
            // Video track unmuted - screen sharing restored
          });

          // Prevent track ending due to tab visibility changes
          const handleVisibilityChange = () => {
            if (document.hidden) {
              // Tab became hidden - maintaining recording
            } else {
              // Tab became visible - recording continues
            }
          };

          document.addEventListener("visibilitychange", handleVisibilityChange);

          // Monitor for browser-level interruptions
          window.addEventListener("beforeunload", (_e) => {
            if (mediaRecorderRef.current?.state === "recording") {
              // Try to stop recording gracefully
              try {
                mediaRecorderRef.current.stop();
              } catch (error) {
                // Error stopping recording on page unload
              }
            }
          });
        }

        // Set states before starting to prevent multiple calls
        setIsRecording(true);
        setHasStarted(true);

        // Start recording with optimized settings for screen content
        // Use 500ms chunks for optimal audio-video sync and data integrity
        mediaRecorder.start(500); // 500ms chunks - prevents sync drift and ensures complete data collection

        onRecordingStart?.();

        // Add a timeout to detect if recording fails to start
        setTimeout(() => {
          if (mediaRecorder.state !== "recording") {
            onRecordingError?.("Recording failed to start");
          }
        }, 1000);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to start recording";
        onRecordingError?.(errorMessage);
      }
    },
    [isRecording, onRecordingStart, onRecordingStop, onRecordingError]
  );

  const stopRecording = useCallback(async () => {
    // Prevent multiple stop calls
    if (!mediaRecorderRef.current || !isRecording) {
      console.log("Recording already stopped or not started");
      return;
    }
    
    // Immediately set to false to prevent multiple calls
    setIsRecording(false);
    setHasStarted(false);
    
    const duration = recordingStartTimeRef.current
      ? (Date.now() - recordingStartTimeRef.current) / 1000
      : 0;

      // Clear health check interval
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }

      // Ensure MediaRecorder is properly stopped and finalized
      try {
        if (mediaRecorderRef.current.state === "recording") {
          // Request final data collection BEFORE stopping to ensure complete recording
          try {
            mediaRecorderRef.current.requestData();
            // Longer delay to ensure all data is properly collected and processed
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (requestError) {
            // Could not request final data
          }

          // Now stop the recorder
          mediaRecorderRef.current.stop();
        } else if (mediaRecorderRef.current.state === "paused") {
          mediaRecorderRef.current.resume();
          // Wait a bit longer to ensure resume happens
          setTimeout(() => {
            if (mediaRecorderRef.current?.state === "recording") {
              try {
                mediaRecorderRef.current.requestData();
              } catch (e) {
                // Could not request final data after resume
              }
              setTimeout(() => {
                if (mediaRecorderRef.current?.state === "recording") {
                  mediaRecorderRef.current.stop();
                }
              }, 100);
            }
          }, 200);
        } else {
          // MediaRecorder already in state
        }
      } catch (error) {
        // Error stopping MediaRecorder
      }

      setIsRecovering(false); // Reset recovery state

      // Stop all tracks after a brief delay to allow MediaRecorder to finalize
      setTimeout(() => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      }, 100);
    }
  }, [isRecording, isDevelopment]);

  // Start recording immediately when existing stream is provided
  useEffect(() => {
    const shouldSkipRecording =
      isDevelopment && process.env.NEXT_PUBLIC_SKIP_RECORDING === "true";

    if (existingStream && !isRecording && !hasStarted && !shouldSkipRecording) {
      startRecordingWithStream(existingStream);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingStream]); // Only depend on existingStream to prevent infinite loops

  // Auto-stop recording ONLY when call definitively ends
  useEffect(() => {
    // Handle both 'leaving' and 'left' statuses to ensure recording stops and uploads
    if (
      (callStatus === "leaving" || callStatus === "left") &&
      isRecording &&
      hasStarted
    ) {
      console.log(`Call ending (${callStatus}) - stopping recording once`);
      
      // Immediate stop for 'leaving' status, short delay for 'left'
      const delay = callStatus === "leaving" ? 500 : 1000;
      setTimeout(() => {
        stopRecording(); // This triggers upload via onRecordingStop callback
      }, delay);
    }
  }, [callStatus, isRecording, stopRecording, hasStarted]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
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
