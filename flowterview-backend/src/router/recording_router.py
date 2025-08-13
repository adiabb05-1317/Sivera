"""
Recording router for handling interview recording uploads and storage.
"""

import os
import asyncio
from datetime import datetime
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse
from loguru import logger

from src.core.config import Config

router = APIRouter(
    prefix="/api/v1/recordings",
    tags=["recordings"],
    responses={404: {"description": "Not found"}},
)


class CloudStorageManager:
    """Manages uploads to cloud storage providers (S3, GCS)."""
    
    def __init__(self):
        self.provider = os.getenv("CLOUD_STORAGE_PROVIDER", "s3").lower()
        self.bucket_name = os.getenv("CLOUD_STORAGE_BUCKET")
        
        if not self.bucket_name:
            logger.warning("CLOUD_STORAGE_BUCKET not configured. Files will be stored locally only.")
    
    async def upload_recording(
        self, 
        file_path: str, 
        object_key: str, 
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Upload recording to cloud storage."""
        if not self.bucket_name:
            logger.info("Cloud storage not configured, keeping file local")
            return {
                "success": True,
                "storage_type": "local",
                "local_path": file_path,
                "message": "File stored locally (cloud storage not configured)"
            }
        
        try:
            if self.provider == "s3":
                return await self._upload_to_s3(file_path, object_key, metadata)
            elif self.provider == "gcs":
                return await self._upload_to_gcs(file_path, object_key, metadata)
            else:
                raise Exception(f"Unsupported storage provider: {self.provider}")
        except Exception as e:
            logger.error(f"Cloud storage upload failed: {e}")
            return {
                "success": False,
                "storage_type": "local",
                "local_path": file_path,
                "error": str(e),
                "message": "File stored locally (cloud upload failed)"
            }
    
    async def _upload_to_s3(self, file_path: str, object_key: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Upload to AWS S3."""
        try:
            import boto3
            from botocore.exceptions import ClientError, NoCredentialsError
        except ImportError:
            raise Exception("boto3 not installed. Run: pip install boto3")
        
        try:
            s3_client = boto3.client(
                's3',
                aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
                region_name=os.getenv("AWS_REGION", "us-east-1")
            )
            
            # Prepare ExtraArgs for upload_fileobj
            extra_args = {
                'ContentType': 'video/webm'
            }
            
            if metadata:
                extra_args['Metadata'] = {k: str(v) for k, v in metadata.items()}
            
            def upload_sync():
                with open(file_path, 'rb') as file:
                    s3_client.upload_fileobj(
                        file, 
                        self.bucket_name, 
                        object_key, 
                        ExtraArgs=extra_args
                    )
            
            await asyncio.get_event_loop().run_in_executor(None, upload_sync)
            
            object_url = f"https://{self.bucket_name}.s3.amazonaws.com/{object_key}"
            logger.info(f"Successfully uploaded to S3: {object_url}")
            
            return {
                "success": True,
                "storage_type": "s3",
                "bucket": self.bucket_name,
                "object_key": object_key,
                "url": object_url,
                "local_path": file_path,
                "message": "File uploaded to S3 successfully"
            }
        except NoCredentialsError:
            raise Exception("AWS credentials not found")
        except ClientError as e:
            raise Exception(f"S3 upload failed: {e.response['Error']['Code']}")
    
    async def _upload_to_gcs(self, file_path: str, object_key: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Upload to Google Cloud Storage."""
        try:
            from google.cloud import storage
            from google.cloud.exceptions import GoogleCloudError
        except ImportError:
            raise Exception("google-cloud-storage not installed. Run: pip install google-cloud-storage")
        
        try:
            credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
            if credentials_path and os.path.exists(credentials_path):
                client = storage.Client.from_service_account_json(credentials_path)
            else:
                client = storage.Client()
            
            bucket = client.bucket(self.bucket_name)
            blob = bucket.blob(object_key)
            
            if metadata:
                blob.metadata = {k: str(v) for k, v in metadata.items()}
            
            def upload_sync():
                with open(file_path, 'rb') as file:
                    blob.upload_from_file(file, content_type='video/webm')
            
            await asyncio.get_event_loop().run_in_executor(None, upload_sync)
            
            object_url = f"https://storage.googleapis.com/{self.bucket_name}/{object_key}"
            logger.info(f"Successfully uploaded to GCS: {object_url}")
            
            return {
                "success": True,
                "storage_type": "gcs",
                "bucket": self.bucket_name,
                "object_key": object_key,
                "url": object_url,
                "local_path": file_path,
                "message": "File uploaded to GCS successfully"
            }
        except GoogleCloudError as e:
            raise Exception(f"GCS upload failed: {str(e)}")
    
    def generate_object_key(self, job_id: str, candidate_id: str, timestamp: str, extension: str = "webm") -> str:
        """Generate structured object key for cloud storage."""
        now = datetime.utcnow()
        year = now.strftime("%Y")
        month = now.strftime("%m")
        return f"recordings/{year}/{month}/{job_id}/{candidate_id}/interview-{timestamp}.{extension}"


# Global storage manager instance
storage_manager = CloudStorageManager()


@router.options("/upload")
async def upload_recording_options():
    """Handle CORS preflight request for upload endpoint."""
    return JSONResponse(
        status_code=200,
        content={"message": "CORS preflight successful"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )


@router.post("/upload")
async def upload_recording(
    request: Request,
    recording: UploadFile = File(...),
    job_id: str = Form(...),
    candidate_id: str = Form(...),
    timestamp: str = Form(...),
    interview_type: str = Form("ai_interview"),
    round_number: int = Form(None),
    interview_id: str = Form(None),
    round_token: str = Form(None)
):
    """
    Upload interview recording and store it in cloud storage.
    Optimized for 30-45 minute recordings with compressed quality.
    """
    try:
        # Validate file type
        if not recording.content_type or not recording.content_type.startswith(('video/webm', 'video/mp4')):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Only WebM and MP4 video files are supported."
            )
        
        # Validate file size (max 2GB for 45min recording)
        max_size = 2 * 1024 * 1024 * 1024  # 2GB
        if recording.size and recording.size > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {max_size // (1024*1024)}MB."
            )
        
        # Create recordings directory
        recordings_dir = "recordings"
        os.makedirs(recordings_dir, exist_ok=True)
        
        # Generate filename
        file_extension = recording.filename.split('.')[-1] if recording.filename and '.' in recording.filename else 'webm'
        safe_filename = f"interview-recording-{job_id}-{candidate_id}-{timestamp}.{file_extension}"
        local_file_path = os.path.join(recordings_dir, safe_filename)
        
        # Save file locally first
        logger.info(f"Saving recording to: {local_file_path}")
        content = await recording.read()
        
        with open(local_file_path, "wb") as buffer:
            buffer.write(content)
        
        file_size = len(content)
        logger.info(f"Recording saved locally: {safe_filename} ({file_size} bytes)")
        
        # Prepare metadata
        metadata = {
            "job_id": job_id,
            "candidate_id": candidate_id,
            "interview_id": interview_id,
            "interview_type": interview_type,
            "round_number": round_number,
            "round_token": round_token,
            "timestamp": timestamp,
            "upload_time": datetime.utcnow().isoformat(),
            "file_size": str(file_size),
            "original_filename": recording.filename or safe_filename
        }
        
        # Generate cloud storage object key
        object_key = storage_manager.generate_object_key(job_id, candidate_id, timestamp, file_extension)
        
        # Upload to cloud storage
        upload_result = await storage_manager.upload_recording(local_file_path, object_key, metadata)
        
        # Store recording info in database via Supabase
        try:
            supabase = request.app.state.supabase
            recording_data = {
                "job_id": job_id,
                "candidate_id": candidate_id,
                "interview_id": interview_id,
                "interview_type": interview_type,
                "round_number": round_number,
                "round_token": round_token,
                "filename": safe_filename,
                "file_size": file_size,
                "storage_type": upload_result.get("storage_type", "local"),
                "cloud_url": upload_result.get("url"),
                "object_key": object_key if upload_result.get("success") else None,
                "local_path": local_file_path,
                "metadata": metadata,
                "created_at": datetime.utcnow().isoformat()
            }
            
            result = supabase.table("interview_recordings").insert(recording_data).execute()
            logger.info(f"Recording metadata saved to database: {result.data}")
            
        except Exception as db_error:
            logger.error(f"Failed to save recording metadata to database: {db_error}")
            # Continue anyway - file is still saved
        
        # Prepare response
        response_data = {
            "success": True,
            "message": "Recording uploaded successfully",
            "filename": safe_filename,
            "file_size": file_size,
            "job_id": job_id,
            "candidate_id": candidate_id,
            "interview_id": interview_id,
            "interview_type": interview_type,
            "round_number": round_number,
            "round_token": round_token,
            "timestamp": timestamp,
            "local_path": local_file_path,
            **upload_result
        }
        
        return JSONResponse(status_code=200, content=response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading recording: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/list/{job_id}")
async def list_recordings(request: Request, job_id: str):
    """List all recordings for a specific job."""
    try:
        supabase = request.app.state.supabase
        result = supabase.table("interview_recordings").select("*").eq("job_id", job_id).execute()
        
        return JSONResponse(status_code=200, content={
            "success": True,
            "recordings": result.data
        })
        
    except Exception as e:
        logger.error(f"Error listing recordings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list recordings: {str(e)}")


@router.get("/download/{recording_id}")
async def get_recording_download_url(request: Request, recording_id: str):
    """Get download URL for a specific recording."""
    try:
        supabase = request.app.state.supabase
        result = supabase.table("interview_recordings").select("*").eq("id", recording_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Recording not found")
        
        recording = result.data[0]
        
        # Return cloud URL if available, otherwise local path info
        download_info = {
            "success": True,
            "recording_id": recording_id,
            "filename": recording["filename"],
            "file_size": recording["file_size"],
            "storage_type": recording["storage_type"]
        }
        
        if recording["cloud_url"]:
            download_info["download_url"] = recording["cloud_url"]
        else:
            download_info["local_path"] = recording["local_path"]
            download_info["message"] = "File stored locally, contact administrator for access"
        
        return JSONResponse(status_code=200, content=download_info)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting recording download URL: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get download URL: {str(e)}")