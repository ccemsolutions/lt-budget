import { useFormContext } from 'react-hook-form'
import type { ProjectInputsWrite } from '../../types/api'

// ─── Configuração dos grupos de MO Indireta ──────────────────────────────────
// Baseado na aba C.I. da planilha de referência
const MO_GROUPS = [
  {
    group: 'Coordenação / Gerência',
    roles: [
      { code: 'I17', label: 'Coordenador de Obra' },
      { code: 'I26', label: 'Eng. Residente de Obras' },
      { code: 'I16', label: 'Coord. Técnico de Obras' },
      { code: 'I40', label: 'Supervisor de Obra' },
      { code: 'I29', label: 'Gerente de Projetos' },
    ],
  },
  {
    group: 'Supervisão de Campo',
    roles: [
      { code: 'I35', label: 'Sup. de Campo SR' },
      { code: 'I38', label: 'Supervisor Montagem' },
      { code: 'I39', label: 'Supervisor Lançamento' },
      { code: 'I37', label: 'Supervisor Civil' },
    ],
  },
  {
    group: 'Planejamento / Engenharia',
    roles: [
      { code: 'I25', label: 'Eng. de Produção' },
      { code: 'I49', label: 'Eng. de Planejamento' },
      { code: 'I46', label: 'Téc. de Planejamento' },
      { code: 'I47', label: 'Téc. de Materiais' },
    ],
  },
  {
    group: 'QSMS',
    roles: [
      { code: 'I27', label: 'Eng. Seg. do Trabalho' },
      { code: 'I45', label: 'Téc. Seg. Trabalho SR' },
      { code: 'I32', label: 'Médico do Trabalho' },
      { code: 'I50', label: 'Enfermeiro' },
      { code: 'I42', label: 'Téc. Enfermagem' },
      { code: 'I24', label: 'Eng. Meio Ambiente' },
      { code: 'I41', label: 'Téc. Meio Ambiente' },
    ],
  },
  {
    group: 'Administração / Almoxarifado',
    roles: [
      { code: 'I14', label: 'Coord. Adm. Obras PL' },
      { code: 'I7',  label: 'Assistente Adm. SR' },
      { code: 'I8',  label: 'Aux. Administrativo' },
      { code: 'I19', label: 'Enc. de Almoxarifado SR' },
      { code: 'I9',  label: 'Aux. de Almoxarifado' },
    ],
  },
  {
    group: 'Apoio Operacional',
    roles: [
      { code: 'I33', label: 'Motorista' },
      { code: 'I10', label: 'Aux. Serviços Gerais' },
      { code: 'I28', label: 'Faxineiro' },
      { code: 'I13', label: 'Controlador de Acesso' },
    ],
  },
]

// ─── Veículos indiretos disponíveis ──────────────────────────────────────────
const VEHICLE_OPTIONS = [
  { code: 'V16', label: 'Caminhonete 4x4' },
  { code: 'V6',  label: 'Caminhão 3/4 Cabinado' },
  { code: 'V15', label: 'Caminhão Toco (10 tn)' },
  { code: 'V13', label: 'Caminhão Pipa' },
  { code: 'V10', label: 'Caminhão Munck 12 tn' },
  { code: 'V11', label: 'Caminhão Munck 18 tn' },
  { code: 'V14', label: 'Caminhão Prancha' },
  { code: 'V9',  label: 'Caminhão Carroceria Truck' },
  { code: 'V7',  label: 'Caminhão Basculante 6x4' },
]

// ─── Todos os códigos presentes no formulário ─────────────────────────────────
const ALL_ROLE_CODES = MO_GROUPS.flatMap(g => g.roles.map(r => r.code))
const ALL_VEHICLE_CODES = VEHICLE_OPTIONS.map(v => v.code)

// Formata número BR
const fmtBR = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

// ─── Helper: lê qty de um role/vehicle a partir do watch ─────────────────────
function useQtyField(
  getValues: () => ProjectInputsWrite,
  setValue: (name: string, val: unknown) => void,
  listKey: 'mo_roles' | 'vehicles',
  code: string,
) {
  const list: { code: string; qty: number }[] =
    (getValues().indirect_config[listKey] as { code: string; qty: number }[]) || []
  const item = list.find(i => i.code === code)
  const qty = item?.qty ?? 0

  const setQty = (newQty: number) => {
    const current = (getValues().indirect_config[listKey] as { code: string; qty: number }[]) || []
    const existing = current.find(i => i.code === code)
    if (existing) {
      existing.qty = newQty
      setValue(`indirect_config.${listKey}`, [...current])
    } else {
      setValue(`indirect_config.${listKey}`, [...current, { code, qty: newQty }])
    }
  }

  return { qty, setQty }
}

// ─── Componente de linha de role/vehicle ─────────────────────────────────────
function RoleRow({
  code,
  label,
  listKey,
}: {
  code: string
  label: string
  listKey: 'mo_roles' | 'vehicles'
}) {
  const { getValues, setValue, watch } = useFormContext<ProjectInputsWrite>()
  // watch para forçar re-render quando lista muda
  watch(`indirect_config.${listKey}`)

  const list: { code: string; qty: number }[] =
    (getValues().indirect_config[listKey] as { code: string; qty: number }[]) || []
  const item = list.find(i => i.code === code)
  const qty = item?.qty ?? 0

  const setQty = (newQty: number) => {
    const current = (getValues().indirect_config[listKey] as { code: string; qty: number }[]) || []
    const idx = current.findIndex(i => i.code === code)
    if (idx >= 0) {
      const updated = [...current]
      updated[idx] = { ...updated[idx], qty: newQty }
      setValue(`indirect_config.${listKey}`, updated, { shouldDirty: true })
    } else {
      setValue(`indirect_config.${listKey}`, [...current, { code, qty: newQty }], { shouldDirty: true })
    }
  }

  return (
    <tr className={qty > 0 ? 'bg-blue-50' : ''}>
      <td className="px-3 py-2 text-sm text-gray-700">{label}</td>
      <td className="px-3 py-2 text-xs text-gray-400">{code}</td>
      <td className="px-3 py-2">
        <input
          type="number"
          min={0}
          step={1}
          value={qty === 0 ? '' : qty}
          onChange={e => setQty(Number(e.target.value) || 0)}
          placeholder="0"
          className="w-20 border rounded px-2 py-1 text-sm text-center focus:border-blue-400 focus:outline-none"
        />
      </td>
    </tr>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function IndirectCostsForm() {
  const { register, watch } = useFormContext<ProjectInputsWrite>()

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-semibold text-gray-800 mb-1">Custos Indiretos</h3>
        <p className="text-sm text-gray-500">
          Configure o efetivo e custos indiretos do projeto conforme aba C.I. da planilha.
          Deixe em branco (zero) os itens que não se aplicam.
        </p>
      </div>

      {/* ── MO Indireta ─────────────────────────────────────────────────────── */}
      <section>
        <h4 className="text-sm font-semibold text-blue-700 mb-3 border-b pb-1">
          Mão de Obra Indireta
        </h4>
        {MO_GROUPS.map(group => (
          <div key={group.group} className="mb-4">
            <p className="text-xs font-medium text-gray-500 mb-1 ml-1">{group.group}</p>
            <table className="w-full border rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500">
                  <th className="px-3 py-2 text-left font-medium">Cargo</th>
                  <th className="px-3 py-2 text-left font-medium">Código</th>
                  <th className="px-3 py-2 text-center font-medium">Qtd.</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {group.roles.map(role => (
                  <RoleRow
                    key={role.code}
                    code={role.code}
                    label={role.label}
                    listKey="mo_roles"
                  />
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      {/* ── Veículos Indiretos ───────────────────────────────────────────────── */}
      <section>
        <h4 className="text-sm font-semibold text-amber-700 mb-3 border-b pb-1">
          Veículos / Equipamentos Indiretos
        </h4>
        <table className="w-full border rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500">
              <th className="px-3 py-2 text-left font-medium">Veículo</th>
              <th className="px-3 py-2 text-left font-medium">Código</th>
              <th className="px-3 py-2 text-center font-medium">Qtd.</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {VEHICLE_OPTIONS.map(v => (
              <RoleRow
                key={v.code}
                code={v.code}
                label={v.label}
                listKey="vehicles"
              />
            ))}
          </tbody>
        </table>
      </section>

      {/* ── Custos Fixos ─────────────────────────────────────────────────────── */}
      <section>
        <h4 className="text-sm font-semibold text-green-700 mb-3 border-b pb-1">
          Outros Custos Indiretos (R$/mês ou valor total)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-600 font-medium">Canteiro (R$/mês)</label>
            <p className="text-xs text-gray-400">Alojamento, escritório, pátio, almoxarifado</p>
            <input
              type="number"
              min={0}
              step={1000}
              placeholder="Ex: 800000"
              className="w-full border rounded px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              {...register('indirect_config.canteiro_custo_mes', { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-600 font-medium">Repúblicas / Hotéis (R$/mês)</label>
            <p className="text-xs text-gray-400">Hospedagem de equipes fora do canteiro</p>
            <input
              type="number"
              min={0}
              step={1000}
              placeholder="Ex: 97000"
              className="w-full border rounded px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              {...register('indirect_config.republicas_custo_mes', { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-600 font-medium">Viagens a Serviço (R$/mês)</label>
            <p className="text-xs text-gray-400">Passagens, diárias, locação eventual</p>
            <input
              type="number"
              min={0}
              step={1000}
              placeholder="Ex: 10000"
              className="w-full border rounded px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              {...register('indirect_config.viagens_custo_mes', { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-600 font-medium">Despesas QSMS (R$/mês)</label>
            <p className="text-xs text-gray-400">Exames, EPIs extras, auditorias, treinamentos</p>
            <input
              type="number"
              min={0}
              step={1000}
              placeholder="Ex: 32000"
              className="w-full border rounded px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              {...register('indirect_config.qsms_custo_mes', { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs text-gray-600 font-medium">Mobilização / Desmobilização (R$ total)</label>
            <p className="text-xs text-gray-400">Custo único de mob/demob de toda a equipe e equipamentos</p>
            <input
              type="number"
              min={0}
              step={10000}
              placeholder="Ex: 2044000"
              className="w-full border rounded px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              {...register('indirect_config.mob_demob_total', { valueAsNumber: true })}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
