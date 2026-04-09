import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { catalogApi } from '../api/projects'
import type { ActivityCatalogRead, ResourceTemplateRead, ResourceTemplateWrite, LaborRoleRef, EquipmentItemRef } from '../types/api'

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

function ActivityCard({ activity, laborRoles, equipmentItems }: ActivityCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [resources, setResources] = useState<(ResourceTemplateWrite & { _key: number })[]>(
    () => activity.resources.map(toWriteWithKey)
  )
  const [productivity, setProductivity] = useState(activity.productivity_per_day)
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  const queryClient = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: async () => {
      await catalogApi.updateProductivity(activity.id, productivity)
      await catalogApi.updateResources(activity.id, resources)
    },
    onSuccess: () => {
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      queryClient.invalidateQueries({ queryKey: ['catalog-activities'] })
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
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="font-mono text-blue-600 font-semibold w-10 shrink-0">{activity.code}</span>
        <span className="text-sm text-gray-800 flex-1">{activity.description}</span>
        <span className="text-xs text-gray-400 w-12 text-center">{activity.unit}</span>
        <span className="text-xs text-gray-400 w-32 text-right">
          KPI: {activity.productivity_per_day} {activity.unit}/dia
        </span>
        <div className="flex gap-1 ml-2">
          {moCount > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TYPE_COLOR.MO}`}>MO×{moCount}</span>}
          {vemCount > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TYPE_COLOR.VEM}`}>VEM×{vemCount}</span>}
          {matCount > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TYPE_COLOR.MAT}`}>MAT×{matCount}</span>}
          {subCount > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TYPE_COLOR.SUB}`}>SUB×{subCount}</span>}
        </div>
        {dirty && <span className="text-xs text-amber-600 font-medium">• editado</span>}
        {saved && <span className="text-xs text-green-600 font-medium">✓ salvo</span>}
        <span className="text-gray-400 text-sm ml-2">{expanded ? '▲' : '▼'}</span>
      </button>

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
              onChange={e => { setProductivity(parseFloat(e.target.value) || 0); setDirty(true); setSaved(false) }}
              className="w-32 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
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
                      onChange={handleChange}
                      onRemove={handleRemove}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add buttons + Save */}
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

          {saveMutation.isError && (
            <p className="text-xs text-red-600">Erro ao salvar. Tente novamente.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CatalogPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('Todos')

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['catalog-activities'],
    queryFn: catalogApi.getActivities,
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
    return matchesCat && matchesSearch
  })

  const grouped = CATEGORY_ORDER
    .map(cat => ({ cat, items: filtered.filter(a => a.category === cat) }))
    .filter(g => g.items.length > 0)

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Catálogo de Atividades — CPUs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Visualize e edite a composição de preços unitários (MO, VEM, MAT, SUB) e o KPI de produtividade de cada atividade.
        </p>
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
    </div>
  )
}
