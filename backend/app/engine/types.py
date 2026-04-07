from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class SalaryParams:
    encargos_pct: float = 0.91
    hours_per_month: float = 220.0
    working_days_per_month: float = 25.0
    ot_50_hours_per_month: float = 40.0
    ot_100_hours_per_month: float = 8.0


@dataclass
class EngineeringData:
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


@dataclass
class ProjectInputs:
    line_length_km: float
    circuit_type: str
    total_towers: int
    engineering: EngineeringData
    # Terrain percentages (sum=100)
    terrain_flat_pct: float = 0
    terrain_undulating_pct: float = 0
    terrain_steep_pct: float = 0
    terrain_mountainous_pct: float = 0
    # Vegetation percentages
    vegetation_agriculture_pct: float = 0
    vegetation_light_forest_pct: float = 0
    vegetation_heavy_forest_pct: float = 0
    vegetation_reforestation_pct: float = 0
    vegetation_open_pct: float = 0
    # Access
    new_roads_km: float = 0
    maintenance_km: float = 0
    swamp_estivas_km: float = 0
    # Schedule
    total_duration_months: int = 24
    start_month_by_category: dict = field(default_factory=dict)
    teams_by_activity: dict = field(default_factory=dict)
    # Salary
    salary: SalaryParams = field(default_factory=SalaryParams)


@dataclass
class LaborRoleData:
    id: str
    code: str
    description: str
    company_cost_hh: float  # R$/HH (pre-calculated in BD_MO)
    company_cost_monthly: float


@dataclass
class EquipmentItemData:
    id: str
    code: str
    description: str
    company_cost_monthly: float
    company_cost_daily: float
    company_cost_hh: float


@dataclass
class ResourceItem:
    resource_type: str  # MO | VEM | MAT | SUB
    # MO
    labor_role_id: Optional[str] = None
    role_code: str = ""
    qty_per_team: float = 0  # people or units per team per day
    # VEM
    equipment_id: Optional[str] = None
    equipment_code: str = ""
    # MAT
    material_code: str = ""
    material_description: str = ""
    material_qty_per_unit: float = 0
    material_unit_price: float = 0
    # SUB
    sub_code: str = ""
    subcontractor_description: str = ""
    subcontractor_cost_per_unit: float = 0


@dataclass
class ActivityData:
    id: str
    code: str
    description: str
    unit: str
    category: str
    sort_order: int
    quantity_formula: str
    productivity_per_day: float
    fd_pct: float = 0.02
    md_pct: float = 0.0
    resources: list[ResourceItem] = field(default_factory=list)


@dataclass
class ActivityResult:
    activity_id: str
    activity_code: str
    activity_description: str
    category: str
    unit: str
    quantity: float
    teams: int
    duration_months: float
    start_month: Optional[int]
    mo_cost_per_unit: float
    vem_cost_per_unit: float
    mat_cost_per_unit: float
    sub_cost_per_unit: float
    fd_cost_per_unit: float
    unit_cost: float
    total_cost: float
    manhours: float


@dataclass
class CategorySummary:
    category: str
    total_cost: float
    mo_cost: float
    vem_cost: float
    mat_cost: float
    sub_cost: float
    fd_cost: float
    manhours: float


@dataclass
class BudgetResult:
    activity_results: list[ActivityResult]
    category_summaries: list[CategorySummary]
    total_direct_cost: float
    total_manhours: float
    cost_per_km: float
    cost_per_tower: float
