from __future__ import annotations
import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel, field_validator, model_validator


# ─── Project ───────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    voltage_kv: int = 230


class ProjectRead(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    voltage_kv: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Project Inputs ────────────────────────────────────────────────────────────

class EngineeringInputs(BaseModel):
    guyed_towers: int = 0
    self_supporting_towers: int = 0
    excavation_tubulao_m3: float = 0
    excavation_mecanizada_m3: float = 0
    excavation_solo_fraco_m3: float = 0
    excavation_manual_m3: float = 0
    excavation_rocha_m3: float = 0
    excavation_moledo_m3: float = 0
    concrete_usinado_m3: float = 0
    concrete_canteiro_m3: float = 0
    concrete_manual_m3: float = 0
    concrete_premoldado_m3: float = 0
    rebar_ton: float = 0
    estacas_aco_m: float = 0
    estacas_concreto_m: float = 0
    estacas_raiz_m: float = 0
    helicoidais_m: float = 0
    chumbadores_m: float = 0
    contrapeso_m: float = 0


class TerrainInputs(BaseModel):
    flat_pct: float = 0
    undulating_pct: float = 0
    steep_pct: float = 0
    mountainous_pct: float = 0

    @model_validator(mode="after")
    def sum_must_be_100(self) -> "TerrainInputs":
        total = self.flat_pct + self.undulating_pct + self.steep_pct + self.mountainous_pct
        # Allow zero (empty form) or must sum to 100
        if total > 0 and abs(total - 100) > 0.5:
            raise ValueError(f"A soma dos percentuais de terreno deve ser 100% (atual: {total:.1f}%)")
        return self


class VegetationInputs(BaseModel):
    agriculture_pct: float = 0
    light_forest_pct: float = 0
    heavy_forest_pct: float = 0
    reforestation_pct: float = 0
    open_pct: float = 0


class CrossingsInputs(BaseModel):
    lt_crossings: int = 0          # Travessias de LTs existentes
    road_crossings: int = 0        # Travessias de rodovias
    river_crossings: int = 0       # Travessias de rios
    pipeline_crossings: int = 0    # Travessias de oleodutos/gasodutos
    fences_km: float = 0           # Cercas (km)
    bridges: int = 0               # Pontes
    wet_crossings: int = 0         # Passagens molhadas
    culverts: int = 0              # Bueiros


class AccessRoadsInputs(BaseModel):
    new_roads_km: float = 0
    maintenance_km: float = 0
    swamp_estivas_km: float = 0


class ScheduleInputs(BaseModel):
    total_duration_months: int = 24
    start_month_preliminares: int = 1
    start_month_civil: int = 2
    start_month_aterramento: int = 6
    start_month_montagem: int = 8
    start_month_lancamento: int = 12
    start_month_finais: int = 20
    teams_by_activity: dict[str, int] = {}
    productivity_factors: dict[str, float] = {}  # activity_code -> fator multiplicador (default 1.0)


class SalaryParamsOverride(BaseModel):
    encargos_pct: float | None = None
    hours_per_month: float | None = None
    working_days_per_month: float | None = None
    ot_50_hours_per_month: float | None = None
    ot_100_hours_per_month: float | None = None


class MaterialItem(BaseModel):
    description: str
    value: float = 0
    start_month: int = 1
    duration_months: int = 1


class FinancialParamsConfig(BaseModel):
    # Margens
    margin_services_pct: float = 18.0     # % sobre custo de serviços
    margin_materials_pct: float = 6.38    # % sobre custo de materiais
    # Condições contratuais
    advance_pct: float = 10.0             # % adiantamento contratual
    retention_pct: float = 3.0            # % retenção
    # Custos complementares (além do orçamento de campo)
    cost_implantacao: float = 0           # sondagem, implantação
    cost_projeto: float = 0               # projeto básico + executivo
    cost_fundiario: float = 0             # fundiário / meio ambiente
    cost_seguros: float = 0               # seguros
    cost_outros: float = 0                # outros custos
    # Materiais principais (com faseamento)
    materials: list[MaterialItem] = []


class IndirectRoleItem(BaseModel):
    code: str
    qty: float = 0
    duration_months: float | None = None  # None = usa total_duration_months


class IndirectVehicleItem(BaseModel):
    code: str
    qty: float = 0
    duration_months: float | None = None


class IndirectCostsConfig(BaseModel):
    mo_roles: list[IndirectRoleItem] = []
    vehicles: list[IndirectVehicleItem] = []
    canteiro_custo_mes: float = 0
    canteiro_meses: float | None = None
    republicas_custo_mes: float = 0
    viagens_custo_mes: float = 0
    qsms_custo_mes: float = 0
    mob_demob_total: float = 0


class ProjectInputsWrite(BaseModel):
    line_length_km: float
    circuit_type: str = "single"
    total_towers: int
    state: str = ""                                  # Estado (UF) da obra
    engineering: EngineeringInputs = EngineeringInputs()
    terrain: TerrainInputs = TerrainInputs()
    vegetation: VegetationInputs = VegetationInputs()
    access_roads: AccessRoadsInputs = AccessRoadsInputs()
    crossings: CrossingsInputs = CrossingsInputs()   # Interferências e obras especiais
    schedule: ScheduleInputs = ScheduleInputs()
    salary_params: SalaryParamsOverride = SalaryParamsOverride()
    indirect_config: IndirectCostsConfig = IndirectCostsConfig()
    financial_params: FinancialParamsConfig = FinancialParamsConfig()


class ProjectInputsRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    line_length_km: float
    circuit_type: str
    total_towers: int
    state: str = ""
    engineering: dict[str, Any]
    terrain: dict[str, Any]
    vegetation: dict[str, Any]
    access_roads: dict[str, Any]
    crossings: dict[str, Any] = {}
    schedule: dict[str, Any]
    salary_params: dict[str, Any]
    indirect_config: dict[str, Any] = {}
    financial_params: dict[str, Any] = {}
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Budget ────────────────────────────────────────────────────────────────────

class BudgetCreate(BaseModel):
    label: str | None = None


class BudgetRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    version: int
    label: str | None
    status: str
    error_message: str | None
    calculated_at: datetime | None
    total_direct_cost: float | None
    total_indirect_cost: float | None
    total_cost: float | None
    total_manhours: float | None
    cost_per_km: float | None
    cost_per_tower: float | None
    selling_price: float | None
    gross_margin: float | None
    max_exposure: float | None
    # Extended KPIs
    hh_per_km: float | None
    hh_per_tower: float | None
    cost_per_hh: float | None
    hh_per_ton: float | None

    model_config = {"from_attributes": True}


class BudgetActivityRead(BaseModel):
    id: uuid.UUID
    activity_code: str
    activity_description: str
    category: str
    unit: str
    quantity: float
    teams: int
    duration_months: float
    mo_cost_per_unit: float
    vem_cost_per_unit: float
    mat_cost_per_unit: float
    sub_cost_per_unit: float
    fd_cost_per_unit: float
    unit_cost: float
    total_cost: float
    manhours: float

    model_config = {"from_attributes": True}


class BudgetSummaryRead(BaseModel):
    category: str
    total_cost: float
    mo_cost: float
    vem_cost: float
    mat_cost: float
    sub_cost: float
    fd_cost: float
    manhours: float
    pct_of_total: float = 0.0

    model_config = {"from_attributes": True}
