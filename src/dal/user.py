"""
User DAL module (DB access only).
"""

from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, update as sa_update
from ..models.user import User


def get_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.execute(select(User).where(User.id == user_id)).scalars().first()


def get_by_email(db: Session, email: str) -> Optional[User]:
    return db.execute(select(User).where(User.email == email)).scalars().first()


def create(db: Session, new_user: User) -> User:
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def update(db: Session, user_id: int, fields: dict) -> Optional[User]:
    db.execute(sa_update(User).where(User.id == user_id).values(**fields))
    db.commit()
    return get_by_id(db, user_id)


def set_verified(db: Session, user_id: int, verified: bool = True) -> Optional[User]:
    return update(db, user_id, {"verified": verified})
