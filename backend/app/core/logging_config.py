"""Centralized logging configuration."""

import logging
import sys
from typing import Any

LOG_FORMAT = "%(asctime)s | %(levelname)-5s | %(name)s | %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logging(level: str | None = None) -> None:
    """Configure application logging."""
    log_level = (level or "INFO").upper()
    numeric_level = getattr(logging, log_level, logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=LOG_DATE_FORMAT))

    root = logging.getLogger()
    root.setLevel(numeric_level)
    # Avoid duplicate handlers when uvicorn reloads
    if not root.handlers:
        root.addHandler(handler)

    # Reduce noise from third-party libs
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get a logger for the given module."""
    return logging.getLogger(name)


def log_request(logger: logging.Logger, method: str, path: str, status: int, duration_ms: float) -> None:
    """Log HTTP request (call from middleware)."""
    level = logging.WARNING if status >= 400 else logging.INFO
    logger.log(level, "%s %s → %d %.0fms", method, path, status, duration_ms)


def log_error(logger: logging.Logger, message: str, exc: BaseException | None = None, **extra: Any) -> None:
    """Log error with optional exception context."""
    if exc:
        logger.error("%s | %s: %s", message, type(exc).__name__, exc, exc_info=True, extra=extra)
    else:
        logger.error(message, extra=extra)
