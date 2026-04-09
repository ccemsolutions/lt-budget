import api from './client'
import type { ProjectRead, ProjectInputsWrite, BudgetRead, BudgetSummaryRead, BudgetActivityRead, HistogramData, FinancialResultRead, CostBreakdownRead } from '../types/api'

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
