from typing import Dict, Any, Optional, List, Literal
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel, Field, EmailStr
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from loguru import logger

from src.core.config import Config

router = APIRouter(prefix="/api/v1/interviews", tags=["interviews"])

# Pydantic models for request validation
class GenerateFlowRequest(BaseModel):
    job_description: str = Field(..., min_length=50, description="Job description for the interview flow")
    organization_id: str = Field(..., description="Organization ID")

class SendInviteRequest(BaseModel):
    email: EmailStr = Field(..., description="Candidate's email address")
    name: str = Field(..., description="Candidate's name")
    job: str = Field(..., description="Job title/position")

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

async def send_email_background(email: str, name: str, job: str) -> None:
    """Background task to send email"""
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
                    We are excited to invite you for an interview for the <b>{job}</b>
                </p>
                <p style="font-size: 1.05em; color: #444;">
                    Your skills and experience have impressed our team, and we'd love to get to know you better!
                </p>
                <div style="margin: 24px 0;">
                    <a href="mailto:recruiter@flowterview.com" style="display:inline-block; background: #4f46e5; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 1.1em; font-weight: bold;">Confirm Interview</a>
                </div>
                <p style="color: #555;">
                    We'll be in touch soon to schedule your interview.<br>
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
        await aiosmtplib.send(
            message,
            hostname=Config.SMTP_HOST,
            port=Config.SMTP_PORT,
            username=Config.SMTP_USER,
            password=Config.SMTP_PASS,
            use_tls=True
        )
        logger.info(f"Email sent successfully to {email}")
    except Exception as e:
        logger.error(f"Failed to send email to {email}: {e}")
        # We don't raise the exception since this is a background task
        # The main request has already returned success

@router.post("/send-invite")
async def send_invite(
    request: SendInviteRequest,
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """
    Send an interview invitation email to the candidate
    """
    try:
        # Add email sending to background tasks
        background_tasks.add_task(
            send_email_background,
            request.email,
            request.name,
            request.job
        )
        
        return {"success": True, "message": "Invitation email queued for sending"}
    except Exception as e:
        logger.error(f"Error sending invite: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[InterviewOut])
async def list_interviews(request: Request):
    supabase = request.app.state.supabase
    resp = supabase.table("interviews").select("*").execute()
    if resp.error:
        raise HTTPException(status_code=500, detail=resp.error.message)
    return resp.data

@router.get("/{interview_id}", response_model=InterviewOut)
async def get_interview(interview_id: str, request: Request):
    supabase = request.app.state.supabase
    resp = supabase.table("interviews").select("*").eq("id", interview_id).single().execute()
    if resp.error:
        raise HTTPException(status_code=404, detail=resp.error.message)
    return resp.data

@router.post("/", response_model=InterviewOut)
async def create_interview(interview: InterviewIn, request: Request):
    supabase = request.app.state.supabase
    resp = supabase.table("interviews").insert(interview.dict()).execute()
    if resp.error:
        raise HTTPException(status_code=400, detail=resp.error.message)
    return resp.data[0]

@router.patch("/{interview_id}", response_model=InterviewOut)
async def update_interview(interview_id: str, updates: InterviewUpdate, request: Request):
    supabase = request.app.state.supabase
    update_dict = {k: v for k, v in updates.dict().items() if v is not None}
    resp = supabase.table("interviews").update(update_dict).eq("id", interview_id).execute()
    if resp.error:
        raise HTTPException(status_code=400, detail=resp.error.message)
    return resp.data[0] 