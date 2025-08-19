"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

interface RecordingPermissionProps {
  onPermissionGranted: (screenStream: MediaStream) => void;
  onPermissionDenied: () => void;
}

export function RecordingPermission({
  onPermissionGranted,
  onPermissionDenied,
}: RecordingPermissionProps) {
  const [isGranting, setIsGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const validateScreenSelection = (stream: MediaStream): boolean => {
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return false;
    
    const settings = videoTrack.getSettings();
    
    // Check if it's entire screen (not window or tab)
    const isLikelyEntireScreen = Boolean(settings.width && settings.height && 
      (settings.width >= 1920 || settings.height >= 1080));
    
    // Check the display surface (if available)
    const displaySurface = (settings as any).displaySurface;
    if (displaySurface && displaySurface !== 'monitor') {
      return false; // Must be monitor (entire screen), not window or browser
    }
    
    return isLikelyEntireScreen;
  };

  const handleGrantPermission = async () => {
    if (isGranting) return; // Prevent multiple clicks
    
    setIsGranting(true);
    setError(null);
    setDebugInfo('Checking browser support...');

    try {
      // Check if getDisplayMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen sharing is not supported in this browser');
      }

      setDebugInfo('Starting screen recording...');
      console.log('🎥 Starting screen recording immediately...');
      
      // Start screen recording with high-quality settings for crisp output
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          width: { ideal: 1920, max: 2560 },       // Allow up to 1440p for better quality
          height: { ideal: 1080, max: 1440 },      // Higher resolution support
          frameRate: { ideal: 30, max: 60 },       // Allow 60fps for smoother recording
          aspectRatio: { ideal: 16/9 },            // Maintain aspect ratio
          resizeMode: 'crop-and-scale'             // Allow browser optimization
        } as any,
        audio: {
          echoCancellation: true,                  // Enable for better quality
          noiseSuppression: true,                  // Reduce background noise
          autoGainControl: true,                   // Auto-adjust levels
          sampleRate: 44100,                       // Standard sample rate
          channelCount: 1,                         // Mono for smaller size
          latency: 0.01                            // Low latency
        } as any
      });

      setDebugInfo('Validating screen selection...');

      // Validate that user selected entire screen
      if (!validateScreenSelection(screenStream)) {
        // Stop the stream
        screenStream.getTracks().forEach(track => track.stop());
        
        setError('❌ ENTIRE SCREEN REQUIRED: You must select "Entire Screen" when prompted. Window or tab recording is not allowed for interview security. Please try again and select "Entire Screen".');
        setIsGranting(false);
        setDebugInfo('');
        return;
      }

      console.log('✅ Entire screen selected - recording started immediately');
      
      // Pass the active stream to parent component
      onPermissionGranted(screenStream);
      
    } catch (error) {
      console.error('❌ Screen recording permission error:', error);
      
      // Handle different error types
      if (error instanceof Error) {
        if (error.message.includes('Permission denied') || error.name === 'NotAllowedError') {
          setError('Screen sharing was cancelled. Please try again and click "Share" to continue.');
        } else if (error.message.includes('NotSupportedError')) {
          setError('Screen sharing is not supported in this browser. Please use Chrome or Edge.');
        } else {
          setError(`Error: ${error.message}`);
        }
      } else {
        setError('Screen recording permission is required for interviews.');
      }
      
      setIsGranting(false);
      setDebugInfo('');
    }
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-app-blue-50 to-white dark:from-[#101624] dark:to-[#23304a]">
      <div className="max-w-md mx-auto p-8 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Screen Recording Required
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            This interview will be recorded for evaluation purposes
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-5 h-5 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mt-0.5">
              <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-sm">
              <p className="text-gray-700 dark:text-gray-300 font-medium">Select "Entire Screen"</p>
              <p className="text-gray-500 dark:text-gray-400">You must share your entire screen, not just a window or tab</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-5 h-5 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mt-0.5">
              <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-sm">
              <p className="text-gray-700 dark:text-gray-300 font-medium">Include Audio</p>
              <p className="text-gray-500 dark:text-gray-400">Make sure to check "Share audio" when prompted</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {debugInfo && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-blue-700 dark:text-blue-400 text-sm">Debug: {debugInfo}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleGrantPermission}
            disabled={isGranting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {isGranting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Granting Permission...
              </>
            ) : (
              'Grant Screen Recording Permission'
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