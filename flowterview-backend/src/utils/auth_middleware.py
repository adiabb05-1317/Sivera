from typing import Optional

from fastapi import HTTPException, Request
import jwt
from loguru import logger


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
            logger.debug(f"Missing required user headers. X-User-ID: {'present' if user_id else 'missing'}, X-User-Email: {'present' if email else 'missing'}")
            return None

        # Optional: Validate Supabase token if present (but don't fail auth if validation fails)
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            token_valid = validate_supabase_token(token)
            if not token_valid:
                logger.warning(f"Invalid Supabase token for user {email}, but proceeding with header-based auth")
                # Don't return None here - continue with header-based authentication
        
        logger.debug(f"Successfully extracted user context for {email} with org_id: {organization_id}")
        return UserContext(user_id=user_id, email=email, organization_id=organization_id)

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
        
        logger.debug(f"Decoded token claims: {list(decoded.keys())}")

        # Check if token has required claims (be more lenient - only require sub)
        if "sub" not in decoded:
            logger.warning("Token missing 'sub' claim")
            return False

        # Check if token is expired
        import time
        current_time = time.time()
        
        if "exp" in decoded:
            token_exp = decoded["exp"]
            logger.debug(f"Token expiration: {token_exp}, current time: {current_time}")
            if token_exp < current_time:
                logger.warning(f"Token expired. Exp: {token_exp}, Now: {current_time}")
                return False

        logger.debug("Token validation successful")
        return True

    except jwt.DecodeError as e:
        logger.error(f"JWT decode error: {e}")
        return False
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
        # Log the headers for debugging
        headers_debug = {
            "X-User-ID": request.headers.get("X-User-ID", "missing"),
            "X-User-Email": request.headers.get("X-User-Email", "missing"),
            "X-Organization-ID": request.headers.get("X-Organization-ID", "missing"),
            "Authorization": "present" if request.headers.get("Authorization") else "missing"
        }
        logger.error(f"Authentication failed. Headers: {headers_debug}")
        
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
