import { useFormContext, useWatch } from 'react-hook-form'
import type { ProjectInputsWrite } from '../../types/api'

function Field({ label, name, unit, integer }: { label: string; name: string; unit?: string; integer?: boolean }) {
  const { register } = useFormContext<ProjectInputsWrite>()
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{unit ? <span className="text-gray-400 font-normal"> ({unit})</span> : null}
      </label>
      <input
        {...register(name as any, { valueAsNumber: true })}
        type="number"
        step={integer ? '1' : '0.01'}
        min="0"
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="0"
      />
    </div>
  )
}

function PctField({ label, name }: { label: string; name: string }) {
  const { register } = useFormContext<ProjectInputsWrite>()
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label} (%)</label>
      <input
        {...register(name as any, { valueAsNumber: true })}
        type="number"
        step="0.1"
        min="0"
        max="100"
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="0"
      />
    </div>
  )
}

function SectionHeader({ title, color = 'blue' }: { title: string; color?: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    teal: 'bg-teal-50 border-teal-200 text-teal-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  }
  return (
    <div className={`px-3 py-1.5 rounded border text-xs font-semibold uppercase tracking-wide ${colorMap[color] ?? colorMap.blue}`}>
      {title}
    </div>
  )
}

function SumRow({ label, fields }: { label: string; fields: string[] }) {
  const values = useWatch({ name: fields as any[] }) as number[]
  const total = values.reduce((s, v) => s + (Number(v) || 0), 0)
  return (
    <div className="col-span-full flex items-center justify-between bg-gray-50 rounded px-3 py-1.5 text-xs">
      <span className="text-gray-600 font-medium">{label}</span>
      <span className="font-semibold text-gray-800">{total.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
    </div>
  )
}

export default function EngineeringQtyForm() {
  const guyed = useWatch({ name: 'engineering.guyed_towers' }) as number
  const ap = useWatch({ name: 'engineering.self_supporting_towers' }) as number
  const pesoEst = useWatch({ name: 'engineering.peso_torres_estaiadas_ton' }) as number
  const pesoAp = useWatch({ name: 'engineering.peso_torres_ap_ton' }) as number
  const totalTorres = (Number(guyed) || 0) + (Number(ap) || 0)
  const totalPeso = (Number(pesoEst) || 0) + (Number(pesoAp) || 0)

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-gray-800">Quantidades de Engenharia</h3>

      {/* ESTRUTURAS */}
      <div className="space-y-3">
        <SectionHeader title="Estruturas" color="blue" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Torres Estaiadas" name="engineering.guyed_towers" unit="un" integer />
          <Field label="Torres AP / Autoportantes" name="engineering.self_supporting_towers" unit="un" integer />
          <Field label="Ancoragens" name="engineering.ancoragens" unit="un" integer />
          <div className="flex items-end gap-2 rounded bg-blue-50 px-3 py-2">
            <span className="text-xs text-blue-700 font-medium">Total Torres:</span>
            <span className="text-sm font-bold text-blue-900">{totalTorres}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Peso Torres Estaiadas" name="engineering.peso_torres_estaiadas_ton" unit="ton" />
          <Field label="Peso Torres AP" name="engineering.peso_torres_ap_ton" unit="ton" />
          <PctField label="% Montagem Manual Estaiada" name="engineering.montagem_manual_estaiada_pct" />
          <PctField label="% Montagem Manual AP" name="engineering.montagem_manual_ap_pct" />
          <div className="col-span-2 flex items-center justify-between bg-blue-50 rounded px-3 py-1.5 text-xs">
            <span className="text-blue-700 font-medium">Peso Total de Aço:</span>
            <span className="font-bold text-blue-900">{totalPeso.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ton</span>
          </div>
        </div>
      </div>

      {/* ESCAVAÇÃO + REATERRO side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <SectionHeader title="Escavação" color="orange" />
          <div className="grid grid-cols-1 gap-2">
            <Field label="Tubulão c/ Perfuratriz" name="engineering.excavation_tubulao_m3" unit="m³" />
            <Field label="Mecanizada c/ Retro" name="engineering.excavation_mecanizada_m3" unit="m³" />
            <Field label="Solo Fraco / Areia / Brejo" name="engineering.excavation_solo_fraco_m3" unit="m³" />
            <Field label="Manual c/ Martelete" name="engineering.excavation_manual_m3" unit="m³" />
            <Field label="Rocha c/ Explosivos" name="engineering.excavation_rocha_m3" unit="m³" />
            <Field label="Moledo" name="engineering.excavation_moledo_m3" unit="m³" />
            <SumRow
              label="Total Escavação (m³)"
              fields={[
                'engineering.excavation_tubulao_m3',
                'engineering.excavation_mecanizada_m3',
                'engineering.excavation_solo_fraco_m3',
                'engineering.excavation_manual_m3',
                'engineering.excavation_rocha_m3',
                'engineering.excavation_moledo_m3',
              ]}
            />
          </div>
        </div>

        <div className="space-y-3">
          <SectionHeader title="Reaterro" color="green" />
          <div className="grid grid-cols-1 gap-2">
            <Field label="Reaterro Normal" name="engineering.reaterro_normal_m3" unit="m³" />
            <Field label="Solo-Cimento" name="engineering.reaterro_solo_cimento_m3" unit="m³" />
            <Field label="Solo Empréstimo" name="engineering.reaterro_solo_emprestimo_m3" unit="m³" />
            <SumRow
              label="Total Reaterro (m³)"
              fields={[
                'engineering.reaterro_normal_m3',
                'engineering.reaterro_solo_cimento_m3',
                'engineering.reaterro_solo_emprestimo_m3',
              ]}
            />
          </div>
        </div>
      </div>

      {/* CONCRETO + AÇO side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <SectionHeader title="Concreto" color="purple" />
          <div className="grid grid-cols-1 gap-2">
            <Field label="Concreto Usinado" name="engineering.concrete_usinado_m3" unit="m³" />
            <Field label="Usinado no Canteiro" name="engineering.concrete_canteiro_m3" unit="m³" />
            <Field label="Concreto Manual" name="engineering.concrete_manual_m3" unit="m³" />
            <Field label="Pré-Moldado Pátio" name="engineering.concrete_premoldado_m3" unit="m³" />
            <Field label="Pré-Moldado Pátio" name="engineering.concrete_premoldado_pecas" unit="peças" integer />
            <SumRow
              label="Total Concreto (m³)"
              fields={[
                'engineering.concrete_usinado_m3',
                'engineering.concrete_canteiro_m3',
                'engineering.concrete_manual_m3',
                'engineering.concrete_premoldado_m3',
              ]}
            />
          </div>
        </div>

        <div className="space-y-3">
          <SectionHeader title="Aço" color="teal" />
          <div className="grid grid-cols-1 gap-2">
            <Field label="Aço CA-50" name="engineering.rebar_ton" unit="ton" />
            <Field label="Chumbadores — Peso Aço" name="engineering.chumbadores_ton" unit="ton" />
            <Field label="Grampo U" name="engineering.grampo_u_un" unit="un" integer />
            <Field label="Tubulão" name="engineering.tubulao_tr" unit="tr" integer />
          </div>
        </div>
      </div>

      {/* FUNDAÇÕES / DIVERSOS */}
      <div className="space-y-3">
        <SectionHeader title="Fundações Especiais / Diversos" color="gray" />
        <div className="grid grid-cols-3 gap-3">
          <Field label="Ancoragem em Rocha / Chumbador" name="engineering.chumbadores_m" unit="m" />
          <Field label="Estai Ancorado em Rocha" name="engineering.estai_ancorado_rocha_m" unit="m" />
          <Field label="Viga L INCOTEP" name="engineering.viga_l_m" unit="m" />
          <Field label="Estacas Aço" name="engineering.estacas_aco_m" unit="m" />
          <Field label="Estacas de Concreto" name="engineering.estacas_concreto_m" unit="m" />
          <Field label="Estacas Escavadas" name="engineering.estacas_escavadas_m" unit="m" />
          <Field label="Estacas Raiz" name="engineering.estacas_raiz_m" unit="m" />
          <Field label="Estacas Helicoidais" name="engineering.helicoidais_m" unit="m" />
          <Field label="Cabo Contrapeso" name="engineering.contrapeso_m" unit="m" />
          <Field label="Perfuração 50–100mm" name="engineering.perfuracao_m" unit="m" />
          <Field label="Defensas de Concreto" name="engineering.defensas_concreto_tr" unit="tr" integer />
          <Field label="Poço Profundo" name="engineering.poco_profundo_m" unit="m" />
        </div>
      </div>
    </div>
  )
}
