"""
Budget calculation service: loads reference data from DB, runs the pipeline,
persists results. Runs in a background task.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import AsyncSessionLocal
from app.models.project import Budget, BudgetActivity, BudgetSummary
from app.models.static_data import LaborRole, EquipmentItem, ActivityCatalog, ResourceTemplate
from app.engine.pipeline import BudgetPipeline
from app.engine.types import (
    ProjectInputs, EngineeringData, SalaryParams,
    ActivityData, LaborRoleData, EquipmentItemData, ResourceItem,
    IndirectCostsData, IndirectRoleConfig, IndirectVehicleConfig,
)
from app.engine.financial_engine import (
    FinancialParams, MaterialItemData, compute_financial,
)


async def run_budget_calculation(budget_id: uuid.UUID) -> None:
    async with AsyncSessionLocal() as db:
        try:
            await _calculate(db, budget_id)
        except Exception as exc:
            async with AsyncSessionLocal() as db2:
                budget = await db2.get(Budget, budget_id)
                if budget:
                    budget.status = "error"
                    budget.error_message = str(exc)[:500]
                    await db2.commit()


async def _calculate(db: AsyncSession, budget_id: uuid.UUID) -> None:
    budget = await db.get(Budget, budget_id)
    if not budget:
        return

    snapshot = budget.inputs_snapshot

    # Build ProjectInputs from snapshot
    eng = snapshot.get("engineering", {})
    terrain = snapshot.get("terrain", {})
    veg = snapshot.get("vegetation", {})
    access = snapshot.get("access_roads", {})
    schedule = snapshot.get("schedule", {})
    sp_override = snapshot.get("salary_params", {})

    salary = SalaryParams(
        encargos_pct=sp_override.get("encargos_pct", 0.91),
        hours_per_month=sp_override.get("hours_per_month", 220.0),
        working_days_per_month=sp_override.get("working_days_per_month", 25.0),
        ot_50_hours_per_month=sp_override.get("ot_50_hours_per_month", 40.0),
        ot_100_hours_per_month=sp_override.get("ot_100_hours_per_month", 8.0),
    )

    # Build IndirectCostsData from snapshot
    ic = snapshot.get("indirect_config", {})
    indirect = IndirectCostsData(
        mo_roles=[
            IndirectRoleConfig(
                code=r["code"],
                qty=float(r.get("qty", 0)),
                duration_months=r.get("duration_months"),
            )
            for r in ic.get("mo_roles", [])
        ],
        vehicles=[
            IndirectVehicleConfig(
                code=v["code"],
                qty=float(v.get("qty", 0)),
                duration_months=v.get("duration_months"),
            )
            for v in ic.get("vehicles", [])
        ],
        canteiro_custo_mes=float(ic.get("canteiro_custo_mes", 0)),
        canteiro_meses=ic.get("canteiro_meses"),
        republicas_custo_mes=float(ic.get("republicas_custo_mes", 0)),
        viagens_custo_mes=float(ic.get("viagens_custo_mes", 0)),
        qsms_custo_mes=float(ic.get("qsms_custo_mes", 0)),
        mob_demob_total=float(ic.get("mob_demob_total", 0)),
    )

    start_month_by_category = {
        "Serviços Preliminares": schedule.get("start_month_preliminares", 1),
        "Obras Civis": schedule.get("start_month_civil", 2),
        "Aterramento": schedule.get("start_month_aterramento", 6),
        "Montagem de Estruturas": schedule.get("start_month_montagem", 8),
        "Lançamento de Cabos": schedule.get("start_month_lancamento", 12),
        "Serviços Finais": schedule.get("start_month_finais", 20),
    }

    inputs = ProjectInputs(
        line_length_km=float(snapshot.get("line_length_km", 0)),
        circuit_type=snapshot.get("circuit_type", "single"),
        total_towers=int(snapshot.get("total_towers", 0)),
        engineering=EngineeringData(
            guyed_towers=eng.get("guyed_towers", 0),
            self_supporting_towers=eng.get("self_supporting_towers", 0),
            excavation_tubulao_m3=eng.get("excavation_tubulao_m3", 0),
            excavation_mecanizada_m3=eng.get("excavation_mecanizada_m3", 0),
            excavation_solo_fraco_m3=eng.get("excavation_solo_fraco_m3", 0),
            excavation_manual_m3=eng.get("excavation_manual_m3", 0),
            excavation_rocha_m3=eng.get("excavation_rocha_m3", 0),
            excavation_moledo_m3=eng.get("excavation_moledo_m3", 0),
            concrete_usinado_m3=eng.get("concrete_usinado_m3", 0),
            concrete_canteiro_m3=eng.get("concrete_canteiro_m3", 0),
            concrete_manual_m3=eng.get("concrete_manual_m3", 0),
            concrete_premoldado_m3=eng.get("concrete_premoldado_m3", 0),
            rebar_ton=eng.get("rebar_ton", 0),
            estacas_aco_m=eng.get("estacas_aco_m", 0),
            estacas_concreto_m=eng.get("estacas_concreto_m", 0),
            estacas_raiz_m=eng.get("estacas_raiz_m", 0),
            helicoidais_m=eng.get("helicoidais_m", 0),
            chumbadores_m=eng.get("chumbadores_m", 0),
            contrapeso_m=eng.get("contrapeso_m", 0),
        ),
        terrain_flat_pct=terrain.get("flat_pct", 0),
        terrain_undulating_pct=terrain.get("undulating_pct", 0),
        terrain_steep_pct=terrain.get("steep_pct", 0),
        terrain_mountainous_pct=terrain.get("mountainous_pct", 0),
        vegetation_agriculture_pct=veg.get("agriculture_pct", 0),
        vegetation_light_forest_pct=veg.get("light_forest_pct", 0),
        vegetation_heavy_forest_pct=veg.get("heavy_forest_pct", 0),
        vegetation_reforestation_pct=veg.get("reforestation_pct", 0),
        vegetation_open_pct=veg.get("open_pct", 0),
        new_roads_km=access.get("new_roads_km", 0),
        maintenance_km=access.get("maintenance_km", 0),
        swamp_estivas_km=access.get("swamp_estivas_km", 0),
        total_duration_months=schedule.get("total_duration_months", 24),
        start_month_by_category=start_month_by_category,
        teams_by_activity=schedule.get("teams_by_activity", {}),
        salary=salary,
        indirect=indirect,
    )

    # Load reference data
    labor_roles = await _load_labor_roles(db)
    equipment_items = await _load_equipment(db)
    activities = await _load_activities(db)

    # Run pipeline
    pipeline = BudgetPipeline()
    result = pipeline.run(inputs, activities, labor_roles, equipment_items)

    # Persist results
    for ar in result.activity_results:
        row = BudgetActivity(
            budget_id=budget_id,
            activity_id=uuid.UUID(ar.activity_id),
            quantity=ar.quantity,
            teams=ar.teams,
            duration_months=ar.duration_months,
            start_month=ar.start_month,
            mo_cost_per_unit=ar.mo_cost_per_unit,
            vem_cost_per_unit=ar.vem_cost_per_unit,
            mat_cost_per_unit=ar.mat_cost_per_unit,
            sub_cost_per_unit=ar.sub_cost_per_unit,
            fd_cost_per_unit=ar.fd_cost_per_unit,
            unit_cost=ar.unit_cost,
            total_cost=ar.total_cost,
            manhours=ar.manhours,
        )
        db.add(row)

    for cs in result.category_summaries:
        row = BudgetSummary(
            budget_id=budget_id,
            category=cs.category,
            total_cost=cs.total_cost,
            mo_cost=cs.mo_cost,
            vem_cost=cs.vem_cost,
            mat_cost=cs.mat_cost,
            sub_cost=cs.sub_cost,
            fd_cost=cs.fd_cost,
            manhours=cs.manhours,
        )
        db.add(row)

    # ── Financial KPIs ───────────────────────────────────────────────────────
    fp_raw = snapshot.get("financial_params", {})
    fin_params = FinancialParams(
        margin_services_pct=float(fp_raw.get("margin_services_pct", 18.0)),
        margin_materials_pct=float(fp_raw.get("margin_materials_pct", 6.38)),
        advance_pct=float(fp_raw.get("advance_pct", 10.0)),
        retention_pct=float(fp_raw.get("retention_pct", 3.0)),
        cost_implantacao=float(fp_raw.get("cost_implantacao", 0)),
        cost_projeto=float(fp_raw.get("cost_projeto", 0)),
        cost_fundiario=float(fp_raw.get("cost_fundiario", 0)),
        cost_seguros=float(fp_raw.get("cost_seguros", 0)),
        cost_outros=float(fp_raw.get("cost_outros", 0)),
        materials=[
            MaterialItemData(
                description=m.get("description", ""),
                value=float(m.get("value", 0)),
                start_month=int(m.get("start_month", 1)),
                duration_months=int(m.get("duration_months", 1)),
            )
            for m in fp_raw.get("materials", [])
        ],
    )

    # Build monthly service disbursement map from activities
    total_months = inputs.total_duration_months or 1
    import math as _math
    monthly_svc: dict[int, float] = {m: 0.0 for m in range(1, total_months + 1)}
    for ar in result.activity_results:
        if not ar.start_month or ar.duration_months <= 0:
            continue
        start = ar.start_month
        dur = ar.duration_months
        end = start + dur
        monthly_val = ar.total_cost / dur
        for m in range(1, total_months + 1):
            if m < start or m > _math.ceil(end):
                continue
            overlap_start = max(m - 1, start - 1)
            overlap_end = min(m, end)
            fraction = max(0.0, overlap_end - overlap_start)
            monthly_svc[m] = monthly_svc.get(m, 0) + monthly_val * fraction
    # Also distribute indirect costs evenly
    if result.indirect_result and result.indirect_result.total_cost > 0:
        per_month_indirect = result.indirect_result.total_cost / total_months
        for m in range(1, total_months + 1):
            monthly_svc[m] = monthly_svc.get(m, 0) + per_month_indirect

    fin_result = compute_financial(
        params=fin_params,
        total_services_cost=result.total_cost,
        total_months=total_months,
        monthly_service_disbursement=monthly_svc,
    )

    budget.status = "ready"
    budget.calculated_at = datetime.utcnow()
    budget.total_direct_cost = result.total_direct_cost
    budget.total_indirect_cost = result.total_indirect_cost
    budget.total_cost = result.total_cost
    budget.total_manhours = result.total_manhours
    budget.cost_per_km = result.cost_per_km
    budget.cost_per_tower = result.cost_per_tower
    budget.selling_price = fin_result.selling_price
    budget.gross_margin = fin_result.gross_margin_pct
    budget.max_exposure = fin_result.max_exposure

    # ── Extended KPIs (Res sheet) ────────────────────────────────────────────
    line_km = inputs.line_length_km or 1
    towers = inputs.total_towers or 1
    total_hh = result.total_manhours or 0
    total_c = result.total_cost or result.total_direct_cost or 1
    rebar_ton = inputs.engineering.rebar_ton or 0

    budget.hh_per_km    = round(total_hh / line_km, 2) if line_km > 0 else None
    budget.hh_per_tower = round(total_hh / towers, 2)  if towers > 0 else None
    budget.cost_per_hh  = round(total_c / total_hh, 4) if total_hh > 0 else None
    budget.hh_per_ton   = round(total_hh / rebar_ton, 4) if rebar_ton > 0 else None

    await db.commit()


async def _load_labor_roles(db: AsyncSession) -> dict[str, LaborRoleData]:
    result = await db.execute(select(LaborRole).where(LaborRole.is_active == True))
    roles = result.scalars().all()
    return {
        r.code: LaborRoleData(
            id=str(r.id),
            code=r.code,
            description=r.description,
            company_cost_hh=float(r.company_cost_hh),
            company_cost_monthly=float(r.company_cost_monthly),
        )
        for r in roles
    }


async def _load_equipment(db: AsyncSession) -> dict[str, EquipmentItemData]:
    result = await db.execute(select(EquipmentItem).where(EquipmentItem.is_active == True))
    items = result.scalars().all()
    return {
        e.code: EquipmentItemData(
            id=str(e.id),
            code=e.code,
            description=e.description,
            company_cost_monthly=float(e.company_cost_monthly),
            company_cost_daily=float(e.company_cost_daily),
            company_cost_hh=float(e.company_cost_hh),
        )
        for e in items
    }


async def _load_activities(db: AsyncSession) -> list[ActivityData]:
    result = await db.execute(
        select(ActivityCatalog)
        .where(ActivityCatalog.is_active == True)
        .order_by(ActivityCatalog.sort_order)
    )
    catalogs = result.scalars().all()

    activities = []
    for cat in catalogs:
        # Load resource templates with eager-loaded relationships to avoid lazy-load in async context
        tpl_result = await db.execute(
            select(ResourceTemplate)
            .where(ResourceTemplate.activity_id == cat.id)
            .options(
                joinedload(ResourceTemplate.labor_role),
                joinedload(ResourceTemplate.equipment_item),
            )
        )
        templates = tpl_result.scalars().all()

        resources = []
        for t in templates:
            ri = ResourceItem(resource_type=t.resource_type)
            if t.resource_type == "MO" and t.labor_role:
                ri.labor_role_id = str(t.labor_role_id)
                ri.role_code = t.labor_role.code if t.labor_role else ""
                ri.qty_per_team = float(t.qty_per_team or 0)
            elif t.resource_type == "VEM" and t.equipment_item:
                ri.equipment_id = str(t.equipment_id)
                ri.equipment_code = t.equipment_item.code if t.equipment_item else ""
                ri.qty_per_team = float(t.qty_per_team or 0)
            elif t.resource_type == "MAT":
                ri.material_code = t.material_code or ""
                ri.material_description = t.material_description or ""
                ri.material_qty_per_unit = float(t.material_qty_per_unit or 0)
                ri.material_unit_price = float(t.material_unit_price or 0)
            elif t.resource_type == "SUB":
                ri.sub_code = t.sub_code or ""
                ri.subcontractor_description = t.subcontractor_description or ""
                ri.subcontractor_cost_per_unit = float(t.subcontractor_cost_per_unit or 0)
            resources.append(ri)

        activities.append(ActivityData(
            id=str(cat.id),
            code=cat.code,
            description=cat.description,
            unit=cat.unit,
            category=cat.category,
            sort_order=cat.sort_order,
            quantity_formula=cat.quantity_formula,
            productivity_per_day=float(cat.productivity_per_day),
            fd_pct=float(cat.fd_pct),
            md_pct=float(cat.md_pct),
            resources=resources,
        ))

    return activities
