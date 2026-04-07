from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Boolean, DateTime, Numeric, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class LaborRole(Base):
    __tablename__ = "labor_roles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(String(200), nullable=False)
    role_type: Mapped[str] = mapped_column(String(10), nullable=False)  # direct | indirect
    salary_type: Mapped[str] = mapped_column(String(1), default="H")   # H=horista, M=mensalista

    # Base salary
    base_salary: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)

    # Pre-calculated company costs (from BD_MO)
    company_cost_monthly: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    company_cost_daily: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    company_cost_hh: Mapped[float] = mapped_column(Numeric(14, 6), default=0)

    # Flags
    has_overtime: Mapped[bool] = mapped_column(Boolean, default=False)
    has_adic_transf: Mapped[bool] = mapped_column(Boolean, default=False)
    has_periculosidade: Mapped[bool] = mapped_column(Boolean, default=False)
    has_adic_produt: Mapped[bool] = mapped_column(Boolean, default=False)
    has_aux_moradia: Mapped[bool] = mapped_column(Boolean, default=False)
    folga_meses: Mapped[float] = mapped_column(Numeric(4, 1), default=3)
    tipo: Mapped[Optional[str]] = mapped_column(String(10))

    # Cost breakdown components (R$/mês)
    custo_bruto_mes: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    he_50_pct: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    he_100_pct: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    encargos: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    transporte: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    alimentacao: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    epi: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    seguro_vida: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    aux_moradia: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    cesta_basica: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    ppr: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    assist_medica: Mapped[float] = mapped_column(Numeric(14, 4), default=0)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    resource_templates: Mapped[list["ResourceTemplate"]] = relationship(
        "ResourceTemplate", back_populates="labor_role"
    )


class EquipmentItem(Base):
    __tablename__ = "equipment_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(String(200), nullable=False)

    # Pre-calculated costs
    company_cost_monthly: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    company_cost_daily: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    company_cost_hh: Mapped[float] = mapped_column(Numeric(14, 6), default=0)

    # Cost components
    locacao_sem_op_mes: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    consumo_combustivel_dia: Mapped[float] = mapped_column(Numeric(10, 4), default=0)
    tipo_combustivel: Mapped[Optional[str]] = mapped_column(String(20))
    total_combustivel_mes: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    total_lubmaint_mes: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    mob_demob_mes: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    outros_mes: Mapped[float] = mapped_column(Numeric(14, 4), default=0)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    resource_templates: Mapped[list["ResourceTemplate"]] = relationship(
        "ResourceTemplate", back_populates="equipment_item"
    )


class ActivityCatalog(Base):
    __tablename__ = "activity_catalog"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(String(300), nullable=False)
    unit: Mapped[str] = mapped_column(String(30), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    quantity_formula: Mapped[str] = mapped_column(String(50), nullable=False)  # key for engine resolver
    productivity_per_day: Mapped[float] = mapped_column(Numeric(14, 6), default=0)
    fd_pct: Mapped[float] = mapped_column(Numeric(6, 4), default=0.02)  # ferramentas diversas %
    md_pct: Mapped[float] = mapped_column(Numeric(6, 4), default=0.0)   # materiais diversos %
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    resource_templates: Mapped[list["ResourceTemplate"]] = relationship(
        "ResourceTemplate", back_populates="activity", cascade="all, delete-orphan"
    )
    budget_activities: Mapped[list["BudgetActivity"]] = relationship(
        "BudgetActivity", back_populates="activity"
    )


class ResourceTemplate(Base):
    __tablename__ = "resource_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    activity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("activity_catalog.id", ondelete="CASCADE"), nullable=False
    )
    resource_type: Mapped[str] = mapped_column(String(10), nullable=False)  # MO | VEM | MAT | SUB

    # MO
    labor_role_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("labor_roles.id"), nullable=True
    )
    qty_per_team: Mapped[Optional[float]] = mapped_column(Numeric(10, 4))  # people or units per team

    # VEM
    equipment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("equipment_items.id"), nullable=True
    )

    # MAT
    material_code: Mapped[Optional[str]] = mapped_column(String(20))
    material_description: Mapped[Optional[str]] = mapped_column(String(200))
    material_qty_per_unit: Mapped[Optional[float]] = mapped_column(Numeric(14, 6))
    material_unit_price: Mapped[Optional[float]] = mapped_column(Numeric(14, 4))

    # SUB
    sub_code: Mapped[Optional[str]] = mapped_column(String(20))
    subcontractor_description: Mapped[Optional[str]] = mapped_column(String(200))
    subcontractor_cost_per_unit: Mapped[Optional[float]] = mapped_column(Numeric(14, 4))

    activity: Mapped["ActivityCatalog"] = relationship("ActivityCatalog", back_populates="resource_templates")
    labor_role: Mapped[Optional["LaborRole"]] = relationship("LaborRole", back_populates="resource_templates")
    equipment_item: Mapped[Optional["EquipmentItem"]] = relationship("EquipmentItem", back_populates="resource_templates")
