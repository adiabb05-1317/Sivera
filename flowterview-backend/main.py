from contextlib import asynccontextmanager
from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from supabase import Client, create_client
import uvicorn

from src.core.config import Config
from src.lib.manager import ConnectionManager
from src.router.analytics_router import router as analytics_router
from src.router.candidate_router import router as candidate_router
from src.router.interview_router import router as interview_router
from src.router.invites_router import router as invites_router
from src.router.linkedin_oauth_router import router as linkedin_oauth_router
from src.router.organization_router import router as organization_router
from src.router.phone_screen_router import router as phone_screen_router
from src.router.round_router import router as round_router
from src.router.user_router import router as user_router
from src.utils.logger import intercept_standard_logging

intercept_standard_logging()

# Initialize Supabase client
supabase: Client = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global supabase
    logger.info("Starting application initialization")

    try:
        # Initialize Supabase client
        supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)
        logger.info("Supabase client initialized successfully")

        # Initialize ConnectionManager
        manager = ConnectionManager()

        # Clean up existing Daily.co rooms if enabled
        if Config.DAILY_CLEANUP_ON_STARTUP:
            try:
                logger.info("Cleaning up existing Daily.co rooms before initialization")
                await manager.cleanup_daily_rooms()
            except Exception as e:
                logger.error(f"Failed to clean up existing Daily.co rooms: {e}")
                logger.warning("Continuing without initial room cleanup")

        app.state.manager = manager

    except Exception as e:
        logger.error(f"Failed to initialize application: {e}")
        raise

    app.state.supabase = supabase
    logger.info("Application initialized successfully")
    yield

    logger.info("Application shutting down...")
    # Cleanup if needed
    try:
        if hasattr(app.state, "manager"):
            await app.state.manager.cleanup()
            logger.info("ConnectionManager cleaned up successfully")
    except Exception as e:
        logger.error(f"Error during ConnectionManager cleanup: {e}")

    logger.info("All resources terminated")


app = FastAPI(title="Flowterview Backend", version="1.0.0", lifespan=lifespan)

logger.info(f"CORS origins: {Config.CORS_ORIGINS}")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(interview_router)
app.include_router(organization_router)
app.include_router(user_router)
app.include_router(candidate_router)
app.include_router(invites_router)
app.include_router(linkedin_oauth_router)
app.include_router(analytics_router)
app.include_router(phone_screen_router)
app.include_router(round_router)


@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "1.0.2",
        "supabase_connected": supabase is not None,
        "manager_initialized": (hasattr(app.state, "manager") if hasattr(app, "state") else False),
    }


@app.post("/loopback")
async def loopback(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Loopback endpoint that echoes back the received data
    Useful for testing and debugging
    """
    try:
        # Log the received data
        logger.info(f"Received data in loopback: {data}")

        # Echo back the data with a timestamp
        return {
            "status": "success",
            "message": "Data received successfully",
            "data": data,
            "timestamp": str(logger.now()),
        }
    except Exception as e:
        logger.error(f"Error in loopback endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    logger.info(f"Starting application server in {Config.ENVIRONMENT} mode")
    uvicorn.run(
        "main:app",
        host=Config.HOST,
        port=Config.PORT,
        reload=Config.RELOAD,
        proxy_headers=True,
        forwarded_allow_ips="*",
        reload_excludes=[
            ".venv",
            ".venv/*",
            "venv",
            "venv/*",
            "env",
            "env/*",
            "__pycache__",
            "__pycache__/*",
            "*.pyc",
            "*.pyo",
            "*.pyd",
            ".git",
            ".git/*",
            "node_modules",
            "node_modules/*",
            ".pytest_cache",
            ".pytest_cache/*",
            "*.log",
            "*.sqlite",
            "*.db",
            ".DS_Store",
            "Thumbs.db",
            "*.tmp",
            "*.temp",
            ".coverage",
            "htmlcov",
            "htmlcov/*",
            "dist",
            "dist/*",
            "build",
            "build/*",
            "*.egg-info",
            "*.egg-info/*",
        ],
        reload_dirs=["src", "storage"],  # Only watch specific directories
    )
