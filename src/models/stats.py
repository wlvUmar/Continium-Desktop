"""
Stats ORM model.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..dal.base import Base


class Stats(Base):
    __tablename__ = "stats"
    __table_args__ = (
        CheckConstraint("duration_minutes >= 0", name="ck_stats_duration_nonneg"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    goal_id: Mapped[int] = mapped_column(
        ForeignKey("goals.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)

    goal: Mapped["Goal"] = relationship("Goal", back_populates="stats")
    user: Mapped["User"] = relationship("User", back_populates="stats")
