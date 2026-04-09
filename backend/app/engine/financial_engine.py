"""
FinancialEngine: implementa a lógica da aba FIN da planilha de referência.

Fluxo de caixa do contrato:
  - DESEMBOLSO mensal = custos de construção + materiais + outros (distribuídos ao longo do tempo)
  - RECEITA mensal = adiantamento contratual + medições mensais (retendo %) + liberação de retenção
  - SALDO acumulado = receitas acumuladas - desembolsos acumulados
  - EXPOSIÇÃO MÁXIMA = mínimo do saldo acumulado (pior mês, valor mais negativo)

Preço de Venda:
  selling_price = custo_serviços × (1 + margin_services) + custo_materiais × (1 + margin_materials)
  onde custo_serviços = total_cost (direto + indireto) sem materiais comprados separadamente
       custo_materiais = soma dos materiais declarados no FIN (M1-M8)
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class MaterialItemData:
    description: str
    value: float
    start_month: int = 1
    duration_months: int = 1


@dataclass
class FinancialParams:
    margin_services_pct: float = 18.0
    margin_materials_pct: float = 6.38
    advance_pct: float = 10.0
    retention_pct: float = 3.0
    cost_implantacao: float = 0
    cost_projeto: float = 0
    cost_fundiario: float = 0
    cost_seguros: float = 0
    cost_outros: float = 0
    materials: list = field(default_factory=list)   # list[MaterialItemData]


@dataclass
class MonthlyCashFlowEntry:
    month: int
    # Desembolso
    disbursement_services: float = 0   # MO + VEM + FD + indireto por mês
    disbursement_materials: float = 0  # materiais do FIN por mês
    disbursement_others: float = 0     # projeto, implantação, fundiário, seguros
    disbursement_total: float = 0
    # Receita
    receipt_advance: float = 0
    receipt_billing: float = 0         # medição líquida de retenção
    receipt_retention: float = 0       # liberação de retenção (no final)
    receipt_total: float = 0
    # Saldo
    balance_monthly: float = 0
    balance_cumulative: float = 0


@dataclass
class FinancialResult:
    # Preços
    total_services_cost: float = 0     # total_cost (direto+indireto)
    total_materials_cost: float = 0    # soma dos materiais do FIN
    total_project_cost: float = 0      # serviços + materiais + outros
    selling_price: float = 0           # total_project_cost com margens
    gross_margin_value: float = 0      # valor absoluto da margem
    gross_margin_pct: float = 0        # % sobre o preço de venda
    # Fluxo
    monthly_cash_flow: list = field(default_factory=list)  # list[MonthlyCashFlowEntry]
    max_exposure: float = 0            # pior saldo acumulado (negativo = exposição)
    max_exposure_month: int = 0


def compute_financial(
    params: FinancialParams,
    total_services_cost: float,          # budget.total_cost (direto + indireto)
    total_months: int,
    # Desembolso mensal de construção por mês (da curva financeira, já calculada)
    monthly_service_disbursement: dict[int, float],  # month → valor
) -> FinancialResult:
    """
    Segue a mesma lógica da aba FIN da planilha:
      1. Calcula preço de venda = serviços × (1+ms) + materiais × (1+mm) + outros
      2. Distribui desembolsos por mês
      3. Calcula receitas: adiantamento no mês 0, medições mensais, retenção no final
      4. Calcula saldo acumulado e exposição máxima
    """
    # ── 1. Custos totais ──────────────────────────────────────────────────────
    total_mat = sum(m.value for m in params.materials) if params.materials else 0
    total_others = (
        params.cost_implantacao
        + params.cost_projeto
        + params.cost_fundiario
        + params.cost_seguros
        + params.cost_outros
    )
    total_project_cost = total_services_cost + total_mat + total_others

    # ── 2. Preço de venda ─────────────────────────────────────────────────────
    selling_services = total_services_cost * (1 + params.margin_services_pct / 100)
    selling_materials = total_mat * (1 + params.margin_materials_pct / 100)
    selling_others = total_others  # outros sem margem
    selling_price = selling_services + selling_materials + selling_others
    gross_margin_value = selling_price - total_project_cost
    gross_margin_pct = (gross_margin_value / selling_price * 100) if selling_price > 0 else 0

    # ── 3. Desembolso mensal de materiais ────────────────────────────────────
    monthly_mat_disbursement: dict[int, float] = {}
    for mat in (params.materials or []):
        if mat.value <= 0 or mat.duration_months <= 0:
            continue
        monthly_val = mat.value / mat.duration_months
        for m in range(mat.start_month, mat.start_month + mat.duration_months):
            if m < 1:
                continue
            monthly_mat_disbursement[m] = monthly_mat_disbursement.get(m, 0) + monthly_val

    # ── 4. Desembolso mensal de outros ────────────────────────────────────────
    # Projeto: mês 1 (pré-construção); implantação: mês 1; fundiário: distribuído
    # Seguros e outros: distribuídos ao longo da obra
    monthly_others_disbursement: dict[int, float] = {}
    if total_months > 0:
        per_month_others = (
            params.cost_implantacao + params.cost_projeto
        )  # pago no início (mês 1)
        distributed = params.cost_fundiario + params.cost_seguros + params.cost_outros
        monthly_others_disbursement[1] = monthly_others_disbursement.get(1, 0) + per_month_others
        if distributed > 0:
            dist_per_month = distributed / total_months
            for m in range(1, total_months + 1):
                monthly_others_disbursement[m] = monthly_others_disbursement.get(m, 0) + dist_per_month

    # ── 5. Receitas ──────────────────────────────────────────────────────────
    # Adiantamento contratual: pago no mês 0 (antes do início, mês "pre")
    advance_value = selling_price * params.advance_pct / 100

    # Medição mensal = (serviço executado no mês / total_serv) × preço_venda_serv × (1 - ret%)
    #   + (material entregue no mês / total_mat) × preço_venda_mat × (1 - ret%)
    ret = params.retention_pct / 100
    total_retention = selling_price * ret  # retenção acumulada ao longo da obra

    # Soma de desembolsos para base de distribuição de receita de serviços
    total_service_dis = sum(monthly_service_disbursement.values()) or 1
    total_mat_dis = sum(monthly_mat_disbursement.values()) or 1

    # ── 6. Montar fluxo mês a mês ─────────────────────────────────────────────
    entries: list[MonthlyCashFlowEntry] = []
    cumulative = 0.0
    min_balance = 0.0
    min_month = 1

    for m in range(1, total_months + 1):
        dis_svc = monthly_service_disbursement.get(m, 0)
        dis_mat = monthly_mat_disbursement.get(m, 0)
        dis_oth = monthly_others_disbursement.get(m, 0)
        dis_total = dis_svc + dis_mat + dis_oth

        # Receita de medição de serviços (proporcional ao desembolso)
        billing_svc = (dis_svc / total_service_dis) * selling_services * (1 - ret) if total_service_dis > 0 else 0
        billing_mat = (dis_mat / total_mat_dis) * selling_materials * (1 - ret) if total_mat_dis > 0 else 0
        billing = billing_svc + billing_mat

        # Adiantamento: recebido no mês 1
        adv = advance_value if m == 1 else 0.0

        # Retenção liberada: no último mês
        ret_release = total_retention if m == total_months else 0.0

        receipt_total = adv + billing + ret_release

        balance_monthly = receipt_total - dis_total
        cumulative += balance_monthly

        if cumulative < min_balance:
            min_balance = cumulative
            min_month = m

        entries.append(MonthlyCashFlowEntry(
            month=m,
            disbursement_services=round(dis_svc, 2),
            disbursement_materials=round(dis_mat, 2),
            disbursement_others=round(dis_oth, 2),
            disbursement_total=round(dis_total, 2),
            receipt_advance=round(adv, 2),
            receipt_billing=round(billing, 2),
            receipt_retention=round(ret_release, 2),
            receipt_total=round(receipt_total, 2),
            balance_monthly=round(balance_monthly, 2),
            balance_cumulative=round(cumulative, 2),
        ))

    return FinancialResult(
        total_services_cost=total_services_cost,
        total_materials_cost=total_mat,
        total_project_cost=total_project_cost,
        selling_price=round(selling_price, 2),
        gross_margin_value=round(gross_margin_value, 2),
        gross_margin_pct=round(gross_margin_pct, 2),
        monthly_cash_flow=entries,
        max_exposure=round(min_balance, 2),
        max_exposure_month=min_month,
    )
