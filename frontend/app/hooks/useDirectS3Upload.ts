"use client";

import { useState, useCallback } from 'react';
import usePathStore from '@/app/store/PathStore';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface PreSignedUrlResponse {
  success: boolean;
  presigned_url: string;
  object_key: string;
  object_url: string;
  bucket: string;
  region: string;
  content_type: string;
  expires_in: number;
  job_id: string;
  candidate_id: string;
  timestamp: string;
}

interface UseDirectS3UploadReturn {
  uploadRecording: (recordingBlob: Blob) => Promise<void>;
  isUploading: boolean;
  uploadProgress: UploadProgress | null;
  uploadError: string | null;
}

// Helper function for single request upload (smaller files)
async function uploadSingleRequest(
  blob: Blob,
  preSignedData: PreSignedUrlResponse,
  isDevelopment: boolean,
  setUploadProgress: (progress: UploadProgress) => void
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentage = Math.round((event.loaded / event.total) * 100);
        setUploadProgress({
          loaded: event.loaded,
          total: event.total,
          percentage
        });
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`S3 upload failed with status ${xhr.status}: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('S3 upload failed due to network error'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new Error('S3 upload timed out'));
    });

    xhr.open('PUT', preSignedData.presigned_url);
    xhr.setRequestHeader('Content-Type', preSignedData.content_type);
    xhr.setRequestHeader('Content-Encoding', 'identity');
    xhr.timeout = 600000; // 10 minutes
    xhr.send(blob);
  });
}

// Optimized upload function for large WebM files with retry logic
async function uploadOptimizedWebM(
  blob: Blob,
  preSignedData: PreSignedUrlResponse,
  isDevelopment: boolean,
  setUploadProgress: (progress: UploadProgress) => void
): Promise<void> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // Start with 1 second delay

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Enhanced progress tracking with speed calculation
        let lastLoaded = 0;
        let lastTime = Date.now();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const now = Date.now();
            const timeDiff = now - lastTime;
            const loadedDiff = event.loaded - lastLoaded;
            
            if (timeDiff > 500) { // Update every 500ms
              const speed = loadedDiff / (timeDiff / 1000); // bytes per second
              const speedMBps = speed / (1024 * 1024);
              const percentage = Math.round((event.loaded / event.total) * 100);
              
              setUploadProgress({
                loaded: event.loaded,
                total: event.total,
                percentage
              });
              
              lastLoaded = event.loaded;
              lastTime = now;
            }
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`S3 upload failed with status ${xhr.status}: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('S3 upload failed due to network error'));
        });

        xhr.addEventListener('timeout', () => {
          reject(new Error('S3 upload timed out'));
        });

        xhr.open('PUT', preSignedData.presigned_url);
        
        // Use the exact content-type from presigned URL to avoid 403 errors
        xhr.setRequestHeader('Content-Type', preSignedData.content_type);
        xhr.setRequestHeader('Content-Encoding', 'identity');
        
        // Optimized timeout based on file size (minimum 5 minutes, +1min per 50MB)
        const timeoutMinutes = Math.max(5, Math.ceil(blob.size / (50 * 1024 * 1024)));
        xhr.timeout = timeoutMinutes * 60 * 1000;
        
        xhr.send(blob);
      });
      
      // Success - break retry loop
      break;
      
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw error; // Final attempt failed
      }
      
      const delay = RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export function useDirectS3Upload(): UseDirectS3UploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const { 
    jobId, 
    candidateId,
    roundNumber
  } = usePathStore();

  const uploadRecording = useCallback(async (recordingBlob: Blob) => {
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Validate recording blob
    if (!recordingBlob || recordingBlob.size === 0) {
      const errorMsg = 'Recording blob is empty or invalid';
      setUploadError(errorMsg);
      return;
    }

    // Validate blob type
    if (!recordingBlob.type || !recordingBlob.type.startsWith('video/')) {
      // Recording blob type is not video
    }

    if (!jobId || !candidateId) {
      const errorMsg = `Missing job ID or candidate ID. JobId: "${jobId}", CandidateId: "${candidateId}"`;
      setUploadError(errorMsg);
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress({ loaded: 0, total: recordingBlob.size, percentage: 0 });

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const baseUrl = process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL || 'http://localhost:8010';
      
      // Step 1: Get pre-signed URL from backend
      const formData = new FormData();
      formData.append('job_id', jobId);
      formData.append('candidate_id', candidateId);
      formData.append('timestamp', timestamp);
      formData.append('file_size', recordingBlob.size.toString());
      // Preserve full content type including codec parameters for proper playback
      const normalizedContentType = recordingBlob.type || 'video/webm';
      formData.append('content_type', normalizedContentType);
      
      // Add interview context
      const interviewType = roundNumber ? 'human_interview' : 'ai_interview';
      formData.append('interview_type', interviewType);
      
      if (roundNumber) {
        formData.append('round_number', roundNumber.toString());
      }
      
      const urlParams = new URLSearchParams(window.location.search);
      const roundToken = urlParams.get('token');
      if (roundToken) {
        formData.append('round_token', roundToken);
      }

      const preSignedResponse = await fetch(`${baseUrl}/api/v1/recordings/presigned-url`, {
        method: 'POST',
        body: formData
      });

      if (!preSignedResponse.ok) {
        const errorText = await preSignedResponse.text();
        throw new Error(`Failed to get pre-signed URL: ${preSignedResponse.status} ${preSignedResponse.statusText} - ${errorText}`);
      }

      const preSignedData: PreSignedUrlResponse = await preSignedResponse.json();

      // Step 2: Upload directly to S3 using optimized method
      // Optimized upload logic for WebM files
      const isWebM = recordingBlob.type.includes('webm') || preSignedData.content_type.includes('webm');
      const LARGE_FILE_THRESHOLD = 25 * 1024 * 1024; // 25MB - lower threshold for WebM optimization
      const useOptimizedUpload = recordingBlob.size > LARGE_FILE_THRESHOLD || isWebM;

      if (useOptimizedUpload) {
        // Use optimized WebM upload with retry logic and proper headers
        await uploadOptimizedWebM(recordingBlob, preSignedData, isDevelopment, setUploadProgress);
      } else {
        // For smaller files, use standard single request
        await uploadSingleRequest(recordingBlob, preSignedData, isDevelopment, setUploadProgress);
      }

      // Step 3: Confirm upload with backend and store metadata
      const confirmFormData = new FormData();
      confirmFormData.append('object_key', preSignedData.object_key);
      confirmFormData.append('object_url', preSignedData.object_url);
      confirmFormData.append('job_id', jobId);
      confirmFormData.append('candidate_id', candidateId);
      confirmFormData.append('timestamp', timestamp);
      confirmFormData.append('file_size', recordingBlob.size.toString());
      confirmFormData.append('content_type', normalizedContentType);
      confirmFormData.append('interview_type', interviewType);
      
      // Add interview_id if available (can be null)
      const interviewId = `${jobId}_${candidateId}_${timestamp}`;
      confirmFormData.append('interview_id', interviewId);
      
      if (roundNumber) {
        confirmFormData.append('round_number', roundNumber.toString());
      }
      
      if (roundToken) {
        confirmFormData.append('round_token', roundToken);
      }

    

      const confirmResponse = await fetch(`${baseUrl}/api/v1/recordings/confirm-upload`, {
        method: 'POST',
        body: confirmFormData
      });

      if (!confirmResponse.ok) {
        const errorText = await confirmResponse.text();
      
        throw new Error(`Failed to confirm upload: ${confirmResponse.status} ${confirmResponse.statusText} - ${errorText}`);
      }

      await confirmResponse.json();
    

      setUploadProgress({ loaded: recordingBlob.size, total: recordingBlob.size, percentage: 100 });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
      // Clear progress after 3 seconds
      setTimeout(() => {
        setUploadProgress(null);
      }, 3000);
    }
  }, [jobId, candidateId, roundNumber]);

  // Expose upload function globally for debugging in development
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    (window as any).testS3Upload = uploadRecording;
    (window as any).getPathStoreState = () => usePathStore.getState();
  }

  return {
    uploadRecording,
    isUploading,
    uploadProgress,
    uploadError
  };
}

export default useDirectS3Upload;