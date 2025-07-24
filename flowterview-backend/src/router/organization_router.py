from email.mime.text import MIMEText
import json
import os
from typing import List, Optional

import aiosmtplib
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from loguru import logger
from pydantic import BaseModel, EmailStr

from src.core.config import Config
from src.utils.auth_middleware import require_organization
from storage.db_manager import DatabaseError, DatabaseManager

router = APIRouter(prefix="/api/v1/organizations", tags=["organizations"])

db = DatabaseManager()


class OrganizationIn(BaseModel):
    name: str


class OrganizationUpdateIn(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None


class OrganizationOut(BaseModel):
    id: str
    name: str
    logo_url: Optional[str] = None
    domain: Optional[str] = None
    created_at: str
    updated_at: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    organization_id: str
    created_at: str


class BulkRecruiterInviteRequest(BaseModel):
    emails: List[EmailStr]


async def send_loops_email(to_email: str, template_id: str, variables: dict) -> None:
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


async def send_recruiter_invite_email(
    email: str,
    company_name: str,
    recruiter_url: str,
) -> None:
    """Background task to send recruiter invitation email via Loops"""
    try:
        logger.info(f"Sending recruiter invite email to {email}")

        # Prepare variables for Loops template
        variables = {
            "url": recruiter_url,
            "company": company_name,
        }

        await send_loops_email(email, Config.LOOPS_RECRUITER_INVITE_TEMPLATE, variables)
        logger.info(f"Recruiter invite email sent successfully to {email}")

    except Exception as e:
        logger.error(f"Failed to send recruiter invite email to {email}: {e}")
        raise


async def process_bulk_recruiter_invites(
    emails: List[str],
    organization_id: str,
    company_name: str,
) -> None:
    """Background task to process bulk recruiter invites"""
    try:
        logger.info(f"Processing bulk recruiter invites for {len(emails)} emails")

        recruiter_url = os.getenv("RECRUITER_FRONTEND_URL", "https://recruiter.sivera.io")

        # Send emails to all recruiters
        for email in emails:
            try:
                await send_recruiter_invite_email(email, company_name, recruiter_url)
            except Exception as e:
                logger.error(f"Failed to send invite to {email}: {e}")
                # Continue with other emails even if one fails

        logger.info(f"Bulk recruiter invites processed for organization {organization_id}")

    except Exception as e:
        logger.error(f"Error processing bulk recruiter invites: {str(e)}")


@router.post("/{org_id}/invite-recruiters")
async def invite_recruiters_bulk(
    org_id: str, request: BulkRecruiterInviteRequest, background_tasks: BackgroundTasks, app_request: Request
):
    """Send bulk recruiter invitation emails"""
    try:
        # Require authentication with organization context
        user_context = require_organization(app_request)

        # Verify the user has access to this organization
        if user_context.organization_id != org_id:
            raise HTTPException(status_code=403, detail="Access denied: Not authorized for this organization")

        # Get organization details
        org = db.fetch_one("organizations", {"id": org_id})
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")

        company_name = org.get("name", "Company")

        # Queue the processing as a background task
        background_tasks.add_task(
            process_bulk_recruiter_invites,
            request.emails,
            org_id,
            company_name,
        )

        logger.info(f"Bulk recruiter invite processing queued for {len(request.emails)} emails")

        return {
            "success": True,
            "message": f"Invitations are being sent to {len(request.emails)} recruiter(s)",
            "emails_count": len(request.emails),
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Unexpected error in bulk recruiter invite: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/", response_model=List[OrganizationOut])
async def list_organizations(request: Request):
    try:
        orgs = db.fetch_all("organizations")
        return orgs
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-user-email/{email}")
async def get_organization_by_user_email(email: str, request: Request):
    try:
        user = db.fetch_one("users", {"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        org_id = user.get("organization_id")
        if not org_id:
            raise HTTPException(status_code=404, detail="Organization not found for user")
        org = db.fetch_one("organizations", {"id": org_id})
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        return {"id": org["id"], "name": org["name"]}
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{org_id}", response_model=OrganizationOut)
async def get_organization(org_id: str, request: Request):
    try:
        org = db.fetch_one("organizations", {"id": org_id})
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        return org
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{org_id}", response_model=OrganizationOut)
async def update_organization(org_id: str, org_update: OrganizationUpdateIn, request: Request):
    try:
        # Check if organization exists
        existing_org = db.fetch_one("organizations", {"id": org_id})
        if not existing_org:
            raise HTTPException(status_code=404, detail="Organization not found")

        # Prepare update data
        update_data = {}
        if org_update.name is not None:
            update_data["name"] = org_update.name
        if org_update.logo_url is not None:
            update_data["logo_url"] = org_update.logo_url

        if not update_data:
            # No updates provided, return existing organization
            return existing_org

        # Update organization
        db.update("organizations", update_data, {"id": org_id})

        # Fetch and return the updated organization
        updated_org = db.fetch_one("organizations", {"id": org_id})
        if not updated_org:
            raise HTTPException(status_code=404, detail="Organization not found after update")
        return updated_org
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=OrganizationOut)
async def create_organization(org: OrganizationIn, request: Request):
    try:
        created_org = db.execute_query("organizations", {"domain": org.name})
        return created_org
    except DatabaseError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{org_id}/users", response_model=List[UserOut])
async def get_organization_users(org_id: str, request: Request):
    try:
        users = db.fetch_all("users", {"organization_id": org_id})
        return users
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))
