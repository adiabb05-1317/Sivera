import os

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config:
    # Load environment variables at import time
    from dotenv import load_dotenv

    load_dotenv()

    # Loops Email Configuration
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.loops.so")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "loops")
    SMTP_PASS = os.getenv("SMTP_PASS", "")  # Loops API Key

    # Loops Template IDs
    LOOPS_VERIFICATION_TEMPLATE = os.getenv("LOOPS_VERIFICATION_TEMPLATE", "cmc0gq2b80cj2xs0iqhal1tj6")
    LOOPS_INTERVIEW_TEMPLATE = os.getenv("LOOPS_INTERVIEW_TEMPLATE", "cmc0gq2b80cj2xs0iqhal1tj6")

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
    RELOAD = DEBUG and os.getenv("DISABLE_RELOAD", "false").lower() != "true"

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

    # Daily.co Configuration
    DAILY_API_KEY = os.getenv("DAILY_API_KEY", "")
    DAILY_ROOM_EXPIRY_MINUTES = 30  # Hardcoded instead of env
    DAILY_CLEANUP_ON_STARTUP = os.getenv("DAILY_CLEANUP_ON_STARTUP", "false").lower() == "true"
    DAILY_ROOM_SETTINGS = {
        "privacy": "public",
        "properties": {
            "enable_chat": True,
            "start_video_off": True,
            "start_audio_off": False,
        },
    }

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
            "DAILY_API_KEY",
            "LOOPS_VERIFICATION_TEMPLATE",
            "LOOPS_INTERVIEW_TEMPLATE",
        ]
        missing = [var for var in required_vars if not getattr(cls, var)]
        if missing:
            print(f"Missing required environment variables: {', '.join(missing)}")
            return False
        return True


Config.init()
