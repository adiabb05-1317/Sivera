from typing import Dict, Any, Optional, List, Literal
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel, Field, EmailStr
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from loguru import logger
from storage.db_manager import DatabaseManager, DatabaseError
import uuid
import secrets
import time
from datetime import datetime, timedelta
import os

from src.core.config import Config

# Set up more detailed logging
import logging
from loguru import logger as loguru_logger

# Ensure loguru is capturing all levels
loguru_logger.add("interview_router.log", level="DEBUG", rotation="5 MB")

router = APIRouter(prefix="/api/v1/interviews", tags=["interview"])

db = DatabaseManager()

# Pydantic models for request validation
class GenerateFlowRequest(BaseModel):
    job_description: str = Field(..., min_length=50, description="Job description for the interview flow")
    organization_id: str = Field(..., description="Organization ID")

class SendInviteRequest(BaseModel):
    email: EmailStr = Field(..., description="Candidate's email address")
    name: str = Field(..., description="Candidate's name")
    job: str = Field(..., description="Job title/position")
    organization_id: str = Field(..., description="Organization ID")
    sender_id: Optional[str] = Field(None, description="ID of the user sending the invitation")

class VerifyTokenRequest(BaseModel):
    token: str = Field(..., description="Verification token from email")

class CompleteRegistrationRequest(BaseModel):
    token: str = Field(..., description="Verification token from email")
    
class CreateUserRequest(BaseModel):
    email: EmailStr = Field(..., description="User's email address")
    name: str = Field(..., description="User's name")
    organization_id: str = Field(..., description="Organization ID")
    role: str = Field(default="candidate", description="User role, defaults to 'candidate'")
    candidate_id: Optional[str] = Field(None, description="ID of the candidate if exists")

class InterviewIn(BaseModel):
    title: str
    organization_id: str
    created_by: str
    status: Optional[Literal["draft", "active", "completed"]] = "draft"

class InterviewUpdate(BaseModel):
    title: Optional[str]
    status: Optional[Literal["draft", "active", "completed"]]

class InterviewOut(BaseModel):
    id: str
    title: str
    organization_id: str
    created_by: str
    status: Literal["draft", "active", "completed"]
    created_at: str
    updated_at: str

class CreateInterviewFromDescriptionRequest(BaseModel):
    title: str
    job_description: str
    flow_json: dict
    react_flow_json: dict
    organization_id: str
    created_by: str

class AddCandidateRequest(BaseModel):
    candidate_id: str

async def send_verification_email(email: str, name: str, job: str, token: str) -> None:
    """Background task to send verification email for new candidates"""
    logger.info(f"Starting to send verification email to {email} with token {token[:10]}...")
    try:
        message = MIMEMultipart()
        message["From"] = f"Flowterview Team <{Config.SMTP_USER}>"
        message["To"] = email
        message["Subject"] = f"Verify Your Email to Continue with Your {job} Interview"

        # Make sure the token is URL safe and properly encoded
        import urllib.parse
        encoded_token = urllib.parse.quote_plus(token)
        verify_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:3001')}/register?token={encoded_token}"
        logger.info(f"Generated verification URL with token: {encoded_token[:10]}...")

        html_content = f"""
        <div style="font-family: Arial, sans-serif; background: #f7f7fa; padding: 32px;">
            <div style="max-width: 540px; margin: auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 8px #e0e7ff; padding: 32px;">
                <h2 style="color: #4f46e5; margin-bottom: 0.5em;">Welcome to Flowterview, {name}! 🎉</h2>
                <p style="font-size: 1.1em; color: #333;">
                    You've been invited to interview for the <b>{job}</b> position.
                </p>
                <p style="font-size: 1.05em; color: #444;">
                    Your skills and experience have impressed our team, and we'd love to get to know you better!
                </p>
                <p style="font-size: 1.05em; color: #444;">
                    Please verify your email to continue to the interview process:
                </p>
                <div style="margin: 24px 0;">
                    <a href="{verify_url}" style="display:inline-block; background: #4f46e5; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 1.1em; font-weight: bold;">Verify Email & Continue</a>
                </div>
                <p style="color: #555;">
                    This link will expire in 7 days.<br>
                    If you have any questions, please contact us.
                </p>
                <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
                <p style="font-size: 0.95em; color: #888;">
                    Best regards,<br>
                    The Flowterview Team
                </p>
            </div>
        </div>
        """
        message.attach(MIMEText(html_content, "html"))

        # Send email using aiosmtplib
        # Log SMTP settings (without password)
        logger.info(f"Sending email using SMTP: {Config.SMTP_HOST}:{Config.SMTP_PORT}, user: {Config.SMTP_USER}")
        
        try:
            await aiosmtplib.send(
                message,
                hostname=Config.SMTP_HOST,
                port=Config.SMTP_PORT,
                username=Config.SMTP_USER,
                password=Config.SMTP_PASS,
                use_tls=True
            )
            logger.info(f"SMTP send operation completed for {email}")
        except Exception as smtp_error:
            logger.error(f"SMTP error: {str(smtp_error)}")
            # Don't raise as this is a background task
            # But log detailed error
            import traceback
            smtp_trace = traceback.format_exc()
            logger.error(f"SMTP error trace: {smtp_trace}")
        logger.info(f"Verification email sent successfully to {email}")
    except Exception as e:
        logger.error(f"Failed to send verification email to {email}: {e}")

async def send_interview_email(email: str, name: str, job: str, interview_url: str) -> None:
    """Background task to send direct interview email for existing candidates"""
    try:
        message = MIMEMultipart()
        message["From"] = f"Flowterview Team <{Config.SMTP_USER}>"
        message["To"] = email
        message["Subject"] = f"You're Invited: Interview for {job} at Flowterview!"

        html_content = f"""
        <div style="font-family: Arial, sans-serif; background: #f7f7fa; padding: 32px;">
            <div style="max-width: 540px; margin: auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 8px #e0e7ff; padding: 32px;">
                <h2 style="color: #4f46e5; margin-bottom: 0.5em;">Congratulations, {name}! 🎉</h2>
                <p style="font-size: 1.1em; color: #333;">
                    We are excited to invite you for an interview for the <b>{job}</b> position.
                </p>
                <p style="font-size: 1.05em; color: #444;">
                    Your skills and experience have impressed our team, and we'd love to get to know you better!
                </p>
                <div style="margin: 24px 0;">
                    <a href="{interview_url}" style="display:inline-block; background: #4f46e5; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 1.1em; font-weight: bold;">Start Your Interview</a>
                </div>
                <p style="color: #555;">
                    This link will take you directly to your interview.<br>
                    If you have any questions, just reply to this email.
                </p>
                <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
                <p style="font-size: 0.95em; color: #888;">
                    Best regards,<br>
                    The Flowterview Team
                </p>
            </div>
        </div>
        """
        message.attach(MIMEText(html_content, "html"))

        # Send email using aiosmtplib
        # Log SMTP settings (without password)
        logger.info(f"Sending email using SMTP: {Config.SMTP_HOST}:{Config.SMTP_PORT}, user: {Config.SMTP_USER}")
        
        try:
            await aiosmtplib.send(
                message,
                hostname=Config.SMTP_HOST,
                port=Config.SMTP_PORT,
                username=Config.SMTP_USER,
                password=Config.SMTP_PASS,
                use_tls=True
            )
            logger.info(f"SMTP send operation completed for {email}")
        except Exception as smtp_error:
            logger.error(f"SMTP error: {str(smtp_error)}")
            # Don't raise as this is a background task
            # But log detailed error
            import traceback
            smtp_trace = traceback.format_exc()
            logger.error(f"SMTP error trace: {smtp_trace}")
        logger.info(f"Interview email sent successfully to {email}")
    except Exception as e:
        logger.error(f"Failed to send interview email to {email}: {e}")

@router.post("/send-invite")
async def send_invite(
    request: SendInviteRequest,
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """
    Send an interview invitation email to the candidate
    If candidate exists, send direct interview link
    If candidate is new, send verification link
    """
    try:
        # First check if candidate exists as a registered user
        user = db.fetch_one(
            "users", 
            {"email": request.email}
        )
        
        # Also check if candidate exists in candidates table
        candidate = db.fetch_one(
            "candidates", 
            {"email": request.email}
        )
        
        # Try to find a matching interview for this job title
        matching_job = db.fetch_one(
            "jobs",
            {"title": request.job, "organization_id": request.organization_id}
        )
        
        interview_id = None
        if matching_job:
            # Find an active interview for this job
            matching_interview = db.fetch_one(
                "interviews",
                {"job_id": matching_job["id"], "status": "active"}
            )
            if matching_interview:
                interview_id = matching_interview["id"]
        
        # Only send direct link if the candidate is a registered user
        if user:
            # Candidate exists, send direct interview link
            logger.info(f"Candidate {request.email} exists, sending direct interview link")
            
            # Update candidate's organization_id if it's different
            if candidate.get("organization_id") != request.organization_id:
                db.update("candidates", {"organization_id": request.organization_id}, {"id": candidate["id"]})
            
            # If we have a matching interview, add candidate to it
            if interview_id:
                # Fetch current candidates_invited 
                current_interview = db.fetch_one("interviews", {"id": interview_id})
                current_invited = current_interview.get("candidates_invited", [])
                
                if candidate["id"] not in current_invited:
                    updated_invited = current_invited + [candidate["id"]]
                    db.update("interviews", {"candidates_invited": updated_invited}, {"id": interview_id})
            
            # Generate interview link
            interview_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:3001')}/interview/{interview_id if interview_id else 'latest'}"
            
            # Send interview email
            background_tasks.add_task(
                send_interview_email,
                request.email,
                request.name,
                request.job,
                interview_url
            )
            
            return {"success": True, "message": "Interview invitation sent to existing candidate"}
        else:
            # Not a registered user, create verification token (even if they exist in candidates table)
            logger.info(f"New candidate {request.email}, sending verification email")
            
            # Generate secure token
            token = secrets.token_urlsafe(32)
            expires_at = datetime.now() + timedelta(days=7)
            
            # Store token in database
            # Get any valid organization if one isn't provided
            org_id = request.organization_id
            
            # If organization doesn't exist or is invalid UUID, find a default
            try:
                uuid.UUID(str(org_id))  # Validate UUID format
                org_exists = db.fetch_one("organizations", {"id": org_id})
                if not org_exists:
                    # Organization ID doesn't exist, try to find any organization
                    logger.warning(f"Organization ID {org_id} not found, looking for default")
                    default_org = db.fetch_one("organizations", limit=1)
                    if default_org:
                        org_id = default_org['id']
                    else:
                        # Create a new organization as fallback
                        logger.warning("No organizations found, creating a default one")
                        new_org_id = str(uuid.uuid4())
                        db.execute_query("organizations", {
                            "id": new_org_id,
                            "name": "Default Organization",
                            "created_at": datetime.now().isoformat()
                        })
                        org_id = new_org_id
            except (ValueError, TypeError):
                # Invalid UUID format, find a default organization
                logger.warning(f"Invalid organization ID format: {org_id}")
                default_org = db.fetch_one("organizations", limit=1)
                if default_org:
                    org_id = default_org['id']
                else:
                    # Create a new organization as fallback
                    logger.warning("No organizations found, creating a default one")
                    new_org_id = str(uuid.uuid4())
                    db.execute_query("organizations", {
                        "id": new_org_id,
                        "name": "Default Organization",
                        "created_at": datetime.now().isoformat()
                    })
                    org_id = new_org_id
                
            # Create token
            try:
                # Log the token we're about to save
                logger.info(f"Creating verification token: {token[:10]}... for {request.email} with org_id: {org_id}")
                
                # Make sure the token is stored as a string
                token_data = {
                    "token": str(token),
                    "email": request.email,
                    "name": request.name,
                    "organization_id": str(org_id),  # Ensure org_id is a string
                    "job_title": request.job,
                    "interview_id": interview_id,
                    "expires_at": expires_at.isoformat()
                }
                
                # Store the token in the database
                result = db.execute_query("verification_tokens", token_data)
                logger.info(f"Token stored successfully: {result}")
                
                # Verify the token was saved by retrieving it
                saved_token = db.fetch_one("verification_tokens", {"token": token})
                if saved_token:
                    logger.info(f"Successfully verified token was saved for {request.email}")
                else:
                    logger.error(f"Failed to verify token was saved for {request.email}")
                logger.info(f"Successfully created verification token for {request.email}")
            except Exception as token_error:
                logger.error(f"Error creating verification token: {str(token_error)}")
                raise HTTPException(status_code=500, detail=f"Failed to create verification token: {str(token_error)}")
            
            # Send verification email
            try:
                logger.info(f"Scheduling verification email task for {request.email}")
                background_tasks.add_task(
                    send_verification_email,
                    request.email,
                    request.name,
                    request.job,
                    token
                )
                logger.info(f"Email task scheduled successfully for {request.email}")
            except Exception as email_error:
                logger.error(f"Error scheduling email task: {str(email_error)}")
                raise HTTPException(status_code=500, detail=f"Failed to schedule email task: {str(email_error)}")
            
            return {"success": True, "message": "Verification email sent to new candidate"}
    except HTTPException as he:
        # Pass through HTTP exceptions as-is
        raise he
        
    except Exception as e:
        logger.error(f"Error sending invite: {str(e)}")
        # Get more detailed error information
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Detailed error trace: {error_trace}")
        
        # Return a more specific error message to the frontend
        if "foreign key constraint" in str(e).lower():
            raise HTTPException(status_code=500, detail="Database foreign key error. Organization may not exist.")
        elif "smtp" in str(e).lower() or "email" in str(e).lower() or "aiosmtplib" in str(e).lower():
            raise HTTPException(status_code=500, detail="Failed to send email. Please check SMTP configuration.")
        else:
            raise HTTPException(status_code=500, detail=f"Failed to send invitation: {str(e)}")

@router.get("/job-id")
async def get_job_id_by_title(title: str, organization_id: str, request: Request):
    print(title, organization_id)
    try:
        job = db.fetch_one("jobs", {"title": title, "organization_id": organization_id})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return {"id": job["id"]}
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs-list")
async def fetch_jobs(request: Request):
    try:
        jobs = db.fetch_all("jobs", order_by="title")
        return [{"id": job["id"], "title": job["title"]} for job in jobs]
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-user")
async def create_user(request: CreateUserRequest) -> Dict[str, Any]:
    """
    Create a new user in the users table. This is a dedicated endpoint for user creation.
    """
    logger.info(f"Creating user in the users table: {request.email}, org_id: {request.organization_id}")
    
    try:
        # Generate unique user ID
        user_id = str(uuid.uuid4())
        
        # Build user data
        user_data = {
            "id": user_id,
            "email": request.email,
            "name": request.name,
            "role": request.role,
            "organization_id": request.organization_id,
        }
        
        # Add candidate_id if provided
        if request.candidate_id:
            user_data["candidate_id"] = request.candidate_id
            
        # Insert user data directly to users table
        try:
            logger.info(f"Inserting user with data: {user_data}")
            # Use direct Supabase insert
            result = db.supabase.table("users").insert(user_data).execute()
            
            # Log the result
            if result and result.data:
                logger.info(f"User created successfully: {result.data}")
                return {"success": True, "user_id": user_id, "message": "User created successfully"}
            else:
                logger.error(f"Failed to create user, empty result: {result}")
                return {"success": False, "message": "Failed to create user, no data returned"}
                
        except Exception as insert_error:
            logger.error(f"Failed to insert user: {str(insert_error)}")
            return {"success": False, "message": f"Failed to create user: {str(insert_error)}"}
    
    except Exception as e:
        logger.error(f"Error in create_user: {str(e)}")
        return {"success": False, "message": f"Error creating user: {str(e)}"}

@router.post("/verify-token")
async def verify_token(request: VerifyTokenRequest) -> Dict[str, Any]:
    """
    Verify a token from an email verification link
    """
    logger.info(f"Verifying token: {request.token[:10]}...")
    
        # For debugging, let's list all tokens in the database
    try:
        all_tokens = db.fetch_all("verification_tokens")
        logger.info(f"Found {len(all_tokens)} tokens in database")
        
        # Check if the current token is in the database
        token_found = False
        for token_record in all_tokens:
            # Log each token (first 10 chars only for security)
            db_token = token_record.get('token', '')
            logger.info(f"Token in DB: {db_token[:10] if db_token else 'None'}... for {token_record.get('email')}")
            
            # Check if this matches our current token
            if db_token and db_token == request.token:
                token_found = True
                logger.info(f"Found matching token in database for verification")
                
        if not token_found and all_tokens:
            logger.warning(f"Current token {request.token[:10]}... not found in database")
            
    except Exception as db_error:
        logger.error(f"Error checking all tokens: {str(db_error)}")
    
    try:
        # Find token in database - handle URL-encoded tokens
        import urllib.parse
        # Try to decode the token in case it's URL-encoded
        decoded_token = urllib.parse.unquote_plus(request.token)
        logger.info(f"Searching for token (decoded): {decoded_token[:10]}...")
        
        # Try to find by both encoded and decoded token
        token_data = db.fetch_one("verification_tokens", {"token": decoded_token})
        
        if not token_data:
            # Try the original token as well
            logger.info(f"Token not found with decoded version, trying original")
            token_data = db.fetch_one("verification_tokens", {"token": request.token})
        
        if not token_data:
            logger.warning(f"Token not found: {request.token[:10]}...")
            return {"valid": False, "message": "Invalid token"}
        
        logger.info(f"Token found for: {token_data.get('email')}")
        
        # Check if token is expired
        try:
            expires_at = datetime.fromisoformat(token_data["expires_at"])
            now = datetime.now()
            logger.info(f"Token expires at: {expires_at}, current time: {now}")
            
            if expires_at < now:
                logger.warning(f"Token expired at {expires_at}")
                return {"valid": False, "message": "Token has expired"}
        except Exception as date_error:
            logger.error(f"Error parsing dates: {str(date_error)}")
            # Continue even if date parsing fails
        
        # Token is valid
        logger.info(f"Token validation successful for {token_data.get('email')}")
        return {
            "valid": True,
            "name": token_data.get("name", ""),
            "email": token_data.get("email", ""),
            "job_title": token_data.get("job_title", ""),
            "organization_id": token_data.get("organization_id", "")
        }
    except Exception as e:
        logger.error(f"Error verifying token: {str(e)}")
        import traceback
        logger.error(f"Detailed error trace: {traceback.format_exc()}")
        # Return a user-friendly error instead of raising an exception
        return {"valid": False, "message": f"Error verifying token: {str(e)}"}

@router.post("/complete-registration")
async def complete_registration(request: CompleteRegistrationRequest) -> Dict[str, Any]:
    """
    Complete registration for a new candidate
    """
    logger.info(f"Starting complete registration with token: {request.token[:10]}...")
    
    try:
        # Handle URL-encoded tokens just like in the verify endpoint
        import urllib.parse
        decoded_token = urllib.parse.unquote_plus(request.token)
        
        # Try to find the token using both the decoded and original values
        token_data = db.fetch_one("verification_tokens", {"token": decoded_token})
        if not token_data:
            token_data = db.fetch_one("verification_tokens", {"token": request.token})
        
        if not token_data:
            return {"success": False, "message": "Invalid token. Please use the link from your email again."}
        
        logger.info(f"Token found for registration: {token_data.get('email')}")
        
        # Check if token is expired - handle timezone-aware vs naive datetime comparison
        try:
            expires_at = datetime.fromisoformat(token_data["expires_at"])
            
            # Make sure both datetimes are naive (no timezone info)
            if expires_at.tzinfo is not None:
                # Convert expires_at to naive by removing timezone
                expires_at = expires_at.replace(tzinfo=None)
                
            # Now compare with naive datetime.now()
            if expires_at < datetime.now():
                return {"success": False, "message": "This verification link has expired. Please request a new invitation."}
        except Exception as date_error:
            logger.error(f"Error comparing dates: {str(date_error)}")
            # Continue even if date comparison fails
        
        # Get organization ID
        org_id = token_data.get("organization_id")
        if not org_id:
            # Try to get any organization
            default_org = db.fetch_one("organizations", limit=1)
            if default_org:
                org_id = default_org.get("id")
                logger.info(f"Using default organization: {org_id}")
        
        # Check if candidate already exists (they should, since the recruiter already added them)
        existing_candidate = db.fetch_one("candidates", {"email": token_data.get("email")})
        
        if existing_candidate:
            # Use the existing candidate
            candidate_id = existing_candidate["id"]
            logger.info(f"Using existing candidate with ID: {candidate_id}")
            
            # Get the job_id from the existing candidate
            job_id = existing_candidate.get("job_id")
            logger.info(f"Using job ID from existing candidate: {job_id}")
        else:
            # This shouldn't happen normally, but let's handle it as a fallback
            candidate_id = str(uuid.uuid4())
            logger.info(f"Creating new candidate with ID: {candidate_id} (unexpected path)")
            
            # Get job information from token data
            job_title = token_data.get("job_title")
            
            # Find or create a job_id (since it's required and can't be null)
            job_id = None
            
            if job_title:
                # Try to find an existing job with this title
                existing_job = db.fetch_one("jobs", {"title": job_title})
                if existing_job:
                    job_id = existing_job.get("id")
                    logger.info(f"Found existing job with ID: {job_id}")
            
            if not job_id:
                # Try to get any job from the database
                any_job = db.fetch_one("jobs", limit=1)
                if any_job:
                    job_id = any_job.get("id")
                    logger.info(f"Using default job ID: {job_id}")
                else:
                    # Need to create a job as it's required
                    job_id = str(uuid.uuid4())
                    db.execute_query("jobs", {
                        "id": job_id,
                        "title": job_title or "Default Job",
                        "organization_id": org_id,
                        "created_at": datetime.now().isoformat()
                    })
                    logger.info(f"Created new job with ID: {job_id}")
            
            # Only add to candidates table if we didn't find an existing one
            db.execute_query("candidates", {
                "id": candidate_id,
                "name": token_data.get("name", ""),
                "email": token_data.get("email", ""),
                "organization_id": org_id,
                "job_id": job_id,  # Add the required job_id
                "status": "Applied"
            })
            logger.info(f"Added new candidate as fallback")
        
        # Create a new user directly in the users table
        user_id = str(uuid.uuid4())
        logger.info(f"Creating new user with ID: {user_id}")
        
        # Add user to users table directly
        try:
            # Get the name from token data
            candidate_name = token_data.get("name", "").strip() 
            logger.info(f"Candidate name from token: '{candidate_name}'")
            
            # Create user data object with name always included
            user_data = {
                "id": user_id,
                "email": token_data.get("email"),
                "name": candidate_name or "Anonymous Candidate",  # Ensure name is never null/empty
                "role": "candidate",
                "candidate_id": candidate_id
            }
                
            if org_id:
                user_data["organization_id"] = org_id
            
            logger.info(f"Adding user to users table: {user_data}")
            
            # Insert directly into users table
            result = db.supabase.table("users").insert(user_data).execute()
            
            if result and result.data:
                logger.info(f"User created successfully: {result.data}")
            else:
                logger.warning("User may not have been created - empty result")
                
        except Exception as user_error:
            logger.error(f"Error creating user: {str(user_error)}")
            
            # Try fallback with minimal fields
            try:
                # Get candidate name again to be sure
                candidate_name = token_data.get("name", "").strip()
                
                # Create minimal user with name included
                minimal_user = {
                    "id": user_id,
                    "email": token_data.get("email"),
                    "name": candidate_name or "Anonymous Candidate",  # Ensure name is never null
                    "role": "candidate"
                }              
                logger.info(f"Trying minimal user insert: {minimal_user}")
                result = db.supabase.table("users").insert(minimal_user).execute()
                logger.info(f"Minimal user insert result: {result.data if result else 'No result'}")
            except Exception as minimal_error:
                logger.error(f"Even minimal user creation failed: {str(minimal_error)}")
                # Continue anyway - we'll have the candidate entry at least
        
        # If we have an interview_id, add candidate to it
        interview_id = token_data.get("interview_id")
        if interview_id:
            current_interview = db.fetch_one("interviews", {"id": interview_id})
            if current_interview:
                current_invited = current_interview.get("candidates_invited", [])
                if candidate_id not in current_invited:
                    updated_invited = current_invited + [candidate_id]
                    db.update("interviews", {"candidates_invited": updated_invited}, {"id": interview_id})
        
        # Generate interview URL
        interview_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:3001')}/interview/{interview_id if interview_id else 'latest'}"
        
        # Delete the token after successful registration
        try:
            db.delete("verification_tokens", {"token": token_data.get("token")})
        except Exception as delete_error:
            logger.error(f"Error deleting token: {str(delete_error)}")
        
        return {
            "success": True,
            "message": "Registration completed successfully",
            "candidate_id": candidate_id,
            "user_id": user_id,
            "interview_url": interview_url,
            "name": token_data.get("name"),
            "email": token_data.get("email"),
            "organization_id": org_id
        }
    except Exception as e:
        logger.error(f"Error completing registration: {str(e)}")
        import traceback
        logger.error(f"Detailed error trace: {traceback.format_exc()}")
        return {"success": False, "message": f"Registration failed: {str(e)}"}

@router.post("/from-description")
async def create_interview_from_description(request: CreateInterviewFromDescriptionRequest):
    try:
        # 1. Store the flow in interview_flows (now with react_flow_json)
        flow = db.execute_query("interview_flows", {
            "name": request.title,
            "flow_json": request.flow_json,
            "react_flow_json": request.react_flow_json,
            "created_by": request.created_by
        })
        flow_id = flow["id"]
        # 2. Create the job
        job = db.execute_query("jobs", {
            "title": request.title,
            "description": request.job_description,
            "organization_id": request.organization_id,
            "flow_id": flow_id
        })
        job_id = job["id"]
        # 3. Create the interview
        interview = db.execute_query("interviews", {
            "job_id": job_id,
            "status": "draft"
        })
        # 4. Return the interview info (with job title)
        return {
            "id": interview["id"],
            "title": job["title"],
            "status": interview["status"],
            "date": interview["created_at"][:10] if interview.get("created_at") else "",
            "job_id": job_id,
            "flow_id": flow_id
        }
    except DatabaseError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{interview_id}/add-candidate")
async def add_candidate_to_interview(interview_id: str, req: AddCandidateRequest, request: Request):
    try:
        # Fetch current candidates_invited
        interview = db.fetch_one("interviews", {"id": interview_id})
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        current_invited = interview.get("candidates_invited", [])
        updated_invited = current_invited if req.candidate_id in current_invited else current_invited + [req.candidate_id]
        db.update("interviews", {"candidates_invited": updated_invited}, {"id": interview_id})
        return {"success": True, "candidates_invited": updated_invited}
    except DatabaseError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{interview_id}/job")
async def get_interview_job(interview_id: str, request: Request):
    try:
        interview = db.fetch_one("interviews", {"id": interview_id})
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        return {"id": interview["id"], "job_id": interview["job_id"]}
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[Dict[str, Any]])
async def list_interviews(request: Request):
    try:
        interviews = db.fetch_all("interviews")
        result = []
        for interview in interviews:
            # Fetch job title
            job = db.fetch_one("jobs", {"id": interview["job_id"]})
            job_title = job["title"] if job else "Unknown"
            # Count candidates (from candidate_interviews)
            candidate_count = len(interview.get("candidates_invited", []))
            # Format date
            date = interview["created_at"][:10] if interview.get("created_at") else ""
            # Status
            status = interview.get("status", "open")
            result.append({
                "id": interview["id"],
                "title": job_title,
                "candidates": candidate_count,
                "status": status,
                "date": date,
            })
        return result
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=InterviewOut)
async def create_interview(interview: InterviewIn, request: Request):
    try:
        created_interview = db.execute_query("interviews", interview.dict())
        return created_interview
    except DatabaseError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{interview_id}", response_model=InterviewOut)
async def update_interview(interview_id: str, updates: InterviewUpdate, request: Request):
    try:
        update_dict = {k: v for k, v in updates.dict().items() if v is not None}
        updated = db.update("interviews", update_dict, {"id": interview_id})
        if not updated:
            raise HTTPException(status_code=404, detail="Interview not found or not updated")
        return updated[0]
    except DatabaseError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{interview_id}")
async def get_interview(interview_id: str, request: Request):
    try:
        # 1. Get interview
        interview = db.fetch_one("interviews", {"id": interview_id})
        candidates = len(interview.get("candidates_invited", []))
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        # 2. Get job
        job = db.fetch_one("jobs", {"id": interview["job_id"]})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found for interview")
        # 3. Get flow
        flow = db.fetch_one("interview_flows", {"id": job.get("flow_id")}) if job.get("flow_id") else None
        # 4. Get candidates (join candidate_interviews + candidates)
        # 5. Build response
        return {
            "interview": interview,
            "job": job,
            "flow": {"react_flow_json": flow["react_flow_json"]} if flow else None,
            "candidates": candidates
        }
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e)) 