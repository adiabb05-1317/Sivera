"""
LinkedIn API utility functions for making authenticated API calls.
This module provides helper functions for accessing LinkedIn APIs
for job syncing, candidate onboarding, and profile retrieval.
"""

from datetime import datetime
from typing import Dict, List, Optional

import httpx

from src.utils.logger import logger
from storage.db_manager import DatabaseError, DatabaseManager


class LinkedInAPIError(Exception):
    """Custom exception for LinkedIn API errors"""

    pass


class LinkedInAPI:
    """LinkedIn API client for making authenticated requests"""

    BASE_URL = "https://api.linkedin.com/v2"

    def __init__(self):
        self.db = DatabaseManager()

    async def _get_access_token(self, organization_id: str) -> str:
        """Get valid access token for organization"""
        try:
            integration = self.db.fetch_one(
                "linkedin_integrations", {"organization_id": organization_id, "is_active": True}
            )

            if not integration:
                raise LinkedInAPIError("No active LinkedIn integration found for organization")

            # Double-check that integration is active (safety check)
            if not integration.get("is_active", False):
                raise LinkedInAPIError("LinkedIn integration is not active. Please reconnect.")

            # Check if token is expired
            expires_at = datetime.fromisoformat(integration["expires_at"].replace("Z", "+00:00"))
            if datetime.utcnow() > expires_at.replace(tzinfo=None):
                # Mark as inactive
                self.db.update(
                    "linkedin_integrations",
                    {"is_active": False, "updated_at": datetime.utcnow().isoformat()},
                    {"organization_id": organization_id},
                )
                raise LinkedInAPIError("LinkedIn integration has expired. Please re-authenticate.")

            return integration["access_token"]

        except DatabaseError as e:
            logger.error(f"Database error getting LinkedIn access token: {str(e)}")
            raise LinkedInAPIError("Database error occurred")

    async def _make_authenticated_request(
        self,
        organization_id: str,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        json_data: Optional[Dict] = None,
        headers: Optional[Dict] = None,
    ) -> Dict:
        """Make authenticated request to LinkedIn API"""
        try:
            access_token = await self._get_access_token(organization_id)

            request_headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0",
            }

            if headers:
                request_headers.update(headers)

            url = f"{self.BASE_URL}{endpoint}"

            async with httpx.AsyncClient() as client:
                if method.upper() == "GET":
                    response = await client.get(url, headers=request_headers, params=params)
                elif method.upper() == "POST":
                    response = await client.post(url, headers=request_headers, params=params, json=json_data)
                elif method.upper() == "PUT":
                    response = await client.put(url, headers=request_headers, params=params, json=json_data)
                elif method.upper() == "DELETE":
                    response = await client.delete(url, headers=request_headers, params=params)
                else:
                    raise LinkedInAPIError(f"Unsupported HTTP method: {method}")

            if response.status_code >= 400:
                logger.error(f"LinkedIn API error: {response.status_code} - {response.text}")
                raise LinkedInAPIError(f"LinkedIn API request failed: {response.status_code} - {response.text}")

            return response.json() if response.content else {}

        except httpx.RequestError as e:
            logger.error(f"HTTP request error calling LinkedIn API: {str(e)}")
            raise LinkedInAPIError("Failed to communicate with LinkedIn API")
        except Exception as e:
            logger.error(f"Unexpected error calling LinkedIn API: {str(e)}")
            raise LinkedInAPIError("Internal error occurred")

    # Profile-related methods
    async def get_user_profile(self, organization_id: str) -> Dict:
        """Get current user's LinkedIn profile"""
        return await self._make_authenticated_request(organization_id, "GET", "/userinfo")

    async def get_profile_by_url(self, organization_id: str, profile_url: str) -> Dict:
        """
        Get LinkedIn profile by URL.
        Note: This requires special permissions and may not be available for all applications.
        """
        # Extract profile ID from URL if needed
        # LinkedIn profile URLs are typically: https://www.linkedin.com/in/username/
        if "/in/" in profile_url:
            username = profile_url.split("/in/")[1].strip("/")
            endpoint = f"/people/(username:{username})"
        else:
            raise LinkedInAPIError("Invalid LinkedIn profile URL format")

        return await self._make_authenticated_request(organization_id, "GET", endpoint)

    # Organization/Company methods
    async def get_organization_info(self, organization_id: str, linkedin_org_id: str) -> Dict:
        """Get information about a LinkedIn organization"""
        endpoint = f"/organizations/{linkedin_org_id}"
        return await self._make_authenticated_request(organization_id, "GET", endpoint)

    async def get_organization_posts(self, organization_id: str, linkedin_org_id: str, count: int = 10) -> List[Dict]:
        """Get recent posts from a LinkedIn organization"""
        params = {"author": f"urn:li:organization:{linkedin_org_id}", "count": count}
        endpoint = "/shares"
        response = await self._make_authenticated_request(organization_id, "GET", endpoint, params=params)
        return response.get("elements", [])

    # Job posting methods (future implementation)
    async def get_job_postings(self, organization_id: str, linkedin_org_id: str, count: int = 25) -> List[Dict]:
        """
        Get job postings for an organization.
        Note: This requires specific LinkedIn Talent Solutions permissions.
        """
        params = {"companyId": linkedin_org_id, "count": count}
        endpoint = "/jobPostings"
        response = await self._make_authenticated_request(organization_id, "GET", endpoint, params=params)
        return response.get("elements", [])

    async def create_job_posting(self, organization_id: str, job_data: Dict) -> Dict:
        """
        Create a new job posting on LinkedIn.
        Note: This requires specific LinkedIn Talent Solutions permissions.
        """
        endpoint = "/jobPostings"
        return await self._make_authenticated_request(organization_id, "POST", endpoint, json_data=job_data)

    async def update_job_posting(self, organization_id: str, job_id: str, job_data: Dict) -> Dict:
        """
        Update an existing job posting on LinkedIn.
        Note: This requires specific LinkedIn Talent Solutions permissions.
        """
        endpoint = f"/jobPostings/{job_id}"
        return await self._make_authenticated_request(organization_id, "PUT", endpoint, json_data=job_data)

    async def delete_job_posting(self, organization_id: str, job_id: str) -> Dict:
        """
        Delete a job posting on LinkedIn.
        Note: This requires specific LinkedIn Talent Solutions permissions.
        """
        endpoint = f"/jobPostings/{job_id}"
        return await self._make_authenticated_request(organization_id, "DELETE", endpoint)

    # Candidate/People search methods (future implementation)
    async def search_people(
        self,
        organization_id: str,
        keywords: Optional[str] = None,
        location: Optional[str] = None,
        current_company: Optional[str] = None,
        past_company: Optional[str] = None,
        school: Optional[str] = None,
        count: int = 10,
    ) -> List[Dict]:
        """
        Search for people on LinkedIn.
        Note: This requires specific LinkedIn Talent Solutions permissions.
        """
        params = {"count": count}

        if keywords:
            params["keywords"] = keywords
        if location:
            params["geoUrn"] = location
        if current_company:
            params["currentCompany"] = current_company
        if past_company:
            params["pastCompany"] = past_company
        if school:
            params["school"] = school

        endpoint = "/people"
        response = await self._make_authenticated_request(organization_id, "GET", endpoint, params=params)
        return response.get("elements", [])

    # Utility methods
    async def validate_integration(self, organization_id: str) -> bool:
        """Check if LinkedIn integration is valid and active"""
        try:
            await self._get_access_token(organization_id)
            return True
        except LinkedInAPIError:
            return False

    async def get_available_scopes(self, organization_id: str) -> List[str]:
        """Get available scopes for the current LinkedIn integration"""
        try:
            integration = self.db.fetch_one(
                "linkedin_integrations", {"organization_id": organization_id, "is_active": True}
            )

            if not integration:
                return []

            scope_string = integration.get("scope", "")
            return scope_string.split() if scope_string else []

        except DatabaseError:
            return []

    async def get_integration_info(self, organization_id: str) -> Optional[Dict]:
        """Get detailed information about LinkedIn integration"""
        try:
            integration = self.db.fetch_one(
                "linkedin_integrations", {"organization_id": organization_id, "is_active": True}
            )

            if not integration:
                return None

            # Don't return sensitive token data
            return {
                "linkedin_user_id": integration.get("linkedin_user_id"),
                "scopes": integration.get("scope", "").split(),
                "expires_at": integration.get("expires_at"),
                "profile_data": integration.get("linkedin_profile_data"),
                "created_at": integration.get("created_at"),
                "last_updated": integration.get("updated_at"),
            }

        except DatabaseError:
            return None


# Create a singleton instance
linkedin_api = LinkedInAPI()
