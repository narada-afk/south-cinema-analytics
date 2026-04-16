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

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .database import SessionLocal
from .services.graph_service import graph_service
from .routers import actors, analytics, stats, health, data_health, trust


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
        print(f"[startup] graph build skipped — DB may be empty or unavailable: {e}")
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


# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Cache-Control headers ─────────────────────────────────────────────────────
# Add Cache-Control: public, max-age=300 to all safe GET responses.
# This lets Next.js's fetch data-cache and browser caches avoid redundant
# backend round-trips for mostly-static analytics/actor data.
# Endpoints that serve truly volatile data can override this individually.

@app.middleware("http")
async def add_cache_control(request: Request, call_next):
    response: Response = await call_next(request)
    if request.method == "GET" and response.status_code == 200:
        # Insights change slowly; everything else changes even less often.
        ttl = 60 if "/analytics/insights" in request.url.path else 300
        response.headers["Cache-Control"] = f"public, max-age={ttl}, stale-while-revalidate=60"
    return response


# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(health.router)
app.include_router(actors.router)
app.include_router(analytics.router)
app.include_router(stats.router)
app.include_router(data_health.router)
app.include_router(trust.router)
