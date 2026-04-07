import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { budgetsApi } from '../api/projects'
import KpiCards from '../components/results/KpiCards'
import CategorySummaryTable from '../components/results/CategorySummaryTable'
import CostBreakdownChart from '../components/results/CostBreakdownChart'
import ActivitiesTable from '../components/results/ActivitiesTable'
import type { BudgetRead } from '../types/api'

function downloadPdf(budgetId: string, version: number) {
  const a = document.createElement('a')
  a.href = `/api/v1/reports/${budgetId}/pdf`
  a.download = `orcamento_R${version}.pdf`
  a.click()
}

interface Props {
  budget: BudgetRead
}

type ResultTab = 'summary' | 'activities' | 'chart'

export default function BudgetResultsPage({ budget }: Props) {
  const [tab, setTab] = useState<ResultTab>('summary')

  const { data: summaries = [] } = useQuery({
    queryKey: ['budget-summary', budget.id],
    queryFn: () => budgetsApi.getSummary(budget.id),
    enabled: budget.status === 'ready',
  })

  const { data: activities = [] } = useQuery({
    queryKey: ['budget-activities', budget.id],
    queryFn: () => budgetsApi.getActivities(budget.id),
    enabled: budget.status === 'ready' && tab === 'activities',
  })

  if (budget.status === 'calculating') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
        <p className="text-gray-600">Calculando orçamento... aguarde.</p>
      </div>
    )
  }

  if (budget.status === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
        <p className="font-semibold mb-1">Erro no cálculo</p>
        <p className="text-sm">{budget.error_message ?? 'Erro desconhecido'}</p>
      </div>
    )
  }

  const handleDownloadPdf = () => downloadPdf(budget.id, budget.version)

  const tabs: { key: ResultTab; label: string }[] = [
    { key: 'summary', label: 'Resumo por Categoria' },
    { key: 'activities', label: 'Atividades' },
    { key: 'chart', label: 'Gráfico' },
  ]

  return (
    <div className="space-y-6">
      <KpiCards budget={budget} />

      <div className="bg-white rounded-xl border shadow-sm">
        <div className="flex items-center border-b">
          <div className="flex flex-1">
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
          <button
            onClick={handleDownloadPdf}
            className="mx-3 px-3 py-1.5 text-xs border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition"
          >
            ↓ Exportar PDF
          </button>
        </div>
        <div className="p-5">
          {tab === 'summary' && <CategorySummaryTable summaries={summaries} />}
          {tab === 'activities' && <ActivitiesTable activities={activities} />}
          {tab === 'chart' && summaries.length > 0 && <CostBreakdownChart summaries={summaries} />}
        </div>
      </div>
    </div>
  )
}
