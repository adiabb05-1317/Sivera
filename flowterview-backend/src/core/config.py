import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
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
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
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