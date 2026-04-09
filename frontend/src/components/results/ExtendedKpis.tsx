import type { BudgetRead } from '../../types/api'

const fmt = (v: number | null, digits = 0) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })

const fmtBRL = (v: number | null) =>
  v == null ? '—' : 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface Props {
  budget: BudgetRead
}

export default function ExtendedKpis({ budget }: Props) {
  const kpis = [
    {
      label: 'HH / km',
      value: budget.hh_per_km != null ? fmt(budget.hh_per_km, 0) + ' HH/km' : '—',
      desc: 'Homens-hora por quilômetro de linha',
      color: 'text-blue-700',
    },
    {
      label: 'HH / Torre',
      value: budget.hh_per_tower != null ? fmt(budget.hh_per_tower, 0) + ' HH/torre' : '—',
      desc: 'Homens-hora por estrutura',
      color: 'text-blue-600',
    },
    {
      label: 'Custo / HH',
      value: fmtBRL(budget.cost_per_hh),
      desc: 'Custo médio por homem-hora',
      color: 'text-green-700',
    },
    {
      label: 'HH / ton Aço',
      value: budget.hh_per_ton != null ? fmt(budget.hh_per_ton, 1) + ' HH/ton' : '—',
      desc: 'Homens-hora por tonelada de armação (quando informado)',
      color: 'text-indigo-700',
    },
    {
      label: 'Custo / km (Total)',
      value: budget.cost_per_km != null ? fmtBRL(budget.cost_per_km) : '—',
      desc: 'Inclui diretos + indiretos',
      color: 'text-teal-700',
    },
    {
      label: 'Total HH',
      value: budget.total_manhours != null
        ? budget.total_manhours.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' HH'
        : '—',
      desc: 'Homens-hora total da obra (direto + indireto)',
      color: 'text-orange-700',
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Indicadores de Produtividade</h3>
        <p className="text-xs text-gray-400">Corresponde à aba Res da planilha de referência</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-xl border shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{k.label}</p>
            <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-gray-400 mt-1">{k.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
