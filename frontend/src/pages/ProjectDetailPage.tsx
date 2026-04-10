import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi, budgetsApi } from '../api/projects'
import InputsPage from './InputsPage'
import BudgetResultsPage from './BudgetResultsPage'
import SchedulePage from './SchedulePage'
import CatalogPage from './CatalogPage'
import type { BudgetRead } from '../types/api'

type Tab = 'inputs' | 'schedule' | 'budgets' | 'catalog'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('inputs')
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null)

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  })

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', id],
    queryFn: () => projectsApi.listBudgets(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data as BudgetRead[] | undefined
      const hasCalculating = data?.some((b) => b.status === 'calculating')
      return hasCalculating ? 2000 : false
    },
  })

  const triggerMutation = useMutation({
    mutationFn: (label?: string) => projectsApi.triggerBudget(id!, label),
    onSuccess: (newBudget: BudgetRead) => {
      qc.invalidateQueries({ queryKey: ['budgets', id] })
      setSelectedBudgetId(newBudget.id)
      setTab('budgets')
    },
  })

  // Auto-select latest budget (budgets are ordered newest-first by version desc)
  useEffect(() => {
    if (budgets.length > 0 && !selectedBudgetId) {
      setSelectedBudgetId(budgets[0].id)
    }
  }, [budgets])

  // Polling: when selected budget is calculating, refetch it individually
  const selectedBudget = budgets.find((b) => b.id === selectedBudgetId) ?? null
  const { data: polledBudget } = useQuery({
    queryKey: ['budget', selectedBudgetId],
    queryFn: () => budgetsApi.get(selectedBudgetId!),
    enabled: !!selectedBudgetId && selectedBudget?.status === 'calculating',
    refetchInterval: 2000,
  })

  const activeBudget = polledBudget ?? selectedBudget

  if (loadingProject) {
    return <div className="flex items-center justify-center h-screen text-gray-400">Carregando...</div>
  }
  if (!project) {
    return <div className="flex items-center justify-center h-screen text-red-500">Projeto não encontrado</div>
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'inputs',   label: 'Entradas' },
    { key: 'schedule', label: 'Cronograma' },
    { key: 'budgets',  label: `Orçamento${budgets.length > 0 ? ` (${budgets.length})` : ''}` },
    { key: 'catalog',  label: 'Catálogo CPU' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
          >
            ←
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">{project.name}</h1>
            <p className="text-xs text-gray-500">
              {project.voltage_kv}kV
              {project.description ? ` · ${project.description}` : ''}
            </p>
          </div>
          <button
            onClick={() => navigate('/base-data')}
            className="text-sm text-gray-500 hover:text-blue-600 font-medium px-3 py-2"
          >
            Base de Dados
          </button>
          <button
            onClick={() => triggerMutation.mutate(undefined)}
            disabled={triggerMutation.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {triggerMutation.isPending ? 'Disparando...' : '▶ Calcular Orçamento'}
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6 flex border-t">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
                tab === t.key
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {tab === 'inputs' && (
          <InputsPage projectId={id!} onSaved={() => {}} />
        )}

        {tab === 'schedule' && (
          <SchedulePage projectId={id!} />
        )}

        {tab === 'catalog' && (
          <CatalogPage projectId={id!} />
        )}

        {tab === 'budgets' && (
          <div className="space-y-5">
            {/* Budget version selector */}
            {budgets.length > 1 && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-600">Versão:</span>
                {budgets.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBudgetId(b.id)}
                    className={`px-3 py-1 text-xs rounded-full font-medium border transition ${
                      b.id === selectedBudgetId
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                    }`}
                  >
                    R{b.version} {b.label ? `— ${b.label}` : ''}{' '}
                    {b.status === 'calculating' && '⟳'}
                    {b.status === 'error' && '✗'}
                    {b.status === 'ready' && '✓'}
                  </button>
                ))}
              </div>
            )}

            {budgets.length === 0 ? (
              <div className="text-center py-24 text-gray-400">
                <p className="mb-2">Nenhum orçamento calculado</p>
                <p className="text-sm">
                  Preencha as entradas e clique em{' '}
                  <strong className="text-gray-600">Calcular Orçamento</strong>
                </p>
              </div>
            ) : activeBudget ? (
              <BudgetResultsPage budget={activeBudget} />
            ) : null}
          </div>
        )}
      </main>
    </div>
  )
}
