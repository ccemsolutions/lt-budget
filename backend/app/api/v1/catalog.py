"""
Catalog API — Activity catalog with CPU (resource templates) view and edit.
Also exposes BD_MO (labor roles) and BD_VEM (equipment) editors.
"""
from __future__ import annotations
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.tenant import User
from app.models.static_data import ActivityCatalog, ResourceTemplate, LaborRole, EquipmentItem
from app.api.deps import get_current_user

router = APIRouter()


# ── Read schemas ────────────────────────────────────────────────────────────

class LaborRoleRef(BaseModel):
    id: str
    code: str
    description: str
    company_cost_hh: float
    company_cost_monthly: float


class EquipmentItemRef(BaseModel):
    id: str
    code: str
    description: str
    company_cost_daily: float
    company_cost_monthly: float


class ResourceTemplateRead(BaseModel):
    id: str
    resource_type: str
    # MO
    labor_role_id: Optional[str] = None
    labor_role: Optional[LaborRoleRef] = None
    qty_per_team: Optional[float] = None
    # VEM
    equipment_id: Optional[str] = None
    equipment_item: Optional[EquipmentItemRef] = None
    # MAT
    material_code: Optional[str] = None
    material_description: Optional[str] = None
    material_qty_per_unit: Optional[float] = None
    material_unit_price: Optional[float] = None
    # SUB
    sub_code: Optional[str] = None
    subcontractor_description: Optional[str] = None
    subcontractor_cost_per_unit: Optional[float] = None


class ActivityCatalogRead(BaseModel):
    id: str
    code: str
    description: str
    unit: str
    category: str
    sort_order: int
    productivity_per_day: float
    fd_pct: float
    resources: list[ResourceTemplateRead] = []


# ── Write schemas ───────────────────────────────────────────────────────────

class ResourceTemplateWrite(BaseModel):
    resource_type: str
    labor_role_id: Optional[str] = None
    qty_per_team: Optional[float] = None
    equipment_id: Optional[str] = None
    material_code: Optional[str] = None
    material_description: Optional[str] = None
    material_qty_per_unit: Optional[float] = None
    material_unit_price: Optional[float] = None
    sub_code: Optional[str] = None
    subcontractor_description: Optional[str] = None
    subcontractor_cost_per_unit: Optional[float] = None


class ActivityProductivityUpdate(BaseModel):
    productivity_per_day: float


# ── BD_MO schemas ────────────────────────────────────────────────────────────

class LaborRoleFullRead(BaseModel):
    id: str
    code: str
    description: str
    role_type: str
    salary_type: str
    base_salary: float
    has_overtime: bool
    custo_bruto_mes: float
    he_50_pct: float
    he_100_pct: float
    encargos: float
    transporte: float
    alimentacao: float
    epi: float
    seguro_vida: float
    aux_moradia: float
    cesta_basica: float
    ppr: float
    assist_medica: float
    company_cost_monthly: float
    company_cost_daily: float
    company_cost_hh: float
    is_active: bool
    version: int


class LaborRoleUpdate(BaseModel):
    description: Optional[str] = None
    base_salary: Optional[float] = None
    has_overtime: Optional[bool] = None
    custo_bruto_mes: Optional[float] = None
    he_50_pct: Optional[float] = None
    he_100_pct: Optional[float] = None
    encargos: Optional[float] = None
    transporte: Optional[float] = None
    alimentacao: Optional[float] = None
    epi: Optional[float] = None
    seguro_vida: Optional[float] = None
    aux_moradia: Optional[float] = None
    cesta_basica: Optional[float] = None
    ppr: Optional[float] = None
    assist_medica: Optional[float] = None


# ── BD_VEM schemas ───────────────────────────────────────────────────────────

class EquipmentItemFullRead(BaseModel):
    id: str
    code: str
    description: str
    locacao_sem_op_mes: float
    consumo_combustivel_dia: float
    tipo_combustivel: Optional[str]
    total_combustivel_mes: float
    total_lubmaint_mes: float
    mob_demob_mes: float
    outros_mes: float
    company_cost_monthly: float
    company_cost_daily: float
    company_cost_hh: float
    is_active: bool
    version: int


class EquipmentItemUpdate(BaseModel):
    description: Optional[str] = None
    locacao_sem_op_mes: Optional[float] = None
    consumo_combustivel_dia: Optional[float] = None
    tipo_combustivel: Optional[str] = None
    total_combustivel_mes: Optional[float] = None
    total_lubmaint_mes: Optional[float] = None
    mob_demob_mes: Optional[float] = None
    outros_mes: Optional[float] = None


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/activities", response_model=list[ActivityCatalogRead])
async def list_activities(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all activities in catalog with their resource templates."""
    act_result = await db.execute(
        select(ActivityCatalog).where(ActivityCatalog.is_active == True).order_by(ActivityCatalog.sort_order)
    )
    activities = act_result.scalars().all()

    # Bulk load templates
    activity_ids = [a.id for a in activities]
    rt_result = await db.execute(
        select(ResourceTemplate).where(ResourceTemplate.activity_id.in_(activity_ids))
    )
    templates = rt_result.scalars().all()

    # Bulk load roles and equipment
    labor_ids = {rt.labor_role_id for rt in templates if rt.labor_role_id}
    equip_ids = {rt.equipment_id for rt in templates if rt.equipment_id}

    labor_map: dict[uuid.UUID, LaborRole] = {}
    if labor_ids:
        lr = await db.execute(select(LaborRole).where(LaborRole.id.in_(labor_ids)))
        for r in lr.scalars():
            labor_map[r.id] = r

    equip_map: dict[uuid.UUID, EquipmentItem] = {}
    if equip_ids:
        eq = await db.execute(select(EquipmentItem).where(EquipmentItem.id.in_(equip_ids)))
        for e in eq.scalars():
            equip_map[e.id] = e

    # Group templates by activity_id
    by_activity: dict[uuid.UUID, list[ResourceTemplate]] = {}
    for rt in templates:
        by_activity.setdefault(rt.activity_id, []).append(rt)

    result = []
    for a in activities:
        rts = by_activity.get(a.id, [])
        resources = []
        for rt in rts:
            lr_ref = None
            if rt.labor_role_id and rt.labor_role_id in labor_map:
                lr = labor_map[rt.labor_role_id]
                lr_ref = LaborRoleRef(
                    id=str(lr.id), code=lr.code, description=lr.description,
                    company_cost_hh=float(lr.company_cost_hh),
                    company_cost_monthly=float(lr.company_cost_monthly),
                )
            eq_ref = None
            if rt.equipment_id and rt.equipment_id in equip_map:
                eq = equip_map[rt.equipment_id]
                eq_ref = EquipmentItemRef(
                    id=str(eq.id), code=eq.code, description=eq.description,
                    company_cost_daily=float(eq.company_cost_daily),
                    company_cost_monthly=float(eq.company_cost_monthly),
                )
            resources.append(ResourceTemplateRead(
                id=str(rt.id),
                resource_type=rt.resource_type,
                labor_role_id=str(rt.labor_role_id) if rt.labor_role_id else None,
                labor_role=lr_ref,
                qty_per_team=float(rt.qty_per_team) if rt.qty_per_team is not None else None,
                equipment_id=str(rt.equipment_id) if rt.equipment_id else None,
                equipment_item=eq_ref,
                material_code=rt.material_code,
                material_description=rt.material_description,
                material_qty_per_unit=float(rt.material_qty_per_unit) if rt.material_qty_per_unit else None,
                material_unit_price=float(rt.material_unit_price) if rt.material_unit_price else None,
                sub_code=rt.sub_code,
                subcontractor_description=rt.subcontractor_description,
                subcontractor_cost_per_unit=float(rt.subcontractor_cost_per_unit) if rt.subcontractor_cost_per_unit else None,
            ))
        result.append(ActivityCatalogRead(
            id=str(a.id), code=a.code, description=a.description,
            unit=a.unit, category=a.category, sort_order=a.sort_order,
            productivity_per_day=float(a.productivity_per_day),
            fd_pct=float(a.fd_pct),
            resources=resources,
        ))
    return result


@router.get("/labor-roles", response_model=list[LaborRoleRef])
async def list_labor_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(LaborRole).where(LaborRole.is_active == True).order_by(LaborRole.code))
    return [
        LaborRoleRef(
            id=str(r.id), code=r.code, description=r.description,
            company_cost_hh=float(r.company_cost_hh),
            company_cost_monthly=float(r.company_cost_monthly),
        )
        for r in result.scalars()
    ]


@router.get("/equipment-items", response_model=list[EquipmentItemRef])
async def list_equipment_items(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(EquipmentItem).where(EquipmentItem.is_active == True).order_by(EquipmentItem.code))
    return [
        EquipmentItemRef(
            id=str(e.id), code=e.code, description=e.description,
            company_cost_daily=float(e.company_cost_daily),
            company_cost_monthly=float(e.company_cost_monthly),
        )
        for e in result.scalars()
    ]


@router.put("/activities/{activity_id}/productivity")
async def update_productivity(
    activity_id: uuid.UUID,
    body: ActivityProductivityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activity = await db.get(ActivityCatalog, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Atividade não encontrada")
    activity.productivity_per_day = body.productivity_per_day
    await db.commit()
    return {"ok": True}


@router.put("/activities/{activity_id}/resources")
async def update_resources(
    activity_id: uuid.UUID,
    resources: list[ResourceTemplateWrite],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Replace all resource templates for an activity."""
    activity = await db.get(ActivityCatalog, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Atividade não encontrada")

    # Delete existing
    existing = await db.execute(
        select(ResourceTemplate).where(ResourceTemplate.activity_id == activity_id)
    )
    for rt in existing.scalars():
        await db.delete(rt)

    # Insert new
    for r in resources:
        rt = ResourceTemplate(
            activity_id=activity_id,
            resource_type=r.resource_type,
            labor_role_id=uuid.UUID(r.labor_role_id) if r.labor_role_id else None,
            qty_per_team=r.qty_per_team,
            equipment_id=uuid.UUID(r.equipment_id) if r.equipment_id else None,
            material_code=r.material_code,
            material_description=r.material_description,
            material_qty_per_unit=r.material_qty_per_unit,
            material_unit_price=r.material_unit_price,
            sub_code=r.sub_code,
            subcontractor_description=r.subcontractor_description,
            subcontractor_cost_per_unit=r.subcontractor_cost_per_unit,
        )
        db.add(rt)

    await db.commit()
    return {"ok": True, "count": len(resources)}


# ── BD_MO endpoints ──────────────────────────────────────────────────────────

def _labor_to_full(r: LaborRole) -> LaborRoleFullRead:
    return LaborRoleFullRead(
        id=str(r.id), code=r.code, description=r.description,
        role_type=r.role_type, salary_type=r.salary_type,
        base_salary=float(r.base_salary), has_overtime=r.has_overtime,
        custo_bruto_mes=float(r.custo_bruto_mes), he_50_pct=float(r.he_50_pct),
        he_100_pct=float(r.he_100_pct), encargos=float(r.encargos),
        transporte=float(r.transporte), alimentacao=float(r.alimentacao),
        epi=float(r.epi), seguro_vida=float(r.seguro_vida),
        aux_moradia=float(r.aux_moradia), cesta_basica=float(r.cesta_basica),
        ppr=float(r.ppr), assist_medica=float(r.assist_medica),
        company_cost_monthly=float(r.company_cost_monthly),
        company_cost_daily=float(r.company_cost_daily),
        company_cost_hh=float(r.company_cost_hh),
        is_active=r.is_active, version=r.version,
    )


@router.get("/labor-roles/full", response_model=list[LaborRoleFullRead])
async def list_labor_roles_full(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(LaborRole).order_by(LaborRole.code))
    return [_labor_to_full(r) for r in result.scalars()]


@router.put("/labor-roles/{role_id}", response_model=LaborRoleFullRead)
async def update_labor_role(
    role_id: uuid.UUID,
    body: LaborRoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = await db.get(LaborRole, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Cargo não encontrado")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(role, field, value)

    # Recalculate totals
    total = (
        float(role.custo_bruto_mes) + float(role.he_50_pct) + float(role.he_100_pct)
        + float(role.encargos) + float(role.transporte) + float(role.alimentacao)
        + float(role.epi) + float(role.seguro_vida) + float(role.aux_moradia)
        + float(role.cesta_basica) + float(role.ppr) + float(role.assist_medica)
    )
    role.company_cost_monthly = total
    role.company_cost_daily = total / 25.0
    role.company_cost_hh = total / 220.0
    role.version = (role.version or 1) + 1
    role.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(role)
    return _labor_to_full(role)


# ── BD_VEM endpoints ─────────────────────────────────────────────────────────

def _equip_to_full(e: EquipmentItem) -> EquipmentItemFullRead:
    return EquipmentItemFullRead(
        id=str(e.id), code=e.code, description=e.description,
        locacao_sem_op_mes=float(e.locacao_sem_op_mes),
        consumo_combustivel_dia=float(e.consumo_combustivel_dia),
        tipo_combustivel=e.tipo_combustivel,
        total_combustivel_mes=float(e.total_combustivel_mes),
        total_lubmaint_mes=float(e.total_lubmaint_mes),
        mob_demob_mes=float(e.mob_demob_mes),
        outros_mes=float(e.outros_mes),
        company_cost_monthly=float(e.company_cost_monthly),
        company_cost_daily=float(e.company_cost_daily),
        company_cost_hh=float(e.company_cost_hh),
        is_active=e.is_active, version=e.version,
    )


@router.get("/equipment-items/full", response_model=list[EquipmentItemFullRead])
async def list_equipment_items_full(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(EquipmentItem).order_by(EquipmentItem.code))
    return [_equip_to_full(e) for e in result.scalars()]


@router.put("/equipment-items/{item_id}", response_model=EquipmentItemFullRead)
async def update_equipment_item(
    item_id: uuid.UUID,
    body: EquipmentItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = await db.get(EquipmentItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(item, field, value)

    # Recalculate totals
    total = (
        float(item.locacao_sem_op_mes) + float(item.total_combustivel_mes)
        + float(item.total_lubmaint_mes) + float(item.mob_demob_mes)
        + float(item.outros_mes)
    )
    item.company_cost_monthly = total
    item.company_cost_daily = total / 25.0
    item.company_cost_hh = item.company_cost_daily / 8.0
    item.version = (item.version or 1) + 1
    item.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(item)
    return _equip_to_full(item)
