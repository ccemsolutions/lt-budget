import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { PhysicalProgressEntry } from '../../types/api'

const PHASE_COLORS: Record<string, string> = {
  preliminares: '#3b82f6',
  civis: '#f59e0b',
  aterramento: '#8b5cf6',
  montagem: '#10b981',
  lancamento: '#ef4444',
  finais: '#6b7280',
  outros: '#d1d5db',
}

const PHASE_LABELS: Record<string, string> = {
  preliminares: 'Serv. Preliminares',
  civis: 'Obras Civis',
  aterramento: 'Aterramento',
  montagem: 'Montagem',
  lancamento: 'Lançamento',
  finais: 'Serv. Finais',
  outros: 'Outros',
}

const PHASE_KEYS = ['preliminares', 'civis', 'aterramento', 'montagem', 'lancamento', 'finais', 'outros']

const fmtPct = (v: number) => `${v.toFixed(1)}%`

interface Props {
  data: PhysicalProgressEntry[]
}

export default function PhysicalProgressChart({ data }: Props) {
  const chartData = data.map(d => ({ ...d, name: `M${d.month}` }))

  // Find the month where cumulative reaches 100%
  const completionMonth = data.find(d => d.cumulative_total >= 99.9)?.month

  return (
    <div>
      <div className="flex gap-6 mb-4 text-sm flex-wrap">
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          <span className="text-gray-500">Término previsto:</span>{' '}
          <strong className="text-green-700">Mês {completionMonth ?? data.length}</strong>
        </div>
        <div className="text-xs text-gray-400 self-center italic">
          Barras = avanço mensal (%) · Linha = avanço acumulado (Curva S)
        </div>
      </div>
      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 40, left: 10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          {/* Left Y axis: monthly % */}
          <YAxis
            yAxisId="monthly"
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11 }}
            domain={[0, 'auto']}
          />
          {/* Right Y axis: cumulative % */}
          <YAxis
            yAxisId="cumulative"
            orientation="right"
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11 }}
            domain={[0, 100]}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'Curva S (Acumulado)') return [`${value.toFixed(1)}%`, name]
              return [`${value.toFixed(2)}%`, PHASE_LABELS[name] ?? name]
            }}
          />
          <Legend formatter={(v) => PHASE_LABELS[v] ?? v} />
          {PHASE_KEYS.map(key => (
            <Bar
              key={key}
              yAxisId="monthly"
              dataKey={key}
              stackId="a"
              fill={PHASE_COLORS[key]}
            />
          ))}
          <Line
            yAxisId="cumulative"
            type="monotone"
            dataKey="cumulative_total"
            stroke="#1d4ed8"
            strokeWidth={2.5}
            dot={false}
            name="Curva S (Acumulado)"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
