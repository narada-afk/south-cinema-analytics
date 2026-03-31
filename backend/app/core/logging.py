"""
core/logging.py
===============
Configures stdlib logging for the whole backend.
Call configure_logging() once at startup (main.py lifespan).

All modules get a logger via:
    import logging
    logger = logging.getLogger(__name__)
"""

import logging
import sys


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
        stream=sys.stdout,
        force=True,   # override any handler gunicorn/uvicorn already added
    )
    # Quiet down noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
