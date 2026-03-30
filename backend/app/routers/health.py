"""
routers/health.py
=================
GET /health  — lightweight liveness probe (no DB query)
GET /health/stats — live row counts (requires DB)
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import schemas
from app.repositories.actor_repository import actor_repo


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
