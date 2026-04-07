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

    budget.status = "ready"
    budget.calculated_at = datetime.utcnow()
    budget.total_direct_cost = result.total_direct_cost
    budget.total_manhours = result.total_manhours
    budget.cost_per_km = result.cost_per_km
    budget.cost_per_tower = result.cost_per_tower
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
