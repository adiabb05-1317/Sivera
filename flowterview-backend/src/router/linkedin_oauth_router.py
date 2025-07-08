from datetime import datetime, timedelta
import secrets
from typing import Dict, Optional
import urllib.parse

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
import httpx
from pydantic import BaseModel, Field

from src.core.config import Config
from src.utils.linkedin_api import LinkedInAPIError, linkedin_api
from src.utils.logger import logger
from storage.db_manager import DatabaseError, DatabaseManager

router = APIRouter(prefix="/api/v1/linkedin", tags=["linkedin-oauth"])
db = DatabaseManager()

# LinkedIn OAuth endpoints
LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_PROFILE_URL = "https://api.linkedin.com/v2/userinfo"

# Default OAuth scopes for LinkedIn (basic scopes available with "Sign In with LinkedIn")
DEFAULT_SCOPES = [
    "openid",
    "profile",
    "email",
    # Advanced scopes like w_member_social, r_organization_social, rw_organization_admin
    # require special LinkedIn permissions and should be added only after approval
]


class LinkedInAuthRequest(BaseModel):
    organization_id: str = Field(..., description="Organization ID to associate with LinkedIn integration")
    scopes: Optional[list[str]] = Field(default=None, description="Custom OAuth scopes (optional)")
    state: Optional[str] = Field(default=None, description="Custom state parameter for CSRF protection")


class LinkedInAuthResponse(BaseModel):
    authorization_url: str
    state: str


class LinkedInCallbackRequest(BaseModel):
    code: str = Field(..., description="Authorization code from LinkedIn")
    state: str = Field(..., description="State parameter for CSRF validation")
    organization_id: str = Field(..., description="Organization ID from the original auth request")


class LinkedInTokenResponse(BaseModel):
    access_token: str
    expires_in: int
    scope: str
    linkedin_user_id: Optional[str] = None
    profile_data: Optional[Dict] = None


class LinkedInIntegrationStatus(BaseModel):
    is_connected: bool
    organization_id: str
    linkedin_user_id: Optional[str] = None
    expires_at: Optional[str] = None
    scopes: Optional[str] = None
    profile_data: Optional[Dict] = None


class LinkedInDisconnectResponse(BaseModel):
    success: bool
    message: str


class LinkedInRemoveResponse(BaseModel):
    success: bool
    message: str


def validate_linkedin_config():
    """Validate LinkedIn OAuth configuration"""
    if not Config.LINKEDIN_CLIENT_ID or not Config.LINKEDIN_CLIENT_SECRET:
        raise HTTPException(
            status_code=500, detail="LinkedIn OAuth is not properly configured. Missing client ID or secret."
        )


def generate_secure_state(organization_id: str) -> str:
    """Generate a secure state parameter for OAuth CSRF protection"""
    random_token = secrets.token_urlsafe(32)
    return f"{organization_id}:{random_token}"


def parse_state_parameter(state: str) -> tuple[str, str]:
    """Parse the state parameter to extract organization_id and token"""
    try:
        parts = state.split(":", 1)
        if len(parts) != 2:
            raise ValueError("Invalid state format")
        return parts[0], parts[1]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid state parameter")


async def get_linkedin_profile(access_token: str) -> Dict:
    """Fetch LinkedIn profile information using access token"""
    try:
        headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

        async with httpx.AsyncClient() as client:
            response = await client.get(LINKEDIN_PROFILE_URL, headers=headers)

        if response.status_code != 200:
            logger.error(f"Failed to fetch LinkedIn profile: {response.status_code} - {response.text}")
            return {}

        return response.json()
    except Exception as e:
        logger.error(f"Error fetching LinkedIn profile: {str(e)}")
        return {}


@router.post("/auth", response_model=LinkedInAuthResponse)
async def initiate_linkedin_auth(auth_request: LinkedInAuthRequest, request: Request):
    """
    Step 1: Generate LinkedIn authorization URL

    This endpoint creates the authorization URL that redirects users to LinkedIn
    for permission granting. It includes CSRF protection via state parameter.
    """
    validate_linkedin_config()

    try:
        # Verify organization exists
        org = db.fetch_one("organizations", {"id": auth_request.organization_id})
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")

        # Check if LinkedIn integration already exists for this organization
        existing_integration = db.fetch_one(
            "linkedin_integrations", {"organization_id": auth_request.organization_id, "is_active": True}
        )

        if existing_integration:
            logger.warning(f"LinkedIn integration already exists for organization {auth_request.organization_id}")
            # We'll allow re-authentication to refresh tokens

        # Generate secure state parameter
        state = auth_request.state or generate_secure_state(auth_request.organization_id)

        # Use provided scopes or defaults
        scopes = auth_request.scopes or DEFAULT_SCOPES
        scope_string = " ".join(scopes)

        # Build authorization URL
        auth_params = {
            "response_type": "code",
            "client_id": Config.LINKEDIN_CLIENT_ID,
            "redirect_uri": Config.LINKEDIN_REDIRECT_URI,
            "scope": scope_string,
            "state": state,
        }

        authorization_url = f"{LINKEDIN_AUTH_URL}?{urllib.parse.urlencode(auth_params)}"

        logger.info(f"Generated LinkedIn auth URL for organization {auth_request.organization_id}")

        return LinkedInAuthResponse(authorization_url=authorization_url, state=state)

    except DatabaseError as e:
        logger.error(f"Database error in LinkedIn auth initiation: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error occurred")
    except Exception as e:
        logger.error(f"Unexpected error in LinkedIn auth initiation: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/callback", response_model=LinkedInTokenResponse)
async def linkedin_oauth_callback(callback_request: LinkedInCallbackRequest, request: Request):
    """
    Step 2: Handle LinkedIn OAuth callback

    This endpoint exchanges the authorization code for access tokens
    and stores them securely in the database.
    """
    validate_linkedin_config()

    try:
        # Parse and validate state parameter
        organization_id, state_token = parse_state_parameter(callback_request.state)

        # Verify the organization_id matches the one in the request
        if organization_id != callback_request.organization_id:
            raise HTTPException(status_code=400, detail="State parameter organization mismatch")

        # Verify organization exists
        org = db.fetch_one("organizations", {"id": organization_id})
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")

        # Exchange authorization code for access token
        token_data = {
            "grant_type": "authorization_code",
            "code": callback_request.code,
            "client_id": Config.LINKEDIN_CLIENT_ID,
            "client_secret": Config.LINKEDIN_CLIENT_SECRET,
            "redirect_uri": Config.LINKEDIN_REDIRECT_URI,
        }

        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        async with httpx.AsyncClient() as client:
            response = await client.post(LINKEDIN_TOKEN_URL, data=token_data, headers=headers)

        if response.status_code != 200:
            logger.error(f"LinkedIn token exchange failed: {response.status_code} - {response.text}")
            raise HTTPException(status_code=400, detail=f"Failed to exchange authorization code: {response.text}")

        token_response = response.json()

        # Extract token information
        access_token = token_response["access_token"]
        expires_in = token_response.get("expires_in", 5184000)  # LinkedIn default: 60 days
        scope = token_response.get("scope", "")
        refresh_token = token_response.get("refresh_token")  # LinkedIn may not provide this

        # Calculate expiration time
        expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

        # Fetch LinkedIn profile information
        profile_data = await get_linkedin_profile(access_token)
        linkedin_user_id = profile_data.get("sub")  # LinkedIn user ID from profile

        # Store or update LinkedIn integration in database
        integration_data = {
            "organization_id": organization_id,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_at": expires_at.isoformat(),
            "scope": scope,
            "linkedin_user_id": linkedin_user_id,
            "linkedin_profile_data": profile_data,
            "is_active": True,
            "updated_at": datetime.utcnow().isoformat(),
        }

        # Check if integration already exists
        existing_integration = db.fetch_one("linkedin_integrations", {"organization_id": organization_id})

        if existing_integration:
            # Update existing integration
            db.update("linkedin_integrations", integration_data, {"organization_id": organization_id})
            logger.info(f"Updated LinkedIn integration for organization {organization_id}")
        else:
            # Create new integration
            integration_data["created_at"] = datetime.utcnow().isoformat()
            db.execute_query("linkedin_integrations", integration_data)
            logger.info(f"Created new LinkedIn integration for organization {organization_id}")

        # Return success response (without sensitive data)
        return LinkedInTokenResponse(
            access_token="***STORED***",  # Don't return actual token
            expires_in=expires_in,
            scope=scope,
            linkedin_user_id=linkedin_user_id,
            profile_data=profile_data,
        )

    except DatabaseError as e:
        logger.error(f"Database error in LinkedIn callback: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error occurred")
    except httpx.RequestError as e:
        logger.error(f"HTTP request error in LinkedIn callback: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to communicate with LinkedIn")
    except Exception as e:
        logger.error(f"Unexpected error in LinkedIn callback: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/callback")
async def linkedin_oauth_callback_get(
    code: str = Query(..., description="Authorization code from LinkedIn"),
    state: str = Query(..., description="State parameter"),
    error: Optional[str] = Query(None, description="Error from LinkedIn"),
    error_description: Optional[str] = Query(None, description="Error description"),
    request: Request = None,
):
    """
    Alternative GET endpoint for LinkedIn OAuth callback

    LinkedIn redirects here after user authorization. This endpoint handles
    both success and error cases from LinkedIn OAuth flow and redirects to frontend.
    """
    # Get frontend URL for redirects
    frontend_url = getattr(Config, "RECRUITER_FRONTEND_URL", "http://localhost:3000")
    logger.info(f"Using frontend URL for redirect: {frontend_url}")

    # Handle OAuth errors
    if error:
        logger.error(f"LinkedIn OAuth error: {error} - {error_description}")
        error_params = f"?error={error}"
        if error_description:
            error_params += f"&error_description={error_description}"
        return RedirectResponse(url=f"{frontend_url}/auth/linkedin-callback{error_params}", status_code=302)

    # Parse state to get organization_id
    try:
        organization_id, _ = parse_state_parameter(state)
    except Exception as e:
        logger.error(f"Invalid state parameter: {str(e)}")
        return RedirectResponse(
            url=f"{frontend_url}/auth/linkedin-callback?error=invalid_state&error_description=Invalid state parameter",
            status_code=302,
        )

    # Create callback request and process
    callback_request = LinkedInCallbackRequest(code=code, state=state, organization_id=organization_id)

    try:
        # Process the OAuth callback
        result = await linkedin_oauth_callback(callback_request, request)

        # Redirect to frontend success page with success parameters
        success_params = f"?code={code}&state={state}&success=true"
        return RedirectResponse(url=f"{frontend_url}/auth/linkedin-callback{success_params}", status_code=302)

    except HTTPException as e:
        logger.error(f"OAuth callback processing failed: {str(e.detail)}")
        error_params = f"?error=callback_failed&error_description={e.detail}"
        return RedirectResponse(url=f"{frontend_url}/auth/linkedin-callback{error_params}", status_code=302)
    except Exception as e:
        logger.error(f"Unexpected error in OAuth callback: {str(e)}")
        error_params = "?error=internal_error&error_description=An unexpected error occurred"
        return RedirectResponse(url=f"{frontend_url}/auth/linkedin-callback{error_params}", status_code=302)


@router.get("/status/{organization_id}", response_model=LinkedInIntegrationStatus)
async def get_linkedin_integration_status(organization_id: str, request: Request):
    """
    Get LinkedIn integration status for an organization

    Returns information about the current LinkedIn integration including
    connection status, expiration, and basic profile information.
    """
    try:
        # Verify organization exists
        org = db.fetch_one("organizations", {"id": organization_id})
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")

        # Check for active LinkedIn integration
        integration = db.fetch_one("linkedin_integrations", {"organization_id": organization_id, "is_active": True})

        if not integration:
            return LinkedInIntegrationStatus(is_connected=False, organization_id=organization_id)

        # Check if token is expired
        expires_at = datetime.fromisoformat(integration["expires_at"].replace("Z", "+00:00"))
        is_expired = datetime.utcnow() > expires_at.replace(tzinfo=None)

        if is_expired:
            logger.warning(f"LinkedIn integration for organization {organization_id} has expired")
            # Mark as inactive
            db.update(
                "linkedin_integrations",
                {"is_active": False, "updated_at": datetime.utcnow().isoformat()},
                {"organization_id": organization_id},
            )

            return LinkedInIntegrationStatus(is_connected=False, organization_id=organization_id)

        return LinkedInIntegrationStatus(
            is_connected=True,
            organization_id=organization_id,
            linkedin_user_id=integration.get("linkedin_user_id"),
            expires_at=integration["expires_at"],
            scopes=integration.get("scope"),
            profile_data=integration.get("linkedin_profile_data"),
        )

    except DatabaseError as e:
        logger.error(f"Database error checking LinkedIn status: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error occurred")
    except Exception as e:
        logger.error(f"Unexpected error checking LinkedIn status: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/refresh/{organization_id}")
async def refresh_linkedin_token(organization_id: str, request: Request):
    """
    Refresh LinkedIn access token using refresh token

    Note: LinkedIn's current OAuth 2.0 implementation may not provide refresh tokens.
    This endpoint is prepared for future LinkedIn API updates.
    """
    validate_linkedin_config()

    try:
        # Get current integration
        integration = db.fetch_one("linkedin_integrations", {"organization_id": organization_id, "is_active": True})

        if not integration:
            raise HTTPException(status_code=404, detail="LinkedIn integration not found")

        refresh_token = integration.get("refresh_token")
        if not refresh_token:
            raise HTTPException(
                status_code=400, detail="No refresh token available. Please re-authenticate with LinkedIn."
            )

        # Attempt token refresh
        refresh_data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": Config.LINKEDIN_CLIENT_ID,
            "client_secret": Config.LINKEDIN_CLIENT_SECRET,
        }

        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        async with httpx.AsyncClient() as client:
            response = await client.post(LINKEDIN_TOKEN_URL, data=refresh_data, headers=headers)

        if response.status_code != 200:
            logger.error(f"LinkedIn token refresh failed: {response.status_code} - {response.text}")
            # Mark integration as inactive
            db.update(
                "linkedin_integrations",
                {"is_active": False, "updated_at": datetime.utcnow().isoformat()},
                {"organization_id": organization_id},
            )
            raise HTTPException(status_code=400, detail="Token refresh failed. Please re-authenticate with LinkedIn.")

        token_response = response.json()

        # Update integration with new token
        new_access_token = token_response["access_token"]
        new_expires_in = token_response.get("expires_in", 5184000)
        new_expires_at = datetime.utcnow() + timedelta(seconds=new_expires_in)
        new_refresh_token = token_response.get("refresh_token", refresh_token)

        update_data = {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "expires_at": new_expires_at.isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

        db.update("linkedin_integrations", update_data, {"organization_id": organization_id})

        logger.info(f"Successfully refreshed LinkedIn token for organization {organization_id}")

        return {"success": True, "message": "Token refreshed successfully", "expires_at": new_expires_at.isoformat()}

    except DatabaseError as e:
        logger.error(f"Database error refreshing LinkedIn token: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error occurred")
    except Exception as e:
        logger.error(f"Unexpected error refreshing LinkedIn token: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/disconnect/{organization_id}", response_model=LinkedInDisconnectResponse)
async def disconnect_linkedin_integration(organization_id: str, request: Request):
    """
    Disconnect LinkedIn integration for an organization

    This removes the stored tokens and marks the integration as inactive.
    """
    try:
        # Verify organization exists
        org = db.fetch_one("organizations", {"id": organization_id})
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")

        # Check if integration exists
        integration = db.fetch_one("linkedin_integrations", {"organization_id": organization_id})

        if not integration:
            return LinkedInDisconnectResponse(success=True, message="No LinkedIn integration found to disconnect")

        # Mark integration as inactive (keep tokens for audit trail)
        update_data = {"is_active": False, "updated_at": datetime.utcnow().isoformat()}

        db.update("linkedin_integrations", update_data, {"organization_id": organization_id})

        logger.info(f"Successfully disconnected LinkedIn integration for organization {organization_id}")

        return LinkedInDisconnectResponse(success=True, message="LinkedIn integration disconnected successfully")

    except DatabaseError as e:
        logger.error(f"Database error disconnecting LinkedIn: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error occurred")
    except Exception as e:
        logger.error(f"Unexpected error disconnecting LinkedIn: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/remove/{organization_id}", response_model=LinkedInRemoveResponse)
async def remove_linkedin_integration(organization_id: str, request: Request):
    """
    Completely remove LinkedIn integration for an organization

    This permanently deletes the integration record from the database.
    Use this to create a fresh integration or completely clean up.
    """
    try:
        # Verify organization exists
        org = db.fetch_one("organizations", {"id": organization_id})
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")

        # Check if integration exists
        integration = db.fetch_one("linkedin_integrations", {"organization_id": organization_id})

        if not integration:
            return LinkedInRemoveResponse(success=True, message="No LinkedIn integration found to remove")

        # Permanently delete the integration record
        db.delete("linkedin_integrations", {"organization_id": organization_id})

        logger.info(f"Successfully removed LinkedIn integration for organization {organization_id}")

        return LinkedInRemoveResponse(success=True, message="LinkedIn integration completely removed from system")

    except DatabaseError as e:
        logger.error(f"Database error removing LinkedIn: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error occurred")
    except Exception as e:
        logger.error(f"Unexpected error removing LinkedIn: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/profile/{organization_id}")
async def get_linkedin_profile_data(organization_id: str, request: Request):
    """
    Get stored LinkedIn profile data for an organization

    Returns the cached profile information from the database.
    """
    try:
        # Get active integration
        integration = db.fetch_one("linkedin_integrations", {"organization_id": organization_id, "is_active": True})

        if not integration:
            raise HTTPException(status_code=404, detail="LinkedIn integration not found")

        # Check if token is expired
        expires_at = datetime.fromisoformat(integration["expires_at"].replace("Z", "+00:00"))
        is_expired = datetime.utcnow() > expires_at.replace(tzinfo=None)

        if is_expired:
            raise HTTPException(status_code=401, detail="LinkedIn integration has expired")

        profile_data = integration.get("linkedin_profile_data", {})

        return {
            "linkedin_user_id": integration.get("linkedin_user_id"),
            "profile_data": profile_data,
            "last_updated": integration.get("updated_at"),
        }

    except DatabaseError as e:
        logger.error(f"Database error fetching LinkedIn profile: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error occurred")
    except Exception as e:
        logger.error(f"Unexpected error fetching LinkedIn profile: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/test/integration/{organization_id}")
async def test_linkedin_integration(organization_id: str, request: Request):
    """
    Test endpoint to verify LinkedIn integration is working correctly

    This endpoint makes a simple API call to LinkedIn to verify the integration
    is active and tokens are valid.
    """
    try:
        # Verify organization exists
        org = db.fetch_one("organizations", {"id": organization_id})
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")

        # Check if integration is valid
        is_valid = await linkedin_api.validate_integration(organization_id)
        if not is_valid:
            raise HTTPException(status_code=401, detail="LinkedIn integration is not valid or has expired")

        # Try to fetch user profile to test API access
        try:
            profile_data = await linkedin_api.get_user_profile(organization_id)
            integration_info = await linkedin_api.get_integration_info(organization_id)

            return {
                "status": "success",
                "message": "LinkedIn integration is working correctly",
                "organization_id": organization_id,
                "integration_info": integration_info,
                "test_api_call": {
                    "endpoint": "/userinfo",
                    "success": True,
                    "profile_name": profile_data.get("name", "N/A"),
                    "profile_email": profile_data.get("email", "N/A"),
                },
            }

        except LinkedInAPIError as e:
            return {
                "status": "error",
                "message": "LinkedIn integration exists but API call failed",
                "organization_id": organization_id,
                "error": str(e),
                "test_api_call": {"endpoint": "/userinfo", "success": False},
            }

    except DatabaseError as e:
        logger.error(f"Database error testing LinkedIn integration: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error occurred")
    except Exception as e:
        logger.error(f"Unexpected error testing LinkedIn integration: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/test/profile-by-url/{organization_id}")
async def test_profile_by_url(
    organization_id: str,
    profile_url: str = Query(..., description="LinkedIn profile URL to test"),
    request: Request = None,
):
    """
    Test endpoint to fetch LinkedIn profile by URL

    This endpoint tests the profile fetching functionality that will be used
    for candidate onboarding.
    """
    try:
        # Verify organization exists
        org = db.fetch_one("organizations", {"id": organization_id})
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")

        # Check if integration is valid
        is_valid = await linkedin_api.validate_integration(organization_id)
        if not is_valid:
            raise HTTPException(status_code=401, detail="LinkedIn integration is not valid or has expired")

        # Try to fetch profile by URL
        try:
            profile_data = await linkedin_api.get_profile_by_url(organization_id, profile_url)

            return {
                "status": "success",
                "message": "Successfully fetched LinkedIn profile",
                "organization_id": organization_id,
                "profile_url": profile_url,
                "profile_data": profile_data,
            }

        except LinkedInAPIError as e:
            return {
                "status": "error",
                "message": "Failed to fetch LinkedIn profile",
                "organization_id": organization_id,
                "profile_url": profile_url,
                "error": str(e),
            }

    except DatabaseError as e:
        logger.error(f"Database error testing profile fetch: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error occurred")
    except Exception as e:
        logger.error(f"Unexpected error testing profile fetch: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
