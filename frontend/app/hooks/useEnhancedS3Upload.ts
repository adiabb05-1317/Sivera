"use client";

import { useState, useCallback, useRef } from 'react';
import usePathStore from '@/app/store/PathStore';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number; // bytes per second
  eta?: number; // seconds remaining
}

interface UploadMetrics {
  startTime: number;
  endTime?: number;
  attempts: number;
  finalSize: number;
  averageSpeed?: number;
}

interface UseEnhancedS3UploadReturn {
  uploadRecording: (recordingBlob: Blob) => Promise<void>;
  isUploading: boolean;
  uploadProgress: UploadProgress | null;
  uploadError: string | null;
  uploadMetrics: UploadMetrics | null;
  retryUpload: () => Promise<void>;
  cancelUpload: () => void;
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

// Chunk upload for large files with resume capability
class ChunkedUploader {
  private blob: Blob;
  private chunkSize: number;
  private uploadedChunks: Set<number> = new Set();
  private totalChunks: number;
  private onProgress: (progress: UploadProgress) => void;
  private abortController: AbortController;

  constructor(
    blob: Blob,
    chunkSize: number = 5 * 1024 * 1024, // 5MB chunks
    onProgress: (progress: UploadProgress) => void
  ) {
    this.blob = blob;
    this.chunkSize = chunkSize;
    this.totalChunks = Math.ceil(blob.size / chunkSize);
    this.onProgress = onProgress;
    this.abortController = new AbortController();
  }

  async uploadToUrl(url: string, contentType: string): Promise<void> {
    const startTime = Date.now();
    let lastProgressTime = startTime;
    let lastLoaded = 0;

    for (let chunkIndex = 0; chunkIndex < this.totalChunks; chunkIndex++) {
      if (this.uploadedChunks.has(chunkIndex)) {
        continue; // Skip already uploaded chunks
      }

      if (this.abortController.signal.aborted) {
        throw new Error('Upload cancelled');
      }

      const start = chunkIndex * this.chunkSize;
      const end = Math.min(start + this.chunkSize, this.blob.size);
      const chunk = this.blob.slice(start, end);

      await this.uploadChunk(chunk, url, contentType, chunkIndex);
      this.uploadedChunks.add(chunkIndex);

      // Calculate progress and speed
      const loaded = this.uploadedChunks.size * this.chunkSize;
      const currentTime = Date.now();
      const timeDiff = (currentTime - lastProgressTime) / 1000;
      const bytesDiff = loaded - lastLoaded;
      const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
      const percentage = Math.round((loaded / this.blob.size) * 100);
      const eta = speed > 0 ? (this.blob.size - loaded) / speed : 0;

      this.onProgress({
        loaded: Math.min(loaded, this.blob.size),
        total: this.blob.size,
        percentage,
        speed,
        eta
      });

      lastProgressTime = currentTime;
      lastLoaded = loaded;
    }
  }

  private async uploadChunk(
    chunk: Blob,
    url: string,
    contentType: string,
    chunkIndex: number,
    retries: number = 3
  ): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'PUT',
          body: chunk,
          headers: {
            'Content-Type': contentType,
            'Content-Range': `bytes ${chunkIndex * this.chunkSize}-${Math.min((chunkIndex + 1) * this.chunkSize - 1, this.blob.size - 1)}/${this.blob.size}`,
          },
          signal: this.abortController.signal,
        });

        if (response.ok) {
          return;
        }

        throw new Error(`Chunk upload failed: ${response.status}`);
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  cancel() {
    this.abortController.abort();
  }

  getProgress(): { uploaded: number; total: number } {
    return {
      uploaded: this.uploadedChunks.size,
      total: this.totalChunks,
    };
  }
}

export function useEnhancedS3Upload(): UseEnhancedS3UploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadMetrics, setUploadMetrics] = useState<UploadMetrics | null>(null);
  
  const lastBlobRef = useRef<Blob | null>(null);
  const chunkedUploaderRef = useRef<ChunkedUploader | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  
  const { jobId, candidateId, roundNumber, interviewId } = usePathStore();
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Enhanced upload with multiple strategies
  const uploadWithStrategy = useCallback(async (
    blob: Blob,
    preSignedData: PreSignedUrlResponse
  ): Promise<void> => {
    const strategies = [
      { name: 'Direct', fn: () => uploadDirect(blob, preSignedData) },
      { name: 'Chunked', fn: () => uploadChunked(blob, preSignedData) },
      { name: 'Multipart', fn: () => uploadMultipart(blob, preSignedData) },
    ];

    let lastError: Error | null = null;

    for (const strategy of strategies) {
      try {
        await strategy.fn();
        return;
      } catch (error) {
        lastError = error as Error;
      }
    }

    throw lastError || new Error('All upload strategies failed');
  }, []);

  // Direct upload with enhanced monitoring
  const uploadDirect = useCallback(async (
    blob: Blob,
    preSignedData: PreSignedUrlResponse
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      
      const startTime = Date.now();
      let lastLoaded = 0;
      let lastTime = startTime;

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const currentTime = Date.now();
          const timeDiff = (currentTime - lastTime) / 1000;
          const bytesDiff = event.loaded - lastLoaded;
          const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
          const percentage = Math.round((event.loaded / event.total) * 100);
          const eta = speed > 0 ? (event.total - event.loaded) / speed : 0;

          setUploadProgress({
            loaded: event.loaded,
            total: event.total,
            percentage,
            speed,
            eta
          });

          lastLoaded = event.loaded;
          lastTime = currentTime;
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const endTime = Date.now();
          setUploadMetrics({
            startTime,
            endTime,
            attempts: 1,
            finalSize: blob.size,
            averageSpeed: blob.size / ((endTime - startTime) / 1000)
          });
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout'));
      });

      xhr.open('PUT', preSignedData.presigned_url);
      xhr.setRequestHeader('Content-Type', preSignedData.content_type);
      xhr.setRequestHeader('x-amz-server-side-encryption', 'AES256');
      xhr.setRequestHeader('Cache-Control', 'max-age=31536000');
      
      // Dynamic timeout based on file size (minimum 5 minutes)
      const timeoutMs = Math.max(300000, blob.size / 1000); // 1KB/s minimum speed
      xhr.timeout = timeoutMs;
      
      xhr.send(blob);
    });
  }, []);

  // Chunked upload for large files
  const uploadChunked = useCallback(async (
    blob: Blob,
    preSignedData: PreSignedUrlResponse
  ): Promise<void> => {
    const uploader = new ChunkedUploader(blob, 5 * 1024 * 1024, setUploadProgress);
    chunkedUploaderRef.current = uploader;
    
    try {
      await uploader.uploadToUrl(preSignedData.presigned_url, preSignedData.content_type);
    } finally {
      chunkedUploaderRef.current = null;
    }
  }, []);

  // Multipart upload for very large files
  const uploadMultipart = useCallback(async (
    blob: Blob,
    preSignedData: PreSignedUrlResponse
  ): Promise<void> => {
    // This would typically initiate a multipart upload with the backend
    // For now, fallback to direct upload
    return uploadDirect(blob, preSignedData);
  }, [uploadDirect]);

  // Main upload function with comprehensive error handling
  const uploadRecording = useCallback(async (recordingBlob: Blob) => {
    // Validation
    if (!recordingBlob || recordingBlob.size === 0) {
      const error = 'Invalid recording blob';
      setUploadError(error);
      return;
    }

    if (!jobId || !candidateId) {
      const error = `Missing identifiers: jobId=${jobId}, candidateId=${candidateId}`;
      setUploadError(error);
      return;
    }

    // Store blob for retry capability
    lastBlobRef.current = recordingBlob;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress({ loaded: 0, total: recordingBlob.size, percentage: 0 });
    
    const startTime = Date.now();
    setUploadMetrics({
      startTime,
      attempts: 0,
      finalSize: recordingBlob.size
    });

    try {
      // Step 1: Get pre-signed URL with retry
      const preSignedData = await getPreSignedUrlWithRetry(
        recordingBlob,
        jobId,
        candidateId,
        roundNumber
      );

      await uploadWithStrategy(recordingBlob, preSignedData);
      // Step 3: Confirm upload
      console.log("✅ Step 3: Confirming upload with backend...");
      await confirmUploadWithRetry(
        preSignedData,
        recordingBlob,
        jobId,
        candidateId,
        interviewId,
        roundNumber
      );

      const endTime = Date.now();
      setUploadMetrics(prev => prev ? {
        ...prev,
        endTime,
        averageSpeed: recordingBlob.size / ((endTime - startTime) / 1000)
      } : null);

      setUploadProgress({
        loaded: recordingBlob.size,
        total: recordingBlob.size,
        percentage: 100
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
      xhrRef.current = null;
      
      // Clear progress after delay
      setTimeout(() => {
        setUploadProgress(null);
      }, 3000);
    }
  }, [jobId, candidateId, roundNumber, uploadWithStrategy, uploadMetrics]);

  // Retry last upload
  const retryUpload = useCallback(async () => {
    if (lastBlobRef.current) {
      await uploadRecording(lastBlobRef.current);
    } else {
      setUploadError('No recording to retry');
    }
  }, [uploadRecording]);

  // Cancel ongoing upload
  const cancelUpload = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    if (chunkedUploaderRef.current) {
      chunkedUploaderRef.current.cancel();
      chunkedUploaderRef.current = null;
    }
    setIsUploading(false);
    setUploadError('Upload cancelled');
  }, []);

  return {
    uploadRecording,
    isUploading,
    uploadProgress,
    uploadError,
    uploadMetrics,
    retryUpload,
    cancelUpload
  };
}

// Helper function to get pre-signed URL with retry
async function getPreSignedUrlWithRetry(
  blob: Blob,
  jobId: string,
  candidateId: string,
  roundNumber?: number,
  maxRetries: number = 3
): Promise<PreSignedUrlResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL || 'http://localhost:8010';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const formData = new FormData();
      formData.append('job_id', jobId);
      formData.append('candidate_id', candidateId);
      formData.append('timestamp', timestamp);
      formData.append('file_size', blob.size.toString());
      formData.append('content_type', blob.type || 'video/webm');
      formData.append('interview_type', roundNumber ? 'human_interview' : 'ai_interview');
      
      if (roundNumber) {
        formData.append('round_number', roundNumber.toString());
      }

      const response = await fetch(`${baseUrl}/api/v1/recordings/presigned-url`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        return await response.json();
      }

      throw new Error(`Failed to get pre-signed URL: ${response.status}`);
      
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  throw new Error('Failed to get pre-signed URL after retries');
}

// Helper function to confirm upload with retry
async function confirmUploadWithRetry(
  preSignedData: PreSignedUrlResponse,
  blob: Blob,
  jobId: string,
  candidateId: string,
  interviewId: string,
  roundNumber?: number,
  maxRetries: number = 3
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL || 'http://localhost:8010';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Use the same timestamp from pre-signed URL request
      const timestamp = preSignedData.timestamp;
      const interviewType = roundNumber ? 'human_interview' : 'ai_interview';
      
      const formData = new FormData();
      formData.append('object_key', preSignedData.object_key);
      formData.append('object_url', preSignedData.object_url);
      formData.append('job_id', jobId);
      formData.append('candidate_id', candidateId);
      formData.append('timestamp', timestamp);
      formData.append('file_size', blob.size.toString());
      formData.append('content_type', blob.type || 'video/webm');
      formData.append('interview_type', interviewType);
      formData.append('interview_id', interviewId);
      
      if (roundNumber) {
        formData.append('round_number', roundNumber.toString());
      }
      
      // Add round token if available
      const urlParams = new URLSearchParams(window.location.search);
      const roundToken = urlParams.get('token');
      if (roundToken) {
        formData.append('round_token', roundToken);
      }

      const response = await fetch(`${baseUrl}/api/v1/recordings/confirm-upload`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Upload confirmed successfully:', responseData);
        return;
      }
      
      // Log the error for debugging
      const errorText = await response.text();
      console.error(`❌ Confirm upload failed (attempt ${attempt}/${maxRetries}):`, {
        status: response.status,
        statusText: response.statusText,
        errorText
      });

      throw new Error(`Failed to confirm upload: ${response.status} - ${errorText}`);
      
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

export default useEnhancedS3Upload;