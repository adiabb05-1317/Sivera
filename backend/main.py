import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.core.config import Config
from src.lib.manager import ConnectionManager
from src.router.path_router import router
from src.utils.logger import intercept_standard_logging, logger

intercept_standard_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting application initialization")

    manager = ConnectionManager()

    try:
        logger.info("Cleaning up existing Daily.co rooms before initialization")
        await manager.cleanup_daily_rooms()
    except Exception as e:
        logger.error(f"Failed to clean up existing Daily.co rooms: {e}")
        logger.warning("Continuing without initial room cleanup")

    app.state.manager = manager

    logger.info("Application initialized successfully")
    yield

    logger.info("Application shutting down, cleaning up resources...")

    try:
        await manager.cleanup()
        logger.info("All connections and resources terminated")
    except Exception as e:
        logger.error(f"Error during application shutdown cleanup: {e}")
        logger.error("Some resources may not have been properly cleaned up")


app = FastAPI(title="Flow AI", version="1.0.1", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def root():
    return {"message": "Server is healthy", "version": "1.0.1"}


app.include_router(router)

if __name__ == "__main__":
    logger.info(f"Starting application server in {Config.ENVIRONMENT} mode")
    uvicorn.run(
        "main:app",
        host=Config.HOST,
        port=Config.PORT,
        reload=Config.RELOAD,
    )