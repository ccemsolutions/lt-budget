import type { BudgetRead } from '../../types/api'

const fmt = (v: number | null) =>
  v == null ? '—' : 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

const fmtHH = (v: number | null) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' HH'

const pct = (v: number | null, total: number | null) => {
  if (v == null || total == null || total === 0) return ''
  return ` (${((v / total) * 100).toFixed(1)}%)`
}

interface Props {
  budget: BudgetRead
}

export default function KpiCards({ budget }: Props) {
  const hasIndirect = (budget.total_indirect_cost ?? 0) > 0
  const hasFinancial = (budget.selling_price ?? 0) > 0
  const totalRef = budget.total_cost ?? budget.total_direct_cost

  const cards: { label: string; value: string; color: string; sub?: string }[] = []

  // Custo total
  cards.push({
    label: hasIndirect ? 'Custo Total (direto + indireto)' : 'Custo Total Direto',
    value: fmt(totalRef),
    color: 'text-blue-700',
  })

  // Direto / Indireto (só se tiver indireto)
  if (hasIndirect) {
    cards.push({
      label: 'Custo Direto',
      value: fmt(budget.total_direct_cost),
      color: 'text-indigo-600',
      sub: pct(budget.total_direct_cost, totalRef),
    })
    cards.push({
      label: 'Custo Indireto',
      value: fmt(budget.total_indirect_cost),
      color: 'text-orange-600',
      sub: pct(budget.total_indirect_cost, totalRef),
    })
  }

  // Preço de venda e margem (só se calculado)
  if (hasFinancial) {
    cards.push({
      label: 'Preço de Venda',
      value: fmt(budget.selling_price),
      color: 'text-green-700',
    })
    cards.push({
      label: 'Margem Bruta',
      value: budget.gross_margin != null ? `${budget.gross_margin.toFixed(1)}%` : '—',
      color: 'text-green-600',
      sub: budget.selling_price && budget.total_cost
        ? fmt((budget.selling_price ?? 0) - (totalRef ?? 0))
        : undefined,
    })
  }

  // Custo/km
  cards.push({
    label: 'Custo / km',
    value: fmt(budget.cost_per_km),
    color: 'text-teal-700',
  })

  // HH
  cards.push({
    label: 'Total Homens-Hora',
    value: fmtHH(budget.total_manhours),
    color: 'text-orange-700',
  })

  const cols = cards.length <= 4 ? 'grid-cols-2 md:grid-cols-4' :
               cards.length <= 6 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6' :
               'grid-cols-2 md:grid-cols-4'

  return (
    <div className={`grid ${cols} gap-3`}>
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl border shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1 leading-snug">{c.label}</p>
          <p className={`text-base font-bold ${c.color}`}>{c.value}</p>
          {c.sub && <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>}
        </div>
      ))}
    </div>
  )
}
