import type { BudgetSummaryRead } from '../../types/api'

const fmt = (v: number) =>
  'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtHH = (v: number) =>
  v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })

interface Props {
  summaries: BudgetSummaryRead[]
}

export default function CategorySummaryTable({ summaries }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 text-gray-600 text-left">
            <th className="px-4 py-3 font-medium">Categoria</th>
            <th className="px-4 py-3 font-medium text-right">MO</th>
            <th className="px-4 py-3 font-medium text-right">VEM</th>
            <th className="px-4 py-3 font-medium text-right">MAT</th>
            <th className="px-4 py-3 font-medium text-right">SUB</th>
            <th className="px-4 py-3 font-medium text-right">FD</th>
            <th className="px-4 py-3 font-medium text-right">Total</th>
            <th className="px-4 py-3 font-medium text-right">HH</th>
            <th className="px-4 py-3 font-medium text-right">%</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((row, i) => (
            <tr key={row.category} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-3 font-medium text-gray-800">{row.category}</td>
              <td className="px-4 py-3 text-right text-gray-600">{fmt(row.mo_cost)}</td>
              <td className="px-4 py-3 text-right text-gray-600">{fmt(row.vem_cost)}</td>
              <td className="px-4 py-3 text-right text-gray-600">{fmt(row.mat_cost)}</td>
              <td className="px-4 py-3 text-right text-gray-600">{fmt(row.sub_cost)}</td>
              <td className="px-4 py-3 text-right text-gray-600">{fmt(row.fd_cost)}</td>
              <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(row.total_cost)}</td>
              <td className="px-4 py-3 text-right text-gray-600">{fmtHH(row.manhours)}</td>
              <td className="px-4 py-3 text-right text-blue-700 font-medium">{row.pct_of_total.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-blue-50 font-bold border-t-2 border-blue-200">
            <td className="px-4 py-3">TOTAL</td>
            <td className="px-4 py-3 text-right">{fmt(summaries.reduce((s, r) => s + r.mo_cost, 0))}</td>
            <td className="px-4 py-3 text-right">{fmt(summaries.reduce((s, r) => s + r.vem_cost, 0))}</td>
            <td className="px-4 py-3 text-right">{fmt(summaries.reduce((s, r) => s + r.mat_cost, 0))}</td>
            <td className="px-4 py-3 text-right">{fmt(summaries.reduce((s, r) => s + r.sub_cost, 0))}</td>
            <td className="px-4 py-3 text-right">{fmt(summaries.reduce((s, r) => s + r.fd_cost, 0))}</td>
            <td className="px-4 py-3 text-right text-blue-700">{fmt(summaries.reduce((s, r) => s + r.total_cost, 0))}</td>
            <td className="px-4 py-3 text-right">{fmtHH(summaries.reduce((s, r) => s + r.manhours, 0))}</td>
            <td className="px-4 py-3 text-right">100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
