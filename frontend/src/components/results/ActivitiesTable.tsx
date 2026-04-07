import { useState } from 'react'
import type { BudgetActivityRead } from '../../types/api'

const fmt = (v: number) =>
  'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface Props {
  activities: BudgetActivityRead[]
}

export default function ActivitiesTable({ activities }: Props) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  const categories = [...new Set(activities.map((a) => a.category))].sort()

  const filtered = activities.filter((a) => {
    const matchSearch =
      !search ||
      a.activity_code.toLowerCase().includes(search.toLowerCase()) ||
      a.activity_description.toLowerCase().includes(search.toLowerCase())
    const matchCat = !category || a.category === category
    return matchSearch && matchCat
  })

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar atividade..."
          className="border rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas categorias</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-600 text-left">
              <th className="px-3 py-2 font-medium">Código</th>
              <th className="px-3 py-2 font-medium">Descrição</th>
              <th className="px-3 py-2 font-medium">Categoria</th>
              <th className="px-3 py-2 font-medium text-right">Qtd</th>
              <th className="px-3 py-2 font-medium">Un</th>
              <th className="px-3 py-2 font-medium text-right">Equipes</th>
              <th className="px-3 py-2 font-medium text-right">Duração (m)</th>
              <th className="px-3 py-2 font-medium text-right">Custo Unit.</th>
              <th className="px-3 py-2 font-medium text-right">Total</th>
              <th className="px-3 py-2 font-medium text-right">HH</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => (
              <tr key={a.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-2 font-mono text-blue-700">{a.activity_code}</td>
                <td className="px-3 py-2 text-gray-700 max-w-xs truncate" title={a.activity_description}>
                  {a.activity_description}
                </td>
                <td className="px-3 py-2 text-gray-500">{a.category}</td>
                <td className="px-3 py-2 text-right">{a.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                <td className="px-3 py-2 text-gray-500">{a.unit}</td>
                <td className="px-3 py-2 text-right">{a.teams}</td>
                <td className="px-3 py-2 text-right">{a.duration_months.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{fmt(a.unit_cost)}</td>
                <td className="px-3 py-2 text-right font-semibold">{fmt(a.total_cost)}</td>
                <td className="px-3 py-2 text-right">{a.manhours.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-8">Nenhuma atividade encontrada</p>
        )}
      </div>
    </div>
  )
}
