import { useEffect, useRef, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { catalogApi, projectsApi } from '../../api/projects'
import type { ProjectInputsWrite, ActivityScheduleRead } from '../../types/api'

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

const CATEGORY_COLOR: Record<string, string> = {
  'Serviços Preliminares': 'bg-green-400',
  'Obras Civis':           'bg-yellow-400',
  'Aterramento':           'bg-sky-400',
  'Montagem de Estruturas':'bg-blue-500',
  'Lançamento de Cabos':   'bg-pink-400',
  'Serviços Finais':       'bg-teal-400',
  'Outros':                'bg-gray-400',
}

const CATEGORY_TEXT: Record<string, string> = {
  'Serviços Preliminares': 'text-green-800',
  'Obras Civis':           'text-yellow-800',
  'Aterramento':           'text-sky-800',
  'Montagem de Estruturas':'text-blue-900',
  'Lançamento de Cabos':   'text-pink-800',
  'Serviços Finais':       'text-teal-800',
  'Outros':                'text-gray-700',
}

interface Props {
  projectId: string
}

export default function ScheduleForm({ projectId }: Props) {
  const { register, setValue, getValues, control } = useFormContext<ProjectInputsWrite>()

  const teamsWatch      = useWatch({ control, name: 'schedule.teams_by_activity' })      ?? {}
  const factorsWatch    = useWatch({ control, name: 'schedule.productivity_factors' })    ?? {}
  const overridesWatch  = useWatch({ control, name: 'schedule.category_overrides' })      ?? {}
  const hiddenWatch     = useWatch({ control, name: 'schedule.hidden_activities' })       ?? []
  const totalMonths     = useWatch({ control, name: 'schedule.total_duration_months'})    ?? 24

  // Debounced preview state
  const [preview, setPreview]       = useState<ActivityScheduleRead[]>([])
  const [loadingPrev, setLoadingPrev] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load catalog (for KPI padrão column)
  const { data: activities = [], isLoading: loadingCatalog } = useQuery({
    queryKey: ['catalog-activities'],
    queryFn: () => catalogApi.getActivities(),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch preview whenever teams/factors change (debounced 600ms)
  useEffect(() => {
    if (!projectId) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoadingPrev(true)
      try {
        const items = await projectsApi.schedulePreview(projectId, teamsWatch, factorsWatch)
        setPreview(items)
      } catch { /* ignore */ }
      finally { setLoadingPrev(false) }
    }, 600)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [projectId, JSON.stringify(teamsWatch), JSON.stringify(factorsWatch)])

  // Build preview lookup by code
  const previewMap = Object.fromEntries(preview.map(p => [p.code, p]))

  const getTeams  = (code: string): number => Number(teamsWatch[code]  ?? 1)
  const getFactor = (code: string): number => Number(factorsWatch[code] ?? 1.0)

  function isHidden(code: string): boolean {
    return (hiddenWatch as string[]).includes(code)
  }

  function toggleHidden(code: string) {
    const current: string[] = getValues('schedule.hidden_activities') ?? []
    if (current.includes(code)) {
      setValue('schedule.hidden_activities', current.filter(c => c !== code), { shouldDirty: true })
    } else {
      setValue('schedule.hidden_activities', [...current, code], { shouldDirty: true })
    }
  }

  function getCategory(act: { code: string; category: string }): string {
    return (overridesWatch as Record<string, string>)[act.code] ?? act.category
  }

  function setCategory(code: string, cat: string) {
    const current: Record<string, string> = getValues('schedule.category_overrides') ?? {}
    if (cat === '') {
      const { [code]: _, ...rest } = current
      setValue('schedule.category_overrides', rest, { shouldDirty: true })
    } else {
      setValue('schedule.category_overrides', { ...current, [code]: cat }, { shouldDirty: true })
    }
  }

  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    items: activities.filter(a => getCategory(a) === cat),
  })).filter(g => g.items.length > 0)

  const months = Array.from({ length: Number(totalMonths) + 1 }, (_, i) => i)  // 0..totalMonths

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
                type="number" min="1"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Activity table + Gantt */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <p className="text-sm font-medium text-gray-700">Equipes, KPI e Cronograma por Atividade</p>
          {loadingPrev && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              atualizando...
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Fator ajusta o KPI padrão (1.0 = sem alteração). Células amarelas = ajustado. Barras do Gantt atualizam automaticamente.
        </p>

        {loadingCatalog ? (
          <div className="text-sm text-gray-400 py-4">Carregando atividades...</div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="text-xs border-collapse min-w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="border-r border-b px-1 py-2 text-center font-semibold text-gray-500 w-8 bg-gray-50" title="Visível">👁</th>
                  {/* Fixed left columns */}
                  <th className="border-r border-b px-2 py-2 text-left font-semibold text-gray-600 w-12 bg-gray-50">Cód.</th>
                  <th className="border-r border-b px-2 py-2 text-left font-semibold text-gray-600 bg-gray-50 min-w-48">Descrição</th>
                  <th className="border-r border-b px-2 py-2 text-center font-semibold text-purple-700 w-28 bg-purple-50">Categoria</th>
                  <th className="border-r border-b px-2 py-2 text-center font-semibold text-gray-600 w-10 bg-gray-50">Un.</th>
                  <th className="border-r border-b px-2 py-2 text-right font-semibold text-gray-600 w-20 bg-gray-50">Qtde</th>
                  <th className="border-r border-b px-2 py-2 text-right font-semibold text-gray-500 w-16 bg-gray-50">KPI<br/>Padrão</th>
                  <th className="border-r border-b px-2 py-2 text-center font-semibold text-gray-600 w-16 bg-gray-50">Fator</th>
                  <th className="border-r border-b px-2 py-2 text-right font-semibold text-amber-700 w-16 bg-amber-50">Adotado</th>
                  <th className="border-r border-b px-2 py-2 text-center font-semibold text-gray-600 w-16 bg-gray-50">Equipes</th>
                  <th className="border-r border-b px-2 py-2 text-right font-semibold text-blue-700 w-16 bg-blue-50">Duração<br/>(mês)</th>
                  {/* Month columns */}
                  {months.map(m => (
                    <th key={m} className="border-r border-b px-1 py-2 text-center font-semibold text-gray-500 w-10 bg-gray-50 whitespace-nowrap">
                      {m === 0 ? 'M0' : `M${m}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.map(({ category, items }) => (
                  <>
                    {/* Category header row */}
                    <tr key={`cat-${category}`} className="bg-gray-100">
                      <td
                        colSpan={11 + months.length}
                        className="px-3 py-1 text-xs font-bold uppercase tracking-wide text-gray-600 border-b"
                      >
                        {category}
                      </td>
                    </tr>

                    {items.map((act) => {
                      const hidden      = isHidden(act.code)
                      const factor      = getFactor(act.code)
                      const teams       = getTeams(act.code)
                      const isModFactor = Math.abs(factor - 1.0) > 0.001
                      const isModTeams  = teams !== 1
                      const catOverride = (overridesWatch as Record<string, string>)[act.code]
                      const prev        = previewMap[act.code]
                      const duration    = prev?.duration_months ?? 0
                      const startMonth  = prev?.start_month ?? 1
                      const quantity    = prev?.quantity ?? 0
                      const adopted     = (act.productivity_per_day * factor).toFixed(3)

                      // Monthly % for Gantt cells
                      const monthPct = duration > 0 ? Math.round(100 / duration) : 0

                      // Active month range [startMonth .. startMonth + duration)
                      const endMonth = startMonth + duration

                      const effectiveCat = catOverride ?? act.category
                      const barColor = CATEGORY_COLOR[effectiveCat] ?? 'bg-gray-300'
                      const textColor = CATEGORY_TEXT[effectiveCat] ?? 'text-gray-700'

                      return (
                        <tr key={act.code} className={`border-b border-gray-100 hover:bg-gray-50 ${hidden ? 'opacity-40' : ''}`}>
                          {/* Visibility toggle */}
                          <td className="border-r px-1 py-1 text-center">
                            <input
                              type="checkbox"
                              checked={!hidden}
                              onChange={() => toggleHidden(act.code)}
                              className="accent-blue-600 cursor-pointer"
                              title={hidden ? 'Ocultar atividade' : 'Atividade visível'}
                            />
                          </td>
                          {/* Code */}
                          <td className="border-r px-2 py-1 font-mono text-blue-600 font-medium">{act.code}</td>
                          {/* Description */}
                          <td className="border-r px-2 py-1 text-gray-700 truncate max-w-xs" title={act.description}>
                            {act.description}
                          </td>
                          {/* Category override */}
                          <td className="border-r px-1 py-1 bg-purple-50">
                            <select
                              value={catOverride ?? ''}
                              onChange={e => setCategory(act.code, e.target.value)}
                              className={`w-full border rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 bg-purple-50 ${catOverride ? 'border-purple-400 font-semibold text-purple-800' : 'border-gray-200 text-gray-400'}`}
                            >
                              <option value="">— padrão —</option>
                              {CATEGORY_ORDER.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </td>
                          {/* Unit */}
                          <td className="border-r px-2 py-1 text-center text-gray-500">{act.unit}</td>
                          {/* Quantity */}
                          <td className="border-r px-2 py-1 text-right font-mono text-gray-600">
                            {quantity > 0 ? quantity.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—'}
                          </td>
                          {/* KPI padrão */}
                          <td className="border-r px-2 py-1 text-right text-gray-400 font-mono">
                            {act.productivity_per_day}
                          </td>
                          {/* Fator */}
                          <td className="border-r px-1 py-1 text-center">
                            <input
                              type="number" step="0.05" min="0.1"
                              value={getFactor(act.code)}
                              onChange={e => setValue(
                                `schedule.productivity_factors.${act.code}` as any,
                                parseFloat(e.target.value) || 1.0,
                                { shouldDirty: true }
                              )}
                              className={`w-14 border rounded px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                                isModFactor ? 'border-amber-400 bg-amber-50 font-semibold' : 'border-gray-200'
                              }`}
                            />
                          </td>
                          {/* Adotado */}
                          <td className={`border-r px-2 py-1 text-right font-mono font-semibold ${isModFactor ? 'text-amber-700 bg-amber-50' : 'text-gray-600'}`}>
                            {adopted}
                          </td>
                          {/* Equipes */}
                          <td className="border-r px-1 py-1 text-center">
                            <input
                              type="number" min="1" max="99"
                              value={getTeams(act.code)}
                              onChange={e => setValue(
                                `schedule.teams_by_activity.${act.code}` as any,
                                parseInt(e.target.value) || 1,
                                { shouldDirty: true }
                              )}
                              className={`w-14 border rounded px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                                isModTeams ? 'border-blue-400 bg-blue-50 font-semibold' : 'border-gray-200'
                              }`}
                            />
                          </td>
                          {/* Duração */}
                          <td className={`border-r px-2 py-1 text-right font-mono font-semibold text-blue-700 bg-blue-50`}>
                            {duration > 0 ? duration.toFixed(2) : '—'}
                          </td>
                          {/* Gantt months */}
                          {months.map(m => {
                            const active = !hidden && duration > 0 && m >= startMonth && m < endMonth
                            return (
                              <td key={m} className={`border-r px-0.5 py-1 text-center ${active ? barColor : ''}`}>
                                {active && monthPct > 0 ? (
                                  <span className={`text-[9px] font-semibold ${textColor}`}>
                                    {monthPct}%
                                  </span>
                                ) : null}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </>
                ))}
              </tbody>
            </table>
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
              type="number" step="0.01"
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
