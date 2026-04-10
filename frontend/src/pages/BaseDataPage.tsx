import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { baseDataApi } from '../api/projects'
import type {
  LaborRoleFullRead, EquipmentItemFullRead,
  BaseParamsRead, LaborRoleCreate, EquipmentItemCreate,
} from '../types/api'

// ─── helpers ──────────────────────────────────────────────────────────────────

function brl(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function calcMoTotal(r: LaborRoleFullRead): number {
  return (
    r.custo_bruto_mes + r.dissidio + r.adic_transf + r.periculosidade_val +
    r.he_50_pct + r.he_100_pct + r.encargos + r.adic_produtividade +
    r.transporte + r.alimentacao + r.epi + r.seguro_vida +
    r.aux_moradia + r.cesta_basica + r.ppr + r.assist_medica
  )
}

function calcVemCombustivel(e: EquipmentItemFullRead): number {
  return e.consumo_combustivel_dia * 25.0 * e.preco_combustivel
}

function calcVemLubMaint(e: EquipmentItemFullRead): number {
  return e.locacao_sem_op_mes * e.manutencao_pct + e.lubrificantes_mes + e.lavagem_mes
}

// ─── Components ───────────────────────────────────────────────────────────────

function NumCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      step="0.01"
      min="0"
      value={value}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      className="w-full border-0 border-b border-transparent focus:border-blue-400 focus:outline-none text-right text-xs px-1 py-0.5 bg-transparent min-w-[72px]"
    />
  )
}

function PctCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      <input
        type="number"
        step="0.001"
        min="0"
        max="1"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-14 border-0 border-b border-transparent focus:border-blue-400 focus:outline-none text-right text-xs px-1 py-0.5 bg-transparent"
      />
      <span className="text-xs text-gray-400">%</span>
    </div>
  )
}

function CalcCell({ value }: { value: number }) {
  return (
    <td className="px-2 py-1 text-right font-semibold text-blue-700 bg-blue-50 whitespace-nowrap">
      {brl(value)}
    </td>
  )
}

// ─── Base Params Panel ─────────────────────────────────────────────────────────

type ParamField = { key: keyof BaseParamsRead; label: string; hint?: string }

const MO_PARAM_FIELDS: ParamField[] = [
  { key: 'default_alimentacao',  label: 'Alimentação',   hint: 'R$/mês' },
  { key: 'default_cesta_basica', label: 'Cesta Básica',  hint: 'R$/mês' },
  { key: 'default_transporte',   label: 'Transporte',    hint: 'R$/mês' },
  { key: 'default_epi',          label: 'EPI',           hint: 'R$/mês' },
  { key: 'default_seguro_vida',  label: 'Seg. Vida',     hint: 'R$/mês' },
  { key: 'default_ppr',          label: 'PPR',           hint: 'R$/mês' },
  { key: 'default_assist_medica',label: 'Assist. Méd.',  hint: 'R$/mês' },
  { key: 'default_aux_moradia',  label: 'Aux. Moradia',  hint: 'R$/mês' },
]

const MO_APPLY_FIELDS: { key: keyof LaborRoleFullRead; label: string }[] = [
  { key: 'alimentacao',  label: 'Alimentação' },
  { key: 'cesta_basica', label: 'Cesta Básica' },
  { key: 'transporte',   label: 'Transporte' },
  { key: 'epi',          label: 'EPI' },
  { key: 'seguro_vida',  label: 'Seg. Vida' },
  { key: 'ppr',          label: 'PPR' },
  { key: 'assist_medica',label: 'Assist. Méd.' },
  { key: 'aux_moradia',  label: 'Aux. Moradia' },
]

function BaseParamsPanel({ params, onSave }: {
  params: BaseParamsRead
  onSave: (data: Partial<BaseParamsRead>) => void
}) {
  const qc = useQueryClient()
  const [localParams, setLocalParams] = useState<BaseParamsRead>(params)
  const [applyFields, setApplyFields] = useState<Set<string>>(new Set())
  const [applyStatus, setApplyStatus] = useState('')
  const [expanded, setExpanded] = useState(false)

  const applyMutation = useMutation({
    mutationFn: (fields: string[]) => baseDataApi.applyDefaults(fields),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['labor-roles-full'] })
      setApplyStatus(`✓ Aplicado a ${res.updated} registros`)
      setTimeout(() => setApplyStatus(''), 3000)
    },
  })

  function setParam(key: keyof BaseParamsRead, val: number) {
    setLocalParams(p => ({ ...p, [key]: val }))
  }

  function toggleApplyField(key: string) {
    setApplyFields(prev => {
      const n = new Set(prev)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })
  }

  const isDirty = JSON.stringify(localParams) !== JSON.stringify(params)

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-2 w-full text-left"
      >
        <span className="text-sm font-semibold text-blue-800">⚙ Parâmetros Padrão MO</span>
        <span className="ml-auto text-blue-400 text-xs">{expanded ? '▲' : '▼'} {expanded ? 'Ocultar' : 'Expandir'}</span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {MO_PARAM_FIELDS.map(f => (
              <label key={f.key} className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-600 font-medium">{f.label} <span className="text-gray-400">({f.hint})</span></span>
                <input
                  type="number"
                  step="0.01"
                  value={localParams[f.key] as number}
                  onChange={e => setParam(f.key, parseFloat(e.target.value) || 0)}
                  className="border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              disabled={!isDirty}
              onClick={() => onSave(localParams)}
              className="px-4 py-1.5 text-sm rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-30"
            >
              Salvar Parâmetros
            </button>
            <span className="text-xs text-gray-400">|</span>
            <span className="text-xs font-medium text-gray-600">Aplicar padrão a todos os registros:</span>
            {MO_APPLY_FIELDS.map(f => (
              <label key={f.key} className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyFields.has(f.key as string)}
                  onChange={() => toggleApplyField(f.key as string)}
                  className="accent-blue-600"
                />
                {f.label}
              </label>
            ))}
            <button
              disabled={applyFields.size === 0 || applyMutation.isPending}
              onClick={() => applyMutation.mutate([...applyFields])}
              className="px-3 py-1 text-xs rounded font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-30"
            >
              Aplicar a todos
            </button>
            {applyStatus && <span className="text-xs text-green-700 font-medium">{applyStatus}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

function FuelPricesPanel({ params, onSave }: {
  params: BaseParamsRead
  onSave: (data: Partial<BaseParamsRead>) => void
}) {
  const qc = useQueryClient()
  const [diesel, setDiesel] = useState(params.preco_diesel)
  const [gasolina, setGasolina] = useState(params.preco_gasolina)
  const [alcool, setAlcool] = useState(params.preco_alcool)
  const [status, setStatus] = useState('')
  const [expanded, setExpanded] = useState(false)

  const updateMutation = useMutation({
    mutationFn: () => baseDataApi.updateFuelPrices({
      preco_diesel: diesel,
      preco_gasolina: gasolina,
      preco_alcool: alcool,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['equipment-items-full'] })
      onSave({ preco_diesel: diesel, preco_gasolina: gasolina, preco_alcool: alcool })
      setStatus(`✓ Atualizado ${res.updated} equipamentos`)
      setTimeout(() => setStatus(''), 3000)
    },
  })

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
      <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-2 w-full text-left">
        <span className="text-sm font-semibold text-orange-800">⛽ Preços de Combustível</span>
        <span className="ml-auto text-orange-400 text-xs">{expanded ? '▲' : '▼'} {expanded ? 'Ocultar' : 'Expandir'}</span>
      </button>
      {expanded && (
        <div className="mt-3 flex items-end gap-4 flex-wrap">
          {[
            { label: 'Diesel (R$/L)', val: diesel, set: setDiesel },
            { label: 'Gasolina (R$/L)', val: gasolina, set: setGasolina },
            { label: 'Álcool (R$/L)', val: alcool, set: setAlcool },
          ].map(f => (
            <label key={f.label} className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-gray-600">{f.label}</span>
              <input type="number" step="0.01" value={f.val}
                onChange={e => f.set(parseFloat(e.target.value) || 0)}
                className="border rounded px-2 py-1 text-sm text-right w-28 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </label>
          ))}
          <button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="px-4 py-1.5 text-sm rounded-lg font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-30"
          >
            Atualizar e Recalcular
          </button>
          {status && <span className="text-xs text-green-700 font-medium">{status}</span>}
        </div>
      )}
    </div>
  )
}

// ─── New Labor Role Modal ──────────────────────────────────────────────────────

function NewLaborRoleModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (r: LaborRoleFullRead) => void
}) {
  const [form, setForm] = useState<LaborRoleCreate>({
    code: '', description: '', role_type: 'direct', salary_type: 'H',
    base_salary: 0, custo_bruto_mes: 0, transporte: 0, alimentacao: 0,
    epi: 0, cesta_basica: 0,
  })
  const [error, setError] = useState('')

  const createMutation = useMutation({
    mutationFn: baseDataApi.createLaborRole,
    onSuccess: (r) => { onCreated(r); onClose() },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'Erro ao criar')
    },
  })

  function f(key: keyof LaborRoleCreate, val: string | number) {
    setForm(p => ({ ...p, [key]: val }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">Nova Função (BD_MO)</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 font-medium">Código *</span>
            <input value={form.code} onChange={e => f('code', e.target.value)}
              className="border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 font-medium">Tipo</span>
            <select value={form.role_type} onChange={e => f('role_type', e.target.value)}
              className="border rounded px-2 py-1.5 focus:outline-none">
              <option value="direct">Direto</option>
              <option value="indirect">Indireto</option>
            </select>
          </label>
          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-xs text-gray-500 font-medium">Descrição *</span>
            <input value={form.description} onChange={e => f('description', e.target.value)}
              className="border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </label>
          {[
            { key: 'base_salary', label: 'Sal. Base' },
            { key: 'custo_bruto_mes', label: 'Custo Bruto/mês' },
            { key: 'encargos', label: 'Encargos' },
            { key: 'transporte', label: 'Transporte' },
            { key: 'alimentacao', label: 'Alimentação' },
            { key: 'epi', label: 'EPI' },
            { key: 'cesta_basica', label: 'Cesta Básica' },
          ].map(({ key, label }) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-xs text-gray-500 font-medium">{label}</span>
              <input type="number" step="0.01"
                value={(form as unknown as Record<string, number>)[key] ?? 0}
                onChange={e => f(key as keyof LaborRoleCreate, parseFloat(e.target.value) || 0)}
                className="border rounded px-2 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </label>
          ))}
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50">Cancelar</button>
          <button
            onClick={() => createMutation.mutate(form)}
            disabled={!form.code || !form.description || createMutation.isPending}
            className="px-5 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-40"
          >
            Criar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── New Equipment Modal ───────────────────────────────────────────────────────

function NewEquipmentModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (e: EquipmentItemFullRead) => void
}) {
  const [form, setForm] = useState<EquipmentItemCreate>({
    code: '', description: '', locacao_sem_op_mes: 0,
    consumo_combustivel_dia: 0, tipo_combustivel: '',
    preco_combustivel: 0, lubrificantes_mes: 0,
    manutencao_pct: 0, lavagem_mes: 0, mob_demob_mes: 0, outros_mes: 0,
  })
  const [error, setError] = useState('')

  const createMutation = useMutation({
    mutationFn: baseDataApi.createEquipmentItem,
    onSuccess: (e) => { onCreated(e); onClose() },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'Erro ao criar')
    },
  })

  function f(key: keyof EquipmentItemCreate, val: string | number) {
    setForm(p => ({ ...p, [key]: val }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">Novo Equipamento (BD_VEM)</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 font-medium">Código *</span>
            <input value={form.code} onChange={e => f('code', e.target.value)}
              className="border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 font-medium">Combustível</span>
            <input value={form.tipo_combustivel ?? ''} onChange={e => f('tipo_combustivel', e.target.value)}
              placeholder="Diesel / Gasolina / Álcool"
              className="border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </label>
          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-xs text-gray-500 font-medium">Descrição *</span>
            <input value={form.description} onChange={e => f('description', e.target.value)}
              className="border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </label>
          {[
            { key: 'locacao_sem_op_mes', label: 'Locação s/Op (R$/mês)' },
            { key: 'preco_combustivel',  label: 'Preço Comb. (R$/L)' },
            { key: 'consumo_combustivel_dia', label: 'Consumo (L/dia)' },
            { key: 'lubrificantes_mes',  label: 'Lubrificantes (R$/mês)' },
            { key: 'manutencao_pct',     label: 'Manutenção (0.0–1.0)' },
            { key: 'lavagem_mes',        label: 'Lavagem (R$/mês)' },
            { key: 'mob_demob_mes',      label: 'Mob/Demob (R$/mês)' },
            { key: 'outros_mes',         label: 'Outros (R$/mês)' },
          ].map(({ key, label }) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-xs text-gray-500 font-medium">{label}</span>
              <input type="number" step="0.01"
                value={(form as unknown as Record<string, number>)[key] ?? 0}
                onChange={e => f(key as keyof EquipmentItemCreate, parseFloat(e.target.value) || 0)}
                className="border rounded px-2 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </label>
          ))}
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50">Cancelar</button>
          <button
            onClick={() => createMutation.mutate(form)}
            disabled={!form.code || !form.description || createMutation.isPending}
            className="px-5 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-40"
          >
            Criar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── BD_MO ────────────────────────────────────────────────────────────────────

const MO_COLS: { key: keyof LaborRoleFullRead; label: string }[] = [
  { key: 'custo_bruto_mes',    label: 'Custo Bruto' },
  { key: 'dissidio',           label: 'Dissídio' },
  { key: 'adic_transf',        label: 'Adic. Transf.' },
  { key: 'periculosidade_val', label: 'Periculosidade' },
  { key: 'he_50_pct',          label: 'HE 50%' },
  { key: 'he_100_pct',         label: 'HE 100%' },
  { key: 'encargos',           label: 'Encargos' },
  { key: 'adic_produtividade', label: 'Adic. Produt.' },
  { key: 'custo_admissao',     label: 'Admissão' },
  { key: 'desp_folga',         label: 'Desp. Folga' },
  { key: 'transporte',         label: 'Transporte' },
  { key: 'alimentacao',        label: 'Alimentação' },
  { key: 'epi',                label: 'EPI' },
  { key: 'seguro_vida',        label: 'Seg. Vida' },
  { key: 'aux_moradia',        label: 'Aux. Moradia' },
  { key: 'cesta_basica',       label: 'Cesta' },
  { key: 'ppr',                label: 'PPR' },
  { key: 'assist_medica',      label: 'Assist. Méd.' },
]

function BdMo({ baseParams, onParamsSaved }: { baseParams: BaseParamsRead; onParamsSaved: (p: Partial<BaseParamsRead>) => void }) {
  const qc = useQueryClient()
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['labor-roles-full'],
    queryFn: baseDataApi.getLaborRoles,
  })

  const [edits, setEdits] = useState<Record<string, Partial<LaborRoleFullRead>>>({})
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'direct' | 'indirect'>('all')
  const [showNew, setShowNew] = useState(false)
  const [importStatus, setImportStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const saveParamsMutation = useMutation({
    mutationFn: (data: Partial<BaseParamsRead>) => baseDataApi.updateBaseParams(data),
    onSuccess: (updated) => onParamsSaved(updated),
  })

  const saveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LaborRoleFullRead> }) =>
      baseDataApi.updateLaborRole(id, data),
    onSuccess: (updated) => {
      qc.setQueryData<LaborRoleFullRead[]>(['labor-roles-full'], prev =>
        prev?.map(r => r.id === updated.id ? updated : r) ?? []
      )
      setEdits(prev => { const n = { ...prev }; delete n[updated.id]; return n })
      setSavedIds(prev => new Set([...prev, updated.id]))
      setTimeout(() => setSavedIds(prev => { const n = new Set(prev); n.delete(updated.id); return n }), 2000)
    },
  })

  function getRow(r: LaborRoleFullRead): LaborRoleFullRead {
    return { ...r, ...(edits[r.id] ?? {}) }
  }

  function setField(id: string, field: keyof LaborRoleFullRead, value: number | string | boolean) {
    setEdits(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), [field]: value } }))
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return roles.filter(r => {
      const matchSearch = !q || r.code.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
      const matchType = filterType === 'all' || r.role_type === filterType
      return matchSearch && matchType
    })
  }, [roles, search, filterType])

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const res = await baseDataApi.importLaborRoles(file)
      qc.invalidateQueries({ queryKey: ['labor-roles-full'] })
      setImportStatus(`✓ ${res.inserted} inseridos, ${res.updated} atualizados${res.errors.length > 0 ? ` — ${res.errors.length} erros` : ''}`)
    } catch {
      setImportStatus('Erro ao importar arquivo')
    }
    if (fileRef.current) fileRef.current.value = ''
    setTimeout(() => setImportStatus(''), 5000)
  }

  if (isLoading) return <div className="py-12 text-center text-gray-400">Carregando...</div>

  return (
    <div className="space-y-3">
      <BaseParamsPanel params={baseParams} onSave={data => saveParamsMutation.mutate(data)} />

      <div className="flex gap-3 flex-wrap items-center">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar código ou descrição..."
          className="border rounded-lg px-3 py-1.5 text-sm w-60 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <div className="flex rounded-lg border overflow-hidden text-sm">
          {(['all', 'direct', 'indirect'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 font-medium transition ${filterType === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {t === 'all' ? 'Todos' : t === 'direct' ? 'Direto' : 'Indireto'}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500">{filtered.length} registros</span>
        <div className="ml-auto flex items-center gap-2">
          {importStatus && <span className="text-xs text-green-700 font-medium">{importStatus}</span>}
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <button
            onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium"
          >
            ↑ Importar XLSX
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium"
          >
            + Nova Função
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border shadow-sm bg-white">
        <table className="text-xs w-full">
          <thead className="bg-gray-50 border-b sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 sticky left-0 bg-gray-50 z-20 w-14">Cód</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 sticky left-14 bg-gray-50 z-20 min-w-[160px]">Descrição</th>
              <th className="px-2 py-2 text-center font-semibold text-gray-600 w-12">T</th>
              <th className="px-2 py-2 text-right font-semibold text-gray-600 w-20">Sal. Base</th>
              {MO_COLS.map(c => (
                <th key={c.key} className="px-2 py-2 text-right font-semibold text-gray-600 whitespace-nowrap w-24">{c.label}</th>
              ))}
              <th className="px-2 py-2 text-right font-semibold text-blue-700 bg-blue-50 w-28 whitespace-nowrap">Total/mês</th>
              <th className="px-2 py-2 text-right font-semibold text-blue-700 bg-blue-50 w-20">R$/dia</th>
              <th className="px-2 py-2 text-right font-semibold text-blue-700 bg-blue-50 w-20">R$/HH</th>
              <th className="px-2 py-2 text-center font-semibold text-gray-600 w-20">Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(orig => {
              const row = getRow(orig)
              const isDirty = !!edits[orig.id]
              const isSaved = savedIds.has(orig.id)
              const total = calcMoTotal(row)
              const perDia = total / 25.0
              const perHH = total / 220.0

              return (
                <tr key={orig.id} className={`border-b last:border-b-0 hover:bg-gray-50 ${isDirty ? 'bg-amber-50' : ''}`}>
                  <td className="px-3 py-1 font-mono font-bold text-gray-700 sticky left-0 bg-inherit z-10">{row.code}</td>
                  <td className="px-3 py-1 sticky left-14 bg-inherit z-10">
                    <input value={row.description} onChange={e => setField(orig.id, 'description', e.target.value)}
                      className="w-full border-0 border-b border-transparent focus:border-blue-400 focus:outline-none text-xs bg-transparent min-w-[140px]" />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <span className={`px-1 py-0.5 rounded text-xs font-medium ${row.role_type === 'direct' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                      {row.role_type === 'direct' ? 'D' : 'I'}
                    </span>
                  </td>
                  <td className="px-1 py-1">
                    <NumCell value={row.base_salary} onChange={v => setField(orig.id, 'base_salary', v)} />
                  </td>
                  {MO_COLS.map(c => (
                    <td key={c.key} className="px-1 py-1">
                      <NumCell value={row[c.key] as number} onChange={v => setField(orig.id, c.key, v)} />
                    </td>
                  ))}
                  <td className="px-2 py-1 text-right font-bold text-blue-700 bg-blue-50">{brl(total)}</td>
                  <td className="px-2 py-1 text-right text-blue-600 bg-blue-50">{brl(perDia)}</td>
                  <td className="px-2 py-1 text-right text-blue-600 bg-blue-50">{brl(perHH)}</td>
                  <td className="px-2 py-1 text-center">
                    {isSaved ? (
                      <span className="text-green-600 text-xs font-medium">✓ Salvo</span>
                    ) : (
                      <button disabled={!isDirty || saveMutation.isPending}
                        onClick={() => saveMutation.mutate({ id: orig.id, data: edits[orig.id]! })}
                        className="px-2 py-1 text-xs rounded font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed">
                        Salvar
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showNew && (
        <NewLaborRoleModal
          onClose={() => setShowNew(false)}
          onCreated={r => {
            qc.setQueryData<LaborRoleFullRead[]>(['labor-roles-full'], prev => [...(prev ?? []), r])
          }}
        />
      )}
    </div>
  )
}

// ─── BD_VEM ───────────────────────────────────────────────────────────────────

function BdVem({ baseParams, onParamsSaved }: { baseParams: BaseParamsRead; onParamsSaved: (p: Partial<BaseParamsRead>) => void }) {
  const qc = useQueryClient()
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['equipment-items-full'],
    queryFn: baseDataApi.getEquipmentItems,
  })

  const [edits, setEdits] = useState<Record<string, Partial<EquipmentItemFullRead>>>({})
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)

  const saveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EquipmentItemFullRead> }) => {
      const { tipo_combustivel, ...rest } = data
      const payload = { ...rest, ...(tipo_combustivel != null ? { tipo_combustivel } : {}) }
      return baseDataApi.updateEquipmentItem(id, payload)
    },
    onSuccess: (updated) => {
      qc.setQueryData<EquipmentItemFullRead[]>(['equipment-items-full'], prev =>
        prev?.map(e => e.id === updated.id ? updated : e) ?? []
      )
      setEdits(prev => { const n = { ...prev }; delete n[updated.id]; return n })
      setSavedIds(prev => new Set([...prev, updated.id]))
      setTimeout(() => setSavedIds(prev => { const n = new Set(prev); n.delete(updated.id); return n }), 2000)
    },
  })

  function getRow(e: EquipmentItemFullRead): EquipmentItemFullRead {
    return { ...e, ...(edits[e.id] ?? {}) }
  }

  function setField(id: string, field: keyof EquipmentItemFullRead, value: number | string) {
    setEdits(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), [field]: value } }))
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter(e => !q || e.code.toLowerCase().includes(q) || e.description.toLowerCase().includes(q))
  }, [items, search])

  if (isLoading) return <div className="py-12 text-center text-gray-400">Carregando...</div>

  return (
    <div className="space-y-3">
      <FuelPricesPanel params={baseParams} onSave={onParamsSaved} />

      <div className="flex gap-3 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar código ou descrição..."
          className="border rounded-lg px-3 py-1.5 text-sm w-60 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        <span className="text-xs text-gray-500">{filtered.length} registros</span>
        <div className="ml-auto">
          <button
            onClick={() => setShowNew(true)}
            className="px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium"
          >
            + Novo Equipamento
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border shadow-sm bg-white">
        <table className="text-xs w-full">
          <thead className="bg-gray-50 border-b sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 sticky left-0 bg-gray-50 z-20 w-14">Cód</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 sticky left-14 bg-gray-50 z-20 min-w-[180px]">Descrição</th>
              <th className="px-2 py-2 text-right font-semibold text-gray-600 w-24">Locação s/Op</th>
              <th className="px-2 py-2 text-center font-semibold text-gray-600 w-20">Comb.</th>
              <th className="px-2 py-2 text-right font-semibold text-gray-600 w-22">R$/L</th>
              <th className="px-2 py-2 text-right font-semibold text-gray-600 w-22">Cons./dia</th>
              <th className="px-2 py-2 text-right font-semibold text-blue-600 w-24">Total Comb.</th>
              <th className="px-2 py-2 text-right font-semibold text-gray-600 w-22">Lubr./mês</th>
              <th className="px-2 py-2 text-right font-semibold text-gray-600 w-22">Manut. %</th>
              <th className="px-2 py-2 text-right font-semibold text-gray-600 w-22">Lavagem</th>
              <th className="px-2 py-2 text-right font-semibold text-blue-600 w-24">Total Lub.</th>
              <th className="px-2 py-2 text-right font-semibold text-gray-600 w-22">Mob/Demob</th>
              <th className="px-2 py-2 text-right font-semibold text-gray-600 w-22">Outros</th>
              <th className="px-2 py-2 text-right font-semibold text-blue-700 bg-blue-50 w-28">Total/mês</th>
              <th className="px-2 py-2 text-right font-semibold text-blue-700 bg-blue-50 w-20">R$/dia</th>
              <th className="px-2 py-2 text-center font-semibold text-gray-600 w-20">Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(orig => {
              const row = getRow(orig)
              const isDirty = !!edits[orig.id]
              const isSaved = savedIds.has(orig.id)
              const totalComb = calcVemCombustivel(row)
              const totalLub = calcVemLubMaint(row)
              const total = row.locacao_sem_op_mes + totalComb + totalLub + row.mob_demob_mes + row.outros_mes
              const perDia = total / 25.0

              return (
                <tr key={orig.id} className={`border-b last:border-b-0 hover:bg-gray-50 ${isDirty ? 'bg-amber-50' : ''}`}>
                  <td className="px-3 py-1 font-mono font-bold text-gray-700 sticky left-0 bg-inherit z-10">{row.code}</td>
                  <td className="px-3 py-1 sticky left-14 bg-inherit z-10">
                    <input value={row.description} onChange={e => setField(orig.id, 'description', e.target.value)}
                      className="w-full border-0 border-b border-transparent focus:border-blue-400 focus:outline-none text-xs bg-transparent min-w-[160px]" />
                  </td>
                  <td className="px-1 py-1"><NumCell value={row.locacao_sem_op_mes} onChange={v => setField(orig.id, 'locacao_sem_op_mes', v)} /></td>
                  <td className="px-2 py-1 text-center">
                    <input value={row.tipo_combustivel ?? ''} onChange={e => setField(orig.id, 'tipo_combustivel', e.target.value)}
                      className="w-16 border rounded px-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  </td>
                  <td className="px-1 py-1"><NumCell value={row.preco_combustivel} onChange={v => setField(orig.id, 'preco_combustivel', v)} /></td>
                  <td className="px-1 py-1"><NumCell value={row.consumo_combustivel_dia} onChange={v => setField(orig.id, 'consumo_combustivel_dia', v)} /></td>
                  <CalcCell value={totalComb} />
                  <td className="px-1 py-1"><NumCell value={row.lubrificantes_mes} onChange={v => setField(orig.id, 'lubrificantes_mes', v)} /></td>
                  <td className="px-1 py-1"><PctCell value={row.manutencao_pct} onChange={v => setField(orig.id, 'manutencao_pct', v)} /></td>
                  <td className="px-1 py-1"><NumCell value={row.lavagem_mes} onChange={v => setField(orig.id, 'lavagem_mes', v)} /></td>
                  <CalcCell value={totalLub} />
                  <td className="px-1 py-1"><NumCell value={row.mob_demob_mes} onChange={v => setField(orig.id, 'mob_demob_mes', v)} /></td>
                  <td className="px-1 py-1"><NumCell value={row.outros_mes} onChange={v => setField(orig.id, 'outros_mes', v)} /></td>
                  <td className="px-2 py-1 text-right font-bold text-blue-700 bg-blue-50">{brl(total)}</td>
                  <td className="px-2 py-1 text-right text-blue-600 bg-blue-50">{brl(perDia)}</td>
                  <td className="px-2 py-1 text-center">
                    {isSaved ? (
                      <span className="text-green-600 text-xs font-medium">✓ Salvo</span>
                    ) : (
                      <button disabled={!isDirty || saveMutation.isPending}
                        onClick={() => saveMutation.mutate({ id: orig.id, data: edits[orig.id]! })}
                        className="px-2 py-1 text-xs rounded font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed">
                        Salvar
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showNew && (
        <NewEquipmentModal
          onClose={() => setShowNew(false)}
          onCreated={e => {
            qc.setQueryData<EquipmentItemFullRead[]>(['equipment-items-full'], prev => [...(prev ?? []), e])
          }}
        />
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BaseDataPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'mo' | 'vem'>('mo')

  const { data: baseParams, isLoading: paramsLoading } = useQuery({
    queryKey: ['base-params'],
    queryFn: baseDataApi.getBaseParams,
  })

  const qc = useQueryClient()

  function handleParamsSaved(updated: Partial<BaseParamsRead>) {
    qc.setQueryData<BaseParamsRead>(['base-params'], prev => prev ? { ...prev, ...updated } : prev)
  }

  const defaultParams: BaseParamsRead = {
    default_alimentacao: 1350, default_cesta_basica: 308,
    default_transporte: 0, default_epi: 235,
    default_seguro_vida: 0, default_ppr: 0,
    default_assist_medica: 0, default_aux_moradia: 0,
    ot_50_horas_mes: 40, ot_100_horas_mes: 8,
    working_days_per_month: 25,
    preco_diesel: 6.50, preco_gasolina: 6.00, preco_alcool: 4.50,
  }

  const params = baseParams ?? defaultParams

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-700 text-xl leading-none">←</button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Base de Dados de Custos</h1>
            <p className="text-xs text-gray-500">BD_MO — Mão de Obra · BD_VEM — Veículos e Equipamentos</p>
          </div>
        </div>
        <div className="max-w-screen-xl mx-auto px-6 flex border-t">
          {[
            { key: 'mo' as const, label: 'BD_MO — Mão de Obra' },
            { key: 'vem' as const, label: 'BD_VEM — Veículos/Equipamentos' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition ${tab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </header>
      <main className="max-w-screen-xl mx-auto px-6 py-6">
        {paramsLoading ? (
          <div className="py-12 text-center text-gray-400">Carregando parâmetros...</div>
        ) : (
          <>
            {tab === 'mo'  && <BdMo baseParams={params} onParamsSaved={handleParamsSaved} />}
            {tab === 'vem' && <BdVem baseParams={params} onParamsSaved={handleParamsSaved} />}
          </>
        )}
      </main>
    </div>
  )
}
