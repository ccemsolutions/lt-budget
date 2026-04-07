from __future__ import annotations
from pydantic import BaseModel


class WorkforceMonthEntry(BaseModel):
    month: int
    # By work phase (H3 equivalent)
    indireto: float = 0
    preliminares: float = 0
    civis: float = 0
    aterramento: float = 0
    montagem: float = 0
    lancamento: float = 0
    finais: float = 0
    outros: float = 0
    total: float = 0


class EquipmentMonthEntry(BaseModel):
    month: int
    veiculos_leves: float = 0
    caminhoes: float = 0
    guindastes_munck: float = 0
    maquinas_terra: float = 0
    equip_lancamento: float = 0
    perfuracao: float = 0
    outros: float = 0
    total: float = 0


class WorkforceByRoleEntry(BaseModel):
    month: int
    ajudantes: float = 0
    montadores: float = 0
    encarregados: float = 0
    motoristas: float = 0
    operadores: float = 0
    topografos: float = 0
    outros_diretos: float = 0
    indiretos: float = 0
    total: float = 0


class PhysicalProgressEntry(BaseModel):
    month: int
    # Monthly progress % by category
    preliminares: float = 0
    civis: float = 0
    aterramento: float = 0
    montagem: float = 0
    lancamento: float = 0
    finais: float = 0
    outros: float = 0
    # Cumulative totals
    monthly_total: float = 0
    cumulative_total: float = 0


class FinancialCurveEntry(BaseModel):
    month: int
    monthly_mo: float = 0
    monthly_vem: float = 0
    monthly_mat: float = 0
    monthly_sub: float = 0
    monthly_fd: float = 0
    monthly_total: float = 0
    cumulative_total: float = 0


class HistogramData(BaseModel):
    total_months: int
    workforce_by_phase: list[WorkforceMonthEntry]
    workforce_by_role: list[WorkforceByRoleEntry]
    equipment_by_type: list[EquipmentMonthEntry]
    physical_progress: list[PhysicalProgressEntry]
    financial_curve: list[FinancialCurveEntry]
    # Summary stats
    peak_workforce: float
    peak_workforce_month: int
    peak_equipment: float
    peak_equipment_month: int
