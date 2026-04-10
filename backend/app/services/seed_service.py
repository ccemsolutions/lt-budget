"""
Seeds static reference data from JSON fixtures into the database.
Run once on first setup: python -m app.services.seed_service
"""
from __future__ import annotations

import json
import os
import uuid
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.models.static_data import LaborRole, EquipmentItem, ActivityCatalog, ResourceTemplate

FIXTURES_DIR = Path(__file__).parent.parent.parent / "fixtures"


async def seed_all(db: AsyncSession) -> dict:
    counts = {}
    counts["labor_roles"] = await seed_labor_roles(db)
    counts["equipment_items"] = await seed_equipment_items(db)
    counts["activity_catalog"] = await seed_activity_catalog(db)
    counts["resource_templates"] = await seed_resource_templates(db)
    await db.commit()
    return counts


async def seed_labor_roles(db: AsyncSession) -> int:
    # Check if already seeded
    result = await db.execute(select(LaborRole).limit(1))
    if result.scalar_one_or_none():
        return 0

    data = _load_fixture("labor_roles.json")
    for i, item in enumerate(data):
        role = LaborRole(
            code=item["code"],
            description=item["description"] or f"Função {item['code']}",
            role_type=item["role_type"],
            salary_type=item.get("salary_type", "H"),
            base_salary=item.get("base_salary", 0),
            company_cost_monthly=item.get("company_cost_monthly", 0),
            company_cost_daily=item.get("company_cost_daily", 0),
            company_cost_hh=item.get("company_cost_hh", 0),
            has_overtime=item.get("has_overtime", False),
            has_adic_transf=item.get("has_adic_transf", False),
            has_periculosidade=item.get("has_periculosidade", False),
            has_adic_produt=item.get("has_adic_produt", False),
            has_aux_moradia=item.get("has_aux_moradia", False),
            folga_meses=item.get("folga_meses", 3),
            tipo=item.get("tipo"),
            custo_bruto_mes=item.get("custo_bruto_mes", 0),
            dissidio=item.get("dissidio", 0),
            adic_transf=item.get("adic_transf", 0),
            periculosidade_val=item.get("periculosidade", 0),
            he_50_pct=item.get("he_50_pct", 0),
            he_100_pct=item.get("he_100_pct", 0),
            encargos=item.get("encargos", 0),
            subtotal_sem_he=item.get("subtotal_sem_he", 0),
            adic_produtividade=item.get("adic_produtividade", 0),
            custo_admissao=item.get("custo_admissao", 0),
            desp_folga=item.get("desp_folga", 0),
            transporte=item.get("transporte", 0),
            alimentacao=item.get("alimentacao", 0),
            epi=item.get("epi", 0),
            seguro_vida=item.get("seguro_vida", 0),
            aux_moradia=item.get("aux_moradia", 0),
            cesta_basica=item.get("cesta_basica", 0),
            ppr=item.get("ppr", 0),
            assist_medica=item.get("assist_medica", 0),
        )
        db.add(role)
    await db.flush()
    return len(data)


async def seed_equipment_items(db: AsyncSession) -> int:
    result = await db.execute(select(EquipmentItem).limit(1))
    if result.scalar_one_or_none():
        return 0

    data = _load_fixture("equipment_items.json")
    for item in data:
        equip = EquipmentItem(
            code=item["code"],
            description=item["description"],
            company_cost_monthly=item.get("company_cost_monthly", 0),
            company_cost_daily=item.get("company_cost_daily", 0),
            company_cost_hh=item.get("company_cost_hh", 0),
            locacao_sem_op_mes=item.get("locacao_sem_op_mes", 0),
            consumo_combustivel_dia=item.get("consumo_combustivel_dia", 0),
            tipo_combustivel=item.get("tipo_combustivel") or None,
            preco_combustivel=item.get("preco_combustivel", 0),
            total_combustivel_mes=item.get("total_combustivel_mes", 0),
            lavagem_mes=item.get("lavagem_mes", 0),
            lubrificantes_mes=item.get("lubrificantes_mes", 0),
            manutencao_pct=item.get("manutencao_pct", 0),
            total_lubmaint_mes=item.get("total_lubmaint_mes", 0),
            mob_demob_mes=item.get("mob_demob_mes", 0),
            outros_mes=item.get("outros_mes", 0),
        )
        db.add(equip)
    await db.flush()
    return len(data)


async def seed_activity_catalog(db: AsyncSession) -> int:
    result = await db.execute(select(ActivityCatalog).limit(1))
    if result.scalar_one_or_none():
        return 0

    data = _load_fixture("activity_catalog.json")
    for item in data:
        if not item.get("description"):
            continue
        act = ActivityCatalog(
            code=item["code"],
            description=item["description"],
            unit=item.get("unit", "un"),
            category=item.get("category", "Outros"),
            sort_order=item.get("seq", 0),
            quantity_formula=item["code"],  # formula key = activity code
            productivity_per_day=item.get("productivity_per_day", 0),
            fd_pct=0.02,
            md_pct=0.0,
        )
        db.add(act)
    await db.flush()
    return len(data)


async def seed_resource_templates(db: AsyncSession) -> int:
    # Check if already seeded
    result = await db.execute(select(ResourceTemplate).limit(1))
    if result.scalar_one_or_none():
        return 0

    templates_data = _load_fixture("resource_templates.json")

    # Build lookup maps
    labor_result = await db.execute(select(LaborRole))
    labor_map = {r.code: r for r in labor_result.scalars().all()}

    equip_result = await db.execute(select(EquipmentItem))
    equip_map = {e.code: e for e in equip_result.scalars().all()}

    act_result = await db.execute(select(ActivityCatalog))
    act_map = {a.code: a for a in act_result.scalars().all()}

    count = 0
    for act_code, template in templates_data.items():
        activity = act_map.get(act_code)
        if not activity:
            continue

        # Update FD/MD pcts on activity
        if template.get("FD_pct"):
            activity.fd_pct = template["FD_pct"]
        if template.get("MD_pct"):
            activity.md_pct = template["MD_pct"]

        for mo_res in template.get("MO", []):
            role = labor_map.get(mo_res["role_code"])
            if role:
                t = ResourceTemplate(
                    activity_id=activity.id,
                    resource_type="MO",
                    labor_role_id=role.id,
                    qty_per_team=mo_res["qty_per_team"],
                )
                db.add(t)
                count += 1

        for vem_res in template.get("VEM", []):
            equip = equip_map.get(vem_res["equipment_code"])
            if equip:
                t = ResourceTemplate(
                    activity_id=activity.id,
                    resource_type="VEM",
                    equipment_id=equip.id,
                    qty_per_team=vem_res["qty_per_team"],
                )
                db.add(t)
                count += 1

        for mat_res in template.get("MAT", []):
            t = ResourceTemplate(
                activity_id=activity.id,
                resource_type="MAT",
                material_code=mat_res["material_code"],
                material_description=mat_res["description"],
                material_qty_per_unit=mat_res.get("qty_per_unit", 0),
                material_unit_price=0,  # prices not extracted yet
            )
            db.add(t)
            count += 1

        for sub_res in template.get("SUB", []):
            t = ResourceTemplate(
                activity_id=activity.id,
                resource_type="SUB",
                sub_code=sub_res["sub_code"],
                subcontractor_description=sub_res["description"],
                subcontractor_cost_per_unit=sub_res.get("cost_per_unit", 0),
            )
            db.add(t)
            count += 1

    await db.flush()
    return count


def _load_fixture(filename: str) -> list | dict:
    path = FIXTURES_DIR / filename
    with open(path, encoding="utf-8") as f:
        return json.load(f)


if __name__ == "__main__":
    import asyncio
    from app.database import AsyncSessionLocal

    async def main():
        async with AsyncSessionLocal() as db:
            counts = await seed_all(db)
            print("Seeded:", counts)

    asyncio.run(main())
