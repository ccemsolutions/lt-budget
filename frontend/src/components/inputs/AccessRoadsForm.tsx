import { useFormContext } from 'react-hook-form'
import type { ProjectInputsWrite } from '../../types/api'

export default function AccessRoadsForm() {
  const { register } = useFormContext<ProjectInputsWrite>()

  return (
    <div className="space-y-8">
      {/* ── Estradas ──────────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-4">Estradas de Acesso</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Novas Estradas (km)</label>
            <input
              {...register('access_roads.new_roads_km', { valueAsNumber: true })}
              type="number" step="0.01"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Manutenção (km)</label>
            <input
              {...register('access_roads.maintenance_km', { valueAsNumber: true })}
              type="number" step="0.01"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Travessias em Estiva (km)</label>
            <input
              {...register('access_roads.swamp_estivas_km', { valueAsNumber: true })}
              type="number" step="0.01"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* ── Interferências e Obras Especiais ──────────────────────────────── */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-1">Interferências e Obras Especiais</h3>
        <p className="text-xs text-gray-500 mb-4">
          Travessias especiais, cercas e obras de arte conforme levantamento de campo
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Travessias de LTs (und.)</label>
            <input
              {...register('crossings.lt_crossings', { valueAsNumber: true })}
              type="number" min={0} step={1}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Travessias de Rodovias (und.)</label>
            <input
              {...register('crossings.road_crossings', { valueAsNumber: true })}
              type="number" min={0} step={1}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Travessias de Rios (und.)</label>
            <input
              {...register('crossings.river_crossings', { valueAsNumber: true })}
              type="number" min={0} step={1}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Travessias Dutos (und.)</label>
            <input
              {...register('crossings.pipeline_crossings', { valueAsNumber: true })}
              type="number" min={0} step={1}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cercas (km)</label>
            <input
              {...register('crossings.fences_km', { valueAsNumber: true })}
              type="number" min={0} step={0.1}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Pontes (und.)</label>
            <input
              {...register('crossings.bridges', { valueAsNumber: true })}
              type="number" min={0} step={1}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Passagens Molhadas (und.)</label>
            <input
              {...register('crossings.wet_crossings', { valueAsNumber: true })}
              type="number" min={0} step={1}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bueiros (und.)</label>
            <input
              {...register('crossings.culverts', { valueAsNumber: true })}
              type="number" min={0} step={1}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
