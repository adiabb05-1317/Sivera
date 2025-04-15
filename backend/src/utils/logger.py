import os
import sys

from loguru import logger

# Remove default handler
logger.remove()

# Configure loguru logger
log_level = os.getenv("LOG_LEVEL", "INFO")


# Define a filter function to exclude WatchFiles messages
def filter_watchfiles(record):
    return "WatchFiles" not in record["message"]


# Add a handler for stdout with custom format and filter
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level=log_level,
    colorize=True,
    filter=filter_watchfiles,
)

log_file = os.getenv("LOG_FILE", "app.log")
if log_file:
    logger.add(
        log_file,
        rotation="10 MB",
        retention="1 week",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{line} - {message}",
        level=log_level,
        filter=filter_watchfiles,
    )


# Create an intercept function to replace the standard library logging
def intercept_standard_logging():
    """
    Intercept standard library logging to use loguru instead.
    This is useful for packages that use the standard logging module.
    """
    import logging

    class InterceptHandler(logging.Handler):
        def emit(self, record):
            # Get corresponding Loguru level if it exists
            try:
                level = logger.level(record.levelname).name
            except ValueError:
                level = record.levelno

            # Find caller from where originated the logged message
            frame, depth = logging.currentframe(), 2
            while frame.f_code.co_filename == logging.__file__:
                frame = frame.f_back
                depth += 1

            # Only emit if it's not a WatchFiles message
            if "WatchFiles" not in record.getMessage():
                logger.opt(depth=depth, exception=record.exc_info).log(
                    level, record.getMessage()
                )

    # Replace all handlers with the InterceptHandler
    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)

    # Update existing loggers
    for name in logging.root.manager.loggerDict.keys():
        logging_logger = logging.getLogger(name)
        logging_logger.handlers = [InterceptHandler()]
        logging_logger.propagate = False


# Export the logger as the module's default export
__all__ = ["logger", "intercept_standard_logging"]
