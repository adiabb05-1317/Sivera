import logging
import sys
from typing import Any, Dict

from loguru import logger

class InterceptHandler(logging.Handler):
    """Intercept standard logging messages and forward them to loguru"""
    
    def emit(self, record: logging.LogRecord) -> None:
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )

def intercept_standard_logging() -> None:
    """Configure logging to intercept standard library logging"""
    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)
    
    # Remove default loguru handler
    logger.remove()
    
    # Add custom handler with better formatting
    logger.add(
        sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level="INFO",
        colorize=True,
    )
    
    # Add file handler for production
    logger.add(
        "app.log",
        rotation="500 MB",
        retention="10 days",
        format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} - {message}",
        level="DEBUG",
    ) 