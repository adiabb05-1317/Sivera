"use client";

import AudioClient from "./audio-client";
import Presentation from "./presentation-layer";
import ScreenRecorder from "./screen-recorder";
import RecordingPermission from "./recording-permission";
import usePathStore from "@/app/store/PathStore";
import useRecordingUpload from "@/app/hooks/useRecordingUpload";
import { useState } from "react";

export default function FlowterviewComponent() {
  const { setCurrentBotTranscript, isHeaderVisible } = usePathStore();
  const { uploadRecording, isUploading, uploadProgress, uploadError } =
    useRecordingUpload();
  const [recordingPermissionGranted, setRecordingPermissionGranted] =
    useState(false);
  const [showPermissionError, setShowPermissionError] = useState(false);
  const [activeScreenStream, setActiveScreenStream] =
    useState<MediaStream | null>(null);

  // Skip permission screen in development
  const isDevelopment = process.env.NODE_ENV === "development";

  const handleClearTranscripts = () => {
    setCurrentBotTranscript("");
  };

  const handleRecordingStart = () => {
    console.log("Recording started");
  };

  const handleRecordingStop = async (recordingBlob: Blob) => {
    console.log(
      "🎥 Recording stopped, starting upload...",
      recordingBlob.size,
      "bytes"
    );

    if (recordingBlob.size === 0) {
      console.error("Recording blob is empty, skipping upload");
      return;
    }

    try {
      console.log("📤 Uploading recording to backend...");
      await uploadRecording(recordingBlob);
      console.log("✅ Recording uploaded successfully!");
    } catch (error) {
      console.error("❌ Failed to upload recording:", error);
      // You might want to retry or show user notification here
    }
  };

  const handleRecordingError = (error: string) => {
    console.error("Recording error:", error);
  };

  const handlePermissionGranted = (screenStream: MediaStream) => {
    console.log("🎥 Permission granted with stream:", {
      videoTracks: screenStream.getVideoTracks().length,
      audioTracks: screenStream.getAudioTracks().length,
      streamId: screenStream.id,
    });

    setRecordingPermissionGranted(true);
    setShowPermissionError(false);
    setActiveScreenStream(screenStream);
    console.log("🎥 Screen recording will start with provided stream");
  };

  const handlePermissionDenied = () => {
    setShowPermissionError(true);
  };

  // Debug logging
  console.log("FlowterviewComponent state:", {
    recordingPermissionGranted,
    isDevelopment,
    showPermissionError,
    nodeEnv: process.env.NODE_ENV,
  });

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

  // Show error if permission denied
  if (showPermissionError) {
    return (
      <main className="flex h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-app-blue-50 to-white dark:from-[#101624] dark:to-[#23304a]">
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-xl font-bold text-red-600 dark:text-red-400">
            Screen Recording Required
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-2 text-center max-w-md">
            Screen recording permission is required to participate in this
            interview. Please refresh the page and grant permission to continue.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="h-full w-full bg-[--meet-background] dark:bg-[--meet-background] relative overflow-hidden">
      <header
        className={`flex items-center justify-between px-8 py-4 sticky top-0 z-50 transition-all duration-300 shadow-lg
          bg-gradient-to-r from-app-blue-50/95 to-white/95 dark:bg-gradient-to-r dark:from-app-blue-900/40 dark:to-app-blue-900/80 backdrop-blur-xl
        ${isHeaderVisible ? "translate-y-0" : "-translate-y-full"}`}
      >
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-app-blue-500/20 blur-md"></div>
          </div>
          <h1
            className="text-lg font-semibold tracking-widest hidden sm:block text-app-blue-800 dark:text-app-blue-200 drop-shadow-sm"
            style={{
              fontFamily: "KyivType Sans",
            }}
          >
            SIVERA
          </h1>
        </div>

        {/* Recording Controls and Status */}
        <div className="absolute top-4 right-4 z-50">
          <ScreenRecorder
            onRecordingStart={handleRecordingStart}
            onRecordingStop={handleRecordingStop}
            onRecordingError={handleRecordingError}
            existingStream={activeScreenStream}
          />

          {/* Upload Progress */}
          {(isUploading || uploadProgress) && (
            <div className="mt-2 p-2 bg-black/40 rounded-lg backdrop-blur-sm text-white text-sm">
              {isUploading && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Uploading recording...</span>
                  {uploadProgress && (
                    <span className="font-mono">
                      {uploadProgress.percentage}%
                    </span>
                  )}
                </div>
              )}
              {uploadProgress && uploadProgress.percentage === 100 && (
                <div className="flex items-center gap-2 text-green-400">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span>Upload complete!</span>
                </div>
              )}
            </div>
          )}

          {/* Upload Error */}
          {uploadError && (
            <div className="mt-0 p-2 bg-red-500/20 border border-red-500/50 rounded-lg backdrop-blur-sm text-sm">
              Upload failed: {uploadError}
            </div>
          )}
        </div>
      </header>
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-app-blue-800/40 via-app-blue-700/30 to-[#232336]/80 dark:from-app-blue-900/60 dark:via-[#292a3a]/60 dark:to-[#232336]/90 backdrop-blur-2xl" />
      <div className="h-[calc(100%-64px)]">
        <AudioClient onClearTranscripts={handleClearTranscripts} />
        <Presentation />
      </div>
    </main>
  );
}
