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
      
      // Simplified and reliable audio handling
      let finalAudioTrack: MediaStreamTrack | null = null;
      
      // Get microphone audio for voice capture
      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100,  // Standard sample rate for compatibility
            channelCount: 1     // Mono for smaller file size
          }
        });
        console.log('✅ Microphone access granted');
      } catch {
        console.log('No microphone access, will try screen audio');
      }

      // Prioritize microphone audio over screen audio for interview recordings
      const screenAudioTracks = screenStream.getAudioTracks();
      const micAudioTracks = micStream?.getAudioTracks() || [];
      
      if (micAudioTracks.length > 0) {
        finalAudioTrack = micAudioTracks[0];
        console.log('✅ Using microphone audio (preferred for interviews)');
      } else if (screenAudioTracks.length > 0) {
        finalAudioTrack = screenAudioTracks[0];
        console.log('✅ Using screen audio as fallback');
      } else {
        console.warn('⚠️ No audio tracks available - video only recording');
      }

      // Combine video with the final audio track
      const combinedTracks = [
        ...screenStream.getVideoTracks(),
        ...(finalAudioTrack ? [finalAudioTrack] : [])
      ];

      const combinedStream = new MediaStream(combinedTracks);
      streamRef.current = combinedStream;

      let options: MediaRecorderOptions = {};
      
      const mimeTypes = [
        'video/webm;codecs=h264',        // H.264 in WebM container - best compatibility
        'video/webm;codecs=vp9',         // VP9 codec - excellent compression
        'video/webm;codecs=vp8',         // VP8 codec - wide compatibility  
        'video/webm',                    // WebM fallback
        'video/mp4;codecs=h264',         // MP4 fallback (rarely supported)
        'video/mp4'                      // MP4 fallback
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
      
      // Optimized bitrate settings for WebM with H.264 codec for best compatibility
      if (options.mimeType?.includes('h264')) {
        // H.264 codec - excellent browser compatibility and hardware acceleration
        options.videoBitsPerSecond = 2500000;  // 2.5Mbps - optimal for screen content
        options.audioBitsPerSecond = 128000;   // 128Kbps - better audio quality
      } else if (options.mimeType?.includes('vp9')) {
        // VP9 codec - excellent compression for screen content
        options.videoBitsPerSecond = 1500000;  // 1.5Mbps - still excellent for screen content  
        options.audioBitsPerSecond = 64000;    // 64Kbps - good audio quality, smaller size
      } else if (options.mimeType?.includes('vp8')) {
        // VP8 codec - good compression
        options.videoBitsPerSecond = 1800000;  // 1.8Mbps for VP8
        options.audioBitsPerSecond = 64000;    // 64Kbps audio
      } else if (options.mimeType?.includes('webm')) {
        // Generic WebM fallback
        options.videoBitsPerSecond = 1200000;  // 1.2Mbps fallback - very efficient
        options.audioBitsPerSecond = 48000;    // 48Kbps audio for compatibility
      }
      
      // Set total bitrate and quality parameters
      if (options.videoBitsPerSecond && options.audioBitsPerSecond) {
        options.bitsPerSecond = options.videoBitsPerSecond + options.audioBitsPerSecond;
      }
      
      // Additional quality enhancement for web streaming compatibility
      if (options.mimeType?.includes('h264')) {
        // Optimize H.264 for streaming playback
        (options as any).videoKeyFrameIntervalDuration = 2000; // Keyframes every 2 seconds for H.264
      } else if (options.mimeType?.includes('webm')) {
        // Optimize WebM for streaming playback
        (options as any).videoKeyFrameIntervalDuration = 1000; // More frequent keyframes for better seeking
      }
      
      console.log('📹 MediaRecorder options:', options);

      const mediaRecorder = new MediaRecorder(combinedStream, options);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (isDevelopment) {
          console.log('📹 Data available event:', event.data.size, 'bytes', 'total chunks:', recordedChunksRef.current.length);
        }
        
        if (event.data && event.data.size > 0) {
          // Create a new Blob from the data to ensure it's properly stored
          const chunkBlob = new Blob([event.data], { type: event.data.type });
          recordedChunksRef.current.push(chunkBlob);
          
          if (isDevelopment) {
            const totalSize = recordedChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
            console.log('✅ Added chunk, total size:', (totalSize / 1024 / 1024).toFixed(2), 'MB');
            
            // Memory management warning
            if (totalSize > 500 * 1024 * 1024) { // 500MB warning
              console.warn('⚠️ Large recording detected:', (totalSize / 1024 / 1024).toFixed(2), 'MB');
            }
          }
        } else {
          if (isDevelopment) {
            console.warn('⚠️ Received empty or invalid data chunk');
          }
        }
        
        // Validate stream is still active
        const videoTracks = screenStream.getVideoTracks();
        if (videoTracks.length > 0 && videoTracks[0].readyState === 'ended') {
          console.warn('⚠️ Video track ended during recording - this may cause corruption');
        }
      };

      mediaRecorder.onstop = () => {
        const endTime = Date.now();
        const duration = recordingStartTimeRef.current 
          ? (endTime - recordingStartTimeRef.current) / 1000 
          : 0;
        
        console.log('🛑 CRITICAL: MediaRecorder.onstop fired!', {
          duration: `${duration.toFixed(1)}s`,
          callStatus,
          chunksCollected: recordedChunksRef.current.length,
          stackTrace: new Error().stack?.split('\n').slice(0, 5),
          timestamp: new Date().toISOString()
        });
        
        // Validate chunks before creating blob
        const validChunks = recordedChunksRef.current.filter(chunk => chunk && chunk.size > 0);
        
        
        if (validChunks.length === 0) {
          console.error('❌ Recording completed but no valid data chunks collected');
          onRecordingError?.('Recording failed - no data collected');
          return;
        }
        
        // Create blob with proper MIME type matching the MediaRecorder
        const mimeType = options.mimeType || 'video/webm';
        
        // Ensure chunks are properly ordered and complete
        const recordingBlob = new Blob(validChunks, { 
          type: mimeType 
        });
        
        console.log('✅ Screen recording completed:', {
          size: recordingBlob.size,
          sizeMB: (recordingBlob.size / 1024 / 1024).toFixed(2),
          duration: `${duration.toFixed(1)}s`,
          chunks: validChunks.length,
          mimeType: mimeType,
          endTime: new Date().toISOString(),
          wasShortRecording: duration < 10
        });
        
        // Validate final blob size
        if (recordingBlob.size > 0) {
          // Additional validation for minimum expected size (prevent tiny corrupted files)
          const minExpectedSize = duration * 100000; // ~100KB per second minimum
          if (recordingBlob.size < minExpectedSize && duration > 10) {
            console.warn(`⚠️ Recording size (${recordingBlob.size}) seems small for duration (${duration}s)`);
          }
          
          onRecordingStop?.(recordingBlob);
        } else {
          console.error('❌ Recording blob is empty after creation');
          onRecordingError?.('Recording failed - empty file created');
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
          console.log('🎬 MediaRecorder started successfully at', new Date().toISOString());
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
            if (isDevelopment && Math.floor(duration) % 30 === 0 && duration > 0) {
              console.log(`📹 Recording status: ${duration.toFixed(1)}s recorded`, {
                trackState: track.readyState,
                mediaRecorderState: mediaRecorderRef.current?.state,
                chunksCollected: recordedChunksRef.current.length,
                callStatus
              });
            }
            
            // Log track state changes but don't react to them
            if (track.readyState === 'ended') {
              console.log('📊 Health check detected ended track - event listener will handle');
            }
          }
        }, 10000); // Check every 10 seconds - less frequent to avoid interference
      };

      mediaRecorder.onpause = () => {
        console.log('⏸️ MediaRecorder paused');
      };

      mediaRecorder.onresume = () => {
        console.log('▶️ MediaRecorder resumed');
      };

      // Simplified and robust video track monitoring (NO PREMATURE STOPPING)
      const videoTrack = screenStream.getVideoTracks()[0];
      if (videoTrack) {
        console.log('🎯 Setting up video track monitoring:', {
          initialState: videoTrack.readyState,
          trackId: videoTrack.id,
          trackKind: videoTrack.kind
        });

        videoTrack.addEventListener('ended', async () => {
          const duration = recordingStartTimeRef.current 
            ? (Date.now() - recordingStartTimeRef.current) / 1000 
            : 0;
          
          console.log('🚨 CRITICAL: Video track ended event fired!', {
            duration: `${duration.toFixed(1)}s`,
            callStatus,
            isRecovering,
            mediaRecorderState: mediaRecorderRef.current?.state,
            timestamp: new Date().toISOString()
          });
          
          // If screen sharing ends for any reason, end the interview immediately
          console.log('🛑 Screen sharing ended - ending interview immediately');
          console.log('📊 Final recording state:', {
            duration,
            callStatus,
            recordingState: mediaRecorderRef.current?.state,
            chunksCollected: recordedChunksRef.current.length
          });
          
          // Stop recording and end interview
          await stopRecording();
          
          // Trigger interview end through the store
          const { setCallStatus } = usePathStore.getState();
          setCallStatus('left');
          
          // Show message to user
          alert('Interview ended: Screen sharing was stopped. The interview has been terminated.');
        });
        
        // Enhanced track event monitoring
        videoTrack.addEventListener('mute', () => {
          console.warn('⚠️ Video track muted - screen sharing may be restricted');
          // Don't stop recording on mute - just log it
        });
        
        videoTrack.addEventListener('unmute', () => {
          console.log('✅ Video track unmuted - screen sharing restored');
        });
        
        // Prevent track ending due to tab visibility changes
        const handleVisibilityChange = () => {
          if (document.hidden) {
            console.log('🕵️ Tab became hidden - maintaining recording');
          } else {
            console.log('✅ Tab became visible - recording continues');
          }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Monitor for browser-level interruptions
        window.addEventListener('beforeunload', (_e) => {
          if (mediaRecorderRef.current?.state === 'recording') {
            console.warn('⚠️ Page unloading during recording - attempting to save');
            // Try to stop recording gracefully
            try {
              mediaRecorderRef.current.stop();
            } catch (error) {
              console.error('Error stopping recording on page unload:', error);
            }
          }
        });
      }

      // Set states before starting to prevent multiple calls
      setIsRecording(true);
      setHasStarted(true);

      // Start recording with optimized settings for screen content
      console.log('🚀 About to start MediaRecorder with optimized settings for screen recording...');
      
      // Use larger chunk size for better compression and smaller files
      mediaRecorder.start(10000); // 10-second chunks - better compression ratio
      
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

  const stopRecording = useCallback(async () => {
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
      
      // Ensure MediaRecorder is properly stopped and finalized
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          console.log('🔄 Stopping MediaRecorder and finalizing...');
          
          // Request final data collection BEFORE stopping to ensure complete recording
          try {
            mediaRecorderRef.current.requestData();
            // Small delay to ensure data is collected
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (requestError) {
            console.warn('Could not request final data:', requestError);
          }
          
          // Now stop the recorder
          mediaRecorderRef.current.stop();
        } else if (mediaRecorderRef.current.state === 'paused') {
          console.log('🔄 Resuming and stopping paused MediaRecorder...');
          mediaRecorderRef.current.resume();
          // Wait a bit longer to ensure resume happens
          setTimeout(() => {
            if (mediaRecorderRef.current?.state === 'recording') {
              try {
                mediaRecorderRef.current.requestData();
              } catch (e) {
                console.warn('Could not request final data after resume:', e);
              }
              setTimeout(() => {
                if (mediaRecorderRef.current?.state === 'recording') {
                  mediaRecorderRef.current.stop();
                }
              }, 100);
            }
          }, 200);
        } else {
          console.log('🔄 MediaRecorder already in state:', mediaRecorderRef.current.state);
        }
      } catch (error) {
        console.error('Error stopping MediaRecorder:', error);
      }
      
      setIsRecording(false);
      setHasStarted(false); // Reset state
      setIsRecovering(false); // Reset recovery state
      
      // Stop all tracks after a brief delay to allow MediaRecorder to finalize
      setTimeout(() => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      }, 100);
      
      if (isDevelopment) {
        console.log('Screen recording stopped and finalized');
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
    const currentDuration = recordingStartTimeRef.current 
      ? (Date.now() - recordingStartTimeRef.current) / 1000 
      : 0;
      
    if (isDevelopment) {
      console.log('🔍 Call status effect triggered:', {
        callStatus,
        isRecording,
        duration: `${currentDuration.toFixed(1)}s`,
        chunksCollected: recordedChunksRef.current.length,
        timestamp: new Date().toISOString()
      });
    }
    
    // ONLY stop recording on definitive call end with proper cleanup
    if (callStatus === 'left' && isRecording && hasStarted) { // Ensure we don't stop if already stopping
      console.log('✅ LEGITIMATE call end detected - stopping recording after delay');
      console.log('📊 Final recording stats:', {
        duration: `${currentDuration.toFixed(1)}s`,
        chunks: recordedChunksRef.current.length,
        totalSize: recordedChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0)
      });
      
      // Set hasStarted to false to prevent multiple stop attempts
      setHasStarted(false);
      
      // Add shorter delay to ensure all chunks are captured
      setTimeout(() => {
        console.log('🔚 Executing delayed recording stop...');
        stopRecording(); // Delayed stop - fire and forget
      }, 1000); // Reduced to 1 second for faster response
    } else if (isRecording && callStatus !== 'left' && isDevelopment) {
      console.log(`📝 Recording continues - call status "${callStatus}" is not a stop condition`);
    }
  }, [callStatus, isRecording, stopRecording, hasStarted, isDevelopment]);

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