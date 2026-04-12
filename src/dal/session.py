"""
SQLAlchemy synchronous database engine and session setup.
"""

from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# Database path: app.db in app root
DB_PATH = Path(__file__).parent.parent.parent / "app.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    echo=False,  
    connect_args={"check_same_thread": False}  
)

SessionLocal = sessionmaker(
    bind=engine,
    class_=Session,
    expire_on_commit=False
)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    # Import ORM models so SQLAlchemy metadata includes all tables.
    import models  # noqa: F401

    from .base import Base
    Base.metadata.create_all(bind=engine)
