from __future__ import annotations
from pydantic import BaseModel


class MonthlyCashFlowRead(BaseModel):
    month: int
    disbursement_services: float
    disbursement_materials: float
    disbursement_others: float
    disbursement_total: float
    receipt_advance: float
    receipt_billing: float
    receipt_retention: float
    receipt_total: float
    balance_monthly: float
    balance_cumulative: float


class FinancialResultRead(BaseModel):
    # Custos e preço
    total_services_cost: float
    total_materials_cost: float
    total_project_cost: float
    selling_price: float
    gross_margin_value: float
    gross_margin_pct: float
    # Parâmetros usados
    margin_services_pct: float
    margin_materials_pct: float
    advance_pct: float
    retention_pct: float
    # Exposição
    max_exposure: float
    max_exposure_month: int
    # Fluxo mensal
    monthly_cash_flow: list[MonthlyCashFlowRead]
