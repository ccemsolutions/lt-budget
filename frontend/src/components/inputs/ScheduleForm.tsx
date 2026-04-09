import { useFormContext, useWatch } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '../../api/projects'
import type { ProjectInputsWrite } from '../../types/api'

const PHASES = [
  { key: 'start_month_preliminares', label: 'Preliminares' },
  { key: 'start_month_civil', label: 'Civil' },
  { key: 'start_month_aterramento', label: 'Aterramento' },
  { key: 'start_month_montagem', label: 'Montagem' },
  { key: 'start_month_lancamento', label: 'Lançamento' },
  { key: 'start_month_finais', label: 'Finais' },
]

const CATEGORY_ORDER = [
  'Serviços Preliminares',
  'Obras Civis',
  'Aterramento',
  'Montagem de Estruturas',
  'Lançamento de Cabos',
  'Serviços Finais',
  'Outros',
]

export default function ScheduleForm() {
  const { register, setValue, control } = useFormContext<ProjectInputsWrite>()

  const teamsWatch = useWatch({ control, name: 'schedule.teams_by_activity' }) ?? {}
  const factorsWatch = useWatch({ control, name: 'schedule.productivity_factors' }) ?? {}

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['catalog-activities'],
    queryFn: catalogApi.getActivities,
    staleTime: 5 * 60 * 1000,
  })

  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    items: activities.filter(a => a.category === cat),
  })).filter(g => g.items.length > 0)

  const getTeams = (code: string): number => {
    const v = teamsWatch[code]
    return v !== undefined ? Number(v) : 1
  }

  const getFactor = (code: string): number => {
    const v = factorsWatch[code]
    return v !== undefined ? Number(v) : 1.0
  }

  const getAdotado = (code: string, base: number): string => {
    return (base * getFactor(code)).toFixed(3)
  }

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-gray-800">Cronograma</h3>

      {/* Duração total */}
      <div>
        <label className="block text-sm font-medium mb-1">Duração Total (meses)</label>
        <input
          {...register('schedule.total_duration_months', { valueAsNumber: true })}
          type="number"
          className="w-48 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="24"
        />
      </div>

      {/* Mês de início por fase */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Mês de Início por Fase</p>
        <div className="grid grid-cols-3 gap-3">
          {PHASES.map((phase) => (
            <div key={phase.key}>
              <label className="block text-xs text-gray-600 mb-1">{phase.label}</label>
              <input
                {...register(`schedule.${phase.key as keyof ProjectInputsWrite['schedule']}` as any, { valueAsNumber: true })}
                type="number"
                min="1"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Equipes + KPI por atividade */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-1">Equipes e KPI de Produtividade por Atividade</p>
        <p className="text-xs text-gray-400 mb-3">
          Equipes = nº de frentes simultâneas. Fator ajusta a produtividade padrão (1.0 = sem alteração). Células em amarelo indicam ajuste aplicado.
        </p>

        {isLoading ? (
          <div className="text-sm text-gray-400 py-4">Carregando atividades...</div>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ category, items }) => (
              <div key={category}>
                <div className="bg-gray-100 px-3 py-1.5 rounded text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  {category}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-1 pr-2 w-12">Cód.</th>
                        <th className="pb-1 pr-2">Descrição</th>
                        <th className="pb-1 pr-2 w-10 text-center">Un.</th>
                        <th className="pb-1 pr-3 w-24 text-right">KPI Padrão</th>
                        <th className="pb-1 pr-2 w-20 text-center">Fator</th>
                        <th className="pb-1 pr-3 w-24 text-right">Adotado</th>
                        <th className="pb-1 w-20 text-center">Equipes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((act) => {
                        const factor = getFactor(act.code)
                        const isModified = Math.abs(factor - 1.0) > 0.001
                        const teams = getTeams(act.code)
                        const teamsModified = teams !== 1
                        return (
                          <tr key={act.code} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-1 pr-2 font-mono text-blue-600 font-medium">{act.code}</td>
                            <td className="py-1 pr-2 text-gray-700 max-w-xs truncate" title={act.description}>
                              {act.description}
                            </td>
                            <td className="py-1 pr-2 text-center text-gray-500">{act.unit}</td>
                            <td className="py-1 pr-3 text-right text-gray-400 font-mono">
                              {act.productivity_per_day}
                            </td>
                            <td className="py-1 pr-2 text-center">
                              <input
                                type="number"
                                step="0.05"
                                min="0.1"
                                value={getFactor(act.code)}
                                onChange={e => setValue(
                                  `schedule.productivity_factors.${act.code}` as any,
                                  parseFloat(e.target.value) || 1.0,
                                  { shouldDirty: true }
                                )}
                                className={`w-16 border rounded px-1.5 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                                  isModified ? 'border-amber-400 bg-amber-50 text-amber-800 font-semibold' : 'border-gray-200'
                                }`}
                              />
                            </td>
                            <td className={`py-1 pr-3 text-right font-mono font-semibold ${isModified ? 'text-amber-700' : 'text-gray-600'}`}>
                              {getAdotado(act.code, act.productivity_per_day)}
                            </td>
                            <td className="py-1 text-center">
                              <input
                                type="number"
                                min="1"
                                max="99"
                                value={getTeams(act.code)}
                                onChange={e => setValue(
                                  `schedule.teams_by_activity.${act.code}` as any,
                                  parseInt(e.target.value) || 1,
                                  { shouldDirty: true }
                                )}
                                className={`w-16 border rounded px-1.5 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                                  teamsModified ? 'border-blue-400 bg-blue-50 text-blue-800 font-semibold' : 'border-gray-200'
                                }`}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Parâmetros salariais */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Parâmetros Salariais</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Encargos Sociais (%)</label>
            <input
              {...register('salary_params.encargos_pct', { valueAsNumber: true })}
              type="number"
              step="0.01"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="91"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Horas / Mês</label>
            <input
              {...register('salary_params.hours_per_month', { valueAsNumber: true })}
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="220"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Dias Úteis / Mês</label>
            <input
              {...register('salary_params.working_days_per_month', { valueAsNumber: true })}
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="22"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
