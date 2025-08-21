"use client";

import { useState, useCallback } from 'react';
import usePathStore from '@/app/store/PathStore';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UseRecordingUploadReturn {
  uploadRecording: (recordingBlob: Blob) => Promise<void>;
  isUploading: boolean;
  uploadProgress: UploadProgress | null;
  uploadError: string | null;
}

export function useRecordingUpload(): UseRecordingUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const { 
    jobId, 
    candidateId,
    roundNumber,
    currentAssessment 
  } = usePathStore();

  const uploadRecording = useCallback(async (recordingBlob: Blob) => {
    const isDevelopment = process.env.NODE_ENV === 'development';

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
      
      // Determine interview type based on context
      const interviewType = roundNumber ? 'human_interview' : 'ai_interview';
      const roundSuffix = roundNumber ? `-round${roundNumber}` : '';
      const filename = `interview-recording-${jobId}-${candidateId}-${timestamp}${roundSuffix}.webm`;
      
      const formData = new FormData();
      formData.append('recording', recordingBlob, filename);
      formData.append('job_id', jobId);
      formData.append('candidate_id', candidateId);
      formData.append('timestamp', timestamp);
      formData.append('interview_type', interviewType);
      
      if (roundNumber) {
        formData.append('round_number', roundNumber.toString());
      }
      
      // Add round token if available (for human interviews)
      const urlParams = new URLSearchParams(window.location.search);
      const roundToken = urlParams.get('token');
      if (roundToken) {
        formData.append('round_token', roundToken);
      }

      const baseUrl = process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL || 'http://localhost:8010';
      
      // Create XMLHttpRequest to track upload progress
      await new Promise<void>((resolve, reject) => {
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
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed due to network error'));
        });

        xhr.addEventListener('timeout', () => {
          reject(new Error('Upload timed out'));
        });

        xhr.open('POST', `${baseUrl}/api/v1/recordings/upload`);
        xhr.timeout = 300000; // 5 minutes timeout
        xhr.send(formData);
      });

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
  }, [jobId, candidateId]);

  return {
    uploadRecording,
    isUploading,
    uploadProgress,
    uploadError
  };
}

export default useRecordingUpload;