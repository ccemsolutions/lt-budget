from __future__ import annotations
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.tenant import User
from app.models.project import Project, ProjectInputs, Budget
from app.schemas.project import (
    ProjectCreate, ProjectRead, ProjectInputsWrite, ProjectInputsRead,
    BudgetCreate, BudgetRead,
)
from app.api.deps import get_current_user
from app.services.schedule_service import compute_schedule_preview
from pydantic import BaseModel as _BaseModel

router = APIRouter()


class SchedulePreviewRequest(_BaseModel):
    teams_by_activity: dict[str, int] = {}
    productivity_factors: dict[str, float] = {}


class ActivityScheduleRead(_BaseModel):
    code: str
    description: str
    category: str
    unit: str
    quantity: float
    duration_months: float
    start_month: int


@router.get("", response_model=list[ProjectRead])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project)
        .where(Project.company_id == current_user.company_id)
        .order_by(Project.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=ProjectRead, status_code=201)
async def create_project(
    payload: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = Project(
        company_id=current_user.company_id,
        created_by=current_user.id,
        name=payload.name,
        description=payload.description,
        voltage_kv=payload.voltage_kv,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _get_project_or_404(db, project_id, current_user)
    return project


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _get_project_or_404(db, project_id, current_user)
    await db.delete(project)
    await db.commit()


@router.get("/{project_id}/inputs", response_model=ProjectInputsRead)
async def get_inputs(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_project_or_404(db, project_id, current_user)
    result = await db.execute(select(ProjectInputs).where(ProjectInputs.project_id == project_id))
    inputs = result.scalar_one_or_none()
    if not inputs:
        raise HTTPException(status_code=404, detail="Entradas não encontradas. Salve as entradas primeiro.")
    return inputs


@router.put("/{project_id}/inputs", response_model=ProjectInputsRead)
async def upsert_inputs(
    project_id: uuid.UUID,
    payload: ProjectInputsWrite,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _get_project_or_404(db, project_id, current_user)

    result = await db.execute(select(ProjectInputs).where(ProjectInputs.project_id == project_id))
    inputs = result.scalar_one_or_none()

    data = {
        "line_length_km": payload.line_length_km,
        "circuit_type": payload.circuit_type,
        "total_towers": payload.total_towers,
        "state": payload.state or "",
        "engineering": payload.engineering.model_dump(),
        "terrain": payload.terrain.model_dump(),
        "vegetation": payload.vegetation.model_dump(),
        "access_roads": payload.access_roads.model_dump(),
        "crossings": payload.crossings.model_dump(),
        "schedule": payload.schedule.model_dump(),
        "salary_params": payload.salary_params.model_dump(exclude_none=True),
        "indirect_config": payload.indirect_config.model_dump(),
        "financial_params": payload.financial_params.model_dump(),
        "materials_supply": payload.materials_supply.model_dump(),
        "subcontractors": payload.subcontractors.model_dump(),
    }

    if inputs:
        for k, v in data.items():
            setattr(inputs, k, v)
        inputs.updated_at = datetime.utcnow()
    else:
        inputs = ProjectInputs(project_id=project_id, **data)
        db.add(inputs)

    project.status = "draft"
    await db.commit()
    await db.refresh(inputs)
    return inputs


@router.get("/{project_id}/budgets", response_model=list[BudgetRead])
async def list_budgets(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_project_or_404(db, project_id, current_user)
    result = await db.execute(
        select(Budget).where(Budget.project_id == project_id).order_by(Budget.version.desc())
    )
    return result.scalars().all()


@router.post("/{project_id}/budgets", response_model=BudgetRead, status_code=202)
async def trigger_budget(
    project_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    payload: BudgetCreate = BudgetCreate(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _get_project_or_404(db, project_id, current_user)

    # Get inputs
    result = await db.execute(select(ProjectInputs).where(ProjectInputs.project_id == project_id))
    inputs_model = result.scalar_one_or_none()
    if not inputs_model:
        raise HTTPException(status_code=400, detail="Salve as entradas do projeto antes de calcular")

    # Determine next version
    count_result = await db.execute(
        select(func.count()).where(Budget.project_id == project_id)
    )
    version = (count_result.scalar() or 0) + 1

    # Build inputs snapshot
    inputs_snapshot = {
        "line_length_km": float(inputs_model.line_length_km),
        "circuit_type": inputs_model.circuit_type,
        "total_towers": inputs_model.total_towers,
        "engineering": inputs_model.engineering,
        "terrain": inputs_model.terrain,
        "vegetation": inputs_model.vegetation,
        "access_roads": inputs_model.access_roads,
        "schedule": inputs_model.schedule,
        "salary_params": inputs_model.salary_params,
        "indirect_config": inputs_model.indirect_config or {},
        "financial_params": inputs_model.financial_params or {},
        "crossings": inputs_model.crossings or {},
        "materials_supply": inputs_model.materials_supply or {},
        "subcontractors": inputs_model.subcontractors or {},
    }

    label = payload.label or f"R{version - 1}"
    budget = Budget(
        project_id=project_id,
        created_by=current_user.id,
        version=version,
        label=label,
        status="calculating",
        inputs_snapshot=inputs_snapshot,
    )
    db.add(budget)
    await db.commit()
    await db.refresh(budget)

    # Trigger async calculation
    from app.services.budget_service import run_budget_calculation
    background_tasks.add_task(run_budget_calculation, budget.id)

    return budget


@router.post("/{project_id}/schedule-preview", response_model=list[ActivityScheduleRead])
async def schedule_preview(
    project_id: uuid.UUID,
    body: SchedulePreviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_project_or_404(db, project_id, current_user)
    items = await compute_schedule_preview(
        project_id=project_id,
        teams_by_activity=body.teams_by_activity,
        productivity_factors=body.productivity_factors,
        db=db,
    )
    return [
        ActivityScheduleRead(
            code=i.code, description=i.description, category=i.category,
            unit=i.unit, quantity=i.quantity, duration_months=i.duration_months,
            start_month=i.start_month,
        )
        for i in items
    ]


async def _get_project_or_404(db: AsyncSession, project_id: uuid.UUID, user: User) -> Project:
    project = await db.get(Project, project_id)
    if not project or project.company_id != user.company_id:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return project
