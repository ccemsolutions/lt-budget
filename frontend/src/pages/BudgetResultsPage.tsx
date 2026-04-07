import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { budgetsApi } from '../api/projects'
import KpiCards from '../components/results/KpiCards'
import CategorySummaryTable from '../components/results/CategorySummaryTable'
import CostBreakdownChart from '../components/results/CostBreakdownChart'
import ActivitiesTable from '../components/results/ActivitiesTable'
import { WorkforceByPhaseChart, WorkforceByRoleChart } from '../components/results/WorkforceHistogram'
import EquipmentHistogram from '../components/results/EquipmentHistogram'
import PhysicalProgressChart from '../components/results/PhysicalProgressChart'
import FinancialCurveChart from '../components/results/FinancialCurveChart'
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

type ResultTab = 'summary' | 'activities' | 'chart' | 'histogramas'
type HistoSubTab = 'efetivo_fase' | 'efetivo_funcao' | 'equipamentos' | 'curva_s' | 'curva_financeira'

export default function BudgetResultsPage({ budget }: Props) {
  const [tab, setTab] = useState<ResultTab>('summary')
  const [histoTab, setHistoTab] = useState<HistoSubTab>('efetivo_fase')

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

  const { data: histograms, isLoading: loadingHistograms } = useQuery({
    queryKey: ['budget-histograms', budget.id],
    queryFn: () => budgetsApi.getHistograms(budget.id),
    enabled: budget.status === 'ready' && tab === 'histogramas',
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
    { key: 'summary', label: 'Resumo' },
    { key: 'activities', label: 'Atividades' },
    { key: 'chart', label: 'Gráfico' },
    { key: 'histogramas', label: 'Histogramas' },
  ]

  const histoTabs: { key: HistoSubTab; label: string }[] = [
    { key: 'efetivo_fase', label: 'Efetivo por Fase' },
    { key: 'efetivo_funcao', label: 'Efetivo por Função' },
    { key: 'equipamentos', label: 'Equipamentos' },
    { key: 'curva_s', label: 'Curva S Física' },
    { key: 'curva_financeira', label: 'Curva Financeira' },
  ]

  return (
    <div className="space-y-6">
      <KpiCards budget={budget} />

      <div className="bg-white rounded-xl border shadow-sm">
        {/* Main tabs row */}
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

          {tab === 'histogramas' && (
            <div>
              {/* Sub-tabs for histograms */}
              <div className="flex gap-1 mb-5 border-b overflow-x-auto">
                {histoTabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setHistoTab(t.key)}
                    className={`px-4 py-2 text-xs font-medium border-b-2 transition whitespace-nowrap ${
                      histoTab === t.key
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {loadingHistograms ? (
                <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full" />
                  Calculando histogramas...
                </div>
              ) : histograms ? (
                <>
                  {histoTab === 'efetivo_fase' && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">
                        Histograma de Pessoal por Macro Atividade
                      </h3>
                      <WorkforceByPhaseChart
                        data={histograms.workforce_by_phase}
                        peakMonth={histograms.peak_workforce_month}
                        peakValue={histograms.peak_workforce}
                      />
                    </div>
                  )}
                  {histoTab === 'efetivo_funcao' && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">
                        Histograma de Pessoal por Função
                      </h3>
                      <WorkforceByRoleChart data={histograms.workforce_by_role} />
                    </div>
                  )}
                  {histoTab === 'equipamentos' && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">
                        Histograma de Equipamentos e Veículos
                      </h3>
                      <EquipmentHistogram
                        data={histograms.equipment_by_type}
                        peakMonth={histograms.peak_equipment_month}
                        peakValue={histograms.peak_equipment}
                      />
                    </div>
                  )}
                  {histoTab === 'curva_s' && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">
                        Avanço Físico — Curva S
                      </h3>
                      <PhysicalProgressChart data={histograms.physical_progress} />
                    </div>
                  )}
                  {histoTab === 'curva_financeira' && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">
                        Curva Financeira — Desembolso por Componente de Custo
                      </h3>
                      <FinancialCurveChart
                        data={histograms.financial_curve}
                        totalCost={budget.total_direct_cost}
                      />
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-gray-400 py-10 text-sm">
                  Nenhum dado de histograma disponível.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
