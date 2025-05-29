from enum import Enum
import os

from dotenv import load_dotenv


class Environment(str, Enum):
    DEVELOPMENT = "development"
    PRODUCTION = "production"


# Load environment-specific .env file
env = os.getenv("ENV", "development")
env_file = ".env.prod" if env == "production" else ".env"
load_dotenv(env_file, override=True)


class Config:
    """Application configuration with environment-specific settings"""

    # Environment & Basic Configuration
    ENVIRONMENT = os.getenv("ENV", "development")
    PORT = int(os.getenv("PORT", "8000"))
    HOST = os.getenv("HOST", "0.0.0.0")
    RELOAD = os.getenv("RELOAD", "true").lower() == "true"
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    USE_COHERE_RERANK = os.getenv("USE_COHERE_RERANK", "false").lower() == "true"

    # File Upload Configuration
    UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")

    # API Keys and Sensitive Data (from .env)
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    DAILY_API_KEY = os.getenv("DAILY_API_KEY", "")
    ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
    DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")
    ZILLIZ_URI = os.getenv("ZILLIZ_URI", "")
    ZILLIZ_TOKEN = os.getenv("ZILLIZ_TOKEN", "")
    ZEROX_API_KEY = os.getenv("ZEROX_API_KEY", "")
    FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY", "")
    COHERE_API_KEY = os.getenv("COHERE_API_KEY", "")
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

    # Daily.co Configuration
    DAILY_ROOM_EXPIRY_MINUTES = 30  # Hardcoded instead of env
    DAILY_CLEANUP_ON_STARTUP = os.getenv("DAILY_CLEANUP_ON_STARTUP", "true").lower() == "true"
    DAILY_ROOM_SETTINGS = {
        "privacy": "public",
        "properties": {
            "enable_chat": True,
            "start_video_off": True,
            "start_audio_off": False,
        },
    }

    # Voice Service Configuration
    ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "")
    CARTESIA_VOICE_ID = os.getenv("CARTESIA_VOICE_ID", "")

    # Vector Store Configuration
    DEFAULT_VECTOR_DIMENSION = 3072
    DEFAULT_COLLECTION = "path_ai_demo"
    TOP_K = 5
    SCORE_THRESHOLD = 0.25
    USE_HYBRID_SEARCH = True
    SEMANTIC_WEIGHT = 0.7
    KEYWORD_WEIGHT = 0.3

    # LLM Configuration
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq")
    LLM_MODEL = os.getenv("LLM_MODEL", "gemini-2.5-flash")

    # CORS Configuration
    CORS_ORIGINS = ["*"]  # Allow all origins in development

    # Chat and Document Processing
    CHUNK_SIZE = 512
    CHUNK_OVERLAP = 50
    LLM_TEMPERATURE = 0.2

    # TTS Configuration
    TTS_CONFIG = {
        "provider": os.getenv("TTS_PROVIDER", "elevenlabs"),  # Default to elevenlabs
        "elevenlabs": {
            "api_key": os.getenv("ELEVENLABS_API_KEY"),
            "voice_id": os.getenv("ELEVENLABS_VOICE_ID", "Xb7hH8MSUJpSbSDYk0k2"),
            "model": os.getenv("ELEVENLABS_MODEL", "eleven_turbo_v2_5"),
            "stability": float(os.getenv("ELEVENLABS_STABILITY", "0.8")),
            "clarity": float(os.getenv("ELEVENLABS_CLARITY", "0.9")),
            "similarity_boost": float(os.getenv("ELEVENLABS_SIMILARITY_BOOST", "0.8")),
        },
        "cartesia": {
            "api_key": os.getenv("CARTESIA_API_KEY"),
            "voice_id": os.getenv("CARTESIA_VOICE_ID"),
            "model": os.getenv("CARTESIA_MODEL", "default"),
            "sample_rate": int(os.getenv("CARTESIA_SAMPLE_RATE", "48000")),
            "encoding": os.getenv("CARTESIA_ENCODING", "pcm_f32le"),
            "container": os.getenv("CARTESIA_CONTAINER", "raw"),
            "voice_controls": {
                "speed": float(os.getenv("CARTESIA_SPEED", "-0.5")),
                "emotion": os.getenv("CARTESIA_EMOTION", "positivity:high").split(","),
            },
        },
        "rime": {
            "api_key": os.getenv("RIME_API_KEY"),
            "voice_id": os.getenv("RIME_VOICE_ID"),
            "model": os.getenv("RIME_MODEL", "mistv2"),
            "sample_rate": int(os.getenv("RIME_SAMPLE_RATE", "48000")),
        },
    }

    @classmethod
    def init(cls):
        """Initialize configuration and ensure required directories exist"""
        os.makedirs(cls.UPLOAD_DIR, exist_ok=True)
        if not cls.validate_config():
            raise ValueError("Missing required environment variables")

    @classmethod
    def validate_config(cls) -> bool:
        """Validate required configuration variables"""
        required_vars = [
            "DAILY_API_KEY",
            "ELEVENLABS_API_KEY",
            "DEEPGRAM_API_KEY",
            "LLM_PROVIDER",
            "LLM_MODEL",
            "OPENAI_API_KEY",
            "GEMINI_API_KEY",
            "SUPABASE_URL",
            "SUPABASE_KEY",
        ]

        missing = [var for var in required_vars if not getattr(cls, var)]
        if missing:
            print(f"Missing required environment variables: {', '.join(missing)}")
            return False
        return True


Config.init()
