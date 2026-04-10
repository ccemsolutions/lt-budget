"""
IndirectCostEngine: calcula custos indiretos conforme lógica da aba C.I. da planilha.

Lógica principal (C.I.):
  - MO Indireta: qty × duration × monthly_cost  (mensalistas do escritório/campo)
  - Veículos Indiretos: qty × duration × monthly_cost
  - Canteiro: custo_mes × meses
  - Repúblicas/Hotéis: custo_mes × meses
  - Viagens a serviço: custo_mes × meses
  - QSMS: custo_mes × meses
  - Mob/Demob: valor fixo total
"""
from __future__ import annotations

from app.engine.types import (
    IndirectCostsData, IndirectCostResult,
    LaborRoleData, EquipmentItemData,
)

# Horas/mês padrão para mensalistas indiretos (BD_MO referência)
_HOURS_PER_MONTH = 220.0


def compute_indirect_costs(
    config: IndirectCostsData,
    total_months: int,
    labor_roles: dict[str, LaborRoleData],
    equipment: dict[str, EquipmentItemData],
) -> IndirectCostResult:
    """
    Calcula o custo total de indiretos.
    Segue a mesma lógica da aba C.I. da planilha de referência.
    """
    # ── MO Indireta ──────────────────────────────────────────────────────────
    mo_cost = 0.0
    manhours = 0.0
    for role_cfg in config.mo_roles:
        if role_cfg.qty <= 0:
            continue
        role = labor_roles.get(role_cfg.code)
        if not role:
            continue
        duration = role_cfg.duration_months if role_cfg.duration_months else total_months
        mo_cost += role_cfg.qty * duration * role.company_cost_monthly
        manhours += role_cfg.qty * duration * _HOURS_PER_MONTH

    # ── Veículos Indiretos ────────────────────────────────────────────────────
    vem_cost = 0.0
    for veh_cfg in config.vehicles:
        if veh_cfg.qty <= 0:
            continue
        equip = equipment.get(veh_cfg.code)
        if not equip:
            continue
        duration = veh_cfg.duration_months if veh_cfg.duration_months else total_months
        vem_cost += veh_cfg.qty * duration * equip.company_cost_monthly

    # ── Custos fixos mensais ──────────────────────────────────────────────────
    # Legacy single canteiro (backward compat)
    canteiro_months = config.canteiro_meses if config.canteiro_meses else total_months
    canteiro_cost    = config.canteiro_custo_mes * canteiro_months

    # New multi-canteiro
    for c in (config.canteiros or []):
        meses = c.meses if c.meses else total_months
        canteiro_cost += c.custo_mes * meses * c.quantidade

    # Alojamentos
    alojamento_cost = 0.0
    for a in (config.alojamentos or []):
        meses = a.meses if a.meses else total_months
        alojamento_cost += a.custo_mes * meses * a.quantidade

    republicas_cost  = config.republicas_custo_mes * total_months
    viagens_cost     = config.viagens_custo_mes * total_months
    qsms_cost        = config.qsms_custo_mes * total_months
    mob_demob_cost   = config.mob_demob_total

    other_cost = canteiro_cost + alojamento_cost + republicas_cost + viagens_cost + qsms_cost + mob_demob_cost
    total_cost = mo_cost + vem_cost + other_cost

    return IndirectCostResult(
        mo_cost=mo_cost,
        vem_cost=vem_cost,
        other_cost=other_cost,
        total_cost=total_cost,
        manhours=manhours,
    )
