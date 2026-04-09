import { useFormContext } from 'react-hook-form'
import type { ProjectInputsWrite } from '../../types/api'

const STATES = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

export default function ProjectInfoForm() {
  const { register, formState: { errors } } = useFormContext<ProjectInputsWrite>()

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-gray-800">Informações Gerais</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Extensão da Linha (km) *</label>
          <input
            {...register('line_length_km', { valueAsNumber: true })}
            type="number"
            step="0.01"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="278"
          />
          {errors.line_length_km && <p className="text-red-500 text-xs mt-1">{errors.line_length_km.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Total de Torres *</label>
          <input
            {...register('total_towers', { valueAsNumber: true })}
            type="number"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="615"
          />
          {errors.total_towers && <p className="text-red-500 text-xs mt-1">{errors.total_towers.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tipo de Circuito *</label>
          <select
            {...register('circuit_type')}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="single">Simples</option>
            <option value="double">Duplo</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Estado (UF)</label>
          <select
            {...register('state')}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Selecione —</option>
            {STATES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
