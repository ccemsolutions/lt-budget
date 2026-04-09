"""
Catalog API — Activity catalog with CPU (resource templates) view and edit.
"""
from __future__ import annotations
import uuid
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
