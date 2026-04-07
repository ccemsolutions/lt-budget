import { useFormContext } from 'react-hook-form'
import type { ProjectInputsWrite } from '../../types/api'

const PHASES = [
  { key: 'start_month_preliminares', label: 'Preliminares' },
  { key: 'start_month_civil', label: 'Civil' },
  { key: 'start_month_aterramento', label: 'Aterramento' },
  { key: 'start_month_montagem', label: 'Montagem' },
  { key: 'start_month_lancamento', label: 'Lançamento' },
  { key: 'start_month_finais', label: 'Finais' },
]

const TEAMS = [
  { key: 'preliminares', label: 'Equipes Preliminares' },
  { key: 'civil', label: 'Equipes Civil' },
  { key: 'aterramento', label: 'Equipes Aterramento' },
  { key: 'montagem', label: 'Equipes Montagem' },
  { key: 'lancamento', label: 'Equipes Lançamento' },
  { key: 'finais', label: 'Equipes Finais' },
]

export default function ScheduleForm() {
  const { register } = useFormContext<ProjectInputsWrite>()

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-gray-800">Cronograma</h3>

      <div>
        <label className="block text-sm font-medium mb-1">Duração Total (meses)</label>
        <input
          {...register('schedule.total_duration_months', { valueAsNumber: true })}
          type="number"
          className="w-48 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="24"
        />
      </div>

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

      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Número de Equipes por Atividade</p>
        <div className="grid grid-cols-3 gap-3">
          {TEAMS.map((team) => (
            <div key={team.key}>
              <label className="block text-xs text-gray-600 mb-1">{team.label}</label>
              <input
                {...register(`schedule.teams_by_activity.${team.key}` as any, { valueAsNumber: true })}
                type="number"
                min="1"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1"
              />
            </div>
          ))}
        </div>
      </div>

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
