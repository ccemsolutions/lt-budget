import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { CostBreakdownRead } from '../../types/api'

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const pct = (v: number, total: number) =>
  total > 0 ? ((v / total) * 100).toFixed(1) + '%' : '–'

const LABOR_COLORS = [
  '#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8',
  '#f59e0b', '#fbbf24', '#d97706', '#fde68a',
  '#10b981', '#34d399', '#6ee7b7', '#a7f3d0',
]

const EQUIP_COLORS = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#7c3aed', '#ddd6fe']

interface Props {
  data: CostBreakdownRead
}

export default function CostCompositionTable({ data }: Props) {
  const { labor, equipment } = data

  const laborRows: { label: string; value: number }[] = [
    { label: 'Custo Bruto (Salário)', value: labor.custo_bruto },
    { label: 'HE 50%', value: labor.he_50 },
    { label: 'HE 100%', value: labor.he_100 },
    { label: 'Encargos Sociais', value: labor.encargos },
    { label: 'Transporte', value: labor.transporte },
    { label: 'Alimentação', value: labor.alimentacao },
    { label: 'EPI', value: labor.epi },
    { label: 'Seguro de Vida', value: labor.seguro_vida },
    { label: 'Aux. Moradia', value: labor.aux_moradia },
    { label: 'Cesta Básica', value: labor.cesta_basica },
    { label: 'PPR / Participação', value: labor.ppr },
    { label: 'Assist. Médica', value: labor.assist_medica },
  ]

  const equipRows: { label: string; value: number }[] = [
    { label: 'Locação s/ Operador', value: equipment.locacao_sem_op },
    { label: 'Combustível', value: equipment.combustivel },
    { label: 'Lub. / Manutenção', value: equipment.lub_manutencao },
    { label: 'Mob. / Demob.', value: equipment.mob_demob },
    { label: 'Outros', value: equipment.outros },
  ]

  const laborPieData = laborRows
    .filter(r => r.value > 0)
    .map((r, i) => ({ name: r.label, value: r.value, color: LABOR_COLORS[i % LABOR_COLORS.length] }))

  const equipPieData = equipRows
    .filter(r => r.value > 0)
    .map((r, i) => ({ name: r.label, value: r.value, color: EQUIP_COLORS[i % EQUIP_COLORS.length] }))

  return (
    <div className="space-y-8">

      {/* ── MO Breakdown ──────────────────────────────────────────────── */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-4">
          Composição MO Direta — OutD
          <span className="ml-3 text-sm font-normal text-gray-500">{fmt(labor.total)}</span>
        </h3>
        <div className="flex gap-6">
          {/* Table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500 uppercase">
                  <th className="pb-2 font-medium">Componente</th>
                  <th className="pb-2 font-medium text-right">Total (R$)</th>
                  <th className="pb-2 font-medium text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {laborRows.map(({ label, value }) => (
                  <tr key={label} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-1.5 text-gray-700">{label}</td>
                    <td className="py-1.5 text-right font-mono text-gray-800">{fmt(value)}</td>
                    <td className="py-1.5 text-right text-gray-500">{pct(value, labor.total)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 font-semibold bg-blue-50">
                  <td className="py-2 text-blue-800">TOTAL MO</td>
                  <td className="py-2 text-right font-mono text-blue-800">{fmt(labor.total)}</td>
                  <td className="py-2 text-right text-blue-700">100%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pie chart */}
          {laborPieData.length > 0 && (
            <div className="w-56 shrink-0">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={laborPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    dataKey="value"
                    stroke="none"
                  >
                    {laborPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [fmt(v), '']}
                    contentStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── VEM Breakdown ─────────────────────────────────────────────── */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-4">
          Composição VEM — OutE
          <span className="ml-3 text-sm font-normal text-gray-500">{fmt(equipment.total)}</span>
        </h3>
        <div className="flex gap-6">
          {/* Table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500 uppercase">
                  <th className="pb-2 font-medium">Componente</th>
                  <th className="pb-2 font-medium text-right">Total (R$)</th>
                  <th className="pb-2 font-medium text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {equipRows.map(({ label, value }) => (
                  <tr key={label} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-1.5 text-gray-700">{label}</td>
                    <td className="py-1.5 text-right font-mono text-gray-800">{fmt(value)}</td>
                    <td className="py-1.5 text-right text-gray-500">{pct(value, equipment.total)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 font-semibold bg-purple-50">
                  <td className="py-2 text-purple-800">TOTAL VEM</td>
                  <td className="py-2 text-right font-mono text-purple-800">{fmt(equipment.total)}</td>
                  <td className="py-2 text-right text-purple-700">100%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pie chart */}
          {equipPieData.length > 0 && (
            <div className="w-56 shrink-0">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={equipPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    dataKey="value"
                    stroke="none"
                  >
                    {equipPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [fmt(v), '']}
                    contentStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
