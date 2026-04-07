import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { WorkforceMonthEntry, WorkforceByRoleEntry } from '../../types/api'

const PHASE_COLORS: Record<string, string> = {
  preliminares: '#3b82f6',
  civis: '#f59e0b',
  aterramento: '#8b5cf6',
  montagem: '#10b981',
  lancamento: '#ef4444',
  finais: '#6b7280',
  outros: '#d1d5db',
  indireto: '#1e40af',
}

const PHASE_LABELS: Record<string, string> = {
  preliminares: 'Serv. Preliminares',
  civis: 'Obras Civis',
  aterramento: 'Aterramento',
  montagem: 'Montagem',
  lancamento: 'Lançamento',
  finais: 'Serv. Finais',
  outros: 'Outros',
  indireto: 'Indireto',
}

const ROLE_COLORS: Record<string, string> = {
  ajudantes: '#60a5fa',
  montadores: '#34d399',
  encarregados: '#f97316',
  motoristas: '#a78bfa',
  operadores: '#fb7185',
  topografos: '#fbbf24',
  outros_diretos: '#94a3b8',
  indiretos: '#1e40af',
}

const ROLE_LABELS: Record<string, string> = {
  ajudantes: 'Ajudantes',
  montadores: 'Montadores',
  encarregados: 'Encarregados',
  motoristas: 'Motoristas',
  operadores: 'Operadores',
  topografos: 'Topógrafos',
  outros_diretos: 'Outros Diretos',
  indiretos: 'Indiretos',
}

const PHASE_KEYS = ['indireto', 'preliminares', 'civis', 'aterramento', 'montagem', 'lancamento', 'finais', 'outros']
const ROLE_KEYS = ['ajudantes', 'montadores', 'encarregados', 'motoristas', 'operadores', 'topografos', 'outros_diretos', 'indiretos']

interface PhaseProps {
  data: WorkforceMonthEntry[]
  peakMonth: number
  peakValue: number
}

export function WorkforceByPhaseChart({ data, peakMonth, peakValue }: PhaseProps) {
  const chartData = data.map(d => ({ ...d, name: `M${d.month}` }))

  return (
    <div>
      <div className="flex gap-6 mb-4 text-sm">
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <span className="text-gray-500">Pico de Efetivo:</span>{' '}
          <strong className="text-blue-700">{peakValue.toLocaleString('pt-BR')} pessoas</strong>{' '}
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
              PHASE_LABELS[name] ?? name,
            ]}
          />
          <Legend formatter={(v) => PHASE_LABELS[v] ?? v} />
          {PHASE_KEYS.map(key => (
            <Bar key={key} dataKey={key} stackId="a" fill={PHASE_COLORS[key]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

interface RoleProps {
  data: WorkforceByRoleEntry[]
}

export function WorkforceByRoleChart({ data }: RoleProps) {
  const chartData = data.map(d => ({ ...d, name: `M${d.month}` }))

  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={chartData} margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(value: number, name: string) => [
            value.toLocaleString('pt-BR'),
            ROLE_LABELS[name] ?? name,
          ]}
        />
        <Legend formatter={(v) => ROLE_LABELS[v] ?? v} />
        {ROLE_KEYS.map(key => (
          <Bar key={key} dataKey={key} stackId="a" fill={ROLE_COLORS[key]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
