"""
Financial service: computes the full financial analysis (FIN sheet equivalent)
from saved budget data.
"""
from __future__ import annotations

import math
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Budget, BudgetActivity
from app.models.static_data import ActivityCatalog
from app.schemas.financial import FinancialResultRead, MonthlyCashFlowRead
from app.engine.financial_engine import (
    FinancialParams, MaterialItemData, compute_financial,
)


async def compute_financial_result(
    budget_id: uuid.UUID,
    db: AsyncSession,
) -> FinancialResultRead:
    budget = await db.get(Budget, budget_id)
    if not budget:
        raise ValueError("Budget not found")

    snapshot = budget.inputs_snapshot
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

    # Load activity timelines
    act_result = await db.execute(
        select(BudgetActivity, ActivityCatalog)
        .join(ActivityCatalog, BudgetActivity.activity_id == ActivityCatalog.id)
        .where(BudgetActivity.budget_id == budget_id)
    )
    pairs = act_result.all()

    # Determine total months
    total_months = snapshot.get("schedule", {}).get("total_duration_months", 24)
    for ba, _ in pairs:
        if ba.start_month and ba.duration_months:
            end = int(math.ceil(ba.start_month + float(ba.duration_months)))
            total_months = max(total_months, end)
    total_months = max(total_months, 1)

    # Build monthly service disbursement
    monthly_svc: dict[int, float] = {m: 0.0 for m in range(1, total_months + 1)}
    for ba, _ in pairs:
        if not ba.start_month or float(ba.duration_months or 0) <= 0:
            continue
        start = int(ba.start_month)
        dur = float(ba.duration_months)
        end = start + dur
        monthly_val = float(ba.total_cost or 0) / dur
        for m in range(1, total_months + 1):
            if m < start or m > math.ceil(end):
                continue
            overlap_start = max(m - 1, start - 1)
            overlap_end = min(m, end)
            fraction = max(0.0, overlap_end - overlap_start)
            monthly_svc[m] += monthly_val * fraction

    # Add indirect costs evenly distributed
    total_services_cost = float(budget.total_cost or budget.total_direct_cost or 0)
    total_direct = float(budget.total_direct_cost or 0)
    total_indirect = float(budget.total_indirect_cost or 0)
    if total_indirect > 0:
        per_month_indirect = total_indirect / total_months
        for m in range(1, total_months + 1):
            monthly_svc[m] += per_month_indirect

    result = compute_financial(
        params=fin_params,
        total_services_cost=total_services_cost,
        total_months=total_months,
        monthly_service_disbursement=monthly_svc,
    )

    return FinancialResultRead(
        total_services_cost=result.total_services_cost,
        total_materials_cost=result.total_materials_cost,
        total_project_cost=result.total_project_cost,
        selling_price=result.selling_price,
        gross_margin_value=result.gross_margin_value,
        gross_margin_pct=result.gross_margin_pct,
        margin_services_pct=fin_params.margin_services_pct,
        margin_materials_pct=fin_params.margin_materials_pct,
        advance_pct=fin_params.advance_pct,
        retention_pct=fin_params.retention_pct,
        max_exposure=result.max_exposure,
        max_exposure_month=result.max_exposure_month,
        monthly_cash_flow=[
            MonthlyCashFlowRead(**{k: v for k, v in e.__dict__.items()})
            for e in result.monthly_cash_flow
        ],
    )
