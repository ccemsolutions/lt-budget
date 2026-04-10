"""
Catalog API — Activity catalog with CPU (resource templates) view and edit.
Also exposes BD_MO (labor roles) and BD_VEM (equipment) editors.
"""
from __future__ import annotations
import io
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.tenant import User
from app.models.static_data import ActivityCatalog, ResourceTemplate, LaborRole, EquipmentItem, CompanyBaseParams
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
    project_id: Optional[str] = None   # None = global; set = project-specific override


class ActivityCreate(BaseModel):
    code: str
    description: str
    unit: str = "un"
    category: str = "Outros"
    sort_order: int = 0
    quantity_formula: str = ""
    productivity_per_day: float = 0
    fd_pct: float = 0.02
    project_id: Optional[str] = None


class ActivityUpdate(BaseModel):
    description: Optional[str] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    quantity_formula: Optional[str] = None
    productivity_per_day: Optional[float] = None
    fd_pct: Optional[float] = None


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
    has_adic_transf: bool
    has_periculosidade: bool
    has_adic_produt: bool
    has_aux_moradia: bool
    folga_meses: float
    custo_bruto_mes: float
    dissidio: float
    adic_transf: float
    periculosidade_val: float
    he_50_pct: float
    he_100_pct: float
    encargos: float
    subtotal_sem_he: float
    adic_produtividade: float
    custo_admissao: float
    desp_folga: float
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
    has_adic_transf: Optional[bool] = None
    has_periculosidade: Optional[bool] = None
    has_adic_produt: Optional[bool] = None
    has_aux_moradia: Optional[bool] = None
    folga_meses: Optional[float] = None
    custo_bruto_mes: Optional[float] = None
    dissidio: Optional[float] = None
    adic_transf: Optional[float] = None
    periculosidade_val: Optional[float] = None
    he_50_pct: Optional[float] = None
    he_100_pct: Optional[float] = None
    encargos: Optional[float] = None
    subtotal_sem_he: Optional[float] = None
    adic_produtividade: Optional[float] = None
    custo_admissao: Optional[float] = None
    desp_folga: Optional[float] = None
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
    preco_combustivel: float
    total_combustivel_mes: float
    lavagem_mes: float
    lubrificantes_mes: float
    manutencao_pct: float
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
    preco_combustivel: Optional[float] = None
    total_combustivel_mes: Optional[float] = None
    lavagem_mes: Optional[float] = None
    lubrificantes_mes: Optional[float] = None
    manutencao_pct: Optional[float] = None
    total_lubmaint_mes: Optional[float] = None
    mob_demob_mes: Optional[float] = None
    outros_mes: Optional[float] = None


# ── Endpoints ───────────────────────────────────────────────────────────────

async def _build_activities_response(
    db: AsyncSession, activities: list[ActivityCatalog]
) -> list[ActivityCatalogRead]:
    """Bulk-load templates and build ActivityCatalogRead list."""
    activity_ids = [a.id for a in activities]
    if not activity_ids:
        return []

    rt_result = await db.execute(
        select(ResourceTemplate).where(ResourceTemplate.activity_id.in_(activity_ids))
    )
    templates = rt_result.scalars().all()

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
            project_id=str(a.project_id) if a.project_id else None,
        ))
    return result


@router.get("/activities", response_model=list[ActivityCatalogRead])
async def list_activities(
    project_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List activities. When project_id supplied: global activities + project overrides (merged)."""
    if project_id:
        # codes that have a project-specific version
        proj_result = await db.execute(
            select(ActivityCatalog.code)
            .where(ActivityCatalog.project_id == project_id, ActivityCatalog.is_active == True)
        )
        overridden_codes = {r for r, in proj_result.all()}
        act_result = await db.execute(
            select(ActivityCatalog)
            .where(
                ActivityCatalog.is_active == True,
                or_(
                    and_(ActivityCatalog.project_id == None, ~ActivityCatalog.code.in_(overridden_codes)),
                    ActivityCatalog.project_id == project_id,
                )
            )
            .order_by(ActivityCatalog.sort_order)
        )
    else:
        act_result = await db.execute(
            select(ActivityCatalog)
            .where(ActivityCatalog.is_active == True, ActivityCatalog.project_id == None)
            .order_by(ActivityCatalog.sort_order)
        )
    activities = act_result.scalars().all()
    return await _build_activities_response(db, activities)


@router.post("/activities", response_model=ActivityCatalogRead, status_code=201)
async def create_activity(
    body: ActivityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project_uuid = uuid.UUID(body.project_id) if body.project_id else None
    # Check uniqueness (code, project_id)
    existing = await db.execute(
        select(ActivityCatalog).where(
            ActivityCatalog.code == body.code,
            ActivityCatalog.project_id == project_uuid,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Código '{body.code}' já existe neste escopo")

    act = ActivityCatalog(
        code=body.code,
        project_id=project_uuid,
        description=body.description,
        unit=body.unit,
        category=body.category,
        sort_order=body.sort_order,
        quantity_formula=body.quantity_formula or body.code,
        productivity_per_day=body.productivity_per_day,
        fd_pct=body.fd_pct,
    )
    db.add(act)
    await db.commit()
    await db.refresh(act)
    result = await _build_activities_response(db, [act])
    return result[0]


@router.put("/activities/{activity_id}", response_model=ActivityCatalogRead)
async def update_activity(
    activity_id: uuid.UUID,
    body: ActivityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    act = await db.get(ActivityCatalog, activity_id)
    if not act:
        raise HTTPException(status_code=404, detail="Atividade não encontrada")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(act, field, value)
    await db.commit()
    await db.refresh(act)
    result = await _build_activities_response(db, [act])
    return result[0]


@router.delete("/activities/{activity_id}")
async def delete_activity(
    activity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    act = await db.get(ActivityCatalog, activity_id)
    if not act:
        raise HTTPException(status_code=404, detail="Atividade não encontrada")
    if act.project_id is None:
        raise HTTPException(status_code=403, detail="Atividades globais não podem ser excluídas")
    await db.delete(act)
    await db.commit()
    return {"ok": True}


@router.post("/activities/{activity_id}/clone", response_model=ActivityCatalogRead, status_code=201)
async def clone_activity_to_project(
    activity_id: uuid.UUID,
    project_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clone a global activity (or any activity) into a project scope."""
    source = await db.get(ActivityCatalog, activity_id)
    if not source:
        raise HTTPException(status_code=404, detail="Atividade não encontrada")

    # Remove existing project override with same code if any
    existing = await db.execute(
        select(ActivityCatalog).where(
            ActivityCatalog.code == source.code,
            ActivityCatalog.project_id == project_id,
        )
    )
    existing_act = existing.scalar_one_or_none()
    if existing_act:
        raise HTTPException(status_code=409, detail=f"Atividade '{source.code}' já clonada para este projeto")

    clone = ActivityCatalog(
        code=source.code,
        project_id=project_id,
        description=source.description,
        unit=source.unit,
        category=source.category,
        sort_order=source.sort_order,
        quantity_formula=source.quantity_formula,
        productivity_per_day=source.productivity_per_day,
        fd_pct=source.fd_pct,
        md_pct=source.md_pct,
    )
    db.add(clone)
    await db.flush()

    # Copy resource templates
    src_templates = await db.execute(
        select(ResourceTemplate).where(ResourceTemplate.activity_id == source.id)
    )
    for rt in src_templates.scalars():
        new_rt = ResourceTemplate(
            activity_id=clone.id,
            resource_type=rt.resource_type,
            labor_role_id=rt.labor_role_id,
            qty_per_team=rt.qty_per_team,
            equipment_id=rt.equipment_id,
            material_code=rt.material_code,
            material_description=rt.material_description,
            material_qty_per_unit=rt.material_qty_per_unit,
            material_unit_price=rt.material_unit_price,
            sub_code=rt.sub_code,
            subcontractor_description=rt.subcontractor_description,
            subcontractor_cost_per_unit=rt.subcontractor_cost_per_unit,
        )
        db.add(new_rt)

    await db.commit()
    await db.refresh(clone)
    result = await _build_activities_response(db, [clone])
    return result[0]


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

def _f(v) -> float:
    return float(v) if v is not None else 0.0


def _labor_to_full(r: LaborRole) -> LaborRoleFullRead:
    return LaborRoleFullRead(
        id=str(r.id), code=r.code, description=r.description,
        role_type=r.role_type, salary_type=r.salary_type,
        base_salary=_f(r.base_salary), has_overtime=bool(r.has_overtime),
        has_adic_transf=bool(r.has_adic_transf),
        has_periculosidade=bool(r.has_periculosidade),
        has_adic_produt=bool(r.has_adic_produt),
        has_aux_moradia=bool(r.has_aux_moradia),
        folga_meses=_f(r.folga_meses),
        custo_bruto_mes=_f(r.custo_bruto_mes),
        dissidio=_f(getattr(r, 'dissidio', 0)),
        adic_transf=_f(getattr(r, 'adic_transf', 0)),
        periculosidade_val=_f(getattr(r, 'periculosidade_val', 0)),
        he_50_pct=_f(r.he_50_pct), he_100_pct=_f(r.he_100_pct),
        encargos=_f(r.encargos),
        subtotal_sem_he=_f(getattr(r, 'subtotal_sem_he', 0)),
        adic_produtividade=_f(getattr(r, 'adic_produtividade', 0)),
        custo_admissao=_f(getattr(r, 'custo_admissao', 0)),
        desp_folga=_f(getattr(r, 'desp_folga', 0)),
        transporte=_f(r.transporte), alimentacao=_f(r.alimentacao),
        epi=_f(r.epi), seguro_vida=_f(r.seguro_vida),
        aux_moradia=_f(r.aux_moradia), cesta_basica=_f(r.cesta_basica),
        ppr=_f(r.ppr), assist_medica=_f(r.assist_medica),
        company_cost_monthly=_f(r.company_cost_monthly),
        company_cost_daily=_f(r.company_cost_daily),
        company_cost_hh=_f(r.company_cost_hh),
        is_active=r.is_active, version=r.version or 1,
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

    # Recalculate totals (full composition)
    total = (
        _f(role.custo_bruto_mes) + _f(getattr(role, 'dissidio', 0))
        + _f(getattr(role, 'adic_transf', 0)) + _f(getattr(role, 'periculosidade_val', 0))
        + _f(role.he_50_pct) + _f(role.he_100_pct)
        + _f(role.encargos) + _f(getattr(role, 'adic_produtividade', 0))
        + _f(role.transporte) + _f(role.alimentacao) + _f(role.epi)
        + _f(role.seguro_vida) + _f(role.aux_moradia) + _f(role.cesta_basica)
        + _f(role.ppr) + _f(role.assist_medica)
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
        locacao_sem_op_mes=_f(e.locacao_sem_op_mes),
        consumo_combustivel_dia=_f(e.consumo_combustivel_dia),
        tipo_combustivel=e.tipo_combustivel,
        preco_combustivel=_f(getattr(e, 'preco_combustivel', 0)),
        total_combustivel_mes=_f(e.total_combustivel_mes),
        lavagem_mes=_f(getattr(e, 'lavagem_mes', 0)),
        lubrificantes_mes=_f(getattr(e, 'lubrificantes_mes', 0)),
        manutencao_pct=_f(getattr(e, 'manutencao_pct', 0)),
        total_lubmaint_mes=_f(e.total_lubmaint_mes),
        mob_demob_mes=_f(e.mob_demob_mes),
        outros_mes=_f(e.outros_mes),
        company_cost_monthly=_f(e.company_cost_monthly),
        company_cost_daily=_f(e.company_cost_daily),
        company_cost_hh=_f(e.company_cost_hh),
        is_active=e.is_active, version=e.version or 1,
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

    # Recalculate combustivel if price or consumption changed
    if body.preco_combustivel is not None or body.consumo_combustivel_dia is not None:
        item.total_combustivel_mes = _f(item.consumo_combustivel_dia) * 25.0 * _f(item.preco_combustivel)
    # Recalculate lub/manut if pct changed
    if body.manutencao_pct is not None or body.locacao_sem_op_mes is not None or body.lavagem_mes is not None:
        item.total_lubmaint_mes = (
            _f(item.locacao_sem_op_mes) * _f(item.manutencao_pct)
            + _f(getattr(item, 'lubrificantes_mes', 0))
            + _f(getattr(item, 'lavagem_mes', 0))
        )
    # Recalculate totals
    total = (
        _f(item.locacao_sem_op_mes) + _f(item.total_combustivel_mes)
        + _f(item.total_lubmaint_mes) + _f(item.mob_demob_mes)
        + _f(item.outros_mes)
    )
    item.company_cost_monthly = total
    item.company_cost_daily = total / 25.0
    item.company_cost_hh = item.company_cost_daily / 8.0
    item.version = (item.version or 1) + 1
    item.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(item)
    return _equip_to_full(item)


# ── Company Base Params ───────────────────────────────────────────────────────

class BaseParamsRead(BaseModel):
    default_alimentacao: float
    default_cesta_basica: float
    default_transporte: float
    default_epi: float
    default_seguro_vida: float
    default_ppr: float
    default_assist_medica: float
    default_aux_moradia: float
    ot_50_horas_mes: float
    ot_100_horas_mes: float
    working_days_per_month: float
    preco_diesel: float
    preco_gasolina: float
    preco_alcool: float


class BaseParamsUpdate(BaseModel):
    default_alimentacao: Optional[float] = None
    default_cesta_basica: Optional[float] = None
    default_transporte: Optional[float] = None
    default_epi: Optional[float] = None
    default_seguro_vida: Optional[float] = None
    default_ppr: Optional[float] = None
    default_assist_medica: Optional[float] = None
    default_aux_moradia: Optional[float] = None
    ot_50_horas_mes: Optional[float] = None
    ot_100_horas_mes: Optional[float] = None
    working_days_per_month: Optional[float] = None
    preco_diesel: Optional[float] = None
    preco_gasolina: Optional[float] = None
    preco_alcool: Optional[float] = None


async def _get_base_params(db: AsyncSession) -> CompanyBaseParams:
    result = await db.execute(select(CompanyBaseParams).limit(1))
    params = result.scalar_one_or_none()
    if not params:
        params = CompanyBaseParams()
        db.add(params)
        await db.flush()
    return params


@router.get("/base-params", response_model=BaseParamsRead)
async def get_base_params(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = await _get_base_params(db)
    return BaseParamsRead(
        default_alimentacao=_f(p.default_alimentacao),
        default_cesta_basica=_f(p.default_cesta_basica),
        default_transporte=_f(p.default_transporte),
        default_epi=_f(p.default_epi),
        default_seguro_vida=_f(p.default_seguro_vida),
        default_ppr=_f(p.default_ppr),
        default_assist_medica=_f(p.default_assist_medica),
        default_aux_moradia=_f(p.default_aux_moradia),
        ot_50_horas_mes=_f(p.ot_50_horas_mes),
        ot_100_horas_mes=_f(p.ot_100_horas_mes),
        working_days_per_month=_f(p.working_days_per_month),
        preco_diesel=_f(p.preco_diesel),
        preco_gasolina=_f(p.preco_gasolina),
        preco_alcool=_f(p.preco_alcool),
    )


@router.put("/base-params", response_model=BaseParamsRead)
async def update_base_params(
    body: BaseParamsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = await _get_base_params(db)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(p, field, value)
    p.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(p)
    return await get_base_params(db=db, current_user=current_user)


# ── Apply base params to all labor roles ─────────────────────────────────────

class ApplyBaseParamsRequest(BaseModel):
    fields: list[str]  # field names from LaborRole to overwrite with defaults


@router.post("/labor-roles/apply-defaults")
async def apply_defaults_to_all(
    body: ApplyBaseParamsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Apply base param defaults to all labor roles for specified fields."""
    p = await _get_base_params(db)
    field_map = {
        "alimentacao": _f(p.default_alimentacao),
        "cesta_basica": _f(p.default_cesta_basica),
        "transporte": _f(p.default_transporte),
        "epi": _f(p.default_epi),
        "seguro_vida": _f(p.default_seguro_vida),
        "ppr": _f(p.default_ppr),
        "assist_medica": _f(p.default_assist_medica),
        "aux_moradia": _f(p.default_aux_moradia),
    }
    roles_result = await db.execute(select(LaborRole))
    roles = roles_result.scalars().all()
    count = 0
    for role in roles:
        for field in body.fields:
            if field in field_map:
                setattr(role, field, field_map[field])
        # recalculate totals
        total = (
            _f(role.custo_bruto_mes) + _f(getattr(role, 'dissidio', 0))
            + _f(getattr(role, 'adic_transf', 0)) + _f(getattr(role, 'periculosidade_val', 0))
            + _f(role.he_50_pct) + _f(role.he_100_pct)
            + _f(role.encargos) + _f(getattr(role, 'adic_produtividade', 0))
            + _f(role.transporte) + _f(role.alimentacao) + _f(role.epi)
            + _f(role.seguro_vida) + _f(role.aux_moradia) + _f(role.cesta_basica)
            + _f(role.ppr) + _f(role.assist_medica)
        )
        role.company_cost_monthly = total
        role.company_cost_daily = total / 25.0
        role.company_cost_hh = total / 220.0
        role.version = (role.version or 1) + 1
        count += 1
    await db.commit()
    return {"ok": True, "updated": count}


# ── Update fuel prices for all equipment ─────────────────────────────────────

class UpdateFuelPricesRequest(BaseModel):
    preco_diesel: Optional[float] = None
    preco_gasolina: Optional[float] = None
    preco_alcool: Optional[float] = None


@router.post("/equipment-items/update-fuel-prices")
async def update_fuel_prices(
    body: UpdateFuelPricesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update fuel prices in base params and recalculate all affected equipment."""
    p = await _get_base_params(db)
    price_map: dict[str, float] = {}
    if body.preco_diesel is not None:
        p.preco_diesel = body.preco_diesel
        price_map["Diesel"] = body.preco_diesel
    if body.preco_gasolina is not None:
        p.preco_gasolina = body.preco_gasolina
        price_map["Gasolina"] = body.preco_gasolina
    if body.preco_alcool is not None:
        p.preco_alcool = body.preco_alcool
        price_map["Álcool"] = body.preco_alcool

    equip_result = await db.execute(select(EquipmentItem))
    items = equip_result.scalars().all()
    count = 0
    for item in items:
        fuel = item.tipo_combustivel or ""
        new_price = None
        for fuel_name, price in price_map.items():
            if fuel_name.lower() in fuel.lower():
                new_price = price
                break
        if new_price is not None:
            item.preco_combustivel = new_price
            item.total_combustivel_mes = _f(item.consumo_combustivel_dia) * 25.0 * new_price
            item.total_lubmaint_mes = (
                _f(item.locacao_sem_op_mes) * _f(getattr(item, 'manutencao_pct', 0))
                + _f(getattr(item, 'lubrificantes_mes', 0))
                + _f(getattr(item, 'lavagem_mes', 0))
            )
            total = (
                _f(item.locacao_sem_op_mes) + _f(item.total_combustivel_mes)
                + _f(item.total_lubmaint_mes) + _f(item.mob_demob_mes)
                + _f(item.outros_mes)
            )
            item.company_cost_monthly = total
            item.company_cost_daily = total / 25.0
            item.company_cost_hh = item.company_cost_daily / 8.0
            item.version = (item.version or 1) + 1
            count += 1

    p.updated_at = datetime.utcnow()
    await db.commit()
    return {"ok": True, "updated": count}


# ── Create new labor role / equipment item ────────────────────────────────────

class LaborRoleCreate(BaseModel):
    code: str
    description: str
    role_type: str = "direct"
    salary_type: str = "H"
    base_salary: float = 0
    has_overtime: bool = False
    has_adic_transf: bool = False
    has_periculosidade: bool = False
    has_adic_produt: bool = False
    has_aux_moradia: bool = False
    folga_meses: float = 3
    custo_bruto_mes: float = 0
    dissidio: float = 0
    adic_transf: float = 0
    periculosidade_val: float = 0
    he_50_pct: float = 0
    he_100_pct: float = 0
    encargos: float = 0
    subtotal_sem_he: float = 0
    adic_produtividade: float = 0
    custo_admissao: float = 0
    desp_folga: float = 0
    transporte: float = 0
    alimentacao: float = 0
    epi: float = 0
    seguro_vida: float = 0
    aux_moradia: float = 0
    cesta_basica: float = 0
    ppr: float = 0
    assist_medica: float = 0


@router.post("/labor-roles", response_model=LaborRoleFullRead, status_code=201)
async def create_labor_role(
    body: LaborRoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check code uniqueness
    existing = await db.execute(select(LaborRole).where(LaborRole.code == body.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Código '{body.code}' já existe")

    total = (
        body.custo_bruto_mes + body.dissidio + body.adic_transf + body.periculosidade_val
        + body.he_50_pct + body.he_100_pct + body.encargos + body.adic_produtividade
        + body.transporte + body.alimentacao + body.epi + body.seguro_vida
        + body.aux_moradia + body.cesta_basica + body.ppr + body.assist_medica
    )
    role = LaborRole(
        code=body.code,
        description=body.description,
        role_type=body.role_type,
        salary_type=body.salary_type,
        base_salary=body.base_salary,
        has_overtime=body.has_overtime,
        has_adic_transf=body.has_adic_transf,
        has_periculosidade=body.has_periculosidade,
        has_adic_produt=body.has_adic_produt,
        has_aux_moradia=body.has_aux_moradia,
        folga_meses=body.folga_meses,
        custo_bruto_mes=body.custo_bruto_mes,
        dissidio=body.dissidio,
        adic_transf=body.adic_transf,
        periculosidade_val=body.periculosidade_val,
        he_50_pct=body.he_50_pct,
        he_100_pct=body.he_100_pct,
        encargos=body.encargos,
        subtotal_sem_he=body.subtotal_sem_he,
        adic_produtividade=body.adic_produtividade,
        custo_admissao=body.custo_admissao,
        desp_folga=body.desp_folga,
        transporte=body.transporte,
        alimentacao=body.alimentacao,
        epi=body.epi,
        seguro_vida=body.seguro_vida,
        aux_moradia=body.aux_moradia,
        cesta_basica=body.cesta_basica,
        ppr=body.ppr,
        assist_medica=body.assist_medica,
        company_cost_monthly=total,
        company_cost_daily=total / 25.0,
        company_cost_hh=total / 220.0,
    )
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return _labor_to_full(role)


class EquipmentItemCreate(BaseModel):
    code: str
    description: str
    locacao_sem_op_mes: float = 0
    consumo_combustivel_dia: float = 0
    tipo_combustivel: Optional[str] = None
    preco_combustivel: float = 0
    lubrificantes_mes: float = 0
    manutencao_pct: float = 0
    lavagem_mes: float = 0
    mob_demob_mes: float = 0
    outros_mes: float = 0


@router.post("/equipment-items", response_model=EquipmentItemFullRead, status_code=201)
async def create_equipment_item(
    body: EquipmentItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(select(EquipmentItem).where(EquipmentItem.code == body.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Código '{body.code}' já existe")

    combustivel = body.consumo_combustivel_dia * 25.0 * body.preco_combustivel
    lub = body.locacao_sem_op_mes * body.manutencao_pct + body.lubrificantes_mes + body.lavagem_mes
    total = body.locacao_sem_op_mes + combustivel + lub + body.mob_demob_mes + body.outros_mes
    item = EquipmentItem(
        code=body.code,
        description=body.description,
        locacao_sem_op_mes=body.locacao_sem_op_mes,
        consumo_combustivel_dia=body.consumo_combustivel_dia,
        tipo_combustivel=body.tipo_combustivel,
        preco_combustivel=body.preco_combustivel,
        total_combustivel_mes=combustivel,
        lubrificantes_mes=body.lubrificantes_mes,
        manutencao_pct=body.manutencao_pct,
        lavagem_mes=body.lavagem_mes,
        total_lubmaint_mes=lub,
        mob_demob_mes=body.mob_demob_mes,
        outros_mes=body.outros_mes,
        company_cost_monthly=total,
        company_cost_daily=total / 25.0,
        company_cost_hh=total / (25.0 * 8.0),
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return _equip_to_full(item)


# ── Import labor roles from XLSX/CSV ─────────────────────────────────────────

@router.post("/labor-roles/import")
async def import_labor_roles(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Import labor roles from XLSX (upsert by code)."""
    import openpyxl
    content = await file.read()
    wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return {"inserted": 0, "updated": 0, "errors": ["Arquivo vazio"]}

    headers = [str(h).strip().lower() if h else "" for h in rows[0]]

    def col(row, name: str, default=0):
        try:
            idx = headers.index(name)
            v = row[idx]
            if v is None:
                return default
            if isinstance(v, str):
                v = v.replace(",", ".").strip()
                return type(default)(v) if v else default
            return type(default)(v)
        except (ValueError, IndexError):
            return default

    inserted = 0
    updated = 0
    errors: list[str] = []

    for i, row in enumerate(rows[1:], start=2):
        code = col(row, "code", "")
        if not code:
            continue
        description = col(row, "description", f"Função {code}")
        try:
            existing = await db.execute(select(LaborRole).where(LaborRole.code == code))
            role = existing.scalar_one_or_none()
            if role:
                # update
                role.description = description
                for field in ["base_salary", "custo_bruto_mes", "dissidio", "adic_transf",
                              "periculosidade_val", "he_50_pct", "he_100_pct", "encargos",
                              "subtotal_sem_he", "adic_produtividade", "custo_admissao",
                              "desp_folga", "transporte", "alimentacao", "epi",
                              "seguro_vida", "aux_moradia", "cesta_basica", "ppr", "assist_medica"]:
                    setattr(role, field, col(row, field))
                # recalculate
                total = (
                    _f(role.custo_bruto_mes) + _f(getattr(role, 'dissidio', 0))
                    + _f(getattr(role, 'adic_transf', 0)) + _f(getattr(role, 'periculosidade_val', 0))
                    + _f(role.he_50_pct) + _f(role.he_100_pct)
                    + _f(role.encargos) + _f(getattr(role, 'adic_produtividade', 0))
                    + _f(role.transporte) + _f(role.alimentacao) + _f(role.epi)
                    + _f(role.seguro_vida) + _f(role.aux_moradia) + _f(role.cesta_basica)
                    + _f(role.ppr) + _f(role.assist_medica)
                )
                role.company_cost_monthly = total
                role.company_cost_daily = total / 25.0
                role.company_cost_hh = total / 220.0
                role.version = (role.version or 1) + 1
                updated += 1
            else:
                custo_bruto = col(row, "custo_bruto_mes")
                new_role = LaborRole(
                    code=code,
                    description=description,
                    role_type=col(row, "role_type", "direct"),
                    salary_type=col(row, "salary_type", "H"),
                    base_salary=col(row, "base_salary"),
                    custo_bruto_mes=custo_bruto,
                    dissidio=col(row, "dissidio"),
                    adic_transf=col(row, "adic_transf"),
                    periculosidade_val=col(row, "periculosidade_val"),
                    he_50_pct=col(row, "he_50_pct"),
                    he_100_pct=col(row, "he_100_pct"),
                    encargos=col(row, "encargos"),
                    subtotal_sem_he=col(row, "subtotal_sem_he"),
                    adic_produtividade=col(row, "adic_produtividade"),
                    custo_admissao=col(row, "custo_admissao"),
                    desp_folga=col(row, "desp_folga"),
                    transporte=col(row, "transporte"),
                    alimentacao=col(row, "alimentacao"),
                    epi=col(row, "epi"),
                    seguro_vida=col(row, "seguro_vida"),
                    aux_moradia=col(row, "aux_moradia"),
                    cesta_basica=col(row, "cesta_basica"),
                    ppr=col(row, "ppr"),
                    assist_medica=col(row, "assist_medica"),
                )
                total = (
                    custo_bruto + new_role.dissidio + new_role.adic_transf + new_role.periculosidade_val
                    + new_role.he_50_pct + new_role.he_100_pct + new_role.encargos
                    + new_role.adic_produtividade + new_role.transporte + new_role.alimentacao
                    + new_role.epi + new_role.seguro_vida + new_role.aux_moradia
                    + new_role.cesta_basica + new_role.ppr + new_role.assist_medica
                )
                new_role.company_cost_monthly = total
                new_role.company_cost_daily = total / 25.0
                new_role.company_cost_hh = total / 220.0
                db.add(new_role)
                inserted += 1
        except Exception as exc:
            errors.append(f"Linha {i}: {exc}")

    await db.commit()
    return {"inserted": inserted, "updated": updated, "errors": errors}
