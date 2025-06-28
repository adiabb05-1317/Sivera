from datetime import datetime, timedelta
from email.mime.text import MIMEText
import json

# Set up more detailed logging
import os
import secrets
import time
from typing import Any, Dict, List, Literal, Optional
import urllib.parse
import uuid

import aiosmtplib
from fastapi import APIRouter, BackgroundTasks, Form, HTTPException, Request
from loguru import (
    logger,
    logger as loguru_logger,
)
from pydantic import BaseModel, EmailStr, Field

from src.core.config import Config
from src.utils.auth_middleware import (
    require_organization,
)
from src.utils.llm_factory import generate_text
from storage.db_manager import DatabaseError, DatabaseManager

# Ensure loguru is capturing all levels
loguru_logger.add("interview_router.log", level="DEBUG", rotation="5 MB")

router = APIRouter(prefix="/api/v1/interviews", tags=["interview"])

db = DatabaseManager()


# Pydantic models for request validation
class GenerateFlowRequest(BaseModel):
    role: str = Field(..., min_length=1, description="Job role for the position")
    job_description: str = Field(..., min_length=50, description="Job description for the interview flow")


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
    bot_token: str = Field(..., description="Bot token from email")
    room_url: str = Field(..., description="Room URL from email")


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
    skills: List[str]
    duration: int
    flow_json: dict
    organization_id: str
    created_by: str
    process_stages: dict
    phone_screen_questions: List[str]


class AddCandidateRequest(BaseModel):
    candidate_id: str


class BulkAddCandidatesRequest(BaseModel):
    candidate_ids: List[str]


class InterviewFlowUpdate(BaseModel):
    skills: Optional[List[str]]
    duration: Optional[int]
    flow_json: Optional[dict]


class JobUpdate(BaseModel):
    title: Optional[str]
    description: Optional[str]
    process_stages: Optional[dict]
    phone_screen_questions: Optional[List[str]]  # This will be handled separately for phone_screen table


async def send_loops_email(to_email: str, template_id: str, variables: Dict[str, Any]) -> None:
    """Send email via Loops transactional API using SMTP"""
    try:
        logger.info(f"Sending Loops email to {to_email} with template {template_id}")

        payload = {"transactionalId": template_id, "email": to_email, "dataVariables": variables}

        msg = MIMEText(json.dumps(payload), "plain")
        msg["From"] = "team@sivera.io"
        msg["To"] = to_email
        msg["Subject"] = "ignored by Loops"  # Subject is handled by Loops template

        await aiosmtplib.send(
            msg,
            hostname=Config.SMTP_HOST,
            port=Config.SMTP_PORT,
            start_tls=True,
            username=Config.SMTP_USER,
            password=Config.SMTP_PASS,
        )

        logger.info(f"Loops email sent successfully to {to_email}")

    except Exception as e:
        logger.error(f"Failed to send Loops email to {to_email}: {e}")
        raise


async def send_verification_email(email: str, name: str, job: str, token: str) -> None:
    """Background task to send verification email for new candidates via Loops"""
    logger.info(f"Starting to send verification email to {email} with token {token[:10]}...")
    try:
        # Make sure the token is URL safe and properly encoded
        import urllib.parse

        encoded_token = urllib.parse.quote_plus(token)
        verify_url = f"{os.getenv('FRONTEND_URL', 'https://app.sivera.io')}/interview?token={encoded_token}"
        logger.info(f"Generated verification URL with token: {encoded_token[:10]}...")

        # Prepare variables for Loops template
        variables = {"name": name, "job": job, "company": "Sivera", "verify_url": verify_url}

        await send_loops_email(email, Config.LOOPS_VERIFICATION_TEMPLATE, variables)
        logger.info(f"Verification email sent successfully to {email}")

    except Exception as e:
        logger.error(f"Failed to send verification email to {email}: {e}")
        raise


async def send_interview_email(email: str, name: str, job: str, interview_url: str) -> None:
    """Background task to send direct interview email for existing candidates via Loops"""
    try:
        logger.info(f"Sending interview email to {email} for job {job}")

        # Prepare variables for Loops template
        variables = {"name": name, "job": job, "company": "Sivera", "verify_url": interview_url}

        await send_loops_email(email, Config.LOOPS_INTERVIEW_TEMPLATE, variables)
        logger.info(f"Interview email sent successfully to {email}")

    except Exception as e:
        logger.error(f"Failed to send interview email to {email}: {e}")
        raise


@router.post("/send-invite")
async def send_invite(request: SendInviteRequest, background_tasks: BackgroundTasks) -> Dict[str, Any]:
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
        matching_job = db.fetch_one("jobs", {"title": request.job, "organization_id": request.organization_id})
        logger.info(f"[send-invite] Matching job for {request.job}: {matching_job}")

        interview_id = None
        if matching_job:
            # Find an interview for this job with status 'active' or 'draft'
            all_interviews = db.fetch_all("interviews", {"job_id": matching_job["id"]})
            logger.info(f"[send-invite] Found {len(all_interviews)} interviews for job {matching_job['id']}")
            matching_interview = next((i for i in all_interviews if i["status"] in ("active", "draft")), None)
            logger.info(f"[send-invite] Matching interview: {matching_interview}")
            if matching_interview:
                interview_id = matching_interview["id"]

        if user:
            logger.info(f"[send-invite] Existing user path for {request.email}")
            # Candidate exists, send direct interview link
            logger.info(f"Candidate {request.email} exists, sending direct interview link")

            # Update candidate's organization_id if it's different
            if candidate and candidate.get("organization_id") != request.organization_id:
                db.update(
                    "candidates",
                    {"organization_id": request.organization_id},
                    {"id": candidate["id"]},
                )

            # If we have a matching interview, create a candidate_interview record
            if interview_id:
                try:
                    ci_record = db.execute_query(
                        "candidate_interviews",
                        {
                            "interview_id": interview_id,
                            "candidate_id": candidate["id"],
                        },
                    )
                    candidate_interview_id = ci_record["id"]
                except Exception as e:
                    logger.error(f"Failed to create candidate_interview record for existing user: {e}")
                    raise HTTPException(status_code=500, detail="Could not schedule interview.")
            else:
                # No interview found, return error
                logger.error(f"No active interview found for job {request.job} in org {request.organization_id}")
                raise HTTPException(status_code=404, detail="No active interview found for this job.")

            # Generate interview link
            interview_url = (
                f"{os.getenv('FRONTEND_URL', 'https://app.sivera.io:3001')}/interview/{candidate_interview_id}/start"
            )

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
                    logger.warning(f"Organization ID {org_id} not found, looking for default")
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
                logger.info(f"Creating verification token: {token[:10]}... for {request.email} with org_id: {org_id}")

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
                    logger.info(f"Successfully verified token was saved for {request.email}")
                else:
                    logger.error(f"Failed to verify token was saved for {request.email}")
                logger.info(f"Successfully created verification token for {request.email}")
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
        elif "smtp" in str(e).lower() or "email" in str(e).lower() or "aiosmtplib" in str(e).lower():
            raise HTTPException(
                status_code=500,
                detail="Failed to send email. Please check SMTP configuration.",
            )
        else:
            raise HTTPException(status_code=500, detail=f"Failed to send invitation: {str(e)}")


@router.get("/job-id")
async def get_job_id_by_title(title: str, organization_id: str, request: Request):
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
        organization_id = require_organization(request).organization_id
        jobs = db.fetch_all(
            "jobs",
            {"organization_id": organization_id},
            order_by=("created_at", True),
        )
        return [{"id": job["id"], "title": job["title"]} for job in jobs]
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract-skills")
async def extract_skills_from_description(request: GenerateFlowRequest) -> Dict[str, Any]:
    """
    Extracts skills from a job description using an LLM.
    """
    try:
        logger.info(f"Extracting skills from job description: {request.job_description[:100]}...")

        prompt = f"""
You are an expert in analyzing job descriptions to extract the 10 most important and relevant skills that can be evaluated through assessments or questions during a pre-screening interview. Please review the following job description and identify the key skills required for the role. The extracted skills should be presented in a format suitable for interviewers to frame questions and effectively evaluate a candidate's qualifications.

Job Title:
{request.role}

Job Description:
{request.job_description}

Please extract and categorize the skills into the following categories. Return your response as a valid JSON object with the following structure:

{{
    "skills": [
        "Docker",
        "JavaScript",
        ""
        ...(rest)
    ],
    "experience_level": "junior|mid|senior",
    "years_experience": "number or range like '3-5'",
}}

Guidelines:
- Only include skills that are explicitly mentioned or clearly implied in the job description
- For experience_level, choose: "junior" (0-2 years), "mid" (3-5 years), or "senior" (6+ years)
- Return only the JSON object, no additional text
"""

        # Use the LLM to extract skills
        logger.info("Sending prompt to LLM for skill extraction...")

        response = generate_text(
            prompt=prompt,
            provider="openai",
            model="gpt-4.1",
            temperature=0.3,
        )

        logger.info(f"LLM response received: {response[:200]}...")

        try:
            response_cleaned = response.strip()
            if response_cleaned.startswith("```json"):
                response_cleaned = response_cleaned[7:]
            if response_cleaned.endswith("```"):
                response_cleaned = response_cleaned[:-3]
            response_cleaned = response_cleaned.strip()

            skills_data = json.loads(response_cleaned)

            logger.info(
                f"Successfully extracted {sum(len(v) for v in skills_data.values() if isinstance(v, list))} skills"
            )

            return {"error": False, "skills": skills_data}

        except json.JSONDecodeError as json_error:
            logger.error(f"Failed to parse LLM response as JSON: {json_error}")
            logger.error(f"Raw response: {response}")

            # Fallback: try to extract basic information manually
            fallback_skills = {
                "skills": [],
                "experience_level": "mid",
                "years_experience": "",
                "education_requirements": [],
            }

            return {
                "result": fallback_skills,
                "error": True,
                "message": "Failed to parse LLM response, returning empty skills structure",
            }

    except Exception as e:
        logger.error(f"Error in extract_skills_from_description: {str(e)}")
        import traceback

        logger.error(f"Detailed error trace: {traceback.format_exc()}")

        # Return empty structure on error
        empty_skills = {"result": [], "experience_level": "mid", "years_experience": "", "education_requirements": []}

        return {"error": True, "result": empty_skills, "message": f"Error extracting skills: {str(e)}"}


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
    Verify a token and check if user needs registration or can proceed directly
    """
    token = request.token
    if not token:
        return {"success": False, "message": "Token is required"}

    try:
        # Try both URL-decoded and original token
        decoded_token = urllib.parse.unquote_plus(token)
        possible_tokens = [decoded_token, token]

        token_data = None
        for t in possible_tokens:
            token_data = db.fetch_one("verification_tokens", {"token": t})
            if token_data:
                logger.info(f"Token found for verification: {token_data.get('email')}")
                break

        if not token_data:
            logger.error(f"Invalid verification token provided: {token}")
            return {"success": False, "message": "Invalid verification token"}

        # Check if token is expired
        try:
            expires_at = datetime.fromisoformat(token_data["expires_at"])
            if expires_at.tzinfo is not None:
                expires_at = expires_at.replace(tzinfo=None)

            if expires_at < datetime.now():
                return {"success": False, "message": "This verification link has expired"}
        except Exception as date_error:
            logger.error(f"Error comparing dates: {str(date_error)}")
            return {"success": False, "message": "Error validating token expiration"}

        # Check if candidate already exists
        candidate = db.fetch_one("candidates", {"email": token_data["email"]})

        if candidate:
            # Candidate exists, create a candidate_interview and return direct URL
            interview_id = token_data.get("interview_id")
            if not interview_id:
                return {"success": False, "message": "No interview associated with this token"}

            # Create candidate_interview record
            try:
                # here if the candidate_interview already exists, then we need to reject because the candidate has already started or have finished the interview
                existing_candidate_interview = db.fetch_one(
                    "candidate_interviews",
                    {"interview_id": interview_id, "candidate_id": candidate["id"]},
                )
                if existing_candidate_interview:
                    # also delete the verification token
                    db.delete("verification_tokens", {"token": token})
                    return {
                        "success": False,
                        "message": "CANDIDATE_ALREADY_STARTED_OR_FINISHED",
                    }
                db.execute_query(
                    "candidate_interviews",
                    {
                        "interview_id": interview_id,
                        "candidate_id": candidate["id"],
                        "room_url": "abcde",
                        "bot_token": "fghij",
                    },
                )
            except Exception as e:
                logger.error(f"Failed to create candidate_interview: {e}")
                return {"success": False, "message": "Failed to set up interview session."}

            interview_data = None
            job_data = None
            flow_data = None
            organization_data = None

            if interview_id:
                interview_data = db.fetch_one("interviews", {"id": interview_id})
                if interview_data and interview_data.get("job_id"):
                    job_data = db.fetch_one("jobs", {"id": interview_data["job_id"]})
                    if job_data:
                        organization_data = db.fetch_one("organizations", {"id": job_data.get("organization_id")})
                        if job_data.get("flow_id"):
                            flow_data = db.fetch_one("interview_flows", {"id": job_data["flow_id"]})

            return {
                "success": True,
                "message": "Token verified successfully",
                "interview_data": {
                    "job_id": job_data.get("id") if job_data else None,
                    "job_title": job_data.get("title")
                    if job_data
                    else token_data.get("job_title", "Software Engineer"),
                    "company": organization_data.get("name") if organization_data else "Company",
                    "duration": flow_data.get("duration") if flow_data else 30,
                    "skills": flow_data.get("skills") if flow_data else [],
                    "interview_id": interview_id,
                    "bot_token": "abcde",
                    "room_url": "fghij",
                    "candidate_id": candidate["id"],
                },
            }
        else:
            # New candidate, needs registration
            # Fetch actual interview data to send to frontend
            interview_data = None
            job_data = None
            flow_data = None
            organization_data = None

            interview_id = token_data.get("interview_id")
            if interview_id:
                # Get interview details
                interview_data = db.fetch_one("interviews", {"id": interview_id})

                if interview_data and interview_data.get("job_id"):
                    # Get job details
                    job_data = db.fetch_one("jobs", {"id": interview_data["job_id"]})

                    if job_data:
                        # Get organization details
                        organization_data = db.fetch_one("organizations", {"id": job_data.get("organization_id")})

                        # Get flow details if available
                        if job_data.get("flow_id"):
                            flow_data = db.fetch_one("interview_flows", {"id": job_data["flow_id"]})

            # Prepare response with actual data or fallbacks
            response_data = {
                "success": True,
                "message": "Please complete registration",
                "name": token_data.get("name"),
                "interview_data": {
                    "job_id": job_data.get("id") if job_data else None,
                    "job_title": job_data.get("title")
                    if job_data
                    else token_data.get("job_title", "Software Engineer"),
                    "company": organization_data.get("name") if organization_data else "Company",
                    "duration": flow_data.get("duration") if flow_data else 30,
                    "skills": flow_data.get("skills") if flow_data else [],
                    "interview_id": interview_id,
                    "bot_token": "abcde",
                    "room_url": "fghij",
                    "candidate_id": candidate["id"],
                },
            }

            return response_data

    except Exception as e:
        logger.error(f"Error verifying token: {str(e)}")
        return {"success": False, "message": "Failed to verify token"}


@router.post("/complete-registration")
async def complete_registration(
    token: str = Form(...),
    name: str = Form(...),
) -> Dict[str, Any]:
    """
    Complete registration for a new candidate
    """
    logger.info(f"Starting complete registration with token: {token[:10]}...")

    try:
        # Try both URL-decoded and original token
        decoded_token = urllib.parse.unquote_plus(token)
        possible_tokens = [decoded_token, token]

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
        existing_candidate = db.fetch_one("candidates", {"email": token_data.get("email")})

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
                existing_job = db.fetch_one("jobs", {"title": job_title, "organization_id": org_id})
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
            candidate_data = {
                "id": candidate_id,
                "name": name or token_data.get("name", ""),
                "email": token_data.get("email", ""),
                "organization_id": org_id,
                "job_id": job_id,
                "created_at": datetime.now().isoformat(),
            }

            db.execute_query("candidates", candidate_data)

        candidate_interview_id = None
        # If we have an interview_id, add candidate to it by creating a candidate_interview
        if interview_id:
            try:
                candidate_interview = db.execute_query(
                    "candidate_interviews",
                    {
                        "interview_id": interview_id,
                        "candidate_id": candidate_id,
                        "room_url": "abcde",
                        "bot_token": "fghij",
                        "started_at": datetime.now().isoformat(),
                    },
                )
                candidate_interview_id = candidate_interview["id"]
                logger.info(
                    f"Created candidate_interview {candidate_interview_id} for candidate {candidate_id} and interview {interview_id}"
                )
            except Exception as e:
                logger.error(f"Failed to create candidate_interview: {e}")
                # We can still proceed without it, but analytics will be affected.

        # Generate interview URL
        frontend_url = os.getenv("FRONTEND_URL", "https://app.sivera.io")
        interview_url = f"{frontend_url}/interview/{candidate_interview_id}/start" if candidate_interview_id else None

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
        flow = db.execute_query(
            "interview_flows",
            {
                "name": request.title,
                "flow_json": request.flow_json,
                "skills": request.skills,
                "duration": request.duration,
                "created_by": request.created_by,
            },
        )
        flow_id = flow["id"]

        phone_screen_id = None
        # Check for phone interview in process stages (using the key from frontend)
        phone_interview_enabled = request.process_stages.get("phoneInterview", False)
        if phone_interview_enabled and request.phone_screen_questions:
            questions = {
                "questions": request.phone_screen_questions,
                "answers": [],
            }
            phone_screen = db.execute_query("phone_screen", {"questions": questions})
            phone_screen_id = phone_screen["id"]

        job = db.execute_query(
            "jobs",
            {
                "title": request.title,
                "description": request.job_description,
                "organization_id": request.organization_id,
                "flow_id": flow_id,
                "phone_screen_id": phone_screen_id,
                "process_stages": request.process_stages,
            },
        )
        job_id = job["id"]

        interview = db.execute_query("interviews", {"job_id": job_id, "status": "draft", "created_by": request.created_by})

        return {
            "id": interview["id"],
            "title": job["title"],
            "status": interview["status"],
            "date": interview["created_at"][:10] if interview.get("created_at") else "",
            "job_id": job_id,
            "flow_id": flow_id,
            "skills": request.skills,
            "duration": request.duration,
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
        updated_invited = (
            current_invited if req.candidate_id in current_invited else current_invited + [req.candidate_id]
        )
        db.update("interviews", {"candidates_invited": updated_invited}, {"id": interview_id})
        return {"success": True, "candidates_invited": updated_invited}
    except DatabaseError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{interview_id}/add-candidates-bulk")
async def add_candidates_bulk_to_interview(interview_id: str, req: BulkAddCandidatesRequest, request: Request):
    """Add multiple candidates to an interview at once for better performance"""
    try:
        # Fetch current candidates_invited
        interview = db.fetch_one("interviews", {"id": interview_id})
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")

        current_invited = interview.get("candidates_invited", [])

        # Merge new candidates with existing ones (avoid duplicates)
        new_candidates = [cid for cid in req.candidate_ids if cid not in current_invited]
        updated_invited = current_invited + new_candidates

        # Update the interview with all candidate IDs
        db.update("interviews", {"candidates_invited": updated_invited}, {"id": interview_id})

        return {
            "success": True,
            "candidates_invited": updated_invited,
            "added_count": len(new_candidates),
            "total_count": len(updated_invited),
        }
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
            logger.info(f"No interviews found for organization {user_context.organization_id}")
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
            f"Total: {total_time * 1000:.0f}ms, "
            f"Auth: {auth_time * 1000:.0f}ms, "
            f"Query: {query_time * 1000:.0f}ms ({len(interviews)} interviews), "
            f"Transform: {transform_time * 1000:.0f}ms"
        )

        return result

    except Exception as e:
        total_time = time.time() - start_time
        logger.error(f"Error fetching interviews after {total_time * 1000:.0f}ms: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch interviews: {str(e)}")


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


@router.patch("/interview-flows/{flow_id}")
async def update_interview_flow(flow_id: str, updates: InterviewFlowUpdate, request: Request):
    """Update interview flow with new skills, duration, and flow_json"""
    try:
        # Require authentication with organization context
        user_context = require_organization(request)

        # Fetch the current interview flow record
        current = db.fetch_one("interview_flows", {"id": flow_id})
        if not current:
            raise HTTPException(status_code=404, detail="Interview flow not found")

        # Build update dictionary with only non-None values
        update_dict = {k: v for k, v in updates.dict().items() if v is not None}

        if not update_dict:
            raise HTTPException(status_code=400, detail="No valid updates provided")

        # Update the interview flow
        db.update("interview_flows", update_dict, {"id": flow_id})

        # Fetch and return the updated record
        updated = db.fetch_one("interview_flows", {"id": flow_id})
        return {
            "id": updated["id"],
            "skills": updated.get("skills", []),
            "duration": updated.get("duration"),
            "flow_json": updated.get("flow_json", {}),
            "updated_at": updated.get("updated_at"),
        }
    except DatabaseError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/jobs/{job_id}")
async def update_job(job_id: str, updates: JobUpdate, request: Request):
    """Update job with new process stages and phone screen questions"""
    try:
        # Require authentication with organization context
        user_context = require_organization(request)

        # Fetch the current job record
        current = db.fetch_one("jobs", {"id": job_id})
        if not current:
            raise HTTPException(status_code=404, detail="Job not found")

        # Verify organization access
        if current.get("organization_id") != user_context.organization_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied: Job not in your organization",
            )

        # Handle phone screen questions separately
        phone_screen_questions = updates.phone_screen_questions
        
        # Build update dictionary with only non-None values (excluding phone_screen_questions)
        update_dict = {k: v for k, v in updates.dict().items() if v is not None and k != "phone_screen_questions"}

        # Update phone screen if questions are provided
        if phone_screen_questions is not None:
            phone_screen_id = current.get("phone_screen_id")
            
            if phone_screen_questions:  # If there are questions
                questions_data = {
                    "questions": phone_screen_questions,
                    "answers": [],
                }
                
                if phone_screen_id:
                    # Update existing phone screen
                    db.update("phone_screen", {"questions": questions_data}, {"id": phone_screen_id})
                else:
                    # Create new phone screen
                    phone_screen = db.execute_query("phone_screen", {"questions": questions_data})
                    update_dict["phone_screen_id"] = phone_screen["id"]
            else:
                # Remove phone screen reference if no questions
                if phone_screen_id:
                    # Optionally delete the phone screen record
                    # db.delete("phone_screen", {"id": phone_screen_id})
                    update_dict["phone_screen_id"] = None

        if update_dict:
            # Update the job
            db.update("jobs", update_dict, {"id": job_id})

        # Fetch the updated record with phone screen data
        updated_job = db.fetch_all(
            table="jobs",
            select="id,title,description,process_stages,phone_screen_id,phone_screen(questions)",
            query_params={"id": job_id},
            limit=1
        )
        
        if not updated_job:
            raise HTTPException(status_code=404, detail="Updated job not found")
            
        job_data = updated_job[0]
        
        # Extract phone screen questions for response
        response_phone_questions = []
        phone_screen_data = job_data.get("phone_screen")
        if phone_screen_data and phone_screen_data.get("questions"):
            questions_data = phone_screen_data.get("questions", {})
            if isinstance(questions_data, dict) and "questions" in questions_data:
                response_phone_questions = questions_data["questions"]
            elif isinstance(questions_data, list):
                response_phone_questions = questions_data

        return {
            "id": job_data["id"],
            "title": job_data.get("title"),
            "description": job_data.get("description"),
            "process_stages": job_data.get("process_stages"),
            "phone_screen_id": job_data.get("phone_screen_id"),
            "phone_screen_questions": response_phone_questions,
            "updated_at": job_data.get("updated_at"),
        }
    except DatabaseError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{interview_id}")
async def get_interview(interview_id: str, request: Request):
    """Get interview details with all related data in a single optimized query"""
    try:
        # Require authentication with organization context
        user_context = require_organization(request)

        # Optimized query with JOINs (interviews + jobs + interview_flows + phone_screen)
        interviews = db.fetch_all(
            table="interviews",
            select="id,status,created_at,candidates_invited,job_id,jobs!inner(id,title,description,organization_id,flow_id,process_stages,phone_screen_id,interview_flows(skills,duration),phone_screen(questions))",
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
        candidate_interview_map = {ci["candidate_id"]: ci for ci in candidate_interviews}

        # Enhance candidates with interview status and room details
        enhanced_candidates = []
        invited_candidate_ids = set(interview_data.get("candidates_invited", []))

        for candidate in job_candidates:
            candidate_id = candidate["id"]
            interview_details = candidate_interview_map.get(candidate_id)

            enhanced_candidate = {
                **candidate,
                "is_invited": candidate_id in invited_candidate_ids,
                "interview_status": (interview_details.get("status") if interview_details else None),
                "room_url": (interview_details.get("room_url") if interview_details else None),
                "bot_token": (interview_details.get("bot_token") if interview_details else None),
                "scheduled_at": (interview_details.get("scheduled_at") if interview_details else None),
                "started_at": (interview_details.get("started_at") if interview_details else None),
                "completed_at": (interview_details.get("completed_at") if interview_details else None),
            }
            enhanced_candidates.append(enhanced_candidate)

        # Extract flow data from the nested structure within job_data
        flow_data = None
        # The 'interview_flows' object is now expected to be part of job_data
        # It will be null if jobs.flow_id is null or if there's no matching flow.
        flow_details_from_job = job_data.get("interview_flows")
        if flow_details_from_job and flow_details_from_job.get("skills") is not None:
            flow_data = {
                "skills": flow_details_from_job.get("skills"),
                "duration": flow_details_from_job.get("duration"),
            }

        # Extract phone screen questions from the phone_screen table
        phone_screen_questions = []
        phone_screen_data = job_data.get("phone_screen")
        if phone_screen_data and phone_screen_data.get("questions"):
            # Extract questions from the JSONB structure
            questions_data = phone_screen_data.get("questions", {})
            if isinstance(questions_data, dict) and "questions" in questions_data:
                phone_screen_questions = questions_data["questions"]
            elif isinstance(questions_data, list):
                phone_screen_questions = questions_data

        # Separate invited and available candidates
        invited_candidates = [c for c in enhanced_candidates if c["is_invited"]]
        available_candidates = [c for c in enhanced_candidates if not c["is_invited"]]

        # Build optimized response
        response = {
            "skills": flow_data.get("skills", []),
            "duration": flow_data.get("duration", 10),
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
                "process_stages": job_data.get("process_stages"),
                "phone_screen_id": job_data.get("phone_screen_id"),
                "phone_screen_questions": phone_screen_questions,
            },
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
        raise HTTPException(status_code=500, detail=f"Failed to fetch interview: {str(e)}")


@router.get("/{interview_id}/candidate-access")
async def validate_candidate_access(interview_id: str) -> Dict[str, Any]:
    """
    Validate if a candidate has access to a specific interview
    Returns interview details and candidate info if access is granted
    """
    try:
        logger.info(f"Validating candidate access for interview {interview_id}")

        # Check if interview exists
        interview = db.fetch_one("interviews", {"id": interview_id})
        if not interview:
            return {"success": False, "message": "Interview not found"}

        # Get job details for the interview
        job = db.fetch_one("jobs", {"id": interview["job_id"]})
        if not job:
            return {"success": False, "message": "Job not found for this interview"}

        # Get interview flow details
        flow = db.fetch_one("interview_flows", {"id": job.get("flow_id")}) if job.get("flow_id") else None

        # For now, allow access if interview exists
        # In production, this should validate candidate authentication via token or session

        response_data = {
            "success": True,
            "message": "Access granted",
            "interview": {
                "id": interview_id,
                "title": job.get("title", "Interview"),
                "company": "TechCorp",  # This should come from organization
                "duration": flow.get("duration", 30) if flow else 30,
                "skills": flow.get("skills", []) if flow else [],
            },
            "candidate": {
                "name": "Candidate",  # This should come from candidate session/token
                "email": "candidate@example.com",  # This should come from candidate session/token
            },
        }

        logger.info(f"Access granted for interview {interview_id}")
        return response_data

    except Exception as e:
        logger.error(f"Error validating candidate access for interview {interview_id}: {str(e)}")
        return {"success": False, "message": "Failed to validate access"}


@router.post("/{interview_id}/join")
async def join_interview(interview_id: str, request: Request) -> Dict[str, Any]:
    """
    Create or join an interview room for a candidate
    """
    try:
        logger.info(f"Candidate joining interview {interview_id}")

        # Check if interview exists
        interview = db.fetch_one("interviews", {"id": interview_id})
        if not interview:
            return {"success": False, "message": "Interview not found"}

        # Get the manager from app state to create a real Daily.co room
        manager = request.app.state.manager
        room_url, bot_token = await manager.create_room_and_token()

        logger.info(f"Created interview room for interview {interview_id}: {room_url}")

        return {
            "success": True,
            "message": "Interview room created successfully",
            "room_url": room_url,
            "bot_token": bot_token,
        }

    except Exception as e:
        logger.error(f"Error joining interview {interview_id}: {str(e)}")
        return {"success": False, "message": "Failed to create interview room"}


@router.get("/candidate-interviews/{candidate_interview_id}")
async def get_candidate_interview_details(candidate_interview_id: str, request: Request):
    """
    Get all details required to start a candidate interview.
    This is an unauthenticated endpoint, access is granted by knowing the candidate_interview_id.
    """
    try:
        # Use Supabase client to fetch data with joins
        result = (
            db.supabase.table("candidate_interviews")
            .select(
                """
                candidate_interview_id:id,
                candidate:candidates(id, name, email),
                interview:interviews(
                    id,
                    job:jobs(
                        id,
                        title,
                        organization:organizations(name),
                        flow:interview_flows(flow_json, duration, skills)
                    )
                )
            """
            )
            .eq("id", candidate_interview_id)
            .single()
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Candidate interview not found")

        # Flatten the nested structure into the desired format
        data = result.data
        details = {
            "candidate_interview_id": data["candidate_interview_id"],
            "candidate_id": data["candidate"]["id"],
            "candidate_name": data["candidate"]["name"],
            "candidate_email": data["candidate"]["email"],
            "interview_id": data["interview"]["id"],
            "job_id": data["interview"]["job"]["id"],
            "job_title": data["interview"]["job"]["title"],
            "company_name": data["interview"]["job"]["organization"]["name"],
            "flow_json": data["interview"]["job"]["flow"]["flow_json"] if data["interview"]["job"]["flow"] else None,
            "duration": data["interview"]["job"]["flow"]["duration"] if data["interview"]["job"]["flow"] else 30,
            "skills": data["interview"]["job"]["flow"]["skills"] if data["interview"]["job"]["flow"] else [],
        }

        return {"success": True, "details": details}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error fetching candidate interview details for {candidate_interview_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch interview details.")
