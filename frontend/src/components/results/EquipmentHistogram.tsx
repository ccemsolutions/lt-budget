import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { EquipmentMonthEntry } from '../../types/api'

const EQ_COLORS: Record<string, string> = {
  veiculos_leves: '#60a5fa',
  caminhoes: '#f59e0b',
  guindastes_munck: '#ef4444',
  maquinas_terra: '#8b5cf6',
  equip_lancamento: '#10b981',
  perfuracao: '#f97316',
  outros: '#94a3b8',
}

const EQ_LABELS: Record<string, string> = {
  veiculos_leves: 'Veículos Leves',
  caminhoes: 'Caminhões',
  guindastes_munck: 'Guindastes/Munck',
  maquinas_terra: 'Máquinas Terrap.',
  equip_lancamento: 'Equip. Lançamento',
  perfuracao: 'Perfuração',
  outros: 'Outros',
}

const EQ_KEYS = ['veiculos_leves', 'caminhoes', 'guindastes_munck', 'maquinas_terra', 'equip_lancamento', 'perfuracao', 'outros']

interface Props {
  data: EquipmentMonthEntry[]
  peakMonth: number
  peakValue: number
}

export default function EquipmentHistogram({ data, peakMonth, peakValue }: Props) {
  const chartData = data.map(d => ({ ...d, name: `M${d.month}` }))

  return (
    <div>
      <div className="flex gap-6 mb-4 text-sm">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          <span className="text-gray-500">Pico de Equipamentos:</span>{' '}
          <strong className="text-amber-700">{peakValue.toLocaleString('pt-BR')} unid.</strong>{' '}
          <span className="text-gray-400">(Mês {peakMonth})</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={chartData} margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value: number, name: string) => [
              value.toLocaleString('pt-BR'),
              EQ_LABELS[name] ?? name,
            ]}
          />
          <Legend formatter={(v) => EQ_LABELS[v] ?? v} />
          {EQ_KEYS.map(key => (
            <Bar key={key} dataKey={key} stackId="a" fill={EQ_COLORS[key]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
