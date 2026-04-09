import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { FinancialResultRead } from '../../types/api'

const brl = (v: number) =>
  'R$ ' + (v / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M'

const brlFull = (v: number) =>
  'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface Props {
  data: FinancialResultRead
}

export default function CashFlowChart({ data }: Props) {
  const chartData = data.monthly_cash_flow.map(d => ({
    name: `M${d.month}`,
    month: d.month,
    'Desembolso Serviços': -d.disbursement_services,
    'Desembolso Materiais': -d.disbursement_materials,
    'Desembolso Outros': -d.disbursement_others,
    'Receita Medição': d.receipt_billing,
    'Adiantamento': d.receipt_advance,
    'Lib. Retenção': d.receipt_retention,
    'Saldo Acumulado': d.balance_cumulative,
  }))

  const hasExposure = data.max_exposure < 0

  return (
    <div className="space-y-6">
      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500">Preço de Venda</p>
          <p className="font-bold text-blue-700">{brlFull(data.selling_price)}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500">Margem Bruta</p>
          <p className="font-bold text-green-700">
            {brlFull(data.gross_margin_value)}{' '}
            <span className="font-normal text-green-600">({data.gross_margin_pct.toFixed(1)}%)</span>
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500">Custo Total do Projeto</p>
          <p className="font-bold text-amber-700">{brlFull(data.total_project_cost)}</p>
          {data.total_materials_cost > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              + {brlFull(data.total_materials_cost)} em materiais
            </p>
          )}
        </div>
        <div className={`border rounded-lg px-4 py-3 ${hasExposure ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
          <p className="text-xs text-gray-500">Exposição Máxima</p>
          <p className={`font-bold ${hasExposure ? 'text-red-700' : 'text-gray-600'}`}>
            {brlFull(Math.abs(data.max_exposure))}
          </p>
          {hasExposure && (
            <p className="text-xs text-red-400 mt-0.5">Mês {data.max_exposure_month}</p>
          )}
        </div>
      </div>

      {/* ── Parâmetros utilizados ────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        <span className="bg-gray-100 rounded px-2 py-1">Margem serviços: {data.margin_services_pct}%</span>
        <span className="bg-gray-100 rounded px-2 py-1">Margem materiais: {data.margin_materials_pct}%</span>
        <span className="bg-gray-100 rounded px-2 py-1">Adiantamento: {data.advance_pct}%</span>
        <span className="bg-gray-100 rounded px-2 py-1">Retenção: {data.retention_pct}%</span>
      </div>

      {/* ── Gráfico fluxo de caixa ───────────────────────────────────────── */}
      <div>
        <p className="text-xs text-gray-400 mb-3 italic">
          Barras positivas = receitas · Barras negativas = desembolsos · Linha = saldo acumulado
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 70, left: 20, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis
              yAxisId="monthly"
              tickFormatter={brl}
              tick={{ fontSize: 10 }}
              width={75}
            />
            <YAxis
              yAxisId="cumulative"
              orientation="right"
              tickFormatter={brl}
              tick={{ fontSize: 10 }}
              width={75}
            />
            <Tooltip
              formatter={(value: number, name: string) => [brlFull(Math.abs(value)), name]}
            />
            <Legend />
            <ReferenceLine yAxisId="monthly" y={0} stroke="#94a3b8" strokeWidth={1.5} />

            {/* Desembolsos (negativos) */}
            <Bar yAxisId="monthly" dataKey="Desembolso Serviços" stackId="neg" fill="#ef4444" />
            <Bar yAxisId="monthly" dataKey="Desembolso Materiais" stackId="neg" fill="#f97316" />
            <Bar yAxisId="monthly" dataKey="Desembolso Outros" stackId="neg" fill="#fbbf24" />
            {/* Receitas (positivos) */}
            <Bar yAxisId="monthly" dataKey="Adiantamento" stackId="pos" fill="#22c55e" />
            <Bar yAxisId="monthly" dataKey="Receita Medição" stackId="pos" fill="#3b82f6" />
            <Bar yAxisId="monthly" dataKey="Lib. Retenção" stackId="pos" fill="#8b5cf6" />
            {/* Saldo acumulado */}
            <Line
              yAxisId="cumulative"
              type="monotone"
              dataKey="Saldo Acumulado"
              stroke="#1d4ed8"
              strokeWidth={2.5}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
