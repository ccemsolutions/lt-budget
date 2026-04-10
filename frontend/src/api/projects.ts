import api from './client'
import type { ProjectRead, ProjectInputsWrite, BudgetRead, BudgetSummaryRead, BudgetActivityRead, HistogramData, FinancialResultRead, CostBreakdownRead, ActivityCatalogRead, LaborRoleRef, EquipmentItemRef, ResourceTemplateWrite, ActivityScheduleRead, LaborRoleFullRead, LaborRoleUpdate, EquipmentItemFullRead, EquipmentItemUpdate, BaseParamsRead, BaseParamsUpdate, LaborRoleCreate, EquipmentItemCreate, ImportResult, ActivityCreate, ActivityUpdate } from '../types/api'

export const projectsApi = {
  list: () => api.get<ProjectRead[]>('/projects').then(r => r.data),
  get: (id: string) => api.get<ProjectRead>(`/projects/${id}`).then(r => r.data),
  create: (data: { name: string; description?: string; voltage_kv?: number }) =>
    api.post<ProjectRead>('/projects', data).then(r => r.data),
  delete: (id: string) => api.delete(`/projects/${id}`),

  getInputs: (id: string) =>
    api.get<ProjectInputsWrite>(`/projects/${id}/inputs`).then(r => r.data),
  saveInputs: (id: string, data: ProjectInputsWrite) =>
    api.put<ProjectInputsWrite>(`/projects/${id}/inputs`, data).then(r => r.data),

  listBudgets: (id: string) =>
    api.get<BudgetRead[]>(`/projects/${id}/budgets`).then(r => r.data),
  triggerBudget: (id: string, label?: string) =>
    api.post<BudgetRead>(`/projects/${id}/budgets`, { label }).then(r => r.data),
  schedulePreview: (id: string, teams: Record<string, number>, factors: Record<string, number>) =>
    api.post<ActivityScheduleRead[]>(`/projects/${id}/schedule-preview`, {
      teams_by_activity: teams,
      productivity_factors: factors,
    }).then(r => r.data),
}

export const budgetsApi = {
  get: (id: string) => api.get<BudgetRead>(`/budgets/${id}`).then(r => r.data),
  getSummary: (id: string) =>
    api.get<BudgetSummaryRead[]>(`/budgets/${id}/summary`).then(r => r.data),
  getActivities: (id: string) =>
    api.get<BudgetActivityRead[]>(`/budgets/${id}/activities`).then(r => r.data),
  getHistograms: (id: string) =>
    api.get<HistogramData>(`/budgets/${id}/histograms`).then(r => r.data),
  getFinancial: (id: string) =>
    api.get<FinancialResultRead>(`/budgets/${id}/financial`).then(r => r.data),
  getCostBreakdown: (id: string) =>
    api.get<CostBreakdownRead>(`/budgets/${id}/cost-breakdown`).then(r => r.data),
}

export const catalogApi = {
  getActivities: (projectId?: string) => {
    const params = projectId ? { project_id: projectId } : {}
    return api.get<ActivityCatalogRead[]>('/catalog/activities', { params }).then(r => r.data)
  },
  getLaborRoles: () =>
    api.get<LaborRoleRef[]>('/catalog/labor-roles').then(r => r.data),
  getEquipmentItems: () =>
    api.get<EquipmentItemRef[]>('/catalog/equipment-items').then(r => r.data),
  updateResources: (activityId: string, resources: ResourceTemplateWrite[]) =>
    api.put(`/catalog/activities/${activityId}/resources`, resources).then(r => r.data),
  updateProductivity: (activityId: string, productivity_per_day: number) =>
    api.put(`/catalog/activities/${activityId}/productivity`, { productivity_per_day }).then(r => r.data),
  createActivity: (data: ActivityCreate) =>
    api.post<ActivityCatalogRead>('/catalog/activities', data).then(r => r.data),
  updateActivity: (id: string, data: ActivityUpdate) =>
    api.put<ActivityCatalogRead>(`/catalog/activities/${id}`, data).then(r => r.data),
  deleteActivity: (id: string) =>
    api.delete(`/catalog/activities/${id}`).then(r => r.data),
  cloneActivity: (id: string, projectId: string) =>
    api.post<ActivityCatalogRead>(`/catalog/activities/${id}/clone`, null, { params: { project_id: projectId } }).then(r => r.data),
}

export const baseDataApi = {
  getLaborRoles: () =>
    api.get<LaborRoleFullRead[]>('/catalog/labor-roles/full').then(r => r.data),
  updateLaborRole: (id: string, data: LaborRoleUpdate) =>
    api.put<LaborRoleFullRead>(`/catalog/labor-roles/${id}`, data).then(r => r.data),
  createLaborRole: (data: LaborRoleCreate) =>
    api.post<LaborRoleFullRead>('/catalog/labor-roles', data).then(r => r.data),
  importLaborRoles: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post<ImportResult>('/catalog/labor-roles/import', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
  applyDefaults: (fields: string[]) =>
    api.post('/catalog/labor-roles/apply-defaults', { fields }).then(r => r.data),
  getEquipmentItems: () =>
    api.get<EquipmentItemFullRead[]>('/catalog/equipment-items/full').then(r => r.data),
  updateEquipmentItem: (id: string, data: EquipmentItemUpdate) =>
    api.put<EquipmentItemFullRead>(`/catalog/equipment-items/${id}`, data).then(r => r.data),
  createEquipmentItem: (data: EquipmentItemCreate) =>
    api.post<EquipmentItemFullRead>('/catalog/equipment-items', data).then(r => r.data),
  updateFuelPrices: (data: { preco_diesel?: number; preco_gasolina?: number; preco_alcool?: number }) =>
    api.post('/catalog/equipment-items/update-fuel-prices', data).then(r => r.data),
  getBaseParams: () =>
    api.get<BaseParamsRead>('/catalog/base-params').then(r => r.data),
  updateBaseParams: (data: BaseParamsUpdate) =>
    api.put<BaseParamsRead>('/catalog/base-params', data).then(r => r.data),
}
