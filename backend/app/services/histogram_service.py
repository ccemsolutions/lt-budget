"""
Histogram computation service.

Generates workforce, equipment, physical-progress, and financial-curve data
from existing BudgetActivity records + ResourceTemplate reference data.

Logic mirrors the H / H3 / CF / FIN sheets of the PRICE spreadsheet:
  H3  → workforce_by_phase  (workers per work category per month)
  H   → workforce_by_role   (workers grouped by labor function)
  H   → equipment_by_type   (equipment grouped by type)
  CF  → physical_progress   (Curva S – physical % per month)
  FIN → financial_curve     (costs per month + cumulative)
"""
from __future__ import annotations

import math
import uuid
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.project import Budget, BudgetActivity
from app.models.static_data import ActivityCatalog, ResourceTemplate, LaborRole, EquipmentItem
from app.schemas.histogram import (
    HistogramData,
    WorkforceMonthEntry,
    WorkforceByRoleEntry,
    EquipmentMonthEntry,
    PhysicalProgressEntry,
    FinancialCurveEntry,
)

# ─── Category mapping helpers ─────────────────────────────────────────────────

PHASE_FIELD_MAP: dict[str, str] = {
    "Serviços Preliminares": "preliminares",
    "Obras Civis": "civis",
    "Aterramento": "aterramento",
    "Montagem de Estruturas": "montagem",
    "Lançamento de Cabos": "lancamento",
    "Serviços Finais": "finais",
    "Outros": "outros",
}


def _labor_group(role_type: str, description: str) -> str:
    """Map a labor role to its histogram group."""
    if role_type == "indirect":
        return "indiretos"
    d = description.lower()
    if "ajudante" in d:
        return "ajudantes"
    if any(x in d for x in ("mont", "montad")):
        return "montadores"
    if any(x in d for x in ("enc ", "encarr", "enc.")):
        return "encarregados"
    if "motor" in d:
        return "motoristas"
    if any(x in d for x in ("oper ", "operador", "operad")):
        return "operadores"
    if any(x in d for x in ("topograf", "nivel", "aux. top")):
        return "topografos"
    return "outros_diretos"


def _equipment_group(description: str) -> str:
    """Map an equipment item to its histogram group."""
    d = description.lower()
    if any(x in d for x in ("caminhonete", "jeep", "ambulân", "van", "kombi", "utilitár", "jeepão")):
        return "veiculos_leves"
    if any(x in d for x in ("caminhão", "caminhao", "carreta", "prancha", "truck", "toco")):
        return "caminhoes"
    if any(x in d for x in ("guindaste", "munck")):
        return "guindastes_munck"
    if any(x in d for x in ("retro", "escavad", "trator", "pá carr", "pa carr", "moto niv")):
        return "maquinas_terra"
    if any(x in d for x in ("lançamento", "lancamento", "conjunto lanç", "conjunto lanc")):
        return "equip_lancamento"
    if any(x in d for x in ("perfurat", "compressor", "drill", "rockd", "britad")):
        return "perfuracao"
    return "outros"


# ─── Main computation ──────────────────────────────────────────────────────────

async def compute_histograms(budget_id: uuid.UUID, db: AsyncSession) -> HistogramData:
    # 1. Load budget
    budget = await db.get(Budget, budget_id)
    if not budget:
        raise ValueError("Budget not found")

    # 2. Load budget activities with their catalog
    act_result = await db.execute(
        select(BudgetActivity, ActivityCatalog)
        .join(ActivityCatalog, BudgetActivity.activity_id == ActivityCatalog.id)
        .where(BudgetActivity.budget_id == budget_id)
        .order_by(ActivityCatalog.sort_order)
    )
    activity_pairs: list[tuple[BudgetActivity, ActivityCatalog]] = act_result.all()

    if not activity_pairs:
        return _empty_histogram()

    # 3. Determine total months from schedule
    total_months = 0
    for ba, _ in activity_pairs:
        if ba.start_month and ba.duration_months:
            end = int(math.ceil(ba.start_month + float(ba.duration_months)))
            total_months = max(total_months, end)
    if total_months <= 0:
        total_months = int(budget.inputs_snapshot.get("total_duration_months", 24))
    total_months = max(total_months, 1)

    # 4. Load resource templates for ALL activities (eager-load roles/equipment)
    activity_ids = [ba.activity_id for ba, _ in activity_pairs]
    tpl_result = await db.execute(
        select(ResourceTemplate)
        .where(ResourceTemplate.activity_id.in_(activity_ids))
        .options(
            joinedload(ResourceTemplate.labor_role),
            joinedload(ResourceTemplate.equipment_item),
        )
    )
    all_templates = tpl_result.unique().scalars().all()

    # Index templates by activity_id
    templates_by_activity: dict[uuid.UUID, list[ResourceTemplate]] = defaultdict(list)
    for t in all_templates:
        templates_by_activity[t.activity_id].append(t)

    # 5. Compute total budget cost (for physical progress weights)
    total_cost = float(budget.total_direct_cost or 1)

    # ─── Per-month accumulators ──────────────────────────────────────────────
    # workforce_by_phase[month] = {field: count}
    wp: dict[int, dict[str, float]] = {m: defaultdict(float) for m in range(1, total_months + 1)}
    # workforce_by_role[month] = {group: count}
    wr: dict[int, dict[str, float]] = {m: defaultdict(float) for m in range(1, total_months + 1)}
    # equipment_by_type[month] = {group: count}
    et: dict[int, dict[str, float]] = {m: defaultdict(float) for m in range(1, total_months + 1)}
    # physical progress [month] = {phase_field: pct_contribution}
    pp: dict[int, dict[str, float]] = {m: defaultdict(float) for m in range(1, total_months + 1)}
    # financial curve [month] = {mo, vem, mat, sub, fd}
    fc: dict[int, dict[str, float]] = {m: defaultdict(float) for m in range(1, total_months + 1)}

    for ba, ac in activity_pairs:
        if not ba.start_month or not ba.duration_months:
            continue

        start = int(ba.start_month)
        dur = float(ba.duration_months)
        end = start + dur  # fractional end month

        phase_field = PHASE_FIELD_MAP.get(ac.category, "outros")
        teams = int(ba.teams or 1)
        act_cost = float(ba.total_cost or 0)

        # Weight for physical progress (% of total)
        weight_pct = (act_cost / total_cost * 100) if total_cost else 0
        # Monthly physical progress contribution (linear)
        monthly_pct = weight_pct / dur if dur > 0 else 0

        # Monthly cost contribution (linear)
        monthly_cost = act_cost / dur if dur > 0 else 0

        templates = templates_by_activity.get(ba.activity_id, [])

        # Sum workers per team for MO resources
        workers_per_team_by_group: dict[str, float] = defaultdict(float)
        for tpl in templates:
            if tpl.resource_type == "MO" and tpl.labor_role:
                role = tpl.labor_role
                group = _labor_group(role.role_type, role.description)
                workers_per_team_by_group[group] += float(tpl.qty_per_team or 0)

        # Sum equipment per team for VEM resources
        equip_per_team_by_group: dict[str, float] = defaultdict(float)
        for tpl in templates:
            if tpl.resource_type == "VEM" and tpl.equipment_item:
                eq = tpl.equipment_item
                group = _equipment_group(eq.description)
                equip_per_team_by_group[group] += float(tpl.qty_per_team or 0)

        # Distribute across active months (integer months that overlap this activity)
        for m in range(1, total_months + 1):
            # Activity is active in month m if:  start <= m <= ceil(end)  AND overlap > 0
            if m < start or m > math.ceil(end):
                continue
            # Fraction of month actually active (handles partial first/last months)
            overlap_start = max(m - 1, start - 1)  # 0-indexed start of month
            overlap_end = min(m, end)               # 0-indexed end of month
            fraction = max(0.0, overlap_end - overlap_start)  # 0..1

            if fraction <= 0:
                continue

            # Workers (per team × teams)
            for grp, qty in workers_per_team_by_group.items():
                count = qty * teams
                wp[m][phase_field] += count
                wr[m][grp] += count

            # Equipment
            for grp, qty in equip_per_team_by_group.items():
                et[m][grp] += qty * teams

            # Physical progress (proportional to fraction of month active)
            pp[m][phase_field] += monthly_pct * fraction
            pp[m]["monthly_total"] += monthly_pct * fraction

            # Financial (proportional)
            fc[m]["monthly_mo"] += float(ba.mo_cost_per_unit or 0) * float(ba.quantity or 0) / dur * fraction
            fc[m]["monthly_vem"] += float(ba.vem_cost_per_unit or 0) * float(ba.quantity or 0) / dur * fraction
            fc[m]["monthly_mat"] += float(ba.mat_cost_per_unit or 0) * float(ba.quantity or 0) / dur * fraction
            fc[m]["monthly_sub"] += float(ba.sub_cost_per_unit or 0) * float(ba.quantity or 0) / dur * fraction
            fc[m]["monthly_fd"] += float(ba.fd_cost_per_unit or 0) * float(ba.quantity or 0) / dur * fraction
            fc[m]["monthly_total"] += monthly_cost * fraction

    # ─── Build response objects ──────────────────────────────────────────────
    workforce_by_phase: list[WorkforceMonthEntry] = []
    workforce_by_role: list[WorkforceByRoleEntry] = []
    equipment_by_type: list[EquipmentMonthEntry] = []
    physical_progress: list[PhysicalProgressEntry] = []
    financial_curve: list[FinancialCurveEntry] = []

    cumulative_pct = 0.0
    cumulative_cost = 0.0

    peak_wf = 0.0
    peak_wf_month = 1
    peak_eq = 0.0
    peak_eq_month = 1

    for m in range(1, total_months + 1):
        # Workforce by phase
        d = wp[m]
        total_wf = sum(
            d[f] for f in ("preliminares", "civis", "aterramento", "montagem", "lancamento", "finais", "outros", "indireto")
        )
        entry_wp = WorkforceMonthEntry(
            month=m,
            indireto=round(d.get("indireto", 0), 1),
            preliminares=round(d.get("preliminares", 0), 1),
            civis=round(d.get("civis", 0), 1),
            aterramento=round(d.get("aterramento", 0), 1),
            montagem=round(d.get("montagem", 0), 1),
            lancamento=round(d.get("lancamento", 0), 1),
            finais=round(d.get("finais", 0), 1),
            outros=round(d.get("outros", 0), 1),
            total=round(total_wf, 1),
        )
        workforce_by_phase.append(entry_wp)
        if total_wf > peak_wf:
            peak_wf = total_wf
            peak_wf_month = m

        # Workforce by role
        r = wr[m]
        total_wr = sum(r.values())
        workforce_by_role.append(WorkforceByRoleEntry(
            month=m,
            ajudantes=round(r.get("ajudantes", 0), 1),
            montadores=round(r.get("montadores", 0), 1),
            encarregados=round(r.get("encarregados", 0), 1),
            motoristas=round(r.get("motoristas", 0), 1),
            operadores=round(r.get("operadores", 0), 1),
            topografos=round(r.get("topografos", 0), 1),
            outros_diretos=round(r.get("outros_diretos", 0), 1),
            indiretos=round(r.get("indiretos", 0), 1),
            total=round(total_wr, 1),
        ))

        # Equipment
        e = et[m]
        total_eq = sum(e.values())
        equipment_by_type.append(EquipmentMonthEntry(
            month=m,
            veiculos_leves=round(e.get("veiculos_leves", 0), 1),
            caminhoes=round(e.get("caminhoes", 0), 1),
            guindastes_munck=round(e.get("guindastes_munck", 0), 1),
            maquinas_terra=round(e.get("maquinas_terra", 0), 1),
            equip_lancamento=round(e.get("equip_lancamento", 0), 1),
            perfuracao=round(e.get("perfuracao", 0), 1),
            outros=round(e.get("outros", 0), 1),
            total=round(total_eq, 1),
        ))
        if total_eq > peak_eq:
            peak_eq = total_eq
            peak_eq_month = m

        # Physical progress
        p = pp[m]
        monthly_t = p.get("monthly_total", 0)
        cumulative_pct += monthly_t
        physical_progress.append(PhysicalProgressEntry(
            month=m,
            preliminares=round(p.get("preliminares", 0), 3),
            civis=round(p.get("civis", 0), 3),
            aterramento=round(p.get("aterramento", 0), 3),
            montagem=round(p.get("montagem", 0), 3),
            lancamento=round(p.get("lancamento", 0), 3),
            finais=round(p.get("finais", 0), 3),
            outros=round(p.get("outros", 0), 3),
            monthly_total=round(monthly_t, 3),
            cumulative_total=round(min(cumulative_pct, 100.0), 3),
        ))

        # Financial curve
        f = fc[m]
        monthly_t_cost = f.get("monthly_total", 0)
        cumulative_cost += monthly_t_cost
        financial_curve.append(FinancialCurveEntry(
            month=m,
            monthly_mo=round(f.get("monthly_mo", 0), 2),
            monthly_vem=round(f.get("monthly_vem", 0), 2),
            monthly_mat=round(f.get("monthly_mat", 0), 2),
            monthly_sub=round(f.get("monthly_sub", 0), 2),
            monthly_fd=round(f.get("monthly_fd", 0), 2),
            monthly_total=round(monthly_t_cost, 2),
            cumulative_total=round(cumulative_cost, 2),
        ))

    return HistogramData(
        total_months=total_months,
        workforce_by_phase=workforce_by_phase,
        workforce_by_role=workforce_by_role,
        equipment_by_type=equipment_by_type,
        physical_progress=physical_progress,
        financial_curve=financial_curve,
        peak_workforce=round(peak_wf, 1),
        peak_workforce_month=peak_wf_month,
        peak_equipment=round(peak_eq, 1),
        peak_equipment_month=peak_eq_month,
    )


def _empty_histogram() -> HistogramData:
    return HistogramData(
        total_months=0,
        workforce_by_phase=[],
        workforce_by_role=[],
        equipment_by_type=[],
        physical_progress=[],
        financial_curve=[],
        peak_workforce=0,
        peak_workforce_month=0,
        peak_equipment=0,
        peak_equipment_month=0,
    )
