"""
Stats DAL module (DB access only).
"""

from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, func, update
from ..models.stats import Stats


def create_stat(
    db: Session,
    goal_id: int,
    user_id: int,
    duration_minutes: int,
    occurred_at: datetime | None = None,
) -> Stats:
    if occurred_at is None:
        occurred_at = datetime.now(timezone.utc)

    obj = Stats(
        goal_id=goal_id,
        user_id=user_id,
        duration_minutes=duration_minutes,
        occurred_at=occurred_at,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def list_stats_for_goal(db: Session, goal_id: int, filters: dict) -> List[Stats]:
    query = select(Stats).where(Stats.goal_id == goal_id)
    if "start_date" in filters:
        query = query.where(Stats.occurred_at >= filters["start_date"])
    if "end_date" in filters:
        query = query.where(Stats.occurred_at <= filters["end_date"])
    return db.execute(query).scalars().all()


def aggregate_overall_for_user(db: Session, user_id: int) -> dict:
    total = db.execute(select(func.sum(Stats.duration_minutes)).where(Stats.user_id == user_id)).scalar() or 0
    return {"total_minutes": total}


def get_stat_by_goal_and_date(
    db: Session,
    user_id: int,
    goal_id: int,
    date: datetime | None = None,
) -> Optional[Stats]:
    if date is None:
        date = datetime.now(timezone.utc)
    
    target_date = date.date() if hasattr(date, 'date') else date
    
    query = select(Stats).where(
        Stats.user_id == user_id,
        Stats.goal_id == goal_id,
        func.date(Stats.occurred_at) == target_date,
    )
    return db.execute(query).scalars().first()


def get_stat(db: Session, stat_id: int) -> Optional[Stats]:
    return db.execute(select(Stats).where(Stats.id == stat_id)).scalars().first()


def update_stat(db: Session, stat_id: int, fields: dict) -> Optional[Stats]:
    db.execute(update(Stats).where(Stats.id == stat_id).values(**fields))
    db.commit()
    return get_stat(db, stat_id)


def get_stats_by_date(db: Session, user_id: int, target_date: str) -> List[Stats]:
    if isinstance(target_date, str):
        from datetime import datetime as dt
        target_date = dt.strptime(target_date, '%Y-%m-%d').date()
    
    query = select(Stats).join(Stats.goal).where(
        Stats.goal.has(user_id=user_id),
        func.date(Stats.occurred_at) == target_date
    )
    return db.execute(query).scalars().all()


def get_stats_by_type(db: Session, user_id: int, type: str) -> List[Stats]:
    query = select(Stats).join(Stats.goal).where(
        Stats.goal.has(user_id=user_id),
        Stats.goal.has(type=type)
    )
    return db.execute(query).scalars().all()


def get_stats_by_date_range(
    db: Session,
    user_id: int,
    goal_id: int,
    start_date: datetime,
    end_date: datetime,
) -> List[Stats]:
    start = start_date.date() if hasattr(start_date, 'date') else start_date
    end = end_date.date() if hasattr(end_date, 'date') else end_date
    
    query = (
        select(Stats)
        .join(Stats.goal)
        .where(
            Stats.goal.has(user_id=user_id),
            Stats.goal_id == goal_id,
            func.date(Stats.occurred_at) >= start,
            func.date(Stats.occurred_at) <= end,
        )
        .order_by(Stats.occurred_at)
    )
    return db.execute(query).scalars().all()


def get_stats_by_goal(db: Session, goal_id: int, user_id: int) -> List[Stats]:
    query = select(Stats).join(Stats.goal).where(
        Stats.goal.has(user_id=user_id),
        Stats.goal_id == goal_id
    )
    return db.execute(query).scalars().all()
