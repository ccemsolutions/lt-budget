export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface UserRead {
  id: string
  email: string
  full_name: string | null
  role: string
  company_id: string
  created_at: string
}

export interface ProjectRead {
  id: string
  name: string
  description: string | null
  voltage_kv: number
  status: string
  created_at: string
  updated_at: string
}

export interface ProjectInputsWrite {
  line_length_km: number
  circuit_type: 'single' | 'double'
  total_towers: number
  engineering: {
    guyed_towers: number
    self_supporting_towers: number
    excavation_tubulao_m3: number
    excavation_mecanizada_m3: number
    excavation_solo_fraco_m3: number
    excavation_manual_m3: number
    excavation_rocha_m3: number
    excavation_moledo_m3: number
    concrete_usinado_m3: number
    concrete_canteiro_m3: number
    concrete_manual_m3: number
    concrete_premoldado_m3: number
    rebar_ton: number
    estacas_aco_m: number
    estacas_concreto_m: number
    estacas_raiz_m: number
    helicoidais_m: number
    chumbadores_m: number
    contrapeso_m: number
  }
  terrain: {
    flat_pct: number
    undulating_pct: number
    steep_pct: number
    mountainous_pct: number
  }
  vegetation: {
    agriculture_pct: number
    light_forest_pct: number
    heavy_forest_pct: number
    reforestation_pct: number
    open_pct: number
  }
  access_roads: {
    new_roads_km: number
    maintenance_km: number
    swamp_estivas_km: number
  }
  schedule: {
    total_duration_months: number
    start_month_preliminares: number
    start_month_civil: number
    start_month_aterramento: number
    start_month_montagem: number
    start_month_lancamento: number
    start_month_finais: number
    teams_by_activity: Record<string, number>
  }
  salary_params: {
    encargos_pct?: number
    hours_per_month?: number
    working_days_per_month?: number
  }
}

export interface BudgetRead {
  id: string
  project_id: string
  version: number
  label: string | null
  status: 'calculating' | 'ready' | 'error'
  error_message: string | null
  calculated_at: string | null
  total_direct_cost: number | null
  total_manhours: number | null
  cost_per_km: number | null
  cost_per_tower: number | null
}

export interface BudgetSummaryRead {
  category: string
  total_cost: number
  mo_cost: number
  vem_cost: number
  mat_cost: number
  sub_cost: number
  fd_cost: number
  manhours: number
  pct_of_total: number
}

export interface BudgetActivityRead {
  id: string
  activity_code: string
  activity_description: string
  category: string
  unit: string
  quantity: number
  teams: number
  duration_months: number
  mo_cost_per_unit: number
  vem_cost_per_unit: number
  mat_cost_per_unit: number
  sub_cost_per_unit: number
  fd_cost_per_unit: number
  unit_cost: number
  total_cost: number
  manhours: number
}
