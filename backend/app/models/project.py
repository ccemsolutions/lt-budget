from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Boolean, DateTime, Numeric, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    voltage_kv: Mapped[int] = mapped_column(Integer, default=230)
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft | calculated | approved
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    company: Mapped["Company"] = relationship("Company", back_populates="projects")
    inputs: Mapped[Optional["ProjectInputs"]] = relationship("ProjectInputs", back_populates="project", uselist=False, cascade="all, delete-orphan")
    budgets: Mapped[list["Budget"]] = relationship("Budget", back_populates="project", cascade="all, delete-orphan", order_by="Budget.version.desc()")


class ProjectInputs(Base):
    __tablename__ = "project_inputs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Indexed scalars
    line_length_km: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False)
    circuit_type: Mapped[str] = mapped_column(String(20), default="single")
    total_towers: Mapped[int] = mapped_column(Integer, nullable=False)
    state: Mapped[str] = mapped_column(String(2), default="")

    # JSONB documents
    engineering: Mapped[dict] = mapped_column(JSONB, default=dict)
    terrain: Mapped[dict] = mapped_column(JSONB, default=dict)
    vegetation: Mapped[dict] = mapped_column(JSONB, default=dict)
    access_roads: Mapped[dict] = mapped_column(JSONB, default=dict)
    schedule: Mapped[dict] = mapped_column(JSONB, default=dict)
    salary_params: Mapped[dict] = mapped_column(JSONB, default=dict)
    indirect_config: Mapped[dict] = mapped_column(JSONB, default=dict)
    financial_params: Mapped[dict] = mapped_column(JSONB, default=dict)
    crossings: Mapped[dict] = mapped_column(JSONB, default=dict)

    project: Mapped["Project"] = relationship("Project", back_populates="inputs")


class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    label: Mapped[Optional[str]] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="calculating")  # calculating | ready | error
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    calculated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Snapshot of inputs
    inputs_snapshot: Mapped[dict] = mapped_column(JSONB, default=dict)

    # KPIs (denormalized)
    total_direct_cost: Mapped[Optional[float]] = mapped_column(Numeric(18, 4))
    total_indirect_cost: Mapped[Optional[float]] = mapped_column(Numeric(18, 4))
    total_cost: Mapped[Optional[float]] = mapped_column(Numeric(18, 4))
    total_manhours: Mapped[Optional[float]] = mapped_column(Numeric(14, 2))
    cost_per_km: Mapped[Optional[float]] = mapped_column(Numeric(14, 4))
    cost_per_tower: Mapped[Optional[float]] = mapped_column(Numeric(14, 4))
    # Financial KPIs
    selling_price: Mapped[Optional[float]] = mapped_column(Numeric(18, 4))
    gross_margin: Mapped[Optional[float]] = mapped_column(Numeric(8, 4))   # %
    max_exposure: Mapped[Optional[float]] = mapped_column(Numeric(18, 4))  # most negative cash
    # Extended KPIs (Res sheet)
    hh_per_km: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))    # HH/km
    hh_per_tower: Mapped[Optional[float]] = mapped_column(Numeric(10, 2)) # HH/torre
    cost_per_hh: Mapped[Optional[float]] = mapped_column(Numeric(14, 4))  # R$/HH
    hh_per_ton: Mapped[Optional[float]] = mapped_column(Numeric(10, 4))   # HH/ton (rebar)

    project: Mapped["Project"] = relationship("Project", back_populates="budgets")
    activities: Mapped[list["BudgetActivity"]] = relationship("BudgetActivity", back_populates="budget", cascade="all, delete-orphan")
    summaries: Mapped[list["BudgetSummary"]] = relationship("BudgetSummary", back_populates="budget", cascade="all, delete-orphan")


class BudgetActivity(Base):
    __tablename__ = "budget_activities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    budget_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("budgets.id", ondelete="CASCADE"), nullable=False
    )
    activity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("activity_catalog.id"), nullable=False
    )

    quantity: Mapped[float] = mapped_column(Numeric(16, 6), nullable=False)
    teams: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    duration_months: Mapped[float] = mapped_column(Numeric(8, 4), nullable=False)
    start_month: Mapped[Optional[int]] = mapped_column(Integer)

    mo_cost_per_unit: Mapped[float] = mapped_column(Numeric(16, 6), default=0)
    vem_cost_per_unit: Mapped[float] = mapped_column(Numeric(16, 6), default=0)
    mat_cost_per_unit: Mapped[float] = mapped_column(Numeric(16, 6), default=0)
    sub_cost_per_unit: Mapped[float] = mapped_column(Numeric(16, 6), default=0)
    fd_cost_per_unit: Mapped[float] = mapped_column(Numeric(16, 6), default=0)
    unit_cost: Mapped[float] = mapped_column(Numeric(16, 6), nullable=False)
    total_cost: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    manhours: Mapped[float] = mapped_column(Numeric(14, 2), default=0)

    budget: Mapped["Budget"] = relationship("Budget", back_populates="activities")
    activity: Mapped["ActivityCatalog"] = relationship("ActivityCatalog", back_populates="budget_activities")


class BudgetSummary(Base):
    __tablename__ = "budget_summaries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    budget_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("budgets.id", ondelete="CASCADE"), nullable=False
    )
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    total_cost: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    mo_cost: Mapped[float] = mapped_column(Numeric(18, 4), default=0)
    vem_cost: Mapped[float] = mapped_column(Numeric(18, 4), default=0)
    mat_cost: Mapped[float] = mapped_column(Numeric(18, 4), default=0)
    sub_cost: Mapped[float] = mapped_column(Numeric(18, 4), default=0)
    fd_cost: Mapped[float] = mapped_column(Numeric(18, 4), default=0)
    manhours: Mapped[float] = mapped_column(Numeric(14, 2), default=0)

    budget: Mapped["Budget"] = relationship("Budget", back_populates="summaries")
