"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import usePathStore from "@/app/store/PathStore";

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
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { callStatus } = usePathStore();
  
  const isDevelopment = process.env.NODE_ENV === 'development';



  const startRecordingWithStream = useCallback(async (screenStream: MediaStream) => {
    if (isRecording || hasStarted) {
      console.log('Recording already in progress or already started');
      return;
    }
    
    try {
      console.log('🎥 Starting recording with existing screen stream...');
      
      // Validate stream is still active
      const videoTracks = screenStream.getVideoTracks();
      const audioTracks = screenStream.getAudioTracks();
      
      console.log('📺 Stream validation:', {
        videoTracks: videoTracks.length,
        audioTracks: audioTracks.length,
        videoEnabled: videoTracks[0]?.enabled,
        videoReadyState: videoTracks[0]?.readyState,
      });
      
      if (videoTracks.length === 0 || videoTracks[0].readyState === 'ended') {
        throw new Error('Screen stream is no longer active');
      }
      
      // Get microphone audio (should already be available from interview)
      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });
      } catch {
        console.log('No microphone access, using screen audio only');
      }

      // Combine screen video + screen audio + microphone audio
      const combinedTracks = [
        ...screenStream.getVideoTracks(),
        ...screenStream.getAudioTracks(),
        ...(micStream?.getAudioTracks() || [])
      ];

      const combinedStream = new MediaStream(combinedTracks);
      streamRef.current = combinedStream;

      // Configure MediaRecorder with better compatibility
      let options: MediaRecorderOptions = {};
      
      // Try different mimeTypes in order of preference
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus', 
        'video/webm;codecs=h264,opus',
        'video/webm',
        'video/mp4'
      ];
      
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          options.mimeType = mimeType;
          console.log('✅ Using mimeType:', mimeType);
          break;
        }
      }
      
      // Only set bitrates if we have a good codec
      if (options.mimeType?.includes('vp9') || options.mimeType?.includes('vp8')) {
        options.videoBitsPerSecond = 800000;
        options.audioBitsPerSecond = 128000;
      }
      
      console.log('📹 MediaRecorder options:', options);

      const mediaRecorder = new MediaRecorder(combinedStream, options);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('📹 Data available event:', event.data.size, 'bytes', 'total chunks:', recordedChunksRef.current.length);
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          console.log('✅ Added chunk, total size so far:', recordedChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0), 'bytes');
        } else {
          console.warn('⚠️ Received empty data chunk');
        }
      };

      mediaRecorder.onstop = () => {
        const recordingBlob = new Blob(recordedChunksRef.current, {
          type: 'video/webm'
        });
        console.log('✅ Screen recording completed:', recordingBlob.size, 'bytes');
        console.log('📊 Recording chunks collected:', recordedChunksRef.current.length);
        
        // Only call onRecordingStop if we have actual data
        if (recordingBlob.size > 0) {
          onRecordingStop?.(recordingBlob);
        } else {
          console.error('❌ Recording completed but no data was collected');
          onRecordingError?.('Recording failed - no data collected');
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("❌ MediaRecorder error:", event);
        onRecordingError?.("Recording failed");
        stopRecording();
      };

      mediaRecorder.onstart = () => {
        console.log('🎬 MediaRecorder started successfully');
      };

      mediaRecorder.onpause = () => {
        console.log('⏸️ MediaRecorder paused');
      };

      mediaRecorder.onresume = () => {
        console.log('▶️ MediaRecorder resumed');
      };

      // Handle user stopping screen share
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('❌ User stopped screen sharing - this will end recording');
        stopRecording();
      });

      // Set states before starting to prevent multiple calls
      setIsRecording(true);
      setHasStarted(true);

      // Start recording with timeout protection
      console.log('🚀 About to start MediaRecorder...');
      mediaRecorder.start(5000); // Collect data every 5 seconds for better reliability
      
      console.log('✅ MediaRecorder.start() called, state:', mediaRecorder.state);
      onRecordingStart?.();
      
      console.log('🎥 Screen recording started successfully with audio');
      
      // Add a timeout to detect if recording fails to start
      setTimeout(() => {
        if (mediaRecorder.state !== 'recording') {
          console.error('❌ MediaRecorder failed to start recording after 1 second, state:', mediaRecorder.state);
          onRecordingError?.('Recording failed to start');
        }
      }, 1000);

    } catch (error) {
      console.error("❌ Error starting screen recording:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to start recording";
      onRecordingError?.(errorMessage);
    }
  }, [isRecording, onRecordingStart, onRecordingStop, onRecordingError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setHasStarted(false); // Reset state
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      console.log('Screen recording stopped');
    }
  }, [isRecording]);

  // Start recording immediately when existing stream is provided
  useEffect(() => {
    const shouldSkipRecording = isDevelopment && process.env.NEXT_PUBLIC_SKIP_RECORDING === 'true';
    
    if (existingStream && !isRecording && !hasStarted && !shouldSkipRecording) {
      console.log('🎥 Starting recording with provided stream...');
      startRecordingWithStream(existingStream);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingStream]); // Only depend on existingStream to prevent infinite loops

  // Auto-stop recording when call ends
  useEffect(() => {
    if ((callStatus === 'leaving' || callStatus === 'left') && isRecording) {
      console.log('Interview ending, stopping screen recording...');
      stopRecording();
    }
  }, [callStatus, isRecording, stopRecording]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      console.log('🧹 ScreenRecorder component unmounting - cleaning up...');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []); // No dependencies - only run on unmount



  // Silent background recording - no UI shown to candidate
  return null;
}

export default ScreenRecorder;