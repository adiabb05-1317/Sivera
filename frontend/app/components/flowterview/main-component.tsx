"use client";

import AudioClient from "./audio-client";
import Presentation from "./presentation-layer";
import ScreenRecorderOptimized from "./screen-recorder-optimized";
import RecordingPermission from "./recording-permission";
import usePathStore from "@/app/store/PathStore";
import useEnhancedS3Upload from "@/app/hooks/useEnhancedS3Upload";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";

export default function FlowterviewComponent() {
  const { setCurrentBotTranscript, isHeaderVisible, jobId, candidateId } =
    usePathStore();
  const { 
    uploadRecording, 
    isUploading, 
    uploadProgress, 
    uploadError,
    retryUpload,
    cancelUpload 
  } = useEnhancedS3Upload();
  
  const [recordingPermissionGranted, setRecordingPermissionGranted] =
    useState(false);
  const [activeScreenStream, setActiveScreenStream] =
    useState<MediaStream | null>(null);
  const [isProcessingLargeFile, setIsProcessingLargeFile] = useState(false);
  
  // Track upload retry attempts
  const uploadRetryCountRef = useRef(0);
  const MAX_UPLOAD_RETRIES = 3;

  // Skip permission screen in development
  const isDevelopment = process.env.NODE_ENV === "development";

  const handleClearTranscripts = () => {
    setCurrentBotTranscript("");
  };

  const handleRecordingStart = (): void => {
    // Silent recording - no UI notification
  };

  const handleRecordingStop = useCallback(async (recordingBlob: Blob, isRetry: boolean = false) => {
    const sizeMB = recordingBlob.size / (1024 * 1024);

    // Validation
    if (recordingBlob.size === 0) {
      return;
    }

    // Handle large files with special care
    const LARGE_FILE_THRESHOLD = 100; // 100MB
    if (sizeMB > LARGE_FILE_THRESHOLD) {
      setIsProcessingLargeFile(true);
    }

    // Reset retry counter only for new uploads, not retries
    if (!isRetry) {
      uploadRetryCountRef.current = 0;
    }

    try {
      await uploadRecording(recordingBlob);
      
      // Silent upload - no UI notification
      
    } catch (error) {
      // Disable auto-retry to prevent multiple uploads
      console.error("Upload failed:", error);
      // Don't retry automatically - this was causing multiple uploads
    } finally {
      setIsProcessingLargeFile(false);
    }
  }, [uploadRecording, retryUpload, cancelUpload, jobId, candidateId, isDevelopment]);

  const handleRecordingError = useCallback((error: string) => {
    // Log error but don't show UI
  }, []);

  const handlePermissionGranted = useCallback((screenStream: MediaStream) => {
    // Prevent setting stream multiple times
    if (activeScreenStream) {
      console.log("Screen stream already set, ignoring duplicate");
      return;
    }
    console.log("Setting screen stream and permission granted");
    setRecordingPermissionGranted(true);
    setActiveScreenStream(screenStream);
  }, [activeScreenStream]);

  const handlePermissionDenied = useCallback(() => {
    // Log but don't show UI
  }, []);

  // Only skip recording entirely if explicitly set
  const shouldSkipRecording =
    isDevelopment && process.env.NEXT_PUBLIC_SKIP_RECORDING === "true";

  // Show permission screen first (unless skipping recording entirely)
  if (!recordingPermissionGranted && !shouldSkipRecording) {
    return (
      <RecordingPermission
        onPermissionGranted={handlePermissionGranted}
        onPermissionDenied={handlePermissionDenied}
      />
    );
  }

  return (
    <main className="h-full w-full bg-[--meet-background] dark:bg-[--meet-background] relative overflow-hidden">
      {/* Hidden Recording Component - Optimized Version */}
      <ScreenRecorderOptimized
        onRecordingStart={handleRecordingStart}
        onRecordingStop={handleRecordingStop}
        onRecordingError={handleRecordingError}
        existingStream={activeScreenStream}
      />
      
      {/* Hidden upload progress tracking in console only */}
      
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-app-blue-800/40 via-app-blue-700/30 to-[#232336]/80 dark:from-app-blue-900/60 dark:via-[#292a3a]/60 dark:to-[#232336]/90 backdrop-blur-2xl" />
      <div className="h-full">
        <AudioClient onClearTranscripts={handleClearTranscripts} />
        <Presentation />
      </div>
    </main>
  );
}
