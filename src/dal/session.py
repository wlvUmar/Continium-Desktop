"""
SQLAlchemy synchronous database engine and session setup.
"""

from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# Database path: app.db in app root
DB_PATH = Path(__file__).parent.parent.parent / "app.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Create synchronous engine (sqlite doesn't need special drivers)
engine = create_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL logging
    connect_args={"check_same_thread": False}  # SQLite requirement
)

# Session factory
SessionLocal = sessionmaker(
    bind=engine,
    class_=Session,
    expire_on_commit=False
)


def get_db() -> Session:
    """Dependency: get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Initialize database tables on app startup."""
    from .base import Base
    Base.metadata.create_all(bind=engine)
