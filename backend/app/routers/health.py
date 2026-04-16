"""
routers/health.py
=================
GET /health       — lightweight liveness probe (no DB query)
GET /ready        — readiness probe: DB connectivity + graph initialized
GET /health/stats — live row counts (requires DB)
"""

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app import schemas
from app.repositories.actor_repository import actor_repo
from app.services.graph_service import graph_service


router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    summary="API liveness probe",
)
def health_check():
    """
    Lightweight liveness probe — returns immediately without touching the DB.
    Used by CI and load-balancers to verify the process is alive.
    """
    return {"status": "ok"}


@router.get("/ready", summary="Readiness probe")
def ready():
    """
    Readiness probe — checks two conditions:
    1. Database is reachable (SELECT 1)
    2. In-memory graph has been built

    Returns 200 + `{"status": "ready"}` when both pass.
    Returns 503 + `{"status": "not_ready", "reason": "..."}` otherwise.
    """
    # Check graph first — it's free (no I/O)
    if not graph_service.is_ready:
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "reason": "graph not initialized"},
        )

    # Check DB connectivity with a minimal query
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "reason": f"db unreachable: {exc}"},
        )
    finally:
        db.close()

    return {"status": "ready"}


@router.get(
    "/health/stats",
    response_model=schemas.HealthOut,
    summary="API health check with DB row counts",
)
def health_stats(db: Session = Depends(get_db)):
    """
    Returns live row counts from the database.

    Example response:
    ```json
    { "status": "ok", "actors": 6691, "movies": 4809 }
    ```
    """
    actor_count, movie_count = actor_repo.get_counts(db)
    return schemas.HealthOut(status="ok", actors=actor_count, movies=movie_count)
