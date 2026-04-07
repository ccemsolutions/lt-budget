from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.tenant import User
from app.models.project import Budget, BudgetActivity, BudgetSummary
from app.models.static_data import ActivityCatalog
from app.schemas.project import BudgetRead, BudgetActivityRead, BudgetSummaryRead
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/{budget_id}", response_model=BudgetRead)
async def get_budget(
    budget_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = await _get_budget_or_404(db, budget_id, current_user)
    return budget


@router.get("/{budget_id}/summary", response_model=list[BudgetSummaryRead])
async def get_budget_summary(
    budget_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = await _get_budget_or_404(db, budget_id, current_user)
    if budget.status != "ready":
        raise HTTPException(status_code=400, detail=f"Orçamento ainda não calculado (status: {budget.status})")

    result = await db.execute(
        select(BudgetSummary).where(BudgetSummary.budget_id == budget_id)
    )
    summaries = result.scalars().all()

    total = sum(s.total_cost for s in summaries) or 1
    return [
        BudgetSummaryRead(
            category=s.category,
            total_cost=float(s.total_cost),
            mo_cost=float(s.mo_cost),
            vem_cost=float(s.vem_cost),
            mat_cost=float(s.mat_cost),
            sub_cost=float(s.sub_cost),
            fd_cost=float(s.fd_cost),
            manhours=float(s.manhours),
            pct_of_total=round(float(s.total_cost) / float(total) * 100, 2),
        )
        for s in summaries
    ]


@router.get("/{budget_id}/activities", response_model=list[BudgetActivityRead])
async def get_budget_activities(
    budget_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = await _get_budget_or_404(db, budget_id, current_user)
    if budget.status != "ready":
        raise HTTPException(status_code=400, detail=f"Orçamento ainda não calculado (status: {budget.status})")

    result = await db.execute(
        select(BudgetActivity, ActivityCatalog)
        .join(ActivityCatalog, BudgetActivity.activity_id == ActivityCatalog.id)
        .where(BudgetActivity.budget_id == budget_id)
        .order_by(ActivityCatalog.sort_order)
    )
    rows = result.all()

    return [
        BudgetActivityRead(
            id=ba.id,
            activity_code=ac.code,
            activity_description=ac.description,
            category=ac.category,
            unit=ac.unit,
            quantity=float(ba.quantity),
            teams=ba.teams,
            duration_months=float(ba.duration_months),
            mo_cost_per_unit=float(ba.mo_cost_per_unit),
            vem_cost_per_unit=float(ba.vem_cost_per_unit),
            mat_cost_per_unit=float(ba.mat_cost_per_unit),
            sub_cost_per_unit=float(ba.sub_cost_per_unit),
            fd_cost_per_unit=float(ba.fd_cost_per_unit),
            unit_cost=float(ba.unit_cost),
            total_cost=float(ba.total_cost),
            manhours=float(ba.manhours),
        )
        for ba, ac in rows
    ]


async def _get_budget_or_404(db: AsyncSession, budget_id: uuid.UUID, user: User) -> Budget:
    from app.models.project import Project
    budget = await db.get(Budget, budget_id)
    if not budget:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    project = await db.get(Project, budget.project_id)
    if not project or project.company_id != user.company_id:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    return budget
