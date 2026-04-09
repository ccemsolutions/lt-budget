import { useEffect } from 'react'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { projectsApi } from '../api/projects'
import type { ProjectInputsWrite } from '../types/api'
import ProjectInfoForm from '../components/inputs/ProjectInfoForm'
import EngineeringQtyForm from '../components/inputs/EngineeringQtyForm'
import PercentSliderGroup from '../components/inputs/PercentSliderGroup'
import AccessRoadsForm from '../components/inputs/AccessRoadsForm'
import ScheduleForm from '../components/inputs/ScheduleForm'
import IndirectCostsForm from '../components/inputs/IndirectCostsForm'
import FinancialParamsForm from '../components/inputs/FinancialParamsForm'

const DEFAULT_INPUTS: ProjectInputsWrite = {
  line_length_km: 0,
  circuit_type: 'single',
  total_towers: 0,
  state: '',
  engineering: {
    guyed_towers: 0,
    self_supporting_towers: 0,
    excavation_tubulao_m3: 0,
    excavation_mecanizada_m3: 0,
    excavation_solo_fraco_m3: 0,
    excavation_manual_m3: 0,
    excavation_rocha_m3: 0,
    excavation_moledo_m3: 0,
    concrete_usinado_m3: 0,
    concrete_canteiro_m3: 0,
    concrete_manual_m3: 0,
    concrete_premoldado_m3: 0,
    rebar_ton: 0,
    estacas_aco_m: 0,
    estacas_concreto_m: 0,
    estacas_raiz_m: 0,
    helicoidais_m: 0,
    chumbadores_m: 0,
    contrapeso_m: 0,
  },
  terrain: {
    flat_pct: 0,
    undulating_pct: 0,
    steep_pct: 0,
    mountainous_pct: 0,
  },
  vegetation: {
    agriculture_pct: 0,
    light_forest_pct: 0,
    heavy_forest_pct: 0,
    reforestation_pct: 0,
    open_pct: 0,
  },
  access_roads: {
    new_roads_km: 0,
    maintenance_km: 0,
    swamp_estivas_km: 0,
  },
  crossings: {
    lt_crossings: 0,
    road_crossings: 0,
    river_crossings: 0,
    pipeline_crossings: 0,
    fences_km: 0,
    bridges: 0,
    wet_crossings: 0,
    culverts: 0,
  },
  schedule: {
    total_duration_months: 24,
    start_month_preliminares: 1,
    start_month_civil: 2,
    start_month_aterramento: 3,
    start_month_montagem: 4,
    start_month_lancamento: 5,
    start_month_finais: 20,
    teams_by_activity: {},
  },
  salary_params: {
    encargos_pct: 91,
    hours_per_month: 220,
    working_days_per_month: 22,
  },
  indirect_config: {
    mo_roles: [],
    vehicles: [],
    canteiro_custo_mes: 0,
    canteiro_meses: null,
    republicas_custo_mes: 0,
    viagens_custo_mes: 0,
    qsms_custo_mes: 0,
    mob_demob_total: 0,
  },
  financial_params: {
    margin_services_pct: 18,
    margin_materials_pct: 6.38,
    advance_pct: 10,
    retention_pct: 3,
    cost_implantacao: 0,
    cost_projeto: 0,
    cost_fundiario: 0,
    cost_seguros: 0,
    cost_outros: 0,
    materials: [],
  },
}

const STEPS = [
  'Informações Gerais',
  'Quantidades de Engenharia',
  'Terreno',
  'Vegetação',
  'Estradas e Interferências',
  'Cronograma',
  'Custos Indiretos',
  'Parâmetros Financeiros',
]

interface Props {
  projectId: string
  onSaved?: () => void
}

export default function InputsPage({ projectId, onSaved }: Props) {
  const qc = useQueryClient()
  const [step, setStep] = useState(0)
  const [saved, setSaved] = useState(false)

  const methods = useForm<ProjectInputsWrite>({ defaultValues: DEFAULT_INPUTS })

  const { data: existingInputs } = useQuery({
    queryKey: ['project-inputs', projectId],
    queryFn: () => projectsApi.getInputs(projectId),
    retry: false,
  })

  useEffect(() => {
    if (existingInputs) {
      methods.reset(existingInputs)
    }
  }, [existingInputs])

  const saveMutation = useMutation({
    mutationFn: (data: ProjectInputsWrite) => projectsApi.saveInputs(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-inputs', projectId] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      onSaved?.()
    },
  })

  const onSubmit = methods.handleSubmit((data) => saveMutation.mutate(data))

  const canPrev = step > 0
  const canNext = step < STEPS.length - 1

  return (
    <FormProvider {...methods}>
      <form onSubmit={onSubmit}>
        {/* Step indicators */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={`flex-shrink-0 px-3 py-1.5 text-xs rounded-full font-medium transition ${
                i === step
                  ? 'bg-blue-600 text-white'
                  : i < step
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {i + 1}. {s}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6 min-h-64">
          {step === 0 && <ProjectInfoForm />}
          {step === 1 && <EngineeringQtyForm />}
          {step === 2 && (
            <PercentSliderGroup
              title="Distribuição do Terreno"
              fields={[
                { name: 'terrain.flat_pct', label: 'Plano' },
                { name: 'terrain.undulating_pct', label: 'Ondulado' },
                { name: 'terrain.steep_pct', label: 'Acidentado' },
                { name: 'terrain.mountainous_pct', label: 'Montanhoso' },
              ]}
            />
          )}
          {step === 3 && (
            <PercentSliderGroup
              title="Vegetação"
              fields={[
                { name: 'vegetation.agriculture_pct', label: 'Agricultura' },
                { name: 'vegetation.light_forest_pct', label: 'Mata Leve' },
                { name: 'vegetation.heavy_forest_pct', label: 'Mata Pesada' },
                { name: 'vegetation.reforestation_pct', label: 'Reflorestamento' },
                { name: 'vegetation.open_pct', label: 'Área Aberta' },
              ]}
            />
          )}
          {step === 4 && <AccessRoadsForm />}
          {step === 5 && <ScheduleForm />}
          {step === 6 && <IndirectCostsForm />}
          {step === 7 && <FinancialParamsForm />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-5">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => setStep((s) => s - 1)}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-30 hover:bg-gray-50"
          >
            ← Anterior
          </button>

          <div className="flex gap-3">
            {saved && <span className="text-green-600 text-sm self-center">✓ Salvo!</span>}
            {saveMutation.isError && (
              <span className="text-red-600 text-sm self-center">Erro ao salvar</span>
            )}
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Salvando...' : 'Salvar Entradas'}
            </button>
          </div>

          <button
            type="button"
            disabled={!canNext}
            onClick={() => setStep((s) => s + 1)}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-30 hover:bg-gray-50"
          >
            Próximo →
          </button>
        </div>
      </form>
    </FormProvider>
  )
}
