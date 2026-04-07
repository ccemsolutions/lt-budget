import { useFormContext } from 'react-hook-form'
import type { ProjectInputsWrite } from '../../types/api'

function Field({ label, name, placeholder }: { label: string; name: string; placeholder?: string }) {
  const { register } = useFormContext<ProjectInputsWrite>()
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        {...register(name as any, { valueAsNumber: true })}
        type="number"
        step="0.01"
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder ?? '0'}
      />
    </div>
  )
}

export default function EngineeringQtyForm() {
  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-gray-800">Quantidades de Engenharia</h3>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Torres</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Torres Estaiadas (un)" name="engineering.guyed_towers" />
          <Field label="Torres AP / Autoportantes (un)" name="engineering.self_supporting_towers" />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Escavação</p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Tubulão (m³)" name="engineering.excavation_tubulao_m3" />
          <Field label="Mecanizada (m³)" name="engineering.excavation_mecanizada_m3" />
          <Field label="Solo Fraco (m³)" name="engineering.excavation_solo_fraco_m3" />
          <Field label="Manual (m³)" name="engineering.excavation_manual_m3" />
          <Field label="Rocha (m³)" name="engineering.excavation_rocha_m3" />
          <Field label="Moledo (m³)" name="engineering.excavation_moledo_m3" />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Concreto</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Usinado (m³)" name="engineering.concrete_usinado_m3" />
          <Field label="Canteiro (m³)" name="engineering.concrete_canteiro_m3" />
          <Field label="Manual (m³)" name="engineering.concrete_manual_m3" />
          <Field label="Pré-moldado (m³)" name="engineering.concrete_premoldado_m3" />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Aço / Fundações Especiais</p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Aço (ton)" name="engineering.rebar_ton" />
          <Field label="Estacas Aço (m)" name="engineering.estacas_aco_m" />
          <Field label="Estacas Concreto (m)" name="engineering.estacas_concreto_m" />
          <Field label="Estacas Raiz (m)" name="engineering.estacas_raiz_m" />
          <Field label="Helicoidais (m)" name="engineering.helicoidais_m" />
          <Field label="Chumbadores (m)" name="engineering.chumbadores_m" />
          <Field label="Contrapeso (m)" name="engineering.contrapeso_m" />
        </div>
      </div>
    </div>
  )
}
