"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
  const [isRecovering, setIsRecovering] = useState(false); // Track recovery attempts
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { callStatus } = usePathStore();
  
  const isDevelopment = process.env.NODE_ENV === 'development';



  const startRecordingWithStream = useCallback(async (screenStream: MediaStream) => {
    if (isRecording || hasStarted) {
      if (isDevelopment) {
        console.log('Recording already in progress or already started');
      }
      return;
    }
    
    try {
      if (isDevelopment) {
        console.log('🎥 Starting recording with existing screen stream...');
      }
      
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
      
      // Enhanced audio handling with Web Audio API for better system audio capture
      let finalAudioTrack: MediaStreamTrack | null = null;
      
      try {
        // Get high-quality microphone audio
        let micStream: MediaStream | null = null;
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000,
              channelCount: 2
            }
          });
        } catch {
          console.log('No microphone access, using screen audio only');
        }

        const screenAudioTracks = screenStream.getAudioTracks();
        const micAudioTracks = micStream?.getAudioTracks() || [];
        
        if (screenAudioTracks.length > 0 || micAudioTracks.length > 0) {
          // Create Web Audio API context for mixing
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: 48000,
            latencyHint: 'interactive'
          });
          
          const destination = audioContext.createMediaStreamDestination();
          const gainNode = audioContext.createGain();
          gainNode.gain.value = 1.0;
          gainNode.connect(destination);
          
          // Connect screen audio (system sounds)
          if (screenAudioTracks.length > 0) {
            const screenAudioSource = audioContext.createMediaStreamSource(
              new MediaStream([screenAudioTracks[0]])
            );
            const screenGain = audioContext.createGain();
            screenGain.gain.value = 0.8; // Slightly reduce system audio
            screenAudioSource.connect(screenGain);
            screenGain.connect(gainNode);
            console.log('✅ System audio connected with Web Audio API');
          }
          
          // Connect microphone audio
          if (micAudioTracks.length > 0) {
            const micAudioSource = audioContext.createMediaStreamSource(
              new MediaStream([micAudioTracks[0]])
            );
            const micGain = audioContext.createGain();
            micGain.gain.value = 1.2; // Boost microphone slightly
            micAudioSource.connect(micGain);
            micGain.connect(gainNode);
            console.log('✅ Microphone audio connected with Web Audio API');
          }
          
          // Get the mixed audio track
          const mixedAudioTracks = destination.stream.getAudioTracks();
          if (mixedAudioTracks.length > 0) {
            finalAudioTrack = mixedAudioTracks[0];
            console.log('✅ Audio mixing successful with Web Audio API');
          }
        }
      } catch (audioError) {
        console.warn('⚠️ Web Audio API mixing failed, falling back to simple combination:', audioError);
        
        // Fallback to simple audio combination
        const screenAudioTracks = screenStream.getAudioTracks();
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
          console.log('No microphone access in fallback');
        }
        const micAudioTracks = micStream?.getAudioTracks() || [];
        
        // Use the best available audio track
        if (screenAudioTracks.length > 0) {
          finalAudioTrack = screenAudioTracks[0];
        } else if (micAudioTracks.length > 0) {
          finalAudioTrack = micAudioTracks[0];
        }
      }

      // Combine video with the final audio track
      const combinedTracks = [
        ...screenStream.getVideoTracks(),
        ...(finalAudioTrack ? [finalAudioTrack] : [])
      ];

      const combinedStream = new MediaStream(combinedTracks);
      streamRef.current = combinedStream;

      // Configure MediaRecorder with better compatibility
      let options: MediaRecorderOptions = {};
      
      // Try different mimeTypes in order of preference - prioritize more compatible codecs
      const mimeTypes = [
        'video/webm;codecs=vp8,opus',  // Most compatible first
        'video/webm;codecs=vp9,opus',  
        'video/webm;codecs=h264,opus',
        'video/webm',
        'video/mp4'
      ];
      
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          options.mimeType = mimeType;
          if (isDevelopment) {
            console.log('✅ Using mimeType:', mimeType);
          }
          break;
        }
      }
      
      if (!options.mimeType) {
        throw new Error('No supported video codec found for recording');
      }
      
      // Set high-quality bitrates for crystal clear screen recording
      if (options.mimeType?.includes('vp9') || options.mimeType?.includes('vp8')) {
        options.videoBitsPerSecond = 8000000; // 8Mbps for crisp screen quality
        options.audioBitsPerSecond = 256000;  // High audio quality
      } else if (options.mimeType?.includes('webm')) {
        options.videoBitsPerSecond = 6000000; // 6Mbps for fallback codecs
        options.audioBitsPerSecond = 256000;  // High audio quality
      }
      
      // Additional quality settings
      if (options.videoBitsPerSecond && options.audioBitsPerSecond) {
        options.bitsPerSecond = options.videoBitsPerSecond + options.audioBitsPerSecond;
      }
      
      console.log('📹 MediaRecorder options:', options);

      const mediaRecorder = new MediaRecorder(combinedStream, options);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (isDevelopment) {
          console.log('📹 Data available event:', event.data.size, 'bytes', 'total chunks:', recordedChunksRef.current.length);
        }
        
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          
          if (isDevelopment) {
            console.log('✅ Added chunk, total size so far:', recordedChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0), 'bytes');
          }
        } else {
          if (isDevelopment) {
            console.warn('⚠️ Received empty data chunk');
          }
        }
        
        // Validate stream is still active
        const videoTracks = screenStream.getVideoTracks();
        if (videoTracks.length > 0 && videoTracks[0].readyState === 'ended') {
          console.warn('⚠️ Video track ended during recording - this may cause corruption');
        }
      };

      mediaRecorder.onstop = () => {
        const recordingBlob = new Blob(recordedChunksRef.current, {
          type: 'video/webm'
        });
        
        const endTime = Date.now();
        const duration = recordingStartTimeRef.current 
          ? (endTime - recordingStartTimeRef.current) / 1000 
          : 0;
          
        console.log('✅ Screen recording completed:', {
          size: recordingBlob.size,
          sizeMB: (recordingBlob.size / 1024 / 1024).toFixed(2),
          duration: `${duration.toFixed(1)}s`,
          chunks: recordedChunksRef.current.length,
          endTime: new Date().toISOString()
        });
        
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
        recordingStartTimeRef.current = Date.now();
        if (isDevelopment) {
          console.log('🎬 MediaRecorder started successfully at', new Date().toISOString());
        }
        
        // Start health check to monitor stream integrity (reduced frequency since we have event listeners)
        healthCheckIntervalRef.current = setInterval(() => {
          const videoTracks = screenStream.getVideoTracks();
          if (videoTracks.length > 0) {
            const track = videoTracks[0];
            if (track.readyState === 'ended' && !isRecovering) {
              console.warn('⚠️ Periodic health check: Video track ended during recording');
              // The 'ended' event listener will handle recovery, so we just log this
            } else if (track.readyState === 'live' && isDevelopment) {
              // Track is healthy - occasional debug log in development
              const duration = recordingStartTimeRef.current 
                ? (Date.now() - recordingStartTimeRef.current) / 1000 
                : 0;
              if (Math.floor(duration) % 30 === 0 && duration > 0) { // Every 30 seconds
                console.log(`📹 Recording health check: ${duration.toFixed(1)}s recorded, stream is live`);
              }
            }
          }
        }, 10000); // Check every 10 seconds (less frequent since we have event listeners)
      };

      mediaRecorder.onpause = () => {
        console.log('⏸️ MediaRecorder paused');
      };

      mediaRecorder.onresume = () => {
        console.log('▶️ MediaRecorder resumed');
      };

      // Handle video track ending with automatic recovery attempt
      const videoTrack = screenStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.addEventListener('ended', async () => {
          const duration = recordingStartTimeRef.current 
            ? (Date.now() - recordingStartTimeRef.current) / 1000 
            : 0;
          
          console.log(`❌ Video track ended after ${duration.toFixed(1)}s - attempting recovery...`);
          
          // Only attempt recovery if we've been recording for more than 10 seconds
          // (to avoid recovery loops for immediate failures)
          if (duration > 10 && !isRecovering) {
            setIsRecovering(true);
            try {
              console.log('🔄 Attempting automatic stream recovery...');
              
              const newScreenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                  cursor: 'always',
                  width: { ideal: 1920 },
                  height: { ideal: 1080 },
                  frameRate: { ideal: 30 }
                } as any,
                audio: {
                  echoCancellation: false,
                  noiseSuppression: false,
                  autoGainControl: false,
                  sampleRate: 48000,
                  channelCount: 2
                } as any
              });
              
              // Validate new stream
              const newVideoTracks = newScreenStream.getVideoTracks();
              if (newVideoTracks.length > 0 && newVideoTracks[0].readyState === 'live') {
                console.log('✅ Stream recovery successful - continuing recording');
                
                // Stop current recording gracefully
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                  mediaRecorderRef.current.stop();
                }
                
                // Start new recording with recovered stream
                setTimeout(() => {
                  setIsRecovering(false);
                  startRecordingWithStream(newScreenStream);
                }, 500);
                
                return; // Don't stop the recording
              }
            } catch (recoveryError) {
              console.error('❌ Automatic recovery failed:', recoveryError);
              setIsRecovering(false);
            }
          }
          
          // If recovery failed or duration too short, stop recording
          console.warn('⚠️ Stopping recording due to video track end');
          stopRecording();
        });
        
        // Also listen for mute events (screen sharing restrictions)
        videoTrack.addEventListener('mute', () => {
          console.warn('⚠️ Video track muted - screen sharing may be restricted');
        });
        
        videoTrack.addEventListener('unmute', () => {
          console.log('✅ Video track unmuted - screen sharing restored');
        });
      }

      // Set states before starting to prevent multiple calls
      setIsRecording(true);
      setHasStarted(true);

      // Start recording with optimized chunk timing
      console.log('🚀 About to start MediaRecorder...');
      mediaRecorder.start(1000); // Collect data every 1 second for better reliability and smaller chunks
      
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
      const duration = recordingStartTimeRef.current 
        ? (Date.now() - recordingStartTimeRef.current) / 1000 
        : 0;
      
      if (isDevelopment) {
        console.log(`Screen recording stopping after ${duration.toFixed(1)} seconds`);
      }
      
      // Clear health check interval
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
      
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setHasStarted(false); // Reset state
      setIsRecovering(false); // Reset recovery state
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      if (isDevelopment) {
        console.log('Screen recording stopped');
      }
    }
  }, [isRecording, isDevelopment]);

  // Start recording immediately when existing stream is provided
  useEffect(() => {
    const shouldSkipRecording = isDevelopment && process.env.NEXT_PUBLIC_SKIP_RECORDING === 'true';
    
    if (existingStream && !isRecording && !hasStarted && !shouldSkipRecording) {
      console.log('🎥 Starting recording with provided stream...');
      startRecordingWithStream(existingStream);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingStream]); // Only depend on existingStream to prevent infinite loops

  // Auto-stop recording ONLY when call definitively ends
  useEffect(() => {
    if (isDevelopment && isRecording) {
      console.log(`Call status changed to: ${callStatus}, recording is active`);
    }
    
    // Only stop recording when the call has definitively ended, not on intermediate states
    if (callStatus === 'left' && isRecording) {
      if (isDevelopment) {
        console.log('Interview ended, stopping screen recording...');
      }
      // Add delay to ensure all chunks are captured
      setTimeout(() => {
        stopRecording();
      }, 3000); // Increased to 3 seconds
    }
    // Don't stop on 'leaving' or other intermediate states - let user manually end or wait for 'left'
  }, [callStatus, isRecording, stopRecording, isDevelopment]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (isDevelopment) {
        console.log('🧹 ScreenRecorder component unmounting - cleaning up...');
      }
      
      // Clear health check interval
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isDevelopment]); // No dependencies - only run on unmount



  // Silent background recording - no UI shown to candidate
  return null;
}

export default ScreenRecorder;