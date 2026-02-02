"""Custom exceptions for consistent error handling."""


class AppException(Exception):
    """Base exception for application errors."""

    def __init__(self, message: str, status_code: int = 500, code: str = "INTERNAL_ERROR"):
        self.message = message
        self.status_code = status_code
        self.code = code
        super().__init__(message)


class NotFoundError(AppException):
    """Resource not found (404)."""

    def __init__(self, message: str = "Resource not found", resource: str = "resource"):
        super().__init__(message, status_code=404, code="NOT_FOUND")
        self.resource = resource


class ValidationError(AppException):
    """Invalid input or request (400)."""

    def __init__(self, message: str = "Validation failed", details: dict | None = None):
        super().__init__(message, status_code=400, code="VALIDATION_ERROR")
        self.details = details or {}


class ServiceUnavailableError(AppException):
    """External service unavailable (503)."""

    def __init__(self, message: str = "Service unavailable"):
        super().__init__(message, status_code=503, code="SERVICE_UNAVAILABLE")
