import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { projectsApi } from '../api/projects'
import type { ActivityScheduleRead } from '../types/api'

interface Props {
  projectId: string
}

const CATEGORY_COLOR: Record<string, { bg: string; text: string; light: string }> = {
  'Serviços Preliminares': { bg: 'bg-green-500',   text: 'text-green-800',  light: 'bg-green-100'  },
  'Obras Civis':           { bg: 'bg-yellow-400',  text: 'text-yellow-800', light: 'bg-yellow-50'  },
  'Aterramento':           { bg: 'bg-sky-400',     text: 'text-sky-800',    light: 'bg-sky-50'     },
  'Montagem de Estruturas':{ bg: 'bg-blue-500',    text: 'text-blue-800',   light: 'bg-blue-50'    },
  'Lançamento de Cabos':   { bg: 'bg-pink-500',    text: 'text-pink-800',   light: 'bg-pink-50'    },
  'Serviços Finais':       { bg: 'bg-teal-500',    text: 'text-teal-800',   light: 'bg-teal-50'    },
  'Outros':                { bg: 'bg-gray-400',    text: 'text-gray-700',   light: 'bg-gray-50'    },
}
const DEFAULT_COLOR = { bg: 'bg-gray-400', text: 'text-gray-700', light: 'bg-gray-50' }

function getColor(category: string) {
  return CATEGORY_COLOR[category] ?? DEFAULT_COLOR
}

interface GroupedRow {
  label: string
  category: string
  start_month: number
  end_month: number
  duration_months: number
  is_group: boolean
  activities?: ActivityScheduleRead[]
}

export default function SchedulePage({ projectId }: Props) {
  const [mode, setMode] = useState<'detailed' | 'master'>('master')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Load saved inputs to get teams + factors
  const { data: inputs } = useQuery({
    queryKey: ['project-inputs', projectId],
    queryFn: () => projectsApi.getInputs(projectId),
    retry: false,
  })

  const teams   = (inputs?.schedule?.teams_by_activity   ?? {}) as Record<string, number>
  const factors = (inputs?.schedule?.productivity_factors ?? {}) as Record<string, number>
  const totalMonths = inputs?.schedule?.total_duration_months ?? 24

  const { data: schedule = [], isLoading } = useQuery({
    queryKey: ['schedule-preview', projectId, teams, factors],
    queryFn: () => projectsApi.schedulePreview(projectId, teams, factors),
    enabled: !!inputs,
  })

  const months = Array.from({ length: totalMonths }, (_, i) => i + 1)

  // Build category groups
  const categoryOrder = [
    'Serviços Preliminares',
    'Obras Civis',
    'Aterramento',
    'Montagem de Estruturas',
    'Lançamento de Cabos',
    'Serviços Finais',
    'Outros',
  ]

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityScheduleRead[]>()
    for (const act of schedule) {
      const cat = act.category || 'Outros'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(act)
    }
    // Sort categories by predefined order, then unknowns
    const cats = [...map.keys()].sort((a, b) => {
      const ia = categoryOrder.indexOf(a)
      const ib = categoryOrder.indexOf(b)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })

    const rows: GroupedRow[] = []
    for (const cat of cats) {
      const acts = map.get(cat)!
      const start = Math.min(...acts.map(a => a.start_month))
      const end   = Math.max(...acts.map(a => a.start_month + a.duration_months))
      rows.push({
        label: cat,
        category: cat,
        start_month: start,
        end_month: end,
        duration_months: end - start,
        is_group: true,
        activities: acts,
      })
    }
    return rows
  }, [schedule])

  // Detailed rows: category header + individual activities
  const detailedRows = useMemo(() => {
    const rows: Array<GroupedRow & { is_category_header?: boolean }> = []
    for (const grp of grouped) {
      rows.push({ ...grp, is_category_header: true })
      if (expandedCategories.has(grp.category)) {
        for (const act of grp.activities ?? []) {
          rows.push({
            label: act.description,
            category: act.category,
            start_month: act.start_month,
            end_month: act.start_month + act.duration_months,
            duration_months: act.duration_months,
            is_group: false,
          })
        }
      }
    }
    return rows
  }, [grouped, expandedCategories])

  const visibleRows = mode === 'master' ? grouped : detailedRows

  function toggleCategory(cat: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  function fmtDuration(d: number) {
    if (d <= 0) return '—'
    return `${d.toFixed(1)} m`
  }

  const COL_W = 36 // px per month column
  const LEFT_W = 320 // px for label column

  if (isLoading || !inputs) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        Carregando cronograma...
      </div>
    )
  }

  if (schedule.length === 0) {
    return (
      <div className="text-center py-24 text-gray-400">
        <p className="mb-1">Nenhuma atividade com quantidade &gt; 0</p>
        <p className="text-sm">Preencha as quantidades de engenharia nas Entradas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Cronograma do Projeto</h2>
          <p className="text-xs text-gray-500">
            {schedule.length} atividades · {totalMonths} meses totais
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Visualização:</span>
          <div className="flex rounded-lg border overflow-hidden text-sm">
            <button
              onClick={() => setMode('master')}
              className={`px-4 py-1.5 font-medium transition ${
                mode === 'master'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Master Plan
            </button>
            <button
              onClick={() => setMode('detailed')}
              className={`px-4 py-1.5 font-medium transition ${
                mode === 'detailed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Detalhado
            </button>
          </div>
        </div>
      </div>

      {/* Gantt table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: LEFT_W + COL_W * totalMonths }}>

            {/* Header: fixed left + month columns */}
            <div className="flex border-b bg-gray-50 sticky top-0 z-10">
              <div
                style={{ width: LEFT_W, minWidth: LEFT_W }}
                className="flex-shrink-0 px-4 py-2 text-xs font-semibold text-gray-600 border-r"
              >
                Atividade
              </div>
              <div className="flex-shrink-0 w-16 px-2 py-2 text-xs font-semibold text-gray-600 text-right border-r">
                Início
              </div>
              <div className="flex-shrink-0 w-16 px-2 py-2 text-xs font-semibold text-gray-600 text-right border-r">
                Dur. (m)
              </div>
              {months.map(m => (
                <div
                  key={m}
                  style={{ width: COL_W, minWidth: COL_W }}
                  className={`flex-shrink-0 text-center text-xs py-2 border-r last:border-r-0 font-medium ${
                    m % 6 === 0 ? 'bg-blue-50 text-blue-700' : 'text-gray-500'
                  }`}
                >
                  {m}
                </div>
              ))}
            </div>

            {/* Rows */}
            {visibleRows.map((row, i) => {
              const color = getColor(row.category)
              const isHeader = (row as any).is_category_header === true
              const isGroup = row.is_group

              // Bar geometry
              const barStart = row.start_month - 1   // 0-based index
              const barLen   = Math.max(row.duration_months, 0.1)

              return (
                <div
                  key={i}
                  className={`flex border-b last:border-b-0 ${
                    isHeader || isGroup ? color.light : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  {/* Label */}
                  <div
                    style={{ width: LEFT_W, minWidth: LEFT_W }}
                    className="flex-shrink-0 px-4 py-2 border-r flex items-center gap-2"
                  >
                    {(isHeader || isGroup) && mode === 'detailed' && (
                      <button
                        onClick={() => toggleCategory(row.category)}
                        className="text-gray-400 hover:text-gray-700 w-4 text-xs flex-shrink-0"
                      >
                        {expandedCategories.has(row.category) ? '▼' : '▶'}
                      </button>
                    )}
                    {(isHeader || isGroup) ? (
                      <span className={`text-xs font-bold ${color.text} truncate`}>
                        {row.label}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-700 truncate pl-4" title={row.label}>
                        {row.label}
                      </span>
                    )}
                  </div>

                  {/* Start month */}
                  <div className="flex-shrink-0 w-16 px-2 py-2 text-xs text-gray-600 text-right border-r flex items-center justify-end">
                    {row.start_month > 0 ? `M${row.start_month}` : '—'}
                  </div>

                  {/* Duration */}
                  <div className="flex-shrink-0 w-16 px-2 py-2 text-xs text-gray-600 text-right border-r flex items-center justify-end">
                    {fmtDuration(row.duration_months)}
                  </div>

                  {/* Month cells with Gantt bar */}
                  <div className="flex relative items-center" style={{ width: COL_W * totalMonths }}>
                    {/* Month grid lines */}
                    {months.map(m => (
                      <div
                        key={m}
                        style={{ width: COL_W, minWidth: COL_W }}
                        className={`flex-shrink-0 h-full border-r last:border-r-0 ${
                          m % 6 === 0 ? 'bg-blue-50/30' : ''
                        }`}
                      />
                    ))}

                    {/* Gantt bar overlay */}
                    {row.duration_months > 0 && row.start_month > 0 && (
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 rounded ${
                          isHeader || isGroup ? color.bg + ' opacity-90' : color.bg + ' opacity-70'
                        }`}
                        style={{
                          left: barStart * COL_W + 2,
                          width: Math.max(barLen * COL_W - 4, 4),
                          height: isHeader || isGroup ? 20 : 14,
                        }}
                        title={`${row.label}: M${row.start_month} → M${(row.start_month + row.duration_months).toFixed(1)} (${row.duration_months.toFixed(1)} meses)`}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(CATEGORY_COLOR).map(([cat, c]) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${c.bg}`} />
            <span className="text-xs text-gray-600">{cat}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
