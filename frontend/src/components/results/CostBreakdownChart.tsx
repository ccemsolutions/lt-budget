import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import type { BudgetSummaryRead } from '../../types/api'

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed']
const LABELS: Record<string, string> = {
  mo: 'Mão de Obra',
  vem: 'Veículos/Equip.',
  mat: 'Materiais',
  sub: 'Subcontratados',
  fd: 'Fundo de Despesas',
}

interface Props {
  summaries: BudgetSummaryRead[]
}

export default function CostBreakdownChart({ summaries }: Props) {
  const totals = summaries.reduce(
    (acc, r) => ({
      mo: acc.mo + r.mo_cost,
      vem: acc.vem + r.vem_cost,
      mat: acc.mat + r.mat_cost,
      sub: acc.sub + r.sub_cost,
      fd: acc.fd + r.fd_cost,
    }),
    { mo: 0, vem: 0, mat: 0, sub: 0, fd: 0 }
  )

  const data = Object.entries(totals)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: LABELS[k] ?? k, value: v }))

  const fmtPct = (value: number, name: string, props: any) => {
    const total = data.reduce((s, d) => s + d.value, 0)
    return [`${((value / total) * 100).toFixed(1)}%`, name]
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={100}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={fmtPct} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
