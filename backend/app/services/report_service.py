from __future__ import annotations

from decimal import Decimal
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.project import Budget, BudgetSummary, BudgetActivity, Project
from app.models.static_data import ActivityCatalog


def _brl(value, decimals: int = 0) -> str:
    if value is None:
        return "—"
    v = float(value)
    formatted = f"{v:,.{decimals}f}"
    parts = formatted.split(".")
    integer_part = parts[0].replace(",", ".")
    if decimals > 0:
        return f"R$ {integer_part},{parts[1]}"
    return f"R$ {integer_part}"


def _num(value, decimals: int = 2, suffix: str = "") -> str:
    if value is None:
        return "—"
    v = float(value)
    formatted = f"{v:,.{decimals}f}"
    parts = formatted.split(".")
    integer_part = parts[0].replace(",", ".")
    result = f"{integer_part},{parts[1]}" if decimals > 0 else integer_part
    return f"{result}{suffix}"


def _pct(value) -> str:
    if value is None:
        return "—"
    return f"{float(value) * 100:.1f}%"


def _generate_html(
    project: Project,
    budget: Budget,
    summaries: list[BudgetSummary],
    activities: list[tuple],
) -> str:
    # ── KPI values ──────────────────────────────────────────────────────────
    total_direct = float(budget.total_direct_cost or 0)
    total_indirect = float(budget.total_indirect_cost or 0)
    total_cost = float(budget.total_cost or 0) or total_direct
    selling_price = float(budget.selling_price or 0)
    gross_margin = float(budget.gross_margin or 0)
    total_hh = float(budget.total_manhours or 0)
    hh_per_km = float(budget.hh_per_km or 0)
    hh_per_tower = float(budget.hh_per_tower or 0)
    cost_per_hh = float(budget.cost_per_hh or 0)
    hh_per_ton = float(budget.hh_per_ton or 0)
    cost_per_km = float(budget.cost_per_km or 0)
    cost_per_tower = float(budget.cost_per_tower or 0)

    has_indirect = total_indirect > 0
    has_financial = selling_price > 0

    # ── Summary rows ────────────────────────────────────────────────────────
    grand_total = sum(float(s.total_cost or 0) for s in summaries) or 1.0
    direct_summaries = [s for s in summaries if s.category != "Custos Indiretos"]
    indirect_summaries = [s for s in summaries if s.category == "Custos Indiretos"]

    summary_rows = ""
    for s in direct_summaries:
        pct = float(s.total_cost or 0) / grand_total * 100
        summary_rows += f"""
        <tr>
          <td>{s.category}</td>
          <td class="num">{_brl(s.mo_cost)}</td>
          <td class="num">{_brl(s.vem_cost)}</td>
          <td class="num">{_brl(s.mat_cost)}</td>
          <td class="num">{_brl(s.sub_cost)}</td>
          <td class="num">{_brl(s.fd_cost)}</td>
          <td class="num bold">{_brl(s.total_cost)}</td>
          <td class="num">{float(s.manhours or 0):,.0f}</td>
          <td class="num">{pct:.1f}%</td>
        </tr>"""

    # subtotal direto
    dir_mo  = sum(float(s.mo_cost  or 0) for s in direct_summaries)
    dir_vem = sum(float(s.vem_cost or 0) for s in direct_summaries)
    dir_mat = sum(float(s.mat_cost or 0) for s in direct_summaries)
    dir_sub = sum(float(s.sub_cost or 0) for s in direct_summaries)
    dir_fd  = sum(float(s.fd_cost  or 0) for s in direct_summaries)
    dir_tot = sum(float(s.total_cost or 0) for s in direct_summaries)
    dir_hh  = sum(float(s.manhours or 0) for s in direct_summaries)

    if has_indirect:
        summary_rows += f"""
        <tr class="subtotal-row">
          <td>Subtotal Direto</td>
          <td class="num">{_brl(dir_mo)}</td>
          <td class="num">{_brl(dir_vem)}</td>
          <td class="num">{_brl(dir_mat)}</td>
          <td class="num">{_brl(dir_sub)}</td>
          <td class="num">{_brl(dir_fd)}</td>
          <td class="num bold">{_brl(dir_tot)}</td>
          <td class="num">{dir_hh:,.0f}</td>
          <td class="num">{dir_tot / grand_total * 100:.1f}%</td>
        </tr>"""

        for s in indirect_summaries:
            pct = float(s.total_cost or 0) / grand_total * 100
            summary_rows += f"""
        <tr class="indirect-row">
          <td>{s.category}</td>
          <td class="num">{_brl(s.mo_cost)}</td>
          <td class="num">{_brl(s.vem_cost)}</td>
          <td class="num">—</td>
          <td class="num">—</td>
          <td class="num">—</td>
          <td class="num bold">{_brl(s.total_cost)}</td>
          <td class="num">{float(s.manhours or 0):,.0f}</td>
          <td class="num">{pct:.1f}%</td>
        </tr>"""

    tot_mo  = sum(float(s.mo_cost  or 0) for s in summaries)
    tot_vem = sum(float(s.vem_cost or 0) for s in summaries)
    tot_mat = sum(float(s.mat_cost or 0) for s in summaries)
    tot_sub = sum(float(s.sub_cost or 0) for s in summaries)
    tot_fd  = sum(float(s.fd_cost  or 0) for s in summaries)
    tot_hh  = sum(float(s.manhours or 0) for s in summaries)
    tot_all = sum(float(s.total_cost or 0) for s in summaries)

    # ── Activity rows ────────────────────────────────────────────────────────
    activity_rows = ""
    for a, ac in activities[:120]:
        activity_rows += f"""
        <tr>
          <td class="code">{ac.code}</td>
          <td>{ac.description}</td>
          <td>{ac.category}</td>
          <td class="num">{float(a.quantity or 0):,.2f} {ac.unit}</td>
          <td class="num">{int(a.teams or 0)}</td>
          <td class="num">{float(a.duration_months or 0):.1f}</td>
          <td class="num">{_brl(a.unit_cost)}</td>
          <td class="num bold">{_brl(a.total_cost)}</td>
        </tr>"""

    # ── Financial KPI block (only when selling_price exists) ────────────────
    financial_block = ""
    if has_financial:
        financial_block = f"""
  <h2>Análise Financeira</h2>
  <div class="fin-grid">
    <div class="fin-card">
      <div class="fin-label">Preço de Venda</div>
      <div class="fin-value green">{_brl(selling_price)}</div>
    </div>
    <div class="fin-card">
      <div class="fin-label">Margem Bruta</div>
      <div class="fin-value green">{_pct(gross_margin)}</div>
    </div>
    <div class="fin-card">
      <div class="fin-label">Custo Total</div>
      <div class="fin-value">{_brl(total_cost)}</div>
    </div>
    {'<div class="fin-card"><div class="fin-label">Exposição Máxima</div><div class="fin-value orange">' + _brl(budget.max_exposure) + '</div></div>' if budget.max_exposure else ''}
  </div>"""

    # ── Extended KPI block ───────────────────────────────────────────────────
    extended_kpis = ""
    if hh_per_km > 0:
        extended_kpis = f"""
  <h2>Indicadores de Produtividade</h2>
  <div class="ext-grid">
    <div class="ext-card">
      <div class="ext-label">HH / km</div>
      <div class="ext-value">{_num(hh_per_km, 0)}</div>
    </div>
    <div class="ext-card">
      <div class="ext-label">HH / Torre</div>
      <div class="ext-value">{_num(hh_per_tower, 0)}</div>
    </div>
    <div class="ext-card">
      <div class="ext-label">R$ / HH</div>
      <div class="ext-value">{_brl(cost_per_hh, 2)}</div>
    </div>
    {'<div class="ext-card"><div class="ext-label">HH / ton aço</div><div class="ext-value">' + _num(hh_per_ton, 1) + '</div></div>' if hh_per_ton > 0 else ''}
    <div class="ext-card">
      <div class="ext-label">Custo / km</div>
      <div class="ext-value">{_brl(cost_per_km)}</div>
    </div>
    <div class="ext-card">
      <div class="ext-label">Total HH</div>
      <div class="ext-value">{_num(total_hh, 0)}</div>
    </div>
  </div>"""

    calc_date = budget.calculated_at.strftime("%d/%m/%Y %H:%M") if budget.calculated_at else "—"

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: Arial, sans-serif; font-size: 9pt; color: #222; padding: 20px; }}
    h1 {{ font-size: 15pt; color: #1d4ed8; margin-bottom: 4px; }}
    h2 {{ font-size: 10pt; color: #374151; margin: 18px 0 8px; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; }}
    .meta {{ font-size: 8pt; color: #6b7280; margin-bottom: 14px; }}

    /* KPI cards */
    .kpis {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }}
    .kpi {{ border: 1px solid #e5e7eb; border-radius: 5px; padding: 9px; }}
    .kpi-label {{ font-size: 7pt; color: #6b7280; margin-bottom: 2px; }}
    .kpi-value {{ font-size: 11pt; font-weight: bold; color: #1d4ed8; }}

    /* Financial cards */
    .fin-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }}
    .fin-card {{ border: 1px solid #e5e7eb; border-radius: 5px; padding: 9px; }}
    .fin-label {{ font-size: 7pt; color: #6b7280; margin-bottom: 2px; }}
    .fin-value {{ font-size: 11pt; font-weight: bold; color: #1d4ed8; }}
    .fin-value.green {{ color: #059669; }}
    .fin-value.orange {{ color: #d97706; }}

    /* Extended KPI cards */
    .ext-grid {{ display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 14px; }}
    .ext-card {{ border: 1px solid #e5e7eb; border-radius: 5px; padding: 7px; }}
    .ext-label {{ font-size: 7pt; color: #6b7280; margin-bottom: 2px; }}
    .ext-value {{ font-size: 10pt; font-weight: bold; color: #374151; }}

    /* Table */
    table {{ width: 100%; border-collapse: collapse; font-size: 8pt; }}
    th {{ background: #f3f4f6; color: #374151; padding: 5px 7px; text-align: left; font-weight: 600; }}
    td {{ padding: 4px 7px; border-bottom: 1px solid #f3f4f6; }}
    tr:nth-child(even) td {{ background: #f9fafb; }}
    .num {{ text-align: right; font-variant-numeric: tabular-nums; }}
    .bold {{ font-weight: bold; }}
    .code {{ font-family: monospace; color: #1d4ed8; font-size: 7.5pt; }}
    tfoot td {{ background: #eff6ff !important; font-weight: bold; border-top: 2px solid #bfdbfe; }}
    .subtotal-row td {{ background: #f0fdf4 !important; font-weight: 600; color: #166534; border-top: 1px solid #86efac; }}
    .indirect-row td {{ background: #fff7ed !important; color: #9a3412; font-weight: 600; }}
    .page-break {{ page-break-before: always; }}
  </style>
</head>
<body>

  <h1>LT Budget — Orçamento de Linha de Transmissão</h1>
  <div class="meta">
    Projeto: <strong>{project.name}</strong> &bull;
    {project.voltage_kv}kV &bull;
    Versão R{budget.version} &bull;
    Calculado em {calc_date}
  </div>

  <!-- KPI cards -->
  <div class="kpis">
    <div class="kpi">
      <div class="kpi-label">{'Custo Total (Direto + Indireto)' if has_indirect else 'Custo Total Direto'}</div>
      <div class="kpi-value">{_brl(total_cost)}</div>
    </div>
    {'<div class="kpi"><div class="kpi-label">Custo Direto</div><div class="kpi-value">' + _brl(total_direct) + '</div></div>' if has_indirect else ''}
    {'<div class="kpi"><div class="kpi-label">Custos Indiretos (' + f'{total_indirect / total_cost * 100:.1f}%)</div><div class="kpi-value">' + _brl(total_indirect) + '</div></div>' if has_indirect else ''}
    <div class="kpi">
      <div class="kpi-label">Custo / km</div>
      <div class="kpi-value">{_brl(cost_per_km)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Custo / Torre</div>
      <div class="kpi-value">{_brl(cost_per_tower)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Total Homens-Hora</div>
      <div class="kpi-value">{total_hh:,.0f} HH</div>
    </div>
  </div>

  {financial_block}
  {extended_kpis}

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
        <td>TOTAL GERAL</td>
        <td class="num">{_brl(tot_mo)}</td>
        <td class="num">{_brl(tot_vem)}</td>
        <td class="num">{_brl(tot_mat)}</td>
        <td class="num">{_brl(tot_sub)}</td>
        <td class="num">{_brl(tot_fd)}</td>
        <td class="num">{_brl(tot_all)}</td>
        <td class="num">{tot_hh:,.0f}</td>
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
        <th class="num">Eq.</th>
        <th class="num">Dur. (m)</th>
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
        return html.encode("utf-8")
