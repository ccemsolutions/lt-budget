import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { catalogApi } from '../api/projects'
import type { ActivityCatalogRead, ResourceTemplateRead, ResourceTemplateWrite, LaborRoleRef, EquipmentItemRef, ActivityCreate } from '../types/api'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 })

const CATEGORY_ORDER = [
  'Serviços Preliminares',
  'Obras Civis',
  'Aterramento',
  'Montagem de Estruturas',
  'Lançamento de Cabos',
  'Serviços Finais',
  'Outros',
]

const TYPE_LABEL: Record<string, string> = {
  MO: 'Mão de Obra',
  VEM: 'Veículos/Equip.',
  MAT: 'Material',
  SUB: 'Subcontrato',
}

const TYPE_COLOR: Record<string, string> = {
  MO: 'bg-blue-100 text-blue-700',
  VEM: 'bg-purple-100 text-purple-700',
  MAT: 'bg-green-100 text-green-700',
  SUB: 'bg-orange-100 text-orange-700',
}

// ─── Resource Row Editor ──────────────────────────────────────────────────────

interface ResourceRowProps {
  resource: ResourceTemplateWrite & { _key: number }
  laborRoles: LaborRoleRef[]
  equipmentItems: EquipmentItemRef[]
  onChange: (key: number, updated: ResourceTemplateWrite) => void
  onRemove: (key: number) => void
}

function ResourceRow({ resource, laborRoles, equipmentItems, onChange, onRemove }: ResourceRowProps) {
  const update = (field: string, value: any) =>
    onChange(resource._key, { ...resource, [field]: value })

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-1.5 pr-2 w-28">
        <select
          value={resource.resource_type}
          onChange={e => onChange(resource._key, { resource_type: e.target.value })}
          className="w-full border rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          {Object.entries(TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </td>

      {resource.resource_type === 'MO' && (
        <>
          <td className="py-1.5 pr-2">
            <select
              value={resource.labor_role_id ?? ''}
              onChange={e => update('labor_role_id', e.target.value || undefined)}
              className="w-full border rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="">— Selecionar —</option>
              {laborRoles.map(r => (
                <option key={r.id} value={r.id}>{r.code} — {r.description}</option>
              ))}
            </select>
          </td>
          <td className="py-1.5 pr-2 w-24">
            <input
              type="number" step="0.01" min="0"
              value={resource.qty_per_team ?? ''}
              onChange={e => update('qty_per_team', parseFloat(e.target.value) || undefined)}
              placeholder="Qtd/equipe"
              className="w-full border rounded px-1.5 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </td>
          <td className="py-1.5 text-xs text-gray-400">
            {resource.labor_role_id && laborRoles.find(r => r.id === resource.labor_role_id)
              ? brl(laborRoles.find(r => r.id === resource.labor_role_id)!.company_cost_hh) + '/HH'
              : '—'}
          </td>
        </>
      )}

      {resource.resource_type === 'VEM' && (
        <>
          <td className="py-1.5 pr-2" colSpan={1}>
            <select
              value={resource.equipment_id ?? ''}
              onChange={e => update('equipment_id', e.target.value || undefined)}
              className="w-full border rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="">— Selecionar —</option>
              {equipmentItems.map(e => (
                <option key={e.id} value={e.id}>{e.code} — {e.description}</option>
              ))}
            </select>
          </td>
          <td className="py-1.5 pr-2 w-24">
            <input
              type="number" step="0.01" min="0"
              value={resource.qty_per_team ?? ''}
              onChange={e => update('qty_per_team', parseFloat(e.target.value) || undefined)}
              placeholder="Qtd/equipe"
              className="w-full border rounded px-1.5 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </td>
          <td className="py-1.5 text-xs text-gray-400">
            {resource.equipment_id && equipmentItems.find(e => e.id === resource.equipment_id)
              ? brl(equipmentItems.find(e => e.id === resource.equipment_id)!.company_cost_daily) + '/dia'
              : '—'}
          </td>
        </>
      )}

      {resource.resource_type === 'MAT' && (
        <>
          <td className="py-1.5 pr-2">
            <input
              value={resource.material_description ?? ''}
              onChange={e => update('material_description', e.target.value)}
              placeholder="Descrição do material"
              className="w-full border rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </td>
          <td className="py-1.5 pr-2 w-24">
            <input
              type="number" step="0.001" min="0"
              value={resource.material_qty_per_unit ?? ''}
              onChange={e => update('material_qty_per_unit', parseFloat(e.target.value) || undefined)}
              placeholder="Qtd/unid"
              className="w-full border rounded px-1.5 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </td>
          <td className="py-1.5">
            <input
              type="number" step="0.01" min="0"
              value={resource.material_unit_price ?? ''}
              onChange={e => update('material_unit_price', parseFloat(e.target.value) || undefined)}
              placeholder="R$/unid"
              className="w-24 border rounded px-1.5 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </td>
        </>
      )}

      {resource.resource_type === 'SUB' && (
        <>
          <td className="py-1.5 pr-2" colSpan={2}>
            <input
              value={resource.subcontractor_description ?? ''}
              onChange={e => update('subcontractor_description', e.target.value)}
              placeholder="Descrição do subcontrato"
              className="w-full border rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </td>
          <td className="py-1.5">
            <input
              type="number" step="0.01" min="0"
              value={resource.subcontractor_cost_per_unit ?? ''}
              onChange={e => update('subcontractor_cost_per_unit', parseFloat(e.target.value) || undefined)}
              placeholder="R$/unid"
              className="w-24 border rounded px-1.5 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </td>
        </>
      )}

      <td className="py-1.5 pl-2 w-8">
        <button
          onClick={() => onRemove(resource._key)}
          className="text-red-400 hover:text-red-600 text-base leading-none"
          title="Remover"
        >×</button>
      </td>
    </tr>
  )
}

// ─── Activity CPU Card ────────────────────────────────────────────────────────

interface ActivityCardProps {
  activity: ActivityCatalogRead
  laborRoles: LaborRoleRef[]
  equipmentItems: EquipmentItemRef[]
  projectId?: string
  onCloned?: () => void
  onDeleted?: () => void
}

let _keyCounter = 0
const nextKey = () => ++_keyCounter

function toWriteWithKey(r: ResourceTemplateRead): ResourceTemplateWrite & { _key: number } {
  return {
    _key: nextKey(),
    resource_type: r.resource_type,
    labor_role_id: r.labor_role_id,
    qty_per_team: r.qty_per_team,
    equipment_id: r.equipment_id,
    material_code: r.material_code,
    material_description: r.material_description,
    material_qty_per_unit: r.material_qty_per_unit,
    material_unit_price: r.material_unit_price,
    sub_code: r.sub_code,
    subcontractor_description: r.subcontractor_description,
    subcontractor_cost_per_unit: r.subcontractor_cost_per_unit,
  }
}

function ActivityCard({ activity, laborRoles, equipmentItems, projectId, onCloned, onDeleted }: ActivityCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [resources, setResources] = useState<(ResourceTemplateWrite & { _key: number })[]>(
    () => activity.resources.map(toWriteWithKey)
  )
  const [productivity, setProductivity] = useState(activity.productivity_per_day)
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  const queryClient = useQueryClient()

  const isProjectScoped = !!activity.project_id
  const isGlobal = !activity.project_id
  const canEdit = isProjectScoped || !projectId  // in project context, only edit project-scoped
  const canDelete = isProjectScoped && !!projectId

  const qKey = projectId ? ['catalog-activities', projectId] : ['catalog-activities']

  const saveMutation = useMutation({
    mutationFn: async () => {
      await catalogApi.updateProductivity(activity.id, productivity)
      await catalogApi.updateResources(activity.id, resources)
    },
    onSuccess: () => {
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      queryClient.invalidateQueries({ queryKey: qKey })
    },
  })

  const cloneMutation = useMutation({
    mutationFn: () => catalogApi.cloneActivity(activity.id, projectId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qKey })
      onCloned?.()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => catalogApi.deleteActivity(activity.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qKey })
      onDeleted?.()
    },
  })

  const handleChange = (key: number, updated: ResourceTemplateWrite) => {
    setResources(rs => rs.map(r => r._key === key ? { ...r, ...updated } : r))
    setDirty(true)
    setSaved(false)
  }

  const handleRemove = (key: number) => {
    setResources(rs => rs.filter(r => r._key !== key))
    setDirty(true)
    setSaved(false)
  }

  const handleAdd = (type: string) => {
    setResources(rs => [...rs, { _key: nextKey(), resource_type: type }])
    setDirty(true)
    setSaved(false)
  }

  const moCount = resources.filter(r => r.resource_type === 'MO').length
  const vemCount = resources.filter(r => r.resource_type === 'VEM').length
  const matCount = resources.filter(r => r.resource_type === 'MAT').length
  const subCount = resources.filter(r => r.resource_type === 'SUB').length

  return (
    <div className={`border rounded-lg overflow-hidden ${dirty ? 'border-amber-300' : 'border-gray-200'}`}>
      {/* Header */}
      <div className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
        <button className="flex items-center gap-3 flex-1 text-left min-w-0" onClick={() => setExpanded(e => !e)}>
          <span className="font-mono text-blue-600 font-semibold w-10 shrink-0">{activity.code}</span>
          <span className="text-sm text-gray-800 flex-1 truncate">{activity.description}</span>
          <span className="text-xs text-gray-400 w-12 text-center shrink-0">{activity.unit}</span>
          <span className="text-xs text-gray-400 w-36 text-right shrink-0">
            KPI: {activity.productivity_per_day} {activity.unit}/dia
          </span>
          <div className="flex gap-1 ml-2 shrink-0">
            {moCount > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TYPE_COLOR.MO}`}>MO×{moCount}</span>}
            {vemCount > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TYPE_COLOR.VEM}`}>VEM×{vemCount}</span>}
            {matCount > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TYPE_COLOR.MAT}`}>MAT×{matCount}</span>}
            {subCount > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TYPE_COLOR.SUB}`}>SUB×{subCount}</span>}
          </div>
        </button>

        {/* Scope badge */}
        {projectId && (
          isProjectScoped
            ? <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 shrink-0">Projeto</span>
            : <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500 shrink-0">Global</span>
        )}

        {dirty && <span className="text-xs text-amber-600 font-medium shrink-0">• editado</span>}
        {saved && <span className="text-xs text-green-600 font-medium shrink-0">✓ salvo</span>}

        {/* Actions */}
        {projectId && isGlobal && (
          <button
            onClick={() => cloneMutation.mutate()}
            disabled={cloneMutation.isPending}
            className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-600 hover:bg-blue-50 shrink-0 disabled:opacity-50"
            title="Clonar para este projeto"
          >
            {cloneMutation.isPending ? '...' : 'Clonar'}
          </button>
        )}

        {canDelete && (
          <button
            onClick={() => { if (confirm(`Excluir atividade ${activity.code}?`)) deleteMutation.mutate() }}
            disabled={deleteMutation.isPending}
            className="text-xs px-2 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50 shrink-0 disabled:opacity-50"
          >
            Excluir
          </button>
        )}

        <button onClick={() => setExpanded(e => !e)} className="text-gray-400 text-sm ml-1 shrink-0">
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t bg-gray-50 p-4 space-y-4">
          {/* Productivity */}
          <div className="flex items-center gap-4">
            <label className="text-xs font-medium text-gray-600 w-32">KPI Padrão ({activity.unit}/dia)</label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={productivity}
              disabled={!canEdit}
              onChange={e => { setProductivity(parseFloat(e.target.value) || 0); setDirty(true); setSaved(false) }}
              className="w-32 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
            />
            {!canEdit && (
              <span className="text-xs text-gray-400">Atividade global — clone para editar neste projeto</span>
            )}
          </div>

          {/* Resources table */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Composição de Recursos (CPU)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-gray-400">
                    <th className="pb-1 pr-2 w-28">Tipo</th>
                    <th className="pb-1 pr-2">Recurso / Descrição</th>
                    <th className="pb-1 pr-2 w-24 text-right">Qtd./Equipe</th>
                    <th className="pb-1 pr-2">Custo Ref.</th>
                    <th className="pb-1 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {resources.length === 0 && (
                    <tr><td colSpan={5} className="py-3 text-center text-gray-400">Nenhum recurso cadastrado</td></tr>
                  )}
                  {resources.map(r => (
                    <ResourceRow
                      key={r._key}
                      resource={r}
                      laborRoles={laborRoles}
                      equipmentItems={equipmentItems}
                      onChange={canEdit ? handleChange : () => {}}
                      onRemove={canEdit ? handleRemove : () => {}}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add buttons + Save */}
          {canEdit && (
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {Object.entries(TYPE_LABEL).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => handleAdd(k)}
                    className={`text-xs px-2 py-1 rounded-full border font-medium ${TYPE_COLOR[k]} hover:opacity-80`}
                  >
                    + {v}
                  </button>
                ))}
              </div>
              <button
                disabled={!dirty || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                className={`px-4 py-1.5 text-xs rounded-lg font-medium transition ${
                  dirty
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          )}

          {saveMutation.isError && (
            <p className="text-xs text-red-600">Erro ao salvar. Tente novamente.</p>
          )}
          {cloneMutation.isError && (
            <p className="text-xs text-red-600">Erro ao clonar atividade.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── New Activity Modal ───────────────────────────────────────────────────────

interface NewActivityModalProps {
  projectId?: string
  onClose: () => void
  onCreated: () => void
}

const QUANTITY_FORMULAS = [
  'line_length_km', 'total_towers', 'guyed_towers', 'self_supporting_towers',
  'ancoragens', 'peso_torres_estaiadas_ton', 'peso_torres_ap_ton',
  'excavation_tubulao_m3', 'excavation_mecanizada_m3', 'excavation_solo_fraco_m3',
  'excavation_manual_m3', 'excavation_rocha_m3', 'excavation_moledo_m3',
  'reaterro_normal_m3', 'reaterro_solo_cimento_m3',
  'cabo_para_km', 'cabo_opgw_km', 'cabo_terra_km',
  'constant_1',
]

function NewActivityModal({ projectId, onClose, onCreated }: NewActivityModalProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ActivityCreate>({
    code: '',
    description: '',
    unit: '',
    category: 'Outros',
    quantity_formula: 'constant_1',
    productivity_per_day: 0,
    fd_pct: 0.02,
    sort_order: 999,
    project_id: projectId ?? null,
  })

  const set = (field: keyof ActivityCreate, value: any) =>
    setForm(f => ({ ...f, [field]: value }))

  const createMutation = useMutation({
    mutationFn: () => catalogApi.createActivity(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectId ? ['catalog-activities', projectId] : ['catalog-activities'] })
      onCreated()
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Nova Atividade</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Código *</label>
            <input
              value={form.code}
              onChange={e => set('code', e.target.value.toUpperCase())}
              placeholder="Ex: P99"
              className="mt-1 w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Unidade *</label>
            <input
              value={form.unit}
              onChange={e => set('unit', e.target.value)}
              placeholder="Ex: un, km, m³"
              className="mt-1 w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600">Descrição *</label>
          <input
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Descrição da atividade"
            className="mt-1 w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Categoria</label>
            <select
              value={form.category}
              onChange={e => set('category', e.target.value)}
              className="mt-1 w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {CATEGORY_ORDER.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Fórmula de Quantidade</label>
            <select
              value={form.quantity_formula}
              onChange={e => set('quantity_formula', e.target.value)}
              className="mt-1 w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {QUANTITY_FORMULAS.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">KPI (unid/dia)</label>
            <input
              type="number" step="0.001" min="0"
              value={form.productivity_per_day}
              onChange={e => set('productivity_per_day', parseFloat(e.target.value) || 0)}
              className="mt-1 w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">FD %</label>
            <input
              type="number" step="0.001" min="0" max="1"
              value={form.fd_pct}
              onChange={e => set('fd_pct', parseFloat(e.target.value) || 0)}
              className="mt-1 w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Ordem</label>
            <input
              type="number" min="0"
              value={form.sort_order}
              onChange={e => set('sort_order', parseInt(e.target.value) || 999)}
              className="mt-1 w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {projectId && (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={form.project_id === projectId}
              onChange={e => set('project_id', e.target.checked ? projectId : null)}
            />
            Criar apenas para este projeto
          </label>
        )}

        {createMutation.isError && (
          <p className="text-xs text-red-600">Erro ao criar atividade. Verifique o código (deve ser único).</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !form.code || !form.description || !form.unit}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Criando...' : 'Criar Atividade'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface CatalogPageProps {
  projectId?: string
}

export default function CatalogPage({ projectId }: CatalogPageProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('Todos')
  const [scopeFilter, setScopeFilter] = useState<'all' | 'global' | 'project'>('all')
  const [showNewModal, setShowNewModal] = useState(false)

  const qKey = projectId ? ['catalog-activities', projectId] : ['catalog-activities']

  const { data: activities = [], isLoading } = useQuery({
    queryKey: qKey,
    queryFn: () => catalogApi.getActivities(projectId),
  })

  const { data: laborRoles = [] } = useQuery({
    queryKey: ['catalog-labor-roles'],
    queryFn: catalogApi.getLaborRoles,
  })

  const { data: equipmentItems = [] } = useQuery({
    queryKey: ['catalog-equipment-items'],
    queryFn: catalogApi.getEquipmentItems,
  })

  const categories = ['Todos', ...CATEGORY_ORDER]

  const filtered = activities.filter(a => {
    const matchesCat = categoryFilter === 'Todos' || a.category === categoryFilter
    const q = search.toLowerCase()
    const matchesSearch = !q || a.code.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
    const matchesScope = scopeFilter === 'all'
      || (scopeFilter === 'global' && !a.project_id)
      || (scopeFilter === 'project' && !!a.project_id)
    return matchesCat && matchesSearch && matchesScope
  })

  const grouped = CATEGORY_ORDER
    .map(cat => ({ cat, items: filtered.filter(a => a.category === cat) }))
    .filter(g => g.items.length > 0)

  const projectCount = activities.filter(a => !!a.project_id).length

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Catálogo de Atividades — CPUs</h1>
          <p className="text-sm text-gray-500 mt-1">
            {projectId
              ? `Composições do projeto — ${activities.length} atividades (${projectCount} específicas do projeto)`
              : 'Visualize e edite a composição de preços unitários (MO, VEM, MAT, SUB) e o KPI de produtividade de cada atividade.'}
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Nova Atividade
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por código ou descrição..."
          className="flex-1 min-w-48 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
        {projectId && (
          <select
            value={scopeFilter}
            onChange={e => setScopeFilter(e.target.value as any)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas</option>
            <option value="global">Globais</option>
            <option value="project">Deste Projeto</option>
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
          <div className="animate-spin w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full" />
          Carregando catálogo...
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ cat, items }) => (
            <div key={cat}>
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide border-b pb-2 mb-3">
                {cat} <span className="text-gray-400 normal-case font-normal">({items.length} atividades)</span>
              </h2>
              <div className="space-y-2">
                {items.map(a => (
                  <ActivityCard
                    key={a.id}
                    activity={a}
                    laborRoles={laborRoles}
                    equipmentItems={equipmentItems}
                    projectId={projectId}
                  />
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-10">Nenhuma atividade encontrada.</p>
          )}
        </div>
      )}

      {showNewModal && (
        <NewActivityModal
          projectId={projectId}
          onClose={() => setShowNewModal(false)}
          onCreated={() => {}}
        />
      )}
    </div>
  )
}
