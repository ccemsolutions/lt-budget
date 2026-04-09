"""
Cost Breakdown Service (OutD / OutE sheets equivalent).

For each MO resource template used in budget activities:
  person_months = rt.qty_per_team × ba.teams × ba.duration_months
  component_cost = person_months × role.component_value

For each VEM resource template:
  unit_months = rt.qty_per_team × ba.teams × ba.duration_months
  component_cost = unit_months × equip.component_value
"""
from __future__ import annotations
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.project import BudgetActivity
from app.models.static_data import ResourceTemplate, LaborRole, EquipmentItem
from app.schemas.cost_breakdown import CostBreakdownRead, LaborBreakdown, EquipmentBreakdown


async def compute_cost_breakdown(budget_id: uuid.UUID, db: AsyncSession) -> CostBreakdownRead:
    # Load all budget activities
    ba_result = await db.execute(
        select(BudgetActivity).where(BudgetActivity.budget_id == budget_id)
    )
    activities = ba_result.scalars().all()

    if not activities:
        _zero_labor = LaborBreakdown(
            custo_bruto=0, he_50=0, he_100=0, encargos=0, transporte=0,
            alimentacao=0, epi=0, seguro_vida=0, aux_moradia=0, cesta_basica=0,
            ppr=0, assist_medica=0, total=0,
        )
        _zero_equip = EquipmentBreakdown(
            locacao_sem_op=0, combustivel=0, lub_manutencao=0, mob_demob=0, outros=0, total=0,
        )
        return CostBreakdownRead(labor=_zero_labor, equipment=_zero_equip)

    activity_ids = [a.activity_id for a in activities]

    # Build lookup: activity_id → (teams, duration_months)
    act_map: dict[uuid.UUID, tuple[int, float]] = {
        a.activity_id: (a.teams, float(a.duration_months)) for a in activities
    }

    # Load resource templates for these activities
    rt_result = await db.execute(
        select(ResourceTemplate).where(ResourceTemplate.activity_id.in_(activity_ids))
    )
    templates = rt_result.scalars().all()

    # Collect unique labor_role_ids and equipment_ids
    labor_ids = {rt.labor_role_id for rt in templates if rt.resource_type == "MO" and rt.labor_role_id}
    equip_ids = {rt.equipment_id for rt in templates if rt.resource_type == "VEM" and rt.equipment_id}

    # Load roles and equipment
    labor_map: dict[uuid.UUID, LaborRole] = {}
    if labor_ids:
        lr_result = await db.execute(select(LaborRole).where(LaborRole.id.in_(labor_ids)))
        for lr in lr_result.scalars().all():
            labor_map[lr.id] = lr

    equip_map: dict[uuid.UUID, EquipmentItem] = {}
    if equip_ids:
        eq_result = await db.execute(select(EquipmentItem).where(EquipmentItem.id.in_(equip_ids)))
        for eq in eq_result.scalars().all():
            equip_map[eq.id] = eq

    # Accumulate labor components
    lab = {k: 0.0 for k in [
        "custo_bruto", "he_50", "he_100", "encargos", "transporte",
        "alimentacao", "epi", "seguro_vida", "aux_moradia", "cesta_basica",
        "ppr", "assist_medica",
    ]}

    # Accumulate equipment components
    eqp = {k: 0.0 for k in [
        "locacao_sem_op", "combustivel", "lub_manutencao", "mob_demob", "outros",
    ]}

    for rt in templates:
        teams, duration = act_map.get(rt.activity_id, (0, 0.0))
        qty = float(rt.qty_per_team or 0)
        person_months = qty * teams * duration

        if rt.resource_type == "MO" and rt.labor_role_id and person_months > 0:
            role = labor_map.get(rt.labor_role_id)
            if role:
                lab["custo_bruto"]  += person_months * float(role.custo_bruto_mes)
                lab["he_50"]        += person_months * float(role.he_50_pct)
                lab["he_100"]       += person_months * float(role.he_100_pct)
                lab["encargos"]     += person_months * float(role.encargos)
                lab["transporte"]   += person_months * float(role.transporte)
                lab["alimentacao"]  += person_months * float(role.alimentacao)
                lab["epi"]          += person_months * float(role.epi)
                lab["seguro_vida"]  += person_months * float(role.seguro_vida)
                lab["aux_moradia"]  += person_months * float(role.aux_moradia)
                lab["cesta_basica"] += person_months * float(role.cesta_basica)
                lab["ppr"]          += person_months * float(role.ppr)
                lab["assist_medica"]+= person_months * float(role.assist_medica)

        elif rt.resource_type == "VEM" and rt.equipment_id and person_months > 0:
            equip = equip_map.get(rt.equipment_id)
            if equip:
                eqp["locacao_sem_op"] += person_months * float(equip.locacao_sem_op_mes)
                eqp["combustivel"]    += person_months * float(equip.total_combustivel_mes)
                eqp["lub_manutencao"] += person_months * float(equip.total_lubmaint_mes)
                eqp["mob_demob"]      += person_months * float(equip.mob_demob_mes)
                eqp["outros"]         += person_months * float(equip.outros_mes)

    labor_total = sum(lab.values())
    equip_total = sum(eqp.values())

    return CostBreakdownRead(
        labor=LaborBreakdown(
            custo_bruto=round(lab["custo_bruto"], 2),
            he_50=round(lab["he_50"], 2),
            he_100=round(lab["he_100"], 2),
            encargos=round(lab["encargos"], 2),
            transporte=round(lab["transporte"], 2),
            alimentacao=round(lab["alimentacao"], 2),
            epi=round(lab["epi"], 2),
            seguro_vida=round(lab["seguro_vida"], 2),
            aux_moradia=round(lab["aux_moradia"], 2),
            cesta_basica=round(lab["cesta_basica"], 2),
            ppr=round(lab["ppr"], 2),
            assist_medica=round(lab["assist_medica"], 2),
            total=round(labor_total, 2),
        ),
        equipment=EquipmentBreakdown(
            locacao_sem_op=round(eqp["locacao_sem_op"], 2),
            combustivel=round(eqp["combustivel"], 2),
            lub_manutencao=round(eqp["lub_manutencao"], 2),
            mob_demob=round(eqp["mob_demob"], 2),
            outros=round(eqp["outros"], 2),
            total=round(equip_total, 2),
        ),
    )
