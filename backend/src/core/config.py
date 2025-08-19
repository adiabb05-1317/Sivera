from enum import Enum
import os

from dotenv import load_dotenv
from src.constants.ai_models import LLMModels


class Environment(str, Enum):
    DEVELOPMENT = "development"
    PRODUCTION = "production"


env = os.getenv("ENV", "development")
if env == "production":
    env_file = ".env.production"
else:
    env_file = ".env.development"

if os.path.exists(env_file):
    load_dotenv(env_file, override=True)
else:
    load_dotenv(".env", override=True)


class Config:
    """Application configuration with environment-specific settings"""

    # Environment & Basic Configuration
    ENVIRONMENT = os.getenv("ENV", "development")
    PORT = int(os.getenv("PORT", "8000"))
    HOST = os.getenv("HOST", "0.0.0.0")
    RELOAD = (
        os.getenv(
            "RELOAD",
            "true" if os.getenv("ENV", "development") == "development" else "false",
        ).lower()
        == "true"
    )
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
    
    # Environment-specific Supabase configuration
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

    # Daily.co Configuration
    DAILY_ROOM_EXPIRY_MINUTES = 30  # Hardcoded instead of env
    DAILY_CLEANUP_ON_STARTUP = (
        os.getenv("DAILY_CLEANUP_ON_STARTUP", "true").lower() == "true"
    )
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
    DEFAULT_COLLECTION = "interview_data"
    TOP_K = 5
    SCORE_THRESHOLD = 0.25
    USE_HYBRID_SEARCH = True
    SEMANTIC_WEIGHT = 0.7
    KEYWORD_WEIGHT = 0.3

    # LLM Configuration
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")
    LLM_MODEL = os.getenv("LLM_MODEL", LLMModels.GPT_4_1)

    # CORS Configuration
    CORS_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8010",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8010",
        "http://127.0.0.1:3001",
        "https://recruiter.sivera.io",
        "https://api.sivera.io",
        "https://app.sivera.io",
    ]  # Allow all origins in development

    # Chat and Document Processing
    CHUNK_SIZE = 512
    CHUNK_OVERLAP = 50
    LLM_TEMPERATURE = 0.2

    # Audio Processing Configuration
    SUPPRESS_NANOBIND_WARNINGS = os.getenv("SUPPRESS_NANOBIND_WARNINGS", "false").lower() == "true"
    
    # Video Optimization Configuration
    VIDEO_OPTIMIZATION_MAX_SIZE_MB = int(os.getenv("VIDEO_OPTIMIZATION_MAX_SIZE_MB", "500"))  # 500MB default
    FFMPEG_TIMEOUT = int(os.getenv("FFMPEG_TIMEOUT", "300"))  # 5 minutes default timeout
    VIDEO_OPTIMIZATION_ENABLED = os.getenv("VIDEO_OPTIMIZATION_ENABLED", "true").lower() == "true"
    AUTO_OPTIMIZE_VIDEOS = os.getenv("AUTO_OPTIMIZE_VIDEOS", "true").lower() == "true"

    # TTS Configuration
    # TODO: add instructions for other TTS providers
    TTS_CONFIG = {
        "provider": os.getenv("TTS_PROVIDER", "elevenlabs"),  # Default to elevenlabs
        "elevenlabs": {
            "api_key": os.getenv("ELEVENLABS_API_KEY"),
            "voice_id": os.getenv("ELEVENLABS_VOICE_ID", "Xb7hH8MSUJpSbSDYk0k2"),
            "model": os.getenv("ELEVENLABS_MODEL", "eleven_turbo_v2_5"),
            "stability": float(os.getenv("ELEVENLABS_STABILITY", "0.8")),
            "clarity": float(os.getenv("ELEVENLABS_CLARITY", "0.9")),
            "similarity_boost": float(os.getenv("ELEVENLABS_SIMILARITY_BOOST", "0.8")),
            "instructions": ""
        },
        "aws_polly": {
            "aws_access_key_id": os.getenv("AWS_ACCESS_KEY_ID"),
            "aws_secret_access_key": os.getenv("AWS_SECRET_ACCESS_KEY"),
            "region": os.getenv("AWS_REGION", "us-east-1"),
            "voice_id": os.getenv("AWS_POLLY_VOICE_ID", "Ruth"),
            "engine": os.getenv("AWS_POLLY_ENGINE", "neural"),
            "language": os.getenv("AWS_POLLY_LANGUAGE", "en"),
            "rate": os.getenv("AWS_POLLY_RATE", "+10%"),
            "volume": os.getenv("AWS_POLLY_VOLUME", "loud"),
            "instructions": ""
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
            "instructions": ""
        },
        "rime": {
            "api_key": os.getenv("RIME_API_KEY"),
            "voice_id": os.getenv("RIME_VOICE_ID"),
            "model": os.getenv("RIME_MODEL", "mistv2"),
            "sample_rate": int(os.getenv("RIME_SAMPLE_RATE", "48000")),
            "instructions": """
                Punctuation serves many purposes in normal writing, it indicates sentence structural things like sentence breaks and questions, but it also serves to indicate pronunciation cues, such as commas for pauses and exclamation points for excitement.

                Questions:
                    1) what do you mean.	(a simple period at the end of the sentence renders it a non-question)
                    2) what do you mean?	(a simple question mark indicates an unmarked question)
                    3) what do you mean?!	(adding an exclamation point makes the question more excited)
                    4) what do you mean!?	(changing the order of the exclamation point and question mark makes a different sort of question)
                    5) what do you mean??	(multiple question marks can also change the type of question prosody)

                False Starts
                    1) i i think it’s pretty cool	(putting a word twice in a row can create more realistic, flawed human speech)
                    2) i- i think it’s pretty cool	(adding a dash immediately after some words can give a cut-off, false start sort of realism)

                Pauses
                    1) so it’s kind of funny.	(without any comma, there will be no pause)
                    2) so, it’s kind of funny.	(adding a comma creates a slight pause)
                    3) so. it’s kind of funny.	(adding a period creates a longer pause)
                
                Numbers
                    Ordinal Numbers
                    Desired Output	(Input)
                    1) One hundred and twenty-three	(123)
                    2) Two thousand and twenty-two	(2,022)
                    3) Four zero	(4 0)
                    4) Forty	(40)

                    Years
                    Desired Output	(Input)
                    1) Twenty twenty two	(2022)

                    Cardinal Numbers
                    Desired Output	(Input)
                    1) Fifth	(5th)

                    Phone Numbers
                    Desired Output	(Input)
                    1) Five five five, seven seven two, nine one four zero	((555)-265-9076)
                    2) Five five five, seven seven two, nine one four zero	(555-772-9140)
                    3) Five five five, seven seven two, nine one four zero	(5 5 5, 7 7 2, 9 1 4 0)

                    Decimals
                    Desired Output	(Input)
                    1) Zero point seven five	(0.75)
                    2) Zero point seven five	(0 point 7 5)

                    Currency
                    Desired Output	(Input)
                    1) Seven dollars, ninety five cents	($7.95)
                    2) One thousand and forty-five dollars, ninety six cents	($1,045.96)
                    3) One thousand and forty-five dollars, ninety six cents	($1045.96)

                    Units of Measurement
                    Desired Output	(Input)
                    1) Five kilograms	(5kg)
                    2) Seventy degrees Fahrenheit	(70°F)

                Dates & Times
                    Desired Output	(Input)
                    1) October twelfth, twenty twenty-four	(10/12/2024)
                    2) March fifteenth, twenty twenty-three	(March 15, 2023)
                    3) January first	(January 1st)
                    4) January first	(Jan. 1)

                    Times
                    Desired Output	(Input)
                    1) Ten thirty A M	(10:30 am)
                    2) Ten thirty A M	(10:30am)
                    3) Ten thirty A M	(10:30 AM)
                    4) Two o’clock P M	(2 o’clock p. m.)

                Abbreviations, Acronyms, and Initialisms
                    Desired Output	(Input)
                    1) Doctor Smith	(Dr. Smith)
                    2) For example	(e.g.)
                    3) Road	(rd.)
                    4) Saint John	(St. John)

                    Acronyms and Initialisms
                    Acronyms are pronounced as a single word, for example, NASA is pronounced as “Nasa”. Initialisms are pronounced as a series of letters, for example DNA is pronounced as “D N A”.
                    By default Rime will pronounce a series of capital letters as acronyms, i.e. as a single word. However, for many common initialisms, e.g. DNA, ID, USA, FBI, CIA, etc., Rime will automatically pronounce them correctly as a series of letters.
                    That being said, to ensure that initialisms are pronounced correctly as a series of letters, the best practice is to use lower case and put a period and space after each letter.
                    Desired Output	(Input)
                    1) Nasa	(NASA)
                    2) D N A	(DNA)
                    3) D N A	(d. n. a.)
                    4) UPS	(u. p. s.)
                    5) GPA	(g. p. a.)

                Symbols and Percentages
                    Desired Output	(Input)
                    1) And	(&)
                    2) Dollar	($)
                    3) Percent	(%)
                    4) One hundred percent	(100%)
                    5) Hash	(#)
                
                Addresses, URLs, and Emails
                    Addresses
                    While Rime will typically pronounce state name abbreviations correctly in the context of an address, best practice is to write out the full state name, e.g. “Massachusetts” instead of “MA”, to get consistent results. Common street abbreviations, e.g. “Rd.” or “St.”, will automatically be pronounced correctly.
                    Desired Output	(Input)
                    1) Five twenty-nine main street, boston, massachusetts, zero two one two nine	(529 Main St., Boston, Massachusetts 02129)
                    2) Five twenty-nine main street, boston, massachusetts, zero two one two nine	(529 Main St., Boston, MA 02129)
                    3) Five twenty-nine main street, boston, massachusetts, zero two one two nine	(529 Main Street, Boston, MA 02129)
                    4) Five twenty-nine main street, boston, massachusetts, zero two one two nine	(529 Main St, Boston, MA 02129)

                URLs
                    Desired Output	(Input)
                    1) Double-u double-u double-u dot example dot com	(www.example.com)
                    2) H t t p s colon slash slash double-u double-u double-u dot rime dot ai slash dashboard	(https://rime.ai/dashboard)

                Emails
                    Desired Output	(Input)
                    1) Name at example dot com	(name@example.com)
            """
        },
        "google": {
            "credentials_path": os.getenv("GOOGLE_CREDENTIALS_PATH"),
            "voice_id": os.getenv("GOOGLE_VOICE_ID"),
            "sample_rate": int(os.getenv("RIME_SAMPLE_RATE", "48000")),
            "instructions": ""
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

        if cls.TTS_CONFIG["provider"] == "aws_polly":
            required_vars.extend([
                "AWS_ACCESS_KEY_ID",
                "AWS_SECRET_ACCESS_KEY",
            ])

        missing = [var for var in required_vars if not getattr(cls, var)]
        if missing:
            print(f"Missing required environment variables: {', '.join(missing)}")
            return False
        return True


Config.init()
