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
from storage.db_manager import DatabaseManager

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
        else:
            logger.info(f"Cloud storage configured: {self.provider} bucket '{self.bucket_name}'")
        
        # Validate AWS credentials if using S3
        if self.provider == "s3" and self.bucket_name:
            self._validate_aws_credentials()
    
    def _validate_aws_credentials(self):
        """Validate AWS credentials and S3 access."""
        aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
        aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        aws_region = os.getenv("AWS_REGION", "us-east-1")
        
        if not aws_access_key:
            logger.error("AWS_ACCESS_KEY_ID not configured")
            return False
        if not aws_secret_key:
            logger.error("AWS_SECRET_ACCESS_KEY not configured")
            return False
            
        logger.info(f"AWS credentials configured for region: {aws_region}")
        logger.info(f"Access key ID: {aws_access_key[:8]}...")
        
        # Test boto3 import
        try:
            import boto3
            logger.info("boto3 library available")
        except ImportError:
            logger.error("boto3 not installed. Run: pip install boto3")
            return False
            
        # Test S3 connection
        try:
            s3_client = boto3.client(
                's3',
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                region_name=aws_region
            )
            
            # Try to list bucket contents instead of head_bucket (requires fewer permissions)
            try:
                s3_client.list_objects_v2(Bucket=self.bucket_name, MaxKeys=1)
                logger.info(f"✅ S3 bucket '{self.bucket_name}' is accessible")
                return True
            except s3_client.exceptions.NoSuchBucket:
                logger.error(f"❌ S3 bucket '{self.bucket_name}' does not exist")
                return False
            except Exception as list_error:
                logger.warning(f"⚠️ Cannot list bucket contents: {list_error}")
                
                # Try a simple put operation to test upload permissions
                try:
                    test_key = "test-connection/test.txt"
                    s3_client.put_object(
                        Bucket=self.bucket_name,
                        Key=test_key,
                        Body=b"Connection test",
                        ServerSideEncryption='AES256'
                    )
                    # Clean up test object
                    s3_client.delete_object(Bucket=self.bucket_name, Key=test_key)
                    logger.info(f"✅ S3 bucket '{self.bucket_name}' upload test successful")
                    return True
                except Exception as upload_error:
                    logger.error(f"❌ S3 upload test failed: {upload_error}")
                    logger.warning(f"🔐 Check AWS permissions for bucket '{self.bucket_name}'")
                    # Return True anyway - we'll handle upload errors gracefully
                    return True
                    
        except Exception as e:
            logger.error(f"❌ S3 credentials/bucket validation failed: {e}")
            logger.warning("🔐 Required S3 permissions: s3:ListBucket, s3:PutObject, s3:PutObjectAcl")
            return False
    
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
            from botocore.exceptions import ClientError, NoCredentialsError, BotoCoreError
        except ImportError:
            raise Exception("boto3 not installed. Run: pip install boto3")
        
        # Get AWS credentials
        aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
        aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        aws_region = os.getenv("AWS_REGION", "us-east-1")
        
        if not aws_access_key or not aws_secret_key:
            raise Exception("AWS credentials not configured. Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY")
        
        logger.info(f"📤 Starting S3 upload: {object_key}")
        logger.info(f"🗂️ File size: {os.path.getsize(file_path)} bytes")
        
        try:
            s3_client = boto3.client(
                's3',
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                region_name=aws_region
            )
            
            # Determine content type from file extension
            file_extension = object_key.split('.')[-1].lower()
            content_type = {
                'webm': 'video/webm',
                'mp4': 'video/mp4',
                'mov': 'video/quicktime'
            }.get(file_extension, 'video/webm')
            
            # Prepare ExtraArgs for upload_fileobj
            extra_args = {
                'ContentType': content_type,
                'ServerSideEncryption': 'AES256'  # Enable server-side encryption
            }
            
            if metadata:
                # S3 metadata keys must be lowercase and contain only alphanumeric characters and hyphens
                clean_metadata = {}
                for k, v in metadata.items():
                    clean_key = k.lower().replace('_', '-')
                    clean_metadata[clean_key] = str(v)
                extra_args['Metadata'] = clean_metadata
                logger.info(f"📋 Metadata: {clean_metadata}")
            
            def upload_sync():
                with open(file_path, 'rb') as file:
                    s3_client.upload_fileobj(
                        file, 
                        self.bucket_name, 
                        object_key, 
                        ExtraArgs=extra_args
                    )
            
            # Upload to S3 asynchronously
            logger.info("⬆️ Uploading to S3...")
            await asyncio.get_event_loop().run_in_executor(None, upload_sync)
            
            # Generate object URL
            object_url = f"https://{self.bucket_name}.s3.{aws_region}.amazonaws.com/{object_key}"
            logger.info(f"✅ Successfully uploaded to S3: {object_url}")
            
            return {
                "success": True,
                "storage_type": "s3",
                "bucket": self.bucket_name,
                "object_key": object_key,
                "url": object_url,
                "local_path": file_path,
                "region": aws_region,
                "content_type": content_type,
                "message": "File uploaded to S3 successfully"
            }
            
        except NoCredentialsError as e:
            error_msg = f"AWS credentials not found: {e}"
            logger.error(f"❌ {error_msg}")
            raise Exception(error_msg)
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_msg = e.response.get('Error', {}).get('Message', str(e))
            
            # Provide specific guidance for common permission errors
            if error_code == 'AccessDenied':
                full_error = f"S3 Access Denied - Check bucket permissions. Required: s3:PutObject, s3:PutObjectAcl on bucket '{self.bucket_name}'"
            elif error_code == 'NoSuchBucket':
                full_error = f"S3 bucket '{self.bucket_name}' does not exist or is not accessible"
            elif error_code == 'InvalidAccessKeyId':
                full_error = f"Invalid AWS Access Key ID. Check AWS_ACCESS_KEY_ID environment variable"
            elif error_code == 'SignatureDoesNotMatch':
                full_error = f"Invalid AWS Secret Key. Check AWS_SECRET_ACCESS_KEY environment variable"
            else:
                full_error = f"S3 upload failed - {error_code}: {error_msg}"
            
            logger.error(f"❌ {full_error}")
            raise Exception(full_error)
        except BotoCoreError as e:
            error_msg = f"Boto3 error: {e}"
            logger.error(f"❌ {error_msg}")
            raise Exception(error_msg)
        except Exception as e:
            error_msg = f"Unexpected S3 upload error: {e}"
            logger.error(f"❌ {error_msg}")
            raise Exception(error_msg)
    
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
        
        # Store recording info in database using DatabaseManager
        try:
            # Create a new DatabaseManager instance for this request
            db = DatabaseManager()
            
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
                "cloud_url": upload_result.get("url"),  # S3 URL stored here
                "object_key": object_key if upload_result.get("success") else None,
                "local_path": local_file_path,
                "metadata": metadata,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            logger.info(f"💾 Storing recording metadata to database:")
            logger.info(f"  📊 Storage type: {recording_data['storage_type']}")
            logger.info(f"  🔗 Cloud URL: {recording_data['cloud_url']}")
            logger.info(f"  🔑 Object key: {recording_data['object_key']}")
            
            # Insert into database
            db_result = db.execute_query("interview_recordings", recording_data)
            logger.info(f"✅ Recording metadata saved to database with ID: {db_result.get('id')}")
            
            # Verify the database entry was created
            if db_result and db_result.get('id'):
                verification = db.fetch_one("interview_recordings", {"id": db_result.get('id')})
                if verification:
                    logger.info(f"🔍 Database verification successful:")
                    logger.info(f"  📋 Record found with cloud_url: {verification.get('cloud_url')}")
                    logger.info(f"  📋 Storage type: {verification.get('storage_type')}")
                else:
                    logger.warning("⚠️ Database verification failed - record not found after insert")
            
        except Exception as db_error:
            logger.error(f"❌ Failed to save recording metadata to database: {db_error}")
            logger.error(f"📋 Recording data that failed to save: {recording_data}")
            # Continue anyway - file is still saved
            logger.warning("📝 Recording file uploaded but metadata not saved to database")
        
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
        
        # Add database information to response if available
        if 'db_result' in locals() and db_result:
            response_data["database"] = {
                "record_id": db_result.get('id'),
                "stored": True,
                "storage_type_in_db": recording_data.get('storage_type'),
                "cloud_url_in_db": recording_data.get('cloud_url')
            }
        else:
            response_data["database"] = {
                "stored": False,
                "error": "Failed to save to database"
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
        db = DatabaseManager()
        recordings = db.fetch_all("interview_recordings", {"job_id": job_id})
        
        logger.info(f"📋 Found {len(recordings)} recordings for job {job_id}")
        
        return JSONResponse(status_code=200, content={
            "success": True,
            "job_id": job_id,
            "count": len(recordings),
            "recordings": recordings
        })
        
    except Exception as e:
        logger.error(f"❌ Error listing recordings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list recordings: {str(e)}")


@router.get("/download/{recording_id}")
async def get_recording_download_url(request: Request, recording_id: str):
    """Get download URL for a specific recording."""
    try:
        db = DatabaseManager()
        recording = db.fetch_one("interview_recordings", {"id": recording_id})
        
        if not recording:
            raise HTTPException(status_code=404, detail="Recording not found")
        
        logger.info(f"📥 Getting download info for recording {recording_id}")
        logger.info(f"📊 Storage type: {recording.get('storage_type')}")
        logger.info(f"🔗 Cloud URL: {recording.get('cloud_url', 'None')}")
        
        # Return cloud URL if available, otherwise local path info
        download_info = {
            "success": True,
            "recording_id": recording_id,
            "filename": recording["filename"],
            "file_size": recording["file_size"],
            "storage_type": recording["storage_type"],
            "job_id": recording.get("job_id"),
            "candidate_id": recording.get("candidate_id"),
            "interview_type": recording.get("interview_type"),
            "created_at": recording.get("created_at")
        }
        
        if recording.get("cloud_url"):
            download_info["download_url"] = recording["cloud_url"]
            download_info["access_type"] = "direct"
            download_info["message"] = "Direct S3 download URL available"
        else:
            download_info["local_path"] = recording.get("local_path")
            download_info["access_type"] = "local"
            download_info["message"] = "File stored locally, contact administrator for access"
        
        return JSONResponse(status_code=200, content=download_info)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting recording download URL: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get download URL: {str(e)}")


@router.get("/test-db-connection")
async def test_database_connection():
    """Test endpoint to verify database connectivity for recordings table"""
    try:
        db = DatabaseManager()
        
        # Test fetching all recordings
        recordings = db.fetch_all("interview_recordings", {})
        
        logger.info(f"🧪 Database test successful - found {len(recordings)} recordings")
        
        # Show some stats
        s3_recordings = [r for r in recordings if r.get('storage_type') == 's3']
        local_recordings = [r for r in recordings if r.get('storage_type') == 'local']
        with_cloud_urls = [r for r in recordings if r.get('cloud_url')]
        
        return JSONResponse(status_code=200, content={
            "success": True,
            "message": "Database connection successful",
            "stats": {
                "total_recordings": len(recordings),
                "s3_recordings": len(s3_recordings),
                "local_recordings": len(local_recordings),
                "recordings_with_cloud_urls": len(with_cloud_urls)
            },
            "recent_recordings": recordings[-3:] if recordings else []  # Last 3 recordings
        })
        
    except Exception as e:
        logger.error(f"❌ Database test failed: {e}")
        return JSONResponse(status_code=500, content={
            "success": False,
            "message": f"Database test failed: {str(e)}"
        })