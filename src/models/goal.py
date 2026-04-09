"""
Goal ORM model.
"""

from __future__ import annotations

import enum
from datetime import date
from typing import List

from sqlalchemy import Boolean, CheckConstraint, Date, Enum, ForeignKey, Integer, String, false
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db.base import Base


class GoalFrequency(str, enum.Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"


class Goal(Base):
    __tablename__ = "goals"
    __table_args__ = (
        CheckConstraint("duration_min >= 0", name="ck_goals_duration_nonneg"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    deadline: Mapped[date] = mapped_column(Date, nullable=False)
    frequency: Mapped[GoalFrequency] = mapped_column(Enum(GoalFrequency), nullable=False)
    duration_min: Mapped[int] = mapped_column(Integer, nullable=False)
    is_complete: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=false())
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="goals")
    stats: Mapped[List["Stats"]] = relationship(
        "Stats",
        back_populates="goal",
        cascade="all, delete-orphan",
    )
