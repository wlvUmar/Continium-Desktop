"""
SQLAlchemy synchronous database engine and session setup.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from utils.paths import database_path

# Store the SQLite database in a per-user writable location.
DB_PATH = database_path()
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
DATABASE_URL = f"sqlite:///{DB_PATH.as_posix()}"

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
