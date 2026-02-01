"""Core module: exceptions, logging, error handling."""

from app.core.exceptions import (
    AppException,
    NotFoundError,
    ValidationError,
    ServiceUnavailableError,
)

__all__ = [
    "AppException",
    "NotFoundError",
    "ValidationError",
    "ServiceUnavailableError",
]
