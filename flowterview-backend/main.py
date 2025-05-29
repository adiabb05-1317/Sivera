from contextlib import asynccontextmanager
from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from supabase import Client, create_client
import uvicorn

from src.core.config import Config
from src.router.candidate_router import router as candidate_router
from src.router.interview_router import router as interview_router
from src.router.organization_router import router as organization_router
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
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        raise

    app.state.supabase = supabase
    logger.info("Application initialized successfully")
    yield

    logger.info("Application shutting down...")
    # Cleanup if needed
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


@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint"""
    return {"status": "healthy", "version": "1.0.0", "supabase_connected": supabase is not None}


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
        reload_excludes=[".venv", ".venv/*", "__pycache__", "*.pyc"],
    )
