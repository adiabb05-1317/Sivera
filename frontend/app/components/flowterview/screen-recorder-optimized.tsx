"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import usePathStore from "@/app/store/PathStore";
import { toast } from "sonner";
import fixWebmDuration from "fix-webm-duration";

// Global flag to prevent multiple recordings across component instances
let globalRecordingStarted = false;

interface ScreenRecorderProps {
  onRecordingStart?: () => void;
  onRecordingStop?: (recordingBlob: Blob) => void;
  onRecordingError?: (error: string) => void;
  existingStream?: MediaStream | null;
}

interface RecordingConfig {
  videoBitrate: number;
  audioBitrate: number;
  frameRate: number;
  keyFrameInterval: number;
  mimeType: string;
}

// Production-optimized recording configurations
const RECORDING_CONFIGS: Record<string, RecordingConfig> = {
  high: {
    videoBitrate: 5000000, // 5 Mbps for crisp quality
    audioBitrate: 128000, // 128 kbps for clear audio
    frameRate: 30,
    keyFrameInterval: 1000, // Keyframe every second
    mimeType: "video/webm;codecs=vp9,opus", // VP9 + Opus for best quality
  },
  medium: {
    videoBitrate: 3500000, // 3.5 Mbps balanced
    audioBitrate: 96000, // 96 kbps
    frameRate: 25,
    keyFrameInterval: 2000,
    mimeType: "video/webm;codecs=vp8,opus", // VP8 + Opus
  },
  fallback: {
    videoBitrate: 2500000, // 2.5 Mbps conservative
    audioBitrate: 64000, // 64 kbps
    frameRate: 20,
    keyFrameInterval: 3000,
    mimeType: "video/webm", // Generic WebM
  },
};

export function ScreenRecorderOptimized({
  onRecordingStart,
  onRecordingStop,
  onRecordingError,
  existingStream = null,
}: ScreenRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [recordingHealth, setRecordingHealth] = useState<"healthy" | "warning" | "error">("healthy");
  const hasUploadedRef = useRef(false); // Prevent multiple uploads
  const isStoppingRef = useRef(false); // Prevent multiple stop calls
  const startAttemptedRef = useRef(false); // Prevent multiple start attempts

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const chunkBufferRef = useRef<Blob[]>([]);
  const uploadQueueRef = useRef<Blob[]>([]);
  const lastChunkTimeRef = useRef<number>(0);

  const { callStatus } = usePathStore();
  const isDevelopment = process.env.NODE_ENV === "development";

  // Enhanced MIME type detection with codec validation
  const getBestMimeType = useCallback((): RecordingConfig => {
    const mimeTypesToTest = [
      { type: "video/webm;codecs=vp9,opus", config: "high" },
      { type: "video/webm;codecs=h264,opus", config: "high" },
      { type: "video/webm;codecs=vp8,opus", config: "medium" },
      { type: "video/webm;codecs=vp8", config: "medium" },
      { type: "video/webm", config: "fallback" },
    ];

    for (const { type, config } of mimeTypesToTest) {
      if (MediaRecorder.isTypeSupported(type)) {
        const recordingConfig = RECORDING_CONFIGS[config];
        return { ...recordingConfig, mimeType: type };
      }
    }

    return RECORDING_CONFIGS.fallback;
  }, []);

  // Optimized audio configuration for production
  const getOptimizedAudioConstraints = useCallback(() => ({
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 2, // Stereo for better quality
    sampleSize: 16,
    latency: 0.02, // 20ms latency for better sync
  }), []);

  // Enhanced chunk validation and processing
  const processChunk = useCallback((chunk: Blob): boolean => {
    if (!chunk || chunk.size === 0) {
      return false;
    }

    // Validate chunk integrity
    if (chunk.size < 100) {
      return false;
    }

    // Buffer management to prevent memory issues
    const MAX_BUFFER_SIZE = 500 * 1024 * 1024; // 500MB max
    const currentBufferSize = recordedChunksRef.current.reduce((sum, c) => sum + c.size, 0);
    
    if (currentBufferSize + chunk.size > MAX_BUFFER_SIZE) {
      return false;
    }

    return true;
  }, []);

  // Production-ready recording start with enhanced error handling
  const startRecordingWithStream = useCallback(
    async (screenStream: MediaStream) => {
      // Check global flag first
      if (globalRecordingStarted) {
        console.log("Global recording already started, skipping");
        return;
      }

      // Check all conditions that would prevent starting
      if (isRecording || hasStarted || startAttemptedRef.current) {
        console.log("Recording already in progress or attempted, skipping duplicate start");
        return;
      }

      // Prevent multiple recorder instances
      if (mediaRecorderRef.current?.state === "recording") {
        console.log("MediaRecorder already recording, skipping");
        return;
      }

      // Mark globally and locally that we're attempting to start
      globalRecordingStarted = true;
      startAttemptedRef.current = true;

      try {
        // Validate and enhance video stream
        const videoTracks = screenStream.getVideoTracks();
        if (videoTracks.length === 0) {
          throw new Error("No video tracks in stream");
        }

        const videoTrack = videoTracks[0];
        const videoSettings = videoTrack.getSettings();

        // Apply video enhancements
        if (videoTrack.applyConstraints) {
          try {
            await videoTrack.applyConstraints({
              width: { ideal: videoSettings.width || 1920 },
              height: { ideal: videoSettings.height || 1080 },
              frameRate: { ideal: 30, max: 60 },
            });
          } catch (e) {
            // Could not apply video constraints
          }
        }

        // Get optimized audio stream
        let audioStream: MediaStream | null = null;
        try {
          audioStream = await navigator.mediaDevices.getUserMedia({
            audio: getOptimizedAudioConstraints(),
            video: false,
          });
        } catch (audioError) {
          // No microphone access, recording video only
        }

        // Create combined stream with production settings
        const tracks: MediaStreamTrack[] = [...videoTracks];
        if (audioStream) {
          const audioTracks = audioStream.getAudioTracks();
          if (audioTracks.length > 0) {
            tracks.push(audioTracks[0]);
            
            // Stop screen audio to prevent echo
            screenStream.getAudioTracks().forEach(track => {
              track.stop();
            });
          }
        }

        const combinedStream = new MediaStream(tracks);
        streamRef.current = combinedStream;

        // Get optimized recording configuration
        const recordingConfig = getBestMimeType();

        // Create MediaRecorder with production settings
        const options: MediaRecorderOptions = {
          mimeType: recordingConfig.mimeType,
          videoBitsPerSecond: recordingConfig.videoBitrate,
          audioBitsPerSecond: audioStream ? recordingConfig.audioBitrate : undefined,
        };

        const mediaRecorder = new MediaRecorder(combinedStream, options);
        mediaRecorderRef.current = mediaRecorder;
        recordedChunksRef.current = [];
        chunkBufferRef.current = [];

        // Enhanced data handler with validation
        mediaRecorder.ondataavailable = (event) => {
          const now = Date.now();
          const timeSinceLastChunk = now - lastChunkTimeRef.current;
          lastChunkTimeRef.current = now;

          if (event.data && event.data.size > 0) {
            if (processChunk(event.data)) {
              // Clone the blob to ensure data integrity
              const chunkBlob = new Blob([event.data], { type: event.data.type });
              recordedChunksRef.current.push(chunkBlob);
              chunkBufferRef.current.push(chunkBlob);

              // Health monitoring
              if (timeSinceLastChunk > 2000 && recordedChunksRef.current.length > 1) {
                setRecordingHealth("warning");
              } else {
                setRecordingHealth("healthy");
              }
            }
          }
        };

        // Production-ready stop handler with validation
        mediaRecorder.onstop = async () => {
          // Prevent multiple uploads
          if (hasUploadedRef.current) {
            console.log("Upload already triggered, skipping duplicate");
            return;
          }

          const endTime = Date.now();
          const duration = recordingStartTimeRef.current
            ? (endTime - recordingStartTimeRef.current) / 1000
            : 0;

          // Validate recording before creating final blob
          if (recordedChunksRef.current.length === 0) {
            onRecordingError?.("Recording failed - no data captured");
            return;
          }

          // Create final blob with proper MIME type
          const finalMimeType = options.mimeType || "video/webm";
          const recordingBlob = new Blob(recordedChunksRef.current, {
            type: finalMimeType,
          });

          // Validate final blob
          if (recordingBlob.size === 0) {
            onRecordingError?.("Recording failed - empty file");
            return;
          }

          // Validate reasonable size (at least 10KB per second)
          const minExpectedSize = duration * 10000;
          if (recordingBlob.size < minExpectedSize && duration > 5) {
            console.warn(`Recording seems small: ${recordingBlob.size} bytes for ${duration}s`);
          }

          try {
            // Fix WebM duration metadata
            console.log(`🔧 Fixing WebM duration metadata (${duration.toFixed(1)}s)`);
            const durationMs = Math.round(duration * 1000);
            
            const fixedBlob = await fixWebmDuration(recordingBlob, durationMs, {
              logger: isDevelopment ? console.log : false
            });
            
            console.log("✅ WebM duration metadata fixed successfully");
            
            // Mark as uploaded before triggering callback
            hasUploadedRef.current = true;
            onRecordingStop?.(fixedBlob);
          } catch (error) {
            console.error("Failed to fix WebM duration, using original blob:", error);
            // Fallback to original blob if fixing fails
            hasUploadedRef.current = true;
            onRecordingStop?.(recordingBlob);
          }
        };

        // Enhanced error handler
        mediaRecorder.onerror = (event: Event) => {
          const error = event as ErrorEvent;
          setRecordingHealth("error");
          onRecordingError?.(`Recording error: ${error.message || "Unknown error"}`);
          stopRecording();
        };

        // Start handler with health check
        mediaRecorder.onstart = () => {
          recordingStartTimeRef.current = Date.now();
          lastChunkTimeRef.current = Date.now();
          setRecordingHealth("healthy");
        };

        // Monitor video track for unexpected ending
        videoTrack.addEventListener("ended", () => {
          if (mediaRecorderRef.current?.state === "recording") {
            stopRecording();
          }
        });

        // Start recording with optimal chunk size
        setIsRecording(true);
        setHasStarted(true);
        
        console.log("🎬 Starting MediaRecorder with 1-second chunks");
        // 1 second chunks for optimal balance between latency and efficiency
        mediaRecorder.start(1000);
        
        onRecordingStart?.();
        console.log("✅ Recording started successfully");

        // Verify recording actually started
        setTimeout(() => {
          if (mediaRecorder.state !== "recording") {
            onRecordingError?.("Recording failed to start");
            setIsRecording(false);
            setHasStarted(false);
          }
        }, 1000);

      } catch (error) {
        console.error("Failed to start recording:", error);
        setIsRecording(false);
        setHasStarted(false);
        // Reset flags on error
        globalRecordingStarted = false;
        startAttemptedRef.current = false;
        const errorMessage = error instanceof Error ? error.message : "Failed to start recording";
        onRecordingError?.(errorMessage);
      }
    },
    [isRecording, hasStarted, onRecordingStart, onRecordingStop, onRecordingError, getBestMimeType, getOptimizedAudioConstraints, processChunk, isDevelopment]
  );

  // Enhanced stop recording with proper cleanup
  const stopRecording = useCallback(async () => {
    // Check if already stopping
    if (isStoppingRef.current) {
      console.log("Already stopping recording, skipping duplicate call");
      return;
    }

    if (!mediaRecorderRef.current || !isRecording) {
      console.log("Recording already stopped or not started");
      return;
    }

    // Mark as stopping to prevent multiple calls
    isStoppingRef.current = true;

    // Immediately set to false to prevent multiple calls
    setIsRecording(false);
    setHasStarted(false);

    const duration = recordingStartTimeRef.current
      ? (Date.now() - recordingStartTimeRef.current) / 1000
      : 0;

    console.log(`🛑 Stopping recording after ${duration.toFixed(1)}s`);

    try {
      // Request final data before stopping
      if (mediaRecorderRef.current.state === "recording") {
        try {
          mediaRecorderRef.current.requestData();
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (e) {
          // Could not request final data
        }

        mediaRecorderRef.current.stop();
      } else if (mediaRecorderRef.current.state === "paused") {
        mediaRecorderRef.current.resume();
        await new Promise(resolve => setTimeout(resolve, 100));
        if (mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }
    } catch (error) {
      // Error stopping recorder
    }

    setRecordingHealth("healthy");

    // Cleanup streams
    setTimeout(() => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }, 100);

  }, [isRecording]);

  // Start recording when stream is provided
  useEffect(() => {
    if (existingStream && !isRecording && !hasStarted) {
      const shouldSkip = isDevelopment && process.env.NEXT_PUBLIC_SKIP_RECORDING === "true";
      if (!shouldSkip) {
        startRecordingWithStream(existingStream);
      }
    }
  }, [existingStream, isRecording, hasStarted, startRecordingWithStream, isDevelopment]);

  // Handle call status changes
  useEffect(() => {
    if ((callStatus === "leaving" || callStatus === "left") && isRecording && hasStarted) {
      console.log(`Call ending (${callStatus}) - stopping recording once`);
      // Add small delay to capture final moments
      const delay = callStatus === "leaving" ? 1000 : 500;
      setTimeout(() => {
        stopRecording();
      }, delay);
    }
  }, [callStatus, isRecording, hasStarted, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("🧹 Cleaning up screen recorder");
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      // Reset global flag on cleanup
      globalRecordingStarted = false;
    };
  }, []);

  return null;
}

export default ScreenRecorderOptimized;