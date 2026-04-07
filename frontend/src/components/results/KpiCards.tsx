import type { BudgetRead } from '../../types/api'

const fmt = (v: number | null, prefix = 'R$') =>
  v == null ? '—' : `${prefix} ${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`

const fmtHH = (v: number | null) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' HH'

interface Props {
  budget: BudgetRead
}

export default function KpiCards({ budget }: Props) {
  const cards = [
    { label: 'Custo Total Direto', value: fmt(budget.total_direct_cost), color: 'text-blue-700' },
    { label: 'Custo / km', value: fmt(budget.cost_per_km), color: 'text-green-700' },
    { label: 'Custo / Torre', value: fmt(budget.cost_per_tower), color: 'text-indigo-700' },
    { label: 'Total de Homens-Hora', value: fmtHH(budget.total_manhours), color: 'text-orange-700' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl border shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">{c.label}</p>
          <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  )
}
