from fastapi import Request, HTTPException
from typing import Optional, Dict, Any
import jwt
from loguru import logger
from src.core.config import Config


class UserContext:
    """User context extracted from request headers"""

    def __init__(self, user_id: str, email: str, organization_id: Optional[str] = None):
        self.user_id = user_id
        self.email = email
        self.organization_id = organization_id


def extract_user_context(request: Request) -> Optional[UserContext]:
    """
    Extract user context from request headers.

    Headers expected:
    - X-User-ID: User ID from Supabase
    - X-User-Email: User email
    - X-Organization-ID: Organization ID (optional)
    - Authorization: Bearer token from Supabase (optional for validation)

    Returns:
        UserContext if valid headers found, None otherwise
    """
    try:
        user_id = request.headers.get("X-User-ID")
        email = request.headers.get("X-User-Email")
        organization_id = request.headers.get("X-Organization-ID")

        if not user_id or not email:
            logger.debug("Missing required user headers")
            return None

        # Optional: Validate Supabase token if present
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            if not validate_supabase_token(token):
                logger.warning(f"Invalid Supabase token for user {email}")
                return None

        return UserContext(
            user_id=user_id, email=email, organization_id=organization_id
        )

    except Exception as e:
        logger.error(f"Error extracting user context: {e}")
        return None


def validate_supabase_token(token: str) -> bool:
    """
    Validate Supabase JWT token.

    Args:
        token: JWT token from Supabase

    Returns:
        True if token is valid, False otherwise
    """
    try:
        # For now, we'll do basic validation
        # In production, you should verify the token signature with Supabase's public key
        decoded = jwt.decode(token, options={"verify_signature": False})

        # Check if token has required claims
        if "sub" not in decoded or "email" not in decoded:
            return False

        # Check if token is expired
        import time

        if "exp" in decoded and decoded["exp"] < time.time():
            return False

        return True

    except Exception as e:
        logger.error(f"Error validating token: {e}")
        return False


def require_auth(request: Request) -> UserContext:
    """
    Require authentication for a request.

    Args:
        request: FastAPI request object

    Returns:
        UserContext if authenticated

    Raises:
        HTTPException: If authentication fails
    """
    user_context = extract_user_context(request)
    if not user_context:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please include X-User-ID and X-User-Email headers.",
        )
    return user_context


def require_organization(request: Request) -> UserContext:
    """
    Require authentication with organization context.

    Args:
        request: FastAPI request object

    Returns:
        UserContext with organization_id

    Raises:
        HTTPException: If authentication fails or organization_id is missing
    """
    user_context = require_auth(request)
    if not user_context.organization_id:
        raise HTTPException(
            status_code=403,
            detail="Organization context required. Please include X-Organization-ID header.",
        )
    return user_context


# Utility function to get user context without raising exceptions
def get_user_context_optional(request: Request) -> Optional[UserContext]:
    """
    Get user context without raising exceptions.
    Useful for endpoints that work with or without authentication.

    Args:
        request: FastAPI request object

    Returns:
        UserContext if authenticated, None otherwise
    """
    return extract_user_context(request)
