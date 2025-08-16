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
from src.services.video_optimizer import video_optimizer

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
            
            # Verify upload by checking object size
            try:
                response = s3_client.head_object(Bucket=self.bucket_name, Key=object_key)
                s3_file_size = response['ContentLength']
                local_file_size = os.path.getsize(file_path)
                
                if s3_file_size != local_file_size:
                    logger.error(f"❌ S3 upload size mismatch: local={local_file_size}, s3={s3_file_size}")
                    raise Exception(f"Upload verification failed: size mismatch (local: {local_file_size}, S3: {s3_file_size})")
                
                logger.info(f"✅ Upload verified: {s3_file_size} bytes match local file")
            except Exception as verify_error:
                logger.error(f"❌ Upload verification failed: {verify_error}")
                # Don't raise here - upload might still be valid
            
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


async def optimize_recording_video_internal(recording_id: str, object_key: str, cloud_url: str) -> dict:
    """
    Internal function to optimize a recording's video file for web streaming.
    This is called automatically after upload.
    """
    try:
        # Check if FFmpeg is available
        if not video_optimizer._check_ffmpeg():
            logger.warning("⚠️ FFmpeg not available - skipping automatic optimization")
            return {"success": False, "reason": "FFmpeg not available"}
        
        # Download from S3
        import boto3
        from botocore.exceptions import ClientError
        
        aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
        aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        aws_region = os.getenv("AWS_REGION", "us-east-1")
        
        if not aws_access_key or not aws_secret_key:
            logger.warning("⚠️ AWS credentials not configured - skipping optimization")
            return {"success": False, "reason": "AWS credentials not configured"}
        
        s3_client = boto3.client(
            's3',
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key,
            region_name=aws_region
        )
        
        # Extract bucket from cloud_url
        bucket_name = cloud_url.split('/')[2].split('.')[0]
        
        # Download to temp file
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_file:
            temp_path = temp_file.name
            
            logger.info(f"📥 Downloading from S3 for optimization: {bucket_name}/{object_key}")
            s3_client.download_file(bucket_name, object_key, temp_path)
            
            # Optimize the video
            logger.info(f"🎬 Optimizing video: {temp_path}")
            success, optimized_path = video_optimizer.optimize_webm_for_streaming(temp_path)
            
            if success:
                # Upload optimized version back to S3
                optimized_key = object_key.replace('.webm', '_optimized.webm')
                
                logger.info(f"📤 Uploading optimized video: {optimized_key}")
                s3_client.upload_file(
                    optimized_path,
                    bucket_name,
                    optimized_key,
                    ExtraArgs={
                        'ContentType': 'video/webm',
                        'ServerSideEncryption': 'AES256'
                    }
                )
                
                # Generate new cloud URL
                optimized_cloud_url = f"https://{bucket_name}.s3.{aws_region}.amazonaws.com/{optimized_key}"
                
                # Update database with optimized version
                db = DatabaseManager()
                optimized_filename = f"interview-recording-{recording_id}_optimized.webm"
                
                update_data = {
                    "filename": optimized_filename,
                    "object_key": optimized_key,
                    "cloud_url": optimized_cloud_url,
                    "updated_at": datetime.utcnow().isoformat()
                }
                
                # Add metadata about optimization
                metadata = {
                    "optimized": True,
                    "optimization_date": datetime.utcnow().isoformat(),
                    "original_object_key": object_key,
                    "original_cloud_url": cloud_url,
                    "auto_optimized": True
                }
                
                # Convert to proper JSON string
                import json
                metadata_json = json.dumps(metadata)
                
                update_data["metadata"] = metadata_json
                
                db.update("interview_recordings", {"id": recording_id}, update_data)
                
                # Cleanup temp files
                os.unlink(temp_path)
                os.unlink(optimized_path)
                
                logger.info(f"✅ Internal video optimization completed successfully")
                logger.info(f"🔗 New optimized URL: {optimized_cloud_url}")
                
                return {
                    "success": True,
                    "optimized_url": optimized_cloud_url,
                    "optimized_key": optimized_key
                }
                
            else:
                # Cleanup temp file
                os.unlink(temp_path)
                logger.error("❌ Internal video optimization failed")
                return {"success": False, "reason": "Optimization process failed"}
                
    except ClientError as e:
        logger.error(f"❌ S3 error during internal optimization: {e}")
        return {"success": False, "reason": f"S3 error: {str(e)}"}
    except Exception as e:
        logger.error(f"❌ Error during internal video optimization: {e}")
        return {"success": False, "reason": f"Optimization error: {str(e)}"}


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


@router.options("/presigned-url")
async def presigned_url_options():
    """Handle CORS preflight request for presigned URL endpoint."""
    return JSONResponse(
        status_code=200,
        content={"message": "CORS preflight successful"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )


@router.post("/presigned-url")
async def get_presigned_upload_url(
    request: Request,
    job_id: str = Form(...),
    candidate_id: str = Form(...),
    timestamp: str = Form(...),
    file_size: int = Form(...),
    interview_type: str = Form("ai_interview"),
    round_number: int = Form(None),
    interview_id: str = Form(None),
    round_token: str = Form(None),
    content_type: str = Form("video/webm")
):
    """
    Generate pre-signed URL for direct S3 upload from client.
    """
    try:
        # Validate file size (max 2GB)
        max_size = 2 * 1024 * 1024 * 1024  # 2GB
        if file_size > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {max_size // (1024*1024)}MB."
            )

        # Check if S3 is configured
        if not storage_manager.bucket_name:
            raise HTTPException(
                status_code=503,
                detail="S3 storage not configured"
            )

        # Generate object key
        file_extension = "webm"  # Default to webm
        if content_type == "video/mp4":
            file_extension = "mp4"
        
        object_key = storage_manager.generate_object_key(job_id, candidate_id, timestamp, file_extension)
        
        # Generate presigned URL
        try:
            import boto3
            from botocore.exceptions import ClientError, NoCredentialsError
        except ImportError:
            raise HTTPException(status_code=500, detail="boto3 not installed")
        
        # Get AWS credentials
        aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
        aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        aws_region = os.getenv("AWS_REGION", "us-east-1")
        
        if not aws_access_key or not aws_secret_key:
            raise HTTPException(status_code=500, detail="AWS credentials not configured")
        
        try:
            s3_client = boto3.client(
                's3',
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                region_name=aws_region
            )
            
            # Generate presigned URL for PUT operation (15 minutes expiry)
            presigned_url = s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': storage_manager.bucket_name,
                    'Key': object_key,
                    'ContentType': content_type,
                    'ServerSideEncryption': 'AES256'
                },
                ExpiresIn=900  # 15 minutes
            )
            
            # Generate the final object URL
            object_url = f"https://{storage_manager.bucket_name}.s3.{aws_region}.amazonaws.com/{object_key}"
            
            logger.info(f"📋 Generated presigned URL for: {object_key}")
            logger.info(f"🗂️ Expected file size: {file_size} bytes")
            
            response_data = {
                "success": True,
                "presigned_url": presigned_url,
                "object_key": object_key,
                "object_url": object_url,
                "bucket": storage_manager.bucket_name,
                "region": aws_region,
                "content_type": content_type,
                "expires_in": 900,  # 15 minutes
                "job_id": job_id,
                "candidate_id": candidate_id,
                "timestamp": timestamp
            }
            
            return JSONResponse(status_code=200, content=response_data)
            
        except NoCredentialsError:
            raise HTTPException(status_code=500, detail="AWS credentials not found")
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            logger.error(f"❌ AWS S3 error: {error_code}")
            raise HTTPException(status_code=500, detail=f"S3 error: {error_code}")
        except Exception as e:
            logger.error(f"❌ Error generating presigned URL: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to generate presigned URL: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error in presigned URL generation: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/confirm-upload")
async def confirm_upload(
    request: Request,
    object_key: str = Form(...),
    object_url: str = Form(...),
    job_id: str = Form(...),
    candidate_id: str = Form(...),
    timestamp: str = Form(...),
    file_size: int = Form(...),
    interview_type: str = Form("ai_interview"),
    round_number: int = Form(None),
    interview_id: str = Form(None),
    round_token: str = Form(None),
    content_type: str = Form("video/mp4")
    ):
       
    try:
        # Verify the file exists in S3 and get actual size
        try:
            import boto3
            from botocore.exceptions import ClientError
            
            aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
            aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
            aws_region = os.getenv("AWS_REGION", "us-east-1")
            
            if aws_access_key and aws_secret_key:
                s3_client = boto3.client(
                    's3',
                    aws_access_key_id=aws_access_key,
                    aws_secret_access_key=aws_secret_key,
                    region_name=aws_region
                )
                
                # Verify file exists and get actual size
                try:
                    response = s3_client.head_object(Bucket=storage_manager.bucket_name, Key=object_key)
                    actual_file_size = response['ContentLength']
                    
                    logger.info(f"✅ S3 upload verified: {object_key}")
                    logger.info(f"📊 File size: {actual_file_size} bytes")
                    
                    # Update file_size with actual size from S3
                    file_size = actual_file_size
                    
                except ClientError as e:
                    if e.response['Error']['Code'] == 'NoSuchKey':
                        logger.error(f"❌ File not found in S3: {object_key}")
                        raise HTTPException(status_code=404, detail="File not found in S3")
                    else:
                        logger.error(f"❌ S3 verification error: {e}")
                        # Continue anyway - file might exist but we can't verify
                        
        except Exception as e:
            logger.warning(f"⚠️ Could not verify S3 upload: {e}")
            # Continue anyway - don't fail the entire operation
        
        # Generate filename for database record
        file_extension = object_key.split('.')[-1] if '.' in object_key else 'webm'
        safe_filename = f"interview-recording-{job_id}-{candidate_id}-{timestamp}.{file_extension}"
        
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
            "content_type": content_type,
            "upload_method": "presigned_url"
        }
        
        # Store recording info in database
        try:
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
                "storage_type": "s3",
                "cloud_url": object_url,
                "object_key": object_key,
                "local_path": None,  # No local path for direct S3 uploads
                "metadata": metadata,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            logger.info(f"💾 Storing S3 upload metadata to database:")
            logger.info(f"  📊 Storage type: s3 (direct upload)")
            logger.info(f"  🔗 Cloud URL: {object_url}")
            logger.info(f"  🔑 Object key: {object_key}")
            logger.info(f"  📏 File size: {file_size} bytes")
            
            # Insert into database
            db_result = db.execute_query("interview_recordings", recording_data)
            recording_id = db_result.get('id')
            logger.info(f"✅ Recording metadata saved to database with ID: {recording_id}")
            
            # Automatically optimize the video for web streaming (if enabled)
            optimization_result = None
            if Config.AUTO_OPTIMIZE_VIDEOS and Config.VIDEO_OPTIMIZATION_ENABLED:
                try:
                    logger.info(f"🎬 Starting automatic video optimization for recording {recording_id}")
                    optimization_result = await optimize_recording_video_internal(recording_id, object_key, object_url)
                    
                    if optimization_result and optimization_result.get('success'):
                        logger.info(f"✅ Automatic video optimization completed successfully")
                    else:
                        logger.warning(f"⚠️ Automatic video optimization failed, but upload was successful")
                        
                except Exception as opt_error:
                    logger.warning(f"⚠️ Automatic video optimization failed: {opt_error}")
                    # Don't fail the upload if optimization fails
            else:
                logger.info(f"⏭️ Automatic video optimization disabled - skipping")
            
            response_data = {
                "success": True,
                "message": "Upload confirmed and metadata stored",
                "database_id": recording_id,
                "object_key": object_key,
                "object_url": object_url,
                "file_size": file_size,
                "storage_type": "s3",
                "optimization_status": "completed" if optimization_result and optimization_result.get('success') else "failed"
            }
            
            return JSONResponse(status_code=200, content=response_data)
            
        except Exception as db_error:
            logger.error(f"❌ Failed to save recording metadata to database: {db_error}")
            raise HTTPException(
                status_code=500, 
                detail=f"Upload successful but failed to store metadata: {str(db_error)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error confirming upload: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to confirm upload: {str(e)}")


@router.options("/confirm-upload")
async def confirm_upload_options():
    """Handle CORS preflight request for confirm upload endpoint."""
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


@router.post("/optimize/{recording_id}")
async def optimize_recording_video(request: Request, recording_id: str):
    """
    Optimize a recording's video file for web streaming.
    Downloads from S3, optimizes, and re-uploads.
    """
    try:
        db = DatabaseManager()
        recording = db.fetch_one("interview_recordings", {"id": recording_id})
        
        if not recording:
            raise HTTPException(status_code=404, detail="Recording not found")
        
        if recording.get("storage_type") != "s3":
            raise HTTPException(status_code=400, detail="Only S3 recordings can be optimized")
        
        if not recording.get("cloud_url"):
            raise HTTPException(status_code=400, detail="Recording has no cloud URL")
        
        logger.info(f"🎬 Starting video optimization for recording {recording_id}")
        logger.info(f"📊 Original file: {recording.get('filename')}")
        logger.info(f"🔗 Cloud URL: {recording.get('cloud_url')}")
        
        # Download from S3
        try:
            import boto3
            from botocore.exceptions import ClientError
            
            aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
            aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
            aws_region = os.getenv("AWS_REGION", "us-east-1")
            
            if not aws_access_key or not aws_secret_key:
                raise HTTPException(status_code=500, detail="AWS credentials not configured")
            
            s3_client = boto3.client(
                's3',
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                region_name=aws_region
            )
            
            # Extract bucket and key from cloud_url
            cloud_url = recording["cloud_url"]
            bucket_name = cloud_url.split('/')[2].split('.')[0]
            object_key = recording["object_key"]
            
            # Download to temp file
            import tempfile
            with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_file:
                temp_path = temp_file.name
                
                logger.info(f"📥 Downloading from S3: {bucket_name}/{object_key}")
                s3_client.download_file(bucket_name, object_key, temp_path)
                
                # Optimize the video
                logger.info(f"🎬 Optimizing video: {temp_path}")
                success, optimized_path = video_optimizer.optimize_webm_for_streaming(temp_path)
                
                if success:
                    # Upload optimized version back to S3
                    optimized_key = object_key.replace('.webm', '_optimized.webm')
                    
                    logger.info(f"📤 Uploading optimized video: {optimized_key}")
                    s3_client.upload_file(
                        optimized_path,
                        bucket_name,
                        optimized_key,
                        ExtraArgs={
                            'ContentType': 'video/webm',
                            'ServerSideEncryption': 'AES256'
                        }
                    )
                    
                    # Generate new cloud URL
                    optimized_cloud_url = f"https://{bucket_name}.s3.{aws_region}.amazonaws.com/{optimized_key}"
                    
                    # Update database with optimized version
                    optimized_filename = recording["filename"].replace('.webm', '_optimized.webm')
                    
                    update_data = {
                        "filename": optimized_filename,
                        "object_key": optimized_key,
                        "cloud_url": optimized_cloud_url,
                        "updated_at": datetime.utcnow().isoformat()
                    }
                    
                    # Add metadata about optimization
                    if recording.get("metadata"):
                        metadata = recording["metadata"]
                    else:
                        metadata = {}
                    
                    metadata["optimized"] = True
                    metadata["optimization_date"] = datetime.utcnow().isoformat()
                    metadata["original_object_key"] = object_key
                    metadata["original_cloud_url"] = cloud_url
                    
                    # Convert to proper JSON string
                    import json
                    metadata_json = json.dumps(metadata)
                    update_data["metadata"] = metadata_json
                    
                    db.update("interview_recordings", {"id": recording_id}, update_data)
                    
                    # Cleanup temp files
                    os.unlink(temp_path)
                    os.unlink(optimized_path)
                    
                    logger.info(f"✅ Video optimization completed successfully")
                    logger.info(f"🔗 New optimized URL: {optimized_cloud_url}")
                    
                    return JSONResponse(status_code=200, content={
                        "success": True,
                        "message": "Video optimized successfully",
                        "recording_id": recording_id,
                        "original_url": cloud_url,
                        "optimized_url": optimized_cloud_url,
                        "original_key": object_key,
                        "optimized_key": optimized_key
                    })
                    
                else:
                    # Cleanup temp file
                    os.unlink(temp_path)
                    raise HTTPException(status_code=500, detail="Video optimization failed")
                    
        except ClientError as e:
            logger.error(f"❌ S3 error during optimization: {e}")
            raise HTTPException(status_code=500, detail=f"S3 error: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error optimizing video: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to optimize video: {str(e)}")


@router.post("/create-mp4-fallback/{recording_id}")
async def create_mp4_fallback(request: Request, recording_id: str):
    """
    Create an MP4 fallback version of a WebM recording for better browser compatibility.
    """
    try:
        db = DatabaseManager()
        recording = db.fetch_one("interview_recordings", {"id": recording_id})
        
        if not recording:
            raise HTTPException(status_code=404, detail="Recording not found")
        
        if recording.get("storage_type") != "s3":
            raise HTTPException(status_code=400, detail="Only S3 recordings can be converted")
        
        if not recording.get("cloud_url"):
            raise HTTPException(status_code=400, detail="Recording has no cloud URL")
        
        logger.info(f"🎬 Creating MP4 fallback for recording {recording_id}")
        
        # Download from S3
        try:
            import boto3
            from botocore.exceptions import ClientError
            
            aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
            aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
            aws_region = os.getenv("AWS_REGION", "us-east-1")
            
            if not aws_access_key or not aws_secret_key:
                raise HTTPException(status_code=500, detail="AWS credentials not configured")
            
            s3_client = boto3.client(
                's3',
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                region_name=aws_region
            )
            
            cloud_url = recording["cloud_url"]
            bucket_name = cloud_url.split('/')[2].split('.')[0]
            object_key = recording["object_key"]
            
            # Download to temp file
            import tempfile
            with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_file:
                temp_path = temp_file.name
                
                logger.info(f"📥 Downloading from S3: {bucket_name}/{object_key}")
                s3_client.download_file(bucket_name, object_key, temp_path)
                
                # Create MP4 fallback
                success, mp4_path = video_optimizer.create_mp4_fallback(temp_path)
                
                if success:
                    # Upload MP4 version to S3
                    mp4_key = object_key.replace('.webm', '.mp4')
                    
                    logger.info(f"📤 Uploading MP4 fallback: {mp4_key}")
                    s3_client.upload_file(
                        mp4_path,
                        bucket_name,
                        mp4_key,
                        ExtraArgs={
                            'ContentType': 'video/mp4',
                            'ServerSideEncryption': 'AES256'
                        }
                    )
                    
                    # Generate MP4 cloud URL
                    mp4_cloud_url = f"https://{bucket_name}.s3.{aws_region}.amazonaws.com/{mp4_key}"
                    
                    # Update database with MP4 fallback info
                    mp4_filename = recording["filename"].replace('.webm', '.mp4')
                    
                    update_data = {
                        "mp4_fallback_url": mp4_cloud_url,
                        "mp4_object_key": mp4_key,
                        "mp4_filename": mp4_filename,
                        "updated_at": datetime.utcnow().isoformat()
                    }
                    
                    # Add metadata about MP4 fallback
                    if recording.get("metadata"):
                        metadata = recording["metadata"]
                    else:
                        metadata = {}
                    
                    metadata["mp4_fallback_created"] = True
                    metadata["mp4_fallback_date"] = datetime.utcnow().isoformat()
                    metadata["mp4_fallback_url"] = mp4_cloud_url
                    
                    # Convert to proper JSON string
                    import json
                    metadata_json = json.dumps(metadata)
                    update_data["metadata"] = metadata_json
                    
                    db.update("interview_recordings", {"id": recording_id}, update_data)
                    
                    # Cleanup temp files
                    os.unlink(temp_path)
                    os.unlink(mp4_path)
                    
                    logger.info(f"✅ MP4 fallback created successfully")
                    logger.info(f"🔗 MP4 URL: {mp4_cloud_url}")
                    
                    return JSONResponse(status_code=200, content={
                        "success": True,
                        "message": "MP4 fallback created successfully",
                        "recording_id": recording_id,
                        "webm_url": cloud_url,
                        "mp4_url": mp4_cloud_url,
                        "webm_key": object_key,
                        "mp4_key": mp4_key
                    })
                    
                else:
                    # Cleanup temp file
                    os.unlink(temp_path)
                    raise HTTPException(status_code=500, detail="MP4 conversion failed")
                    
        except ClientError as e:
            logger.error(f"❌ S3 error during MP4 conversion: {e}")
            raise HTTPException(status_code=500, detail=f"S3 error: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creating MP4 fallback: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create MP4 fallback: {str(e)}")