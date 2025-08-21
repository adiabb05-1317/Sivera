"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Video } from "lucide-react";
import { toast } from "sonner";
interface RecordingPermissionProps {
  onPermissionGranted: (screenStream: MediaStream) => void;
  onPermissionDenied: () => void;
}

export function RecordingPermission({
  onPermissionGranted,
  onPermissionDenied,
}: RecordingPermissionProps) {
  const [isGranting, setIsGranting] = useState(false);

  const validateScreenSelection = (stream: MediaStream): boolean => {
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return false;

    const settings = videoTrack.getSettings();

    // Check if it's entire screen (not window or tab)
    const isLikelyEntireScreen = Boolean(
      settings.width &&
        settings.height &&
        (settings.width >= 1920 || settings.height >= 1080)
    );

    // Check the display surface (if available)
    const displaySurface = (settings as any).displaySurface;
    if (displaySurface && displaySurface !== "monitor") {
      return false; // Must be monitor (entire screen), not window or browser
    }

    return isLikelyEntireScreen;
  };

  const handleGrantPermission = async () => {
    if (isGranting) return; // Prevent multiple clicks

    setIsGranting(true);

    try {
      // Check if getDisplayMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error("Screen sharing is not supported in this browser");
      }

      toast.info("Requesting screen recording permission...", {
        description: "Please click 'Share' when prompted.",
      });

      // Start screen recording with high-quality settings for crisp output
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
          width: { ideal: 1920, max: 1920 }, // Allow up to 1440p for better quality
          height: { ideal: 1080, max: 1080 }, // Higher resolution support
          frameRate: { ideal: 30, max: 60 }, // Allow 60fps for smoother recording
          aspectRatio: { ideal: 16 / 9 }, // Maintain aspect ratio
          resizeMode: "crop-and-scale", // Allow browser optimization
        } as any,
        audio: {
          echoCancellation: true, // Enable for better quality
          noiseSuppression: true, // Reduce background noise
          autoGainControl: true, // Auto-adjust levels
          sampleRate: 44100, // Standard sample rate
          channelCount: 1, // Mono for smaller size
          latency: 0.01, // Low latency
        } as any,
      });

      // Validate that user selected entire screen
      if (!validateScreenSelection(screenStream)) {
        // Stop the stream
        screenStream.getTracks().forEach((track) => track.stop());

        toast.error("Entire screen required", {
          description:
            "You must select 'Entire Screen' when prompted. Window or tab recording is not allowed for interview security. Please try again and select 'Entire Screen'.",
        });
        setIsGranting(false);
        return;
      }

      // Pass the active stream to parent component
      onPermissionGranted(screenStream);
    } catch (error) {
      // Handle different error types
      if (error instanceof Error) {
        if (
          error.message.includes("Permission denied") ||
          error.name === "NotAllowedError"
        ) {
          toast.error("Permission denied", {
            description: "Please try again and click 'Share' to continue.",
          });
        } else if (error.message.includes("NotSupportedError")) {
          toast.error("Screen sharing not supported", {
            description:
              "Screen sharing is not supported in this browser. Please use Chrome or Edge.",
          });
        } else {
          toast.error("Error", {
            description: `Error: ${error.message}`,
          });
        }
      } else {
        toast.error("Screen recording permission is required", {
          description: "Please try again and click 'Share' to continue.",
        });
      }

      setIsGranting(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-app-blue-50 to-white dark:from-[#101624] dark:to-[#23304a]">
      <div className="max-w-md mx-auto p-8 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-app-blue-100 dark:bg-app-blue-900/20 rounded-full flex items-center justify-center mb-4">
            <Video className="w-8 h-8 text-app-blue-600 dark:text-app-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Screen Recording Required
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            This interview will be recorded for evaluation purposes
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-center space-x-3">
            <Check className="w-3.5 h-3.5  text-app-blue-600 dark:text-app-blue-400" />
            <div className="text-sm">
              <p className="text-gray-700 dark:text-gray-300 font-medium">
                Select "Entire Screen"
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-xs">
                You must share your entire screen, not just a window or tab.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Check className="w-3.5 h-3.5  text-app-blue-600 dark:text-app-blue-400" />
            <div className="text-sm">
              <p className="text-gray-700 dark:text-gray-300 font-medium">
                Include Audio
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-xs">
                Make sure to check "Share audio" when prompted.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleGrantPermission}
            disabled={isGranting}
            className="flex-1 bg-app-blue-600 hover:bg-app-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {isGranting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Granting Permission...
              </>
            ) : (
              "Grant Screen Recording Permission"
            )}
          </Button>

          <Button
            onClick={onPermissionDenied}
            variant="outline"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </Button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
          Recording will start automatically when the interview begins
        </p>
      </div>
    </div>
  );
}

export default RecordingPermission;
