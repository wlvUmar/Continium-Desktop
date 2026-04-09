"""
User ORM model.
"""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy import Boolean, String, true, false
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=true())
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=false())

    goals: Mapped[List["Goal"]] = relationship(
        "Goal",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    stats: Mapped[List["Stats"]] = relationship(
        "Stats",
        back_populates="user",
        cascade="all, delete-orphan",
    )
