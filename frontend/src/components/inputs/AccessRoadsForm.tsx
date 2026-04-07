import { useFormContext } from 'react-hook-form'
import type { ProjectInputsWrite } from '../../types/api'

export default function AccessRoadsForm() {
  const { register } = useFormContext<ProjectInputsWrite>()

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-gray-800">Estradas de Acesso</h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Novas Estradas (km)</label>
          <input
            {...register('access_roads.new_roads_km', { valueAsNumber: true })}
            type="number"
            step="0.01"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Manutenção (km)</label>
          <input
            {...register('access_roads.maintenance_km', { valueAsNumber: true })}
            type="number"
            step="0.01"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Travessias em Estiva (km)</label>
          <input
            {...register('access_roads.swamp_estivas_km', { valueAsNumber: true })}
            type="number"
            step="0.01"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
          />
        </div>
      </div>
    </div>
  )
}
