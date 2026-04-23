# database.py
# Sets up the SQLAlchemy database connection.
# All other files import 'SessionLocal' and 'Base' from here.

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker


# Read the database URL from environment variable.
# Default falls back to a local value for easier development.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://sca:sca@localhost:5432/sca"
)

# The engine is the core connection to the database.
# pool_size / max_overflow keep a warm connection pool so each request
# doesn't pay the TCP + auth handshake cost.
# connect_args sets work_mem per session so sort operations stay in memory
# instead of spilling to disk (relevant for UNION + JOIN queries).
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    connect_args={"options": "-c work_mem=16MB"},
)

# SessionLocal is a factory for creating new DB sessions.
# Each request gets its own session (opened and closed per request).
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base is the parent class for all SQLAlchemy models (Actor, Movie, Cast).
Base = declarative_base()


def get_db():
    """
    FastAPI dependency that provides a database session per request.
    Automatically closes the session when the request is done.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
