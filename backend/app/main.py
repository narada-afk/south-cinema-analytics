"""
main.py
=======
FastAPI application entry point.

Responsibilities (this file only):
  • App instance + metadata
  • CORS middleware
  • Lifespan: build in-memory graph once at startup
  • Include domain routers

What this file does NOT do:
  • SQL queries  →  app/routers/*  →  repositories/  or  crud.py
  • Graph logic  →  services/graph_service.py
  • DB table creation  →  run migrations/ scripts instead
                          (create_all removed — use Alembic or the SQL
                           files in migrations/ for schema changes)

Run with:
  uvicorn app.main:app --reload
"""

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from .core.config import settings
from .core.limiter import limiter
from .core.logging import configure_logging
from .database import SessionLocal
from .services.graph_service import graph_service
from .routers import actors, analytics, stats, health, data_health, admin

configure_logging()
logger = logging.getLogger(__name__)


# ── Lifespan ──────────────────────────────────────────────────────────────────
# Build the in-memory collaboration graph ONCE at startup.
# All BFS and Brandes requests after this point make zero DB calls during
# graph traversal — they use the pre-built adjacency list.
#
# To refresh after ingesting new data:
#   POST /admin/rebuild-graph  (add this endpoint when needed), or
#   docker compose restart backend  (simplest — graph rebuilds on startup)

@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        graph_service.build(db)
    except Exception as e:
        # DB may be empty or schema not yet applied (e.g. CI environment).
        # Log and continue — the app will still serve /health; graph-dependent
        # endpoints will return empty results until the graph is populated.
        logger.warning("graph build skipped — DB may be empty or unavailable: %s", e)
    finally:
        db.close()
    yield
    # Shutdown: nothing to tear down (graph is GC'd with the process)


# ── App instance ──────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_TITLE,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"detail": f"Rate limit exceeded. {exc.detail}"},
    )


# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request logging ───────────────────────────────────────────────────────────

_req_logger = logging.getLogger("api.request")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.monotonic()
    response = await call_next(request)
    ms = (time.monotonic() - start) * 1000
    _req_logger.info("%s %s %d %.0fms", request.method, request.url.path, response.status_code, ms)
    return response


# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(health.router)
app.include_router(actors.router)
app.include_router(analytics.router)
app.include_router(stats.router)
app.include_router(data_health.router)
app.include_router(admin.router)
