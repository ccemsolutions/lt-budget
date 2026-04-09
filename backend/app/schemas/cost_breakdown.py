from __future__ import annotations
from pydantic import BaseModel


class LaborBreakdown(BaseModel):
    custo_bruto: float
    he_50: float
    he_100: float
    encargos: float
    transporte: float
    alimentacao: float
    epi: float
    seguro_vida: float
    aux_moradia: float
    cesta_basica: float
    ppr: float
    assist_medica: float
    total: float


class EquipmentBreakdown(BaseModel):
    locacao_sem_op: float
    combustivel: float
    lub_manutencao: float
    mob_demob: float
    outros: float
    total: float


class CostBreakdownRead(BaseModel):
    labor: LaborBreakdown
    equipment: EquipmentBreakdown
