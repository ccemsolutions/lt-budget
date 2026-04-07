import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { FinancialCurveEntry } from '../../types/api'

const COST_COLORS: Record<string, string> = {
  monthly_mo: '#3b82f6',
  monthly_vem: '#f59e0b',
  monthly_mat: '#10b981',
  monthly_sub: '#8b5cf6',
  monthly_fd: '#94a3b8',
}

const COST_LABELS: Record<string, string> = {
  monthly_mo: 'Mão de Obra',
  monthly_vem: 'Veículos/Equip.',
  monthly_mat: 'Materiais',
  monthly_sub: 'Subcontratação',
  monthly_fd: 'Frete/Despacho',
}

const COST_KEYS = ['monthly_mo', 'monthly_vem', 'monthly_mat', 'monthly_sub', 'monthly_fd']

const brl = (v: number) =>
  'R$ ' + (v / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'M'

const brlFull = (v: number) =>
  'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface Props {
  data: FinancialCurveEntry[]
  totalCost: number | null
}

export default function FinancialCurveChart({ data, totalCost }: Props) {
  const chartData = data.map(d => ({ ...d, name: `M${d.month}` }))

  const peakMonth = data.reduce(
    (best, d) => (d.monthly_total > best.val ? { month: d.month, val: d.monthly_total } : best),
    { month: 0, val: 0 }
  )

  return (
    <div>
      <div className="flex gap-4 mb-4 text-sm flex-wrap">
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <span className="text-gray-500">Custo Total:</span>{' '}
          <strong className="text-blue-700">{totalCost ? brlFull(totalCost) : '—'}</strong>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          <span className="text-gray-500">Pico Mensal:</span>{' '}
          <strong className="text-amber-700">{brlFull(peakMonth.val)}</strong>{' '}
          <span className="text-gray-400">(Mês {peakMonth.month})</span>
        </div>
        <div className="text-xs text-gray-400 self-center italic">
          Barras = custo mensal · Linha = custo acumulado
        </div>
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 60, left: 20, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis
            yAxisId="monthly"
            tickFormatter={(v) => brl(v)}
            tick={{ fontSize: 10 }}
            width={70}
          />
          <YAxis
            yAxisId="cumulative"
            orientation="right"
            tickFormatter={(v) => brl(v)}
            tick={{ fontSize: 10 }}
            width={70}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'Custo Acumulado') return [brlFull(value), name]
              return [brlFull(value), COST_LABELS[name] ?? name]
            }}
          />
          <Legend formatter={(v) => COST_LABELS[v] ?? v} />
          {COST_KEYS.map(key => (
            <Bar
              key={key}
              yAxisId="monthly"
              dataKey={key}
              stackId="a"
              fill={COST_COLORS[key]}
            />
          ))}
          <Line
            yAxisId="cumulative"
            type="monotone"
            dataKey="cumulative_total"
            stroke="#1d4ed8"
            strokeWidth={2.5}
            dot={false}
            name="Custo Acumulado"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
