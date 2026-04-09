"""
Goal DAL module (DB access only).
"""

from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, update, delete
from ..models.goal import Goal


def create_goal(db: Session, user_id: int, goal_data: dict) -> Goal:
    new_goal = Goal(user_id=user_id, **goal_data)
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    return new_goal


def list_goals(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Goal]:
    return db.execute(
        select(Goal).where(Goal.user_id == user_id).offset(skip).limit(limit)
    ).scalars().all()


def get_goal(db: Session, goal_id: int) -> Optional[Goal]:
    return db.execute(select(Goal).where(Goal.id == goal_id)).scalars().first()


def update_goal(db: Session, goal_id: int, fields: dict) -> Optional[Goal]:
    db.execute(update(Goal).where(Goal.id == goal_id).values(**fields))
    db.commit()
    return get_goal(db, goal_id)


def delete_goal(db: Session, goal_id: int) -> bool:
    result = db.execute(delete(Goal).where(Goal.id == goal_id))
    db.commit()
    return result.rowcount > 0


def get_goal_by_id(db: Session, goal_id: int) -> Optional[Goal]:
    return db.execute(select(Goal).where(Goal.id == goal_id)).scalars().first()


def get_goal_by_date(db: Session, user_id: int, target_date: date) -> List[Goal]:
    return db.execute(
        select(Goal).where(
            Goal.user_id == user_id,
            Goal.start_date <= target_date,
            Goal.deadline >= target_date
        )
    ).scalars().all()


def filter_incomplete(db: Session, user_id: int, is_complete: bool, skip: int = 0, limit: int = 100) -> List[Goal]:
    return db.execute(
        select(Goal).where(
            Goal.user_id == user_id,
            Goal.is_complete == is_complete
        ).offset(skip).limit(limit)
    ).scalars().all()


def get_by_name(
    db: Session,
    user_id: int,
    name: str,
    skip: int = 0,
    take: int = 100
) -> List[Goal]:
    query = (
        select(Goal)
        .where(Goal.user_id == user_id, Goal.title.ilike(f"%{name}%"))
        .offset(skip)
        .limit(take)
    )
    return db.execute(query).scalars().all()
