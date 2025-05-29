from typing import Dict, Any, Optional, List, Literal
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request, Path
from pydantic import BaseModel, Field, EmailStr
import aiosmtplib
import urllib.parse
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from loguru import logger
from storage.db_manager import DatabaseManager, DatabaseError
from src.utils.auth_middleware import (
    require_auth,
    require_organization,
    get_user_context_optional,
)
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
    job_description: str = Field(
        ..., min_length=50, description="Job description for the interview flow"
    )
    organization_id: str = Field(..., description="Organization ID")


class SendInviteRequest(BaseModel):
    email: EmailStr = Field(..., description="Candidate's email address")
    name: str = Field(..., description="Candidate's name")
    job: str = Field(..., description="Job title/position")
    organization_id: str = Field(..., description="Organization ID")
    sender_id: Optional[str] = Field(
        None, description="ID of the user sending the invitation"
    )


class VerifyTokenRequest(BaseModel):
    token: str = Field(..., description="Verification token from email")


class CompleteRegistrationRequest(BaseModel):
    token: str = Field(..., description="Verification token from email")


class CreateUserRequest(BaseModel):
    email: EmailStr = Field(..., description="User's email address")
    name: str = Field(..., description="User's name")
    organization_id: str = Field(..., description="Organization ID")
    role: str = Field(
        default="candidate", description="User role, defaults to 'candidate'"
    )
    candidate_id: Optional[str] = Field(
        None, description="ID of the candidate if exists"
    )


class InterviewIn(BaseModel):
    title: str
    organization_id: str
    created_by: str
    status: Optional[Literal["draft", "active", "completed"]] = "draft"


class InterviewUpdate(BaseModel):
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
    logger.info(
        f"Starting to send verification email to {email} with token {token[:10]}..."
    )
    try:
        message = MIMEMultipart()
        message["From"] = f"Flowterview Team <{Config.SMTP_USER}>"
        message["To"] = email
        message["Subject"] = (
            f"You're Invited: Interview for {job} at Flowterview! (Email Verification Required)"
        )

        # Make sure the token is URL safe and properly encoded
        import urllib.parse

        encoded_token = urllib.parse.quote_plus(token)
        verify_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:3001')}/interview?token={encoded_token}"
        logger.info(f"Generated verification URL with token: {encoded_token[:10]}...")

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
                    <a href="{verify_url}" style="display:inline-block; background: #4f46e5; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 1.1em; font-weight: bold;">Verify Email & Start Your Interview</a>
                </div>
                <p style="color: #555;">
                    Please verify your email to continue to the interview process.<br>
                    This link will expire in 7 days.<br>
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

        logger.info(
            f"Sending email using SMTP: {Config.SMTP_HOST}:{Config.SMTP_PORT}, user: {Config.SMTP_USER}"
        )

        try:
            await aiosmtplib.send(
                message,
                hostname=Config.SMTP_HOST,
                port=Config.SMTP_PORT,
                username=Config.SMTP_USER,
                password=Config.SMTP_PASS,
                use_tls=True,
            )
            logger.info(f"SMTP send operation completed for {email}")
        except Exception as smtp_error:
            logger.error(f"SMTP error: {str(smtp_error)}")
            import traceback

            smtp_trace = traceback.format_exc()
            logger.error(f"SMTP error trace: {smtp_trace}")
        logger.info(f"Verification email sent successfully to {email}")
    except Exception as e:
        logger.error(f"Failed to send verification email to {email}: {e}")


async def send_interview_email(
    email: str, name: str, job: str, interview_url: str
) -> None:
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
        logger.info(
            f"Sending email using SMTP: {Config.SMTP_HOST}:{Config.SMTP_PORT}, user: {Config.SMTP_USER}"
        )

        try:
            await aiosmtplib.send(
                message,
                hostname=Config.SMTP_HOST,
                port=Config.SMTP_PORT,
                username=Config.SMTP_USER,
                password=Config.SMTP_PASS,
                use_tls=True,
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
    request: SendInviteRequest, background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """
    Send an interview invitation email to the candidate
    If candidate exists, send direct interview link
    If candidate is new, send verification link
    """
    try:
        logger.info(f"[send-invite] Received invite request: {request.dict()}")
        # First check if candidate exists as a registered user
        user = db.fetch_one("users", {"email": request.email})
        logger.info(f"[send-invite] User lookup for {request.email}: {user}")

        # Also check if candidate exists in candidates table
        candidate = db.fetch_one("candidates", {"email": request.email})
        logger.info(f"[send-invite] Candidate lookup for {request.email}: {candidate}")

        # Try to find a matching interview for this job title
        matching_job = db.fetch_one(
            "jobs", {"title": request.job, "organization_id": request.organization_id}
        )
        logger.info(f"[send-invite] Matching job for {request.job}: {matching_job}")

        interview_id = None
        if matching_job:
            # Find an interview for this job with status 'active' or 'draft'
            all_interviews = db.fetch_all("interviews", {"job_id": matching_job["id"]})
            logger.info(
                f"[send-invite] Found {len(all_interviews)} interviews for job {matching_job['id']}"
            )
            matching_interview = next(
                (i for i in all_interviews if i["status"] in ("active", "draft")), None
            )
            logger.info(f"[send-invite] Matching interview: {matching_interview}")
            if matching_interview:
                interview_id = matching_interview["id"]

        if user:
            logger.info(f"[send-invite] Existing user path for {request.email}")
            # Candidate exists, send direct interview link
            logger.info(
                f"Candidate {request.email} exists, sending direct interview link"
            )

            # Update candidate's organization_id if it's different
            if candidate.get("organization_id") != request.organization_id:
                db.update(
                    "candidates",
                    {"organization_id": request.organization_id},
                    {"id": candidate["id"]},
                )

            # If we have a matching interview, add candidate to it
            if interview_id:
                # Fetch current candidates_invited
                current_interview = db.fetch_one("interviews", {"id": interview_id})
                current_invited = current_interview.get("candidates_invited", [])

                if candidate["id"] not in current_invited:
                    updated_invited = current_invited + [candidate["id"]]
                    db.update(
                        "interviews",
                        {"candidates_invited": updated_invited},
                        {"id": interview_id},
                    )

            else:
                # No interview found, return error
                logger.error(
                    f"No active interview found for job {request.job} in org {request.organization_id}"
                )
                raise HTTPException(
                    status_code=404, detail="No active interview found for this job."
                )

            # Generate interview link
            interview_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:3001')}/interview/{interview_id}"

            # Send interview email
            background_tasks.add_task(
                send_interview_email,
                request.email,
                request.name,
                request.job,
                interview_url,
            )

            return {
                "success": True,
                "message": "Interview invitation sent to existing candidate",
            }
        else:
            logger.info(f"[send-invite] New candidate path for {request.email}")
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
                    logger.warning(
                        f"Organization ID {org_id} not found, looking for default"
                    )
                    default_org = db.fetch_one("organizations", limit=1)
                    if default_org:
                        org_id = default_org["id"]
                    else:
                        # Create a new organization as fallback
                        logger.warning("No organizations found, creating a default one")
                        new_org_id = str(uuid.uuid4())
                        db.execute_query(
                            "organizations",
                            {
                                "id": new_org_id,
                                "name": "Default Organization",
                                "created_at": datetime.now().isoformat(),
                            },
                        )
                        org_id = new_org_id
            except (ValueError, TypeError):
                # Invalid UUID format, find a default organization
                logger.warning(f"Invalid organization ID format: {org_id}")
                default_org = db.fetch_one("organizations", limit=1)
                if default_org:
                    org_id = default_org["id"]
                else:
                    # Create a new organization as fallback
                    logger.warning("No organizations found, creating a default one")
                    new_org_id = str(uuid.uuid4())
                    db.execute_query(
                        "organizations",
                        {
                            "id": new_org_id,
                            "name": "Default Organization",
                            "created_at": datetime.now().isoformat(),
                        },
                    )
                    org_id = new_org_id

            # Create token
            try:
                # Log the token we're about to save
                logger.info(
                    f"Creating verification token: {token[:10]}... for {request.email} with org_id: {org_id}"
                )

                # Make sure the token is stored as a string
                token_data = {
                    "token": str(token),
                    "email": request.email,
                    "name": request.name,
                    "organization_id": str(org_id),  # Ensure org_id is a string
                    "job_title": request.job,
                    "interview_id": interview_id,
                    "expires_at": expires_at.isoformat(),
                }

                # Store the token in the database
                result = db.execute_query("verification_tokens", token_data)
                logger.info(f"Token stored successfully: {result}")

                # Verify the token was saved by retrieving it
                saved_token = db.fetch_one("verification_tokens", {"token": token})
                if saved_token:
                    logger.info(
                        f"Successfully verified token was saved for {request.email}"
                    )
                else:
                    logger.error(
                        f"Failed to verify token was saved for {request.email}"
                    )
                logger.info(
                    f"Successfully created verification token for {request.email}"
                )
            except Exception as token_error:
                logger.error(f"Error creating verification token: {str(token_error)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to create verification token: {str(token_error)}",
                )

            # Send verification email
            try:
                logger.info(f"Scheduling verification email task for {request.email}")
                background_tasks.add_task(
                    send_verification_email,
                    request.email,
                    request.name,
                    request.job,
                    token,
                )
                logger.info(f"Email task scheduled successfully for {request.email}")
            except Exception as email_error:
                logger.error(f"Error scheduling email task: {str(email_error)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to schedule email task: {str(email_error)}",
                )

            return {
                "success": True,
                "message": "Verification email sent to new candidate",
                "token": token,
            }
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
            raise HTTPException(
                status_code=500,
                detail="Database foreign key error. Organization may not exist.",
            )
        elif (
            "smtp" in str(e).lower()
            or "email" in str(e).lower()
            or "aiosmtplib" in str(e).lower()
        ):
            raise HTTPException(
                status_code=500,
                detail="Failed to send email. Please check SMTP configuration.",
            )
        else:
            raise HTTPException(
                status_code=500, detail=f"Failed to send invitation: {str(e)}"
            )


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
    logger.info(
        f"Creating user in the users table: {request.email}, org_id: {request.organization_id}"
    )

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
                return {
                    "success": True,
                    "user_id": user_id,
                    "message": "User created successfully",
                }
            else:
                logger.error(f"Failed to create user, empty result: {result}")
                return {
                    "success": False,
                    "message": "Failed to create user, no data returned",
                }

        except Exception as insert_error:
            logger.error(f"Failed to insert user: {str(insert_error)}")
            return {
                "success": False,
                "message": f"Failed to create user: {str(insert_error)}",
            }

    except Exception as e:
        logger.error(f"Error in create_user: {str(e)}")
        return {"success": False, "message": f"Error creating user: {str(e)}"}


@router.post("/verify-token")
async def verify_token(request: VerifyTokenRequest) -> Dict[str, Any]:
    """
    Verify a token from an email verification link
    """
    logger.info(f"Verifying token: {request.token[:10]}...")

    try:
        # Try both URL-decoded and original token
        decoded_token = urllib.parse.unquote_plus(request.token)
        possible_tokens = [decoded_token, request.token]

        token_data = None
        for token in possible_tokens:
            token_data = db.fetch_one("verification_tokens", {"token": token})
            if token_data:
                logger.info(f"Token found for: {token_data.get('email')}")
                break

        if not token_data:
            logger.warning(f"Token not found: {request.token[:10]}...")
            return {
                "valid": False,
                "message": "Invalid verification token. Please check your email and try again.",
            }

        # Check if token is expired
        try:
            expires_at = datetime.fromisoformat(token_data["expires_at"])
            # Make sure both datetimes are naive (no timezone info)
            if expires_at.tzinfo is not None:
                expires_at = expires_at.replace(tzinfo=None)

            if expires_at < datetime.now():
                logger.warning(f"Token expired at {expires_at}")
                return {
                    "valid": False,
                    "message": "This verification link has expired. Please request a new invitation.",
                }
        except Exception as date_error:
            logger.error(f"Error parsing dates: {str(date_error)}")
            return {
                "valid": False,
                "message": "Error validating token expiration. Please try again or request a new invitation.",
            }

        # Token is valid
        logger.info(f"Token validation successful for {token_data.get('email')}")
        return {
            "valid": True,
            "name": token_data.get("name", ""),
            "email": token_data.get("email", ""),
            "job_title": token_data.get("job_title", ""),
            "organization_id": token_data.get("organization_id", ""),
            "interview_id": token_data.get(
                "interview_id", ""
            ),  # Include interview_id in response
        }
    except Exception as e:
        logger.error(f"Error verifying token: {str(e)}")
        import traceback

        logger.error(f"Detailed error trace: {traceback.format_exc()}")
        return {
            "valid": False,
            "message": "An error occurred while verifying your token. Please try again or request a new invitation.",
        }


@router.post("/complete-registration")
async def complete_registration(request: CompleteRegistrationRequest) -> Dict[str, Any]:
    """
    Complete registration for a new candidate
    """
    logger.info(f"Starting complete registration with token: {request.token[:10]}...")

    try:
        # Try both URL-decoded and original token
        decoded_token = urllib.parse.unquote_plus(request.token)
        possible_tokens = [decoded_token, request.token]

        token_data = None
        for token in possible_tokens:
            token_data = db.fetch_one("verification_tokens", {"token": token})
            if token_data:
                logger.info(f"Token found for registration: {token_data.get('email')}")
                break

        if not token_data:
            return {
                "success": False,
                "message": "Invalid verification token. Please check your email and try again.",
            }

        # Check if token is expired
        try:
            expires_at = datetime.fromisoformat(token_data["expires_at"])
            if expires_at.tzinfo is not None:
                expires_at = expires_at.replace(tzinfo=None)

            if expires_at < datetime.now():
                return {
                    "success": False,
                    "message": "This verification link has expired. Please request a new invitation.",
                }
        except Exception as date_error:
            logger.error(f"Error comparing dates: {str(date_error)}")
            return {
                "success": False,
                "message": "Error validating token expiration. Please try again or request a new invitation.",
            }

        # Get organization ID and interview ID
        org_id = token_data.get("organization_id")
        interview_id = token_data.get("interview_id")

        if not org_id:
            # Try to get any organization
            default_org = db.fetch_one("organizations", limit=1)
            if default_org:
                org_id = default_org.get("id")
                logger.info(f"Using default organization: {org_id}")
            else:
                return {
                    "success": False,
                    "message": "No valid organization found. Please contact support.",
                }

        # Check if candidate already exists
        existing_candidate = db.fetch_one(
            "candidates", {"email": token_data.get("email")}
        )

        if existing_candidate:
            # Use the existing candidate
            candidate_id = existing_candidate["id"]
            logger.info(f"Using existing candidate with ID: {candidate_id}")

            # Update candidate information if needed
            db.update(
                "candidates",
                {
                    "name": token_data.get("name", existing_candidate.get("name")),
                    "organization_id": org_id,
                    "updated_at": datetime.now().isoformat(),
                },
                {"id": candidate_id},
            )
        else:
            # Create new candidate
            candidate_id = str(uuid.uuid4())
            logger.info(f"Creating new candidate with ID: {candidate_id}")

            # Get job information
            job_title = token_data.get("job_title")
            job_id = None

            if job_title:
                # Try to find an existing job with this title
                existing_job = db.fetch_one(
                    "jobs", {"title": job_title, "organization_id": org_id}
                )
                if existing_job:
                    job_id = existing_job.get("id")
                    logger.info(f"Found existing job with ID: {job_id}")

            if not job_id:
                # Create a new job
                job_id = str(uuid.uuid4())
                db.execute_query(
                    "jobs",
                    {
                        "id": job_id,
                        "title": job_title or "Software Engineer",
                        "organization_id": org_id,
                        "created_at": datetime.now().isoformat(),
                    },
                )
                logger.info(f"Created new job with ID: {job_id}")

            # Create the candidate
            db.execute_query(
                "candidates",
                {
                    "id": candidate_id,
                    "name": token_data.get("name", ""),
                    "email": token_data.get("email", ""),
                    "organization_id": org_id,
                    "job_id": job_id,
                    "created_at": datetime.now().isoformat(),
                },
            )

        # If we have an interview_id, add candidate to it
        if interview_id:
            current_interview = db.fetch_one("interviews", {"id": interview_id})
            if current_interview:
                current_invited = current_interview.get("candidates_invited", [])
                if candidate_id not in current_invited:
                    updated_invited = current_invited + [candidate_id]
                    db.update(
                        "interviews",
                        {"candidates_invited": updated_invited},
                        {"id": interview_id},
                    )
                logger.info(
                    f"Added candidate {candidate_id} to interview {interview_id}"
                )

        # Generate interview URL
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3001")
        interview_url = (
            f"{frontend_url}/interview/{interview_id}/start" if interview_id else None
        )

        # Delete the used token
        db.delete("verification_tokens", {"token": token_data["token"]})
        logger.info(f"Deleted used token for {token_data.get('email')}")

        return {
            "success": True,
            "message": "Registration completed successfully",
            "interview_url": interview_url,
        }

    except Exception as e:
        logger.error(f"Error completing registration: {str(e)}")
        import traceback

        logger.error(f"Detailed error trace: {traceback.format_exc()}")
        return {
            "success": False,
            "message": "An error occurred while completing your registration. Please try again or contact support.",
        }


@router.post("/from-description")
async def create_interview_from_description(
    request: CreateInterviewFromDescriptionRequest,
):
    try:
        # 1. Store the flow in interview_flows (now with react_flow_json)
        flow = db.execute_query(
            "interview_flows",
            {
                "name": request.title,
                "flow_json": request.flow_json,
                "react_flow_json": request.react_flow_json,
                "created_by": request.created_by,
            },
        )
        flow_id = flow["id"]
        # 2. Create the job
        job = db.execute_query(
            "jobs",
            {
                "title": request.title,
                "description": request.job_description,
                "organization_id": request.organization_id,
                "flow_id": flow_id,
            },
        )
        job_id = job["id"]
        # 3. Create the interview
        interview = db.execute_query(
            "interviews", {"job_id": job_id, "status": "draft"}
        )
        # 4. Return the interview info (with job title)
        return {
            "id": interview["id"],
            "title": job["title"],
            "status": interview["status"],
            "date": interview["created_at"][:10] if interview.get("created_at") else "",
            "job_id": job_id,
            "flow_id": flow_id,
        }
    except DatabaseError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{interview_id}/add-candidate")
async def add_candidate_to_interview(
    interview_id: str, req: AddCandidateRequest, request: Request
):
    try:
        # Fetch current candidates_invited
        interview = db.fetch_one("interviews", {"id": interview_id})
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        current_invited = interview.get("candidates_invited", [])
        updated_invited = (
            current_invited
            if req.candidate_id in current_invited
            else current_invited + [req.candidate_id]
        )
        db.update(
            "interviews", {"candidates_invited": updated_invited}, {"id": interview_id}
        )
        return {"success": True, "candidates_invited": updated_invited}
    except DatabaseError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{interview_id}/job")
async def get_interview_job(interview_id: str, request: Request):
    """Get job information for a specific interview with authentication"""
    try:
        # Add authentication
        user_context = require_organization(request)

        # Optimized query: get interview with job data in one query
        interview_data = db.fetch_all(
            table="interviews",
            select="id, job_id, jobs!inner(id, title, organization_id)",
            query_params={"id": interview_id},
            limit=1,
        )

        if not interview_data:
            raise HTTPException(status_code=404, detail="Interview not found")

        interview = interview_data[0]
        job_info = interview.get("jobs", {})

        # Verify organization access
        if job_info.get("organization_id") != user_context.organization_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied: Interview not in your organization",
            )

        return {"id": interview["id"], "job_id": interview["job_id"]}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching interview job {interview_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[Dict[str, Any]])
async def list_interviews(request: Request):
    """List all interviews for the authenticated user's organization"""
    import time

    start_time = time.time()

    try:
        # Require authentication with organization context
        auth_start = time.time()
        user_context = require_organization(request)
        auth_time = time.time() - auth_start

        # Single optimized query using proper indexes
        query_start = time.time()

        # This will use idx_jobs_org_id_optimized and idx_interviews_job_id_optimized
        interviews = db.fetch_all(
            table="interviews",
            select="id, status, created_at, candidates_invited, job_id, jobs!inner(id, title)",
            eq_filters={"jobs.organization_id": user_context.organization_id},
            order_by=(
                "created_at",
                True,
            ),  # This will use the optimized composite index
            limit=100,  # Add limit for performance
        )

        if not interviews:
            logger.info(
                f"No interviews found for organization {user_context.organization_id}"
            )
            return []

        query_time = time.time() - query_start

        # Fast data transformation
        transform_start = time.time()
        result = []
        for interview in interviews:
            job_info = interview.get("jobs", {})
            candidate_count = len(interview.get("candidates_invited", []))
            date = interview["created_at"][:10] if interview.get("created_at") else ""

            result.append(
                {
                    "id": interview["id"],
                    "title": job_info.get("title", "Unknown"),
                    "candidates": candidate_count,
                    "status": interview.get("status", "open"),
                    "date": date,
                    "job_id": interview.get("job_id"),
                }
            )

        transform_time = time.time() - transform_start
        total_time = time.time() - start_time

        logger.info(
            f"Performance metrics for org {user_context.organization_id}: "
            f"Total: {total_time*1000:.0f}ms, "
            f"Auth: {auth_time*1000:.0f}ms, "
            f"Query: {query_time*1000:.0f}ms ({len(interviews)} interviews), "
            f"Transform: {transform_time*1000:.0f}ms"
        )

        return result

    except Exception as e:
        total_time = time.time() - start_time
        logger.error(
            f"Error fetching interviews after {total_time*1000:.0f}ms: {str(e)}"
        )
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch interviews: {str(e)}"
        )


@router.post("/", response_model=InterviewOut)
async def create_interview(interview: InterviewIn, request: Request):
    try:
        created_interview = db.execute_query("interviews", interview.dict())
        return created_interview
    except DatabaseError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{interview_id}", response_model=InterviewOut)
async def update_interview(
    interview_id: str, updates: InterviewUpdate, request: Request
):
    try:
        # Fetch the current interview record
        current = db.fetch_one("interviews", {"id": interview_id})
        if not current:
            raise HTTPException(status_code=404, detail="Interview not found")
        # Merge current record with updates
        update_dict = {
            **current,
            **{k: v for k, v in updates.dict().items() if v is not None},
        }
        allowed_fields = {"title", "organization_id", "created_by", "status"}
        update_dict = {k: v for k, v in update_dict.items() if k in allowed_fields}
        db.update("interviews", update_dict, {"id": interview_id})

        # Fetch the updated record to return
        updated = db.fetch_one("interviews", {"id": interview_id})
        # Ensure all required fields are present and not None
        for field in ["title", "organization_id", "created_by"]:
            if updated.get(field) is None:
                updated[field] = ""
        return updated
    except DatabaseError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{interview_id}")
async def get_interview(interview_id: str, request: Request):
    """Get interview details with all related data in a single optimized query"""
    try:
        # Require authentication with organization context
        user_context = require_organization(request)

        # Optimized query with single JOIN (interviews + jobs + interview_flows)
        interviews = db.fetch_all(
            table="interviews",
            select="id,status,created_at,candidates_invited,job_id,jobs!inner(id,title,description,organization_id,flow_id,interview_flows(react_flow_json))",
            query_params={"id": interview_id},
            limit=1,  # Ensure only one record is fetched
        )

        if not interviews:
            raise HTTPException(status_code=404, detail="Interview not found")

        interview_data = interviews[0]
        job_data = interview_data.get("jobs", {})

        # Verify organization access
        if job_data.get("organization_id") != user_context.organization_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied: Interview not in your organization",
            )

        # Fetch ALL candidates for this job using JOIN for better performance
        job_candidates = db.fetch_all(
            table="candidates",
            select="id,name,email,status,job_id,created_at",
            eq_filters={"job_id": job_data.get("id")},
            order_by=("created_at", True),  # Most recent first
        )

        # Fetch candidate_interviews to get room_url and bot_token for invited candidates
        candidate_interviews = db.fetch_all(
            table="candidate_interviews",
            select="candidate_id,status,room_url,bot_token,scheduled_at,started_at,completed_at",
            eq_filters={"interview_id": interview_id},
        )

        # Create a map of candidate_id to interview details
        candidate_interview_map = {
            ci["candidate_id"]: ci for ci in candidate_interviews
        }

        # Enhance candidates with interview status and room details
        enhanced_candidates = []
        invited_candidate_ids = set(interview_data.get("candidates_invited", []))

        for candidate in job_candidates:
            candidate_id = candidate["id"]
            interview_details = candidate_interview_map.get(candidate_id)

            enhanced_candidate = {
                **candidate,
                "is_invited": candidate_id in invited_candidate_ids,
                "interview_status": (
                    interview_details.get("status") if interview_details else None
                ),
                "room_url": (
                    interview_details.get("room_url") if interview_details else None
                ),
                "bot_token": (
                    interview_details.get("bot_token") if interview_details else None
                ),
                "scheduled_at": (
                    interview_details.get("scheduled_at") if interview_details else None
                ),
                "started_at": (
                    interview_details.get("started_at") if interview_details else None
                ),
                "completed_at": (
                    interview_details.get("completed_at") if interview_details else None
                ),
            }
            enhanced_candidates.append(enhanced_candidate)

        # Extract flow data from the nested structure within job_data
        flow_data = None
        # The 'interview_flows' object is now expected to be part of job_data
        # It will be null if jobs.flow_id is null or if there's no matching flow.
        flow_details_from_job = job_data.get("interview_flows")
        if (
            flow_details_from_job
            and flow_details_from_job.get("react_flow_json") is not None
        ):
            flow_data = {
                "react_flow_json": flow_details_from_job.get("react_flow_json")
            }

        # Separate invited and available candidates
        invited_candidates = [c for c in enhanced_candidates if c["is_invited"]]
        available_candidates = [c for c in enhanced_candidates if not c["is_invited"]]

        # Build optimized response
        response = {
            "interview": {
                "id": interview_data["id"],
                "status": interview_data.get("status", "draft"),
                "created_at": interview_data.get("created_at"),
                "candidates_invited": interview_data.get("candidates_invited", []),
                "job_id": interview_data.get("job_id"),
            },
            "job": {
                "id": job_data.get("id"),
                "title": job_data.get("title"),
                "description": job_data.get("description"),
                "organization_id": job_data.get("organization_id"),
                "flow_id": job_data.get("flow_id"),
            },
            "flow": flow_data,
            "candidates": {
                "invited": invited_candidates,
                "available": available_candidates,
                "total_job_candidates": len(enhanced_candidates),
                "invited_count": len(invited_candidates),
                "available_count": len(available_candidates),
            },
        }

        logger.info(
            f"Retrieved interview {interview_id} for organization {user_context.organization_id} "
            f"with {len(invited_candidates)} invited and {len(available_candidates)} available candidates"
        )
        return response

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error fetching interview {interview_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch interview: {str(e)}"
        )
