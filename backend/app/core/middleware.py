"""Request/response logging middleware."""

import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging_config import get_logger, log_request

logger = get_logger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log HTTP requests: method, path, status, duration."""

    SKIP_PATHS = ("/", "/health", "/api/health-check")

    async def dispatch(self, request: Request, call_next) -> Response:
        method = request.method
        path = request.url.path
        start = time.perf_counter()

        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000

        if path not in self.SKIP_PATHS:
            log_request(logger, method, path, response.status_code, duration_ms)
        return response
