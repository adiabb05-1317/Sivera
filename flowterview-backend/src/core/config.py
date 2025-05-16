import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    # Load environment variables at import time
    from dotenv import load_dotenv
    import os
    load_dotenv()
    
    # SMTP Configuration with defaults
    SMTP_HOST = os.getenv("SMTP_HOST", "smtpout.secureserver.net")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
    SMTP_USER = os.getenv("SMTP_USER", "recruiter@flowterview.com")
    SMTP_PASS = os.getenv("SMTP_PASS", "")
    
    # Frontend URL for generating links
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3001")
    
    @classmethod
    def validate_smtp_config(cls):
        """Validate that SMTP settings are properly configured"""
        if not cls.SMTP_HOST or not cls.SMTP_PORT or not cls.SMTP_USER or not cls.SMTP_PASS:
            from loguru import logger
            logger.warning("⚠️ SMTP settings are not fully configured. Email sending may fail.")
            logger.debug(f"SMTP_HOST: {cls.SMTP_HOST}, SMTP_PORT: {cls.SMTP_PORT}, SMTP_USER: {cls.SMTP_USER}")
            return False
        return True
    """Application configuration"""
    # Environment
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    DEBUG = ENVIRONMENT == "development"
    
    # Server settings
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8010"))
    RELOAD = DEBUG
    
    # CORS settings
    CORS_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:3001",
    ]
    
    # Supabase settings
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
    
    # SMTP settings
    SMTP_HOST = os.getenv("SMTP_HOST", "smtpout.secureserver.net")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASS = os.getenv("SMTP_PASS", "")

    @classmethod
    def init(cls):
        """Initialize configuration and validate required environment variables."""
        if not cls.validate_config():
            raise ValueError("Missing required environment variables for Supabase or SMTP.")

    @classmethod
    def validate_config(cls) -> bool:
        """Validate required configuration variables for Supabase and SMTP."""
        required_vars = [
            "SUPABASE_URL",
            "SUPABASE_KEY",
            "SMTP_HOST",
            "SMTP_PORT",
            "SMTP_USER",
            "SMTP_PASS",
        ]
        missing = [var for var in required_vars if not getattr(cls, var)]
        if missing:
            print(f"Missing required environment variables: {', '.join(missing)}")
            return False
        return True

Config.init() 