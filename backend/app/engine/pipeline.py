"""
BudgetPipeline: stateless orchestrator.
Runs quantity → duration → CPU → summary in sequence.
Idempotent: same inputs always produce same outputs.
"""
from __future__ import annotations

from collections import defaultdict

from app.engine.types import (
    ProjectInputs, ActivityData, LaborRoleData, EquipmentItemData,
    ActivityResult, CategorySummary, BudgetResult,
)
from app.engine.quantity_engine import QuantityEngine
from app.engine.cpu_engine import CPUEngine
from app.engine.indirect_engine import compute_indirect_costs

CATEGORY_SORT = {
    "Serviços Preliminares": 1,
    "Obras Civis": 2,
    "Aterramento": 3,
    "Montagem de Estruturas": 4,
    "Lançamento de Cabos": 5,
    "Serviços Finais": 6,
    "Outros": 7,
}


class BudgetPipeline:
    def __init__(self):
        self._qty_engine = QuantityEngine()

    def run(
        self,
        inputs: ProjectInputs,
        activities: list[ActivityData],
        labor_roles: dict[str, LaborRoleData],   # code -> data
        equipment: dict[str, EquipmentItemData],  # code -> data
    ) -> BudgetResult:
        cpu_engine = CPUEngine(labor_roles, equipment)
        activity_results: list[ActivityResult] = []

        for activity in activities:
            if not activity.description:
                continue

            # Step 1: Resolve quantity
            quantity = self._qty_engine.resolve(activity.quantity_formula, inputs)

            # Step 2: Determine teams (per activity code, fallback 1)
            teams = inputs.teams_by_activity.get(activity.code, 1)

            # Step 2b: Apply productivity factor (fator de ajuste)
            factor = inputs.productivity_factors.get(activity.code, 1.0)
            if factor != 1.0 and factor > 0:
                from copy import copy as _copy
                activity = _copy(activity)
                activity.productivity_per_day = activity.productivity_per_day * factor

            # Step 3: Compute duration
            duration_months = self._compute_duration(activity, quantity, teams, inputs)

            # Step 4: CPU cost composition
            mo, vem, mat, sub, fd = cpu_engine.compute(
                activity, quantity, teams, duration_months, inputs
            )
            unit_cost = mo + vem + mat + sub + fd
            total_cost = unit_cost * quantity

            # Step 5: Manhours = sum of (role_qty × working_days × hours_per_day) × teams
            manhours = self._compute_manhours(activity, quantity, teams, duration_months, inputs)

            # Step 6: Start month from schedule
            start_month = inputs.start_month_by_category.get(activity.category)

            activity_results.append(ActivityResult(
                activity_id=activity.id,
                activity_code=activity.code,
                activity_description=activity.description,
                category=activity.category,
                unit=activity.unit,
                quantity=quantity,
                teams=teams,
                duration_months=duration_months,
                start_month=start_month,
                mo_cost_per_unit=mo,
                vem_cost_per_unit=vem,
                mat_cost_per_unit=mat,
                sub_cost_per_unit=sub,
                fd_cost_per_unit=fd,
                unit_cost=unit_cost,
                total_cost=total_cost,
                manhours=manhours,
            ))

        # Aggregate by category
        category_summaries = self._aggregate(activity_results)

        total_direct_cost = sum(r.total_cost for r in activity_results)
        total_manhours = sum(r.manhours for r in activity_results)
        line_km = inputs.line_length_km or 1
        towers = inputs.total_towers or 1

        # Indirect costs (aba C.I. da planilha)
        indirect_result = compute_indirect_costs(
            config=inputs.indirect,
            total_months=inputs.total_duration_months,
            labor_roles=labor_roles,
            equipment=equipment,
        )
        if indirect_result.total_cost > 0:
            category_summaries.append(CategorySummary(
                category="Custos Indiretos",
                total_cost=indirect_result.total_cost,
                mo_cost=indirect_result.mo_cost,
                vem_cost=indirect_result.vem_cost,
                mat_cost=indirect_result.other_cost,
                sub_cost=0.0,
                fd_cost=0.0,
                manhours=indirect_result.manhours,
            ))
        total_indirect_cost = indirect_result.total_cost
        total_cost = total_direct_cost + total_indirect_cost
        total_manhours += indirect_result.manhours

        return BudgetResult(
            activity_results=activity_results,
            category_summaries=category_summaries,
            total_direct_cost=total_direct_cost,
            total_indirect_cost=total_indirect_cost,
            total_cost=total_cost,
            total_manhours=total_manhours,
            cost_per_km=total_cost / line_km,
            cost_per_tower=total_cost / towers,
            indirect_result=indirect_result,
        )

    def _compute_duration(
        self,
        activity: ActivityData,
        quantity: float,
        teams: int,
        inputs: ProjectInputs,
    ) -> float:
        """
        duration_months = quantity / (teams × working_days_per_month × productivity_per_day)
        """
        if quantity <= 0 or teams <= 0 or activity.productivity_per_day <= 0:
            return 0.0
        daily_output = teams * inputs.salary.working_days_per_month * activity.productivity_per_day
        return quantity / daily_output

    def _compute_manhours(
        self,
        activity: ActivityData,
        quantity: float,
        teams: int,
        duration_months: float,
        inputs: ProjectInputs,
    ) -> float:
        if quantity <= 0 or duration_months <= 0:
            return 0.0
        total_people = sum(
            r.qty_per_team * teams
            for r in activity.resources
            if r.resource_type == "MO"
        )
        working_days = duration_months * inputs.salary.working_days_per_month
        hours_per_day = inputs.salary.hours_per_month / inputs.salary.working_days_per_month
        return total_people * working_days * hours_per_day

    def _aggregate(self, results: list[ActivityResult]) -> list[CategorySummary]:
        buckets: dict[str, dict] = defaultdict(lambda: {
            "total_cost": 0.0, "mo_cost": 0.0, "vem_cost": 0.0,
            "mat_cost": 0.0, "sub_cost": 0.0, "fd_cost": 0.0, "manhours": 0.0
        })
        for r in results:
            b = buckets[r.category]
            b["total_cost"] += r.total_cost
            b["mo_cost"] += r.mo_cost_per_unit * r.quantity
            b["vem_cost"] += r.vem_cost_per_unit * r.quantity
            b["mat_cost"] += r.mat_cost_per_unit * r.quantity
            b["sub_cost"] += r.sub_cost_per_unit * r.quantity
            b["fd_cost"] += r.fd_cost_per_unit * r.quantity
            b["manhours"] += r.manhours

        summaries = [
            CategorySummary(category=cat, **data)
            for cat, data in buckets.items()
        ]
        summaries.sort(key=lambda s: CATEGORY_SORT.get(s.category, 99))
        return summaries
