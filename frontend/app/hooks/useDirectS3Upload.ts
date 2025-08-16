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

export function useDirectS3Upload(): UseDirectS3UploadReturn {
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
    
    if (isDevelopment) {
      console.log('🚀 Starting direct S3 upload:', {
        blobSize: recordingBlob.size,
        blobType: recordingBlob.type,
        jobId,
        candidateId,
        roundNumber,
        sizeMB: (recordingBlob.size / 1024 / 1024).toFixed(2)
      });
    }

    if (!jobId || !candidateId) {
      const errorMsg = `Missing job ID or candidate ID. JobId: "${jobId}", CandidateId: "${candidateId}"`;
      setUploadError(errorMsg);
      if (isDevelopment) {
        console.error('❌ Upload failed:', errorMsg);
      }
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress({ loaded: 0, total: recordingBlob.size, percentage: 0 });

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const baseUrl = process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL || 'http://localhost:8010';
      
      // Step 1: Get pre-signed URL from backend
      if (isDevelopment) {
        console.log('📋 Step 1: Getting pre-signed URL...');
      }
      
      const formData = new FormData();
      formData.append('job_id', jobId);
      formData.append('candidate_id', candidateId);
      formData.append('timestamp', timestamp);
      formData.append('file_size', recordingBlob.size.toString());
      formData.append('content_type', recordingBlob.type || 'video/webm');
      
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
        throw new Error(`Failed to get pre-signed URL: ${preSignedResponse.status} ${preSignedResponse.statusText}`);
      }

      const preSignedData: PreSignedUrlResponse = await preSignedResponse.json();
      
      if (isDevelopment) {
        console.log('✅ Pre-signed URL obtained:', {
          objectKey: preSignedData.object_key,
          bucket: preSignedData.bucket,
          expiresIn: `${preSignedData.expires_in}s`
        });
      }

      // Step 2: Upload directly to S3 using pre-signed URL
      if (isDevelopment) {
        console.log('📋 Step 2: Uploading directly to S3...');
      }

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
            
            if (isDevelopment && percentage % 20 === 0) { // Log every 20%
              console.log(`📤 Upload progress: ${percentage}%`);
            }
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            if (isDevelopment) {
              console.log('✅ S3 upload completed successfully');
            }
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

        // Configure S3 upload
        xhr.open('PUT', preSignedData.presigned_url);
        xhr.setRequestHeader('Content-Type', preSignedData.content_type);
        xhr.timeout = 600000; // 10 minutes timeout for large files
        xhr.send(recordingBlob);
      });

      // Step 3: Confirm upload with backend and store metadata
      if (isDevelopment) {
        console.log('📋 Step 3: Confirming upload with backend...');
      }

      const confirmFormData = new FormData();
      confirmFormData.append('object_key', preSignedData.object_key);
      confirmFormData.append('object_url', preSignedData.object_url);
      confirmFormData.append('job_id', jobId);
      confirmFormData.append('candidate_id', candidateId);
      confirmFormData.append('timestamp', timestamp);
      confirmFormData.append('file_size', recordingBlob.size.toString());
      confirmFormData.append('content_type', recordingBlob.type || 'video/webm');
      confirmFormData.append('interview_type', interviewType);
      
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
        throw new Error(`Failed to confirm upload: ${confirmResponse.status} ${confirmResponse.statusText}`);
      }

      const confirmData = await confirmResponse.json();

      if (isDevelopment) {
        console.log('✅ Upload confirmed and metadata stored:', {
          databaseId: confirmData.database_id,
          objectUrl: confirmData.object_url,
          fileSize: confirmData.file_size
        });
      }

      setUploadProgress({ loaded: recordingBlob.size, total: recordingBlob.size, percentage: 100 });
      
    } catch (error) {
      console.error('❌ Direct S3 upload failed:', error);
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

  return {
    uploadRecording,
    isUploading,
    uploadProgress,
    uploadError
  };
}

export default useDirectS3Upload;