from __future__ import annotations

import io
from decimal import Decimal
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.project import Budget, BudgetSummary, BudgetActivity, Project
from app.models.static_data import ActivityCatalog


def _fmt(value: Optional[Decimal], decimals: int = 2) -> str:
    if value is None:
        return "—"
    formatted = f"{float(value):,.{decimals}f}"
    # Convert to Brazilian format: 1,234,567.89 → 1.234.567,89
    parts = formatted.split(".")
    integer_part = parts[0].replace(",", ".")
    decimal_part = parts[1] if len(parts) > 1 else ""
    return f"R$ {integer_part},{decimal_part}"


def _generate_html(
    project: Project,
    budget: Budget,
    summaries: list[BudgetSummary],
    activities: list[BudgetActivity],
) -> str:
    grand_total = sum(float(s.total_cost or 0) for s in summaries) or 1.0
    summary_rows = ""
    for s in summaries:
        pct = float(s.total_cost or 0) / grand_total * 100
        summary_rows += f"""
        <tr>
          <td>{s.category}</td>
          <td class="num">{_fmt(s.mo_cost)}</td>
          <td class="num">{_fmt(s.vem_cost)}</td>
          <td class="num">{_fmt(s.mat_cost)}</td>
          <td class="num">{_fmt(s.sub_cost)}</td>
          <td class="num">{_fmt(s.fd_cost)}</td>
          <td class="num bold">{_fmt(s.total_cost)}</td>
          <td class="num">{float(s.manhours or 0):,.0f}</td>
          <td class="num">{pct:.1f}%</td>
        </tr>"""

    total_mo = sum(float(s.mo_cost or 0) for s in summaries)
    total_vem = sum(float(s.vem_cost or 0) for s in summaries)
    total_mat = sum(float(s.mat_cost or 0) for s in summaries)
    total_sub = sum(float(s.sub_cost or 0) for s in summaries)
    total_fd = sum(float(s.fd_cost or 0) for s in summaries)
    total_total = sum(float(s.total_cost or 0) for s in summaries)
    total_hh = sum(float(s.manhours or 0) for s in summaries)

    def brl(v: float) -> str:
        formatted = f"{v:,.2f}"
        parts = formatted.split(".")
        integer_part = parts[0].replace(",", ".")
        return f"R$ {integer_part},{parts[1]}"

    activity_rows = ""
    for a, ac in activities[:100]:  # limit for PDF size; a=BudgetActivity, ac=ActivityCatalog
        activity_rows += f"""
        <tr>
          <td class="code">{ac.code}</td>
          <td>{ac.description}</td>
          <td>{ac.category}</td>
          <td class="num">{float(a.quantity or 0):,.2f} {ac.unit}</td>
          <td class="num">{int(a.teams or 0)}</td>
          <td class="num">{float(a.duration_months or 0):.2f}</td>
          <td class="num">{_fmt(a.unit_cost)}</td>
          <td class="num bold">{_fmt(a.total_cost)}</td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: Arial, sans-serif; font-size: 9pt; color: #222; padding: 20px; }}
    h1 {{ font-size: 16pt; color: #1d4ed8; margin-bottom: 4px; }}
    h2 {{ font-size: 11pt; color: #374151; margin: 20px 0 8px; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; }}
    .meta {{ font-size: 8pt; color: #6b7280; margin-bottom: 16px; }}
    .kpis {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }}
    .kpi {{ border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; }}
    .kpi-label {{ font-size: 7pt; color: #6b7280; margin-bottom: 2px; }}
    .kpi-value {{ font-size: 12pt; font-weight: bold; color: #1d4ed8; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 8pt; }}
    th {{ background: #f3f4f6; color: #374151; padding: 6px 8px; text-align: left; font-weight: 600; }}
    td {{ padding: 5px 8px; border-bottom: 1px solid #f3f4f6; }}
    tr:nth-child(even) td {{ background: #f9fafb; }}
    .num {{ text-align: right; }}
    .bold {{ font-weight: bold; }}
    .code {{ font-family: monospace; color: #1d4ed8; }}
    tfoot td {{ background: #eff6ff !important; font-weight: bold; border-top: 2px solid #bfdbfe; }}
    .page-break {{ page-break-before: always; }}
  </style>
</head>
<body>
  <h1>LT Budget — Orçamento de Linha de Transmissão</h1>
  <div class="meta">
    Projeto: <strong>{project.name}</strong> &bull;
    {project.voltage_kv}kV &bull;
    Versão R{budget.version} &bull;
    {f'Calculado em {budget.calculated_at.strftime("%d/%m/%Y %H:%M") if budget.calculated_at else "—"}'}
  </div>

  <div class="kpis">
    <div class="kpi">
      <div class="kpi-label">Custo Total Direto</div>
      <div class="kpi-value">{_fmt(budget.total_direct_cost)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Custo / km</div>
      <div class="kpi-value">{_fmt(budget.cost_per_km)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Custo / Torre</div>
      <div class="kpi-value">{_fmt(budget.cost_per_tower)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Total Homens-Hora</div>
      <div class="kpi-value">{float(budget.total_manhours or 0):,.0f} HH</div>
    </div>
  </div>

  <h2>Resumo por Categoria</h2>
  <table>
    <thead>
      <tr>
        <th>Categoria</th>
        <th class="num">MO</th>
        <th class="num">VEM</th>
        <th class="num">MAT</th>
        <th class="num">SUB</th>
        <th class="num">FD</th>
        <th class="num">Total</th>
        <th class="num">HH</th>
        <th class="num">%</th>
      </tr>
    </thead>
    <tbody>{summary_rows}</tbody>
    <tfoot>
      <tr>
        <td>TOTAL</td>
        <td class="num">{brl(total_mo)}</td>
        <td class="num">{brl(total_vem)}</td>
        <td class="num">{brl(total_mat)}</td>
        <td class="num">{brl(total_sub)}</td>
        <td class="num">{brl(total_fd)}</td>
        <td class="num">{brl(total_total)}</td>
        <td class="num">{total_hh:,.0f}</td>
        <td class="num">100%</td>
      </tr>
    </tfoot>
  </table>

  <div class="page-break"></div>
  <h2>Detalhe por Atividade</h2>
  <table>
    <thead>
      <tr>
        <th>Código</th>
        <th>Descrição</th>
        <th>Categoria</th>
        <th class="num">Quantidade</th>
        <th class="num">Equipes</th>
        <th class="num">Duração (m)</th>
        <th class="num">Custo Unit.</th>
        <th class="num">Total</th>
      </tr>
    </thead>
    <tbody>{activity_rows}</tbody>
  </table>
</body>
</html>"""


async def generate_pdf(budget_id: str, db: AsyncSession) -> bytes:
    """Generate PDF bytes for a budget. Falls back to HTML if WeasyPrint unavailable."""
    budget = await db.get(Budget, budget_id)
    if not budget:
        raise ValueError("Budget not found")

    project = await db.get(Project, budget.project_id)

    summaries_result = await db.execute(
        select(BudgetSummary).where(BudgetSummary.budget_id == budget_id)
    )
    summaries = list(summaries_result.scalars().all())

    activities_result = await db.execute(
        select(BudgetActivity, ActivityCatalog)
        .join(ActivityCatalog, BudgetActivity.activity_id == ActivityCatalog.id)
        .where(BudgetActivity.budget_id == budget_id)
        .order_by(ActivityCatalog.sort_order)
    )
    activities = list(activities_result.all())

    html = _generate_html(project, budget, summaries, activities)

    try:
        import weasyprint  # type: ignore
        pdf_bytes = weasyprint.HTML(string=html).write_pdf()
        return pdf_bytes
    except Exception:
        # WeasyPrint not installed or failed: return HTML as fallback
        return html.encode("utf-8")
