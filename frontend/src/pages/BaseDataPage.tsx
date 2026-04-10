import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { baseDataApi } from '../api/projects'
import type { LaborRoleFullRead, EquipmentItemFullRead } from '../types/api'

// ─── helpers ──────────────────────────────────────────────────────────────────

function brl(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function calcMoTotal(r: LaborRoleFullRead): number {
  return (
    r.custo_bruto_mes + r.he_50_pct + r.he_100_pct + r.encargos +
    r.transporte + r.alimentacao + r.epi + r.seguro_vida +
    r.aux_moradia + r.cesta_basica + r.ppr + r.assist_medica
  )
}

function calcVemTotal(e: EquipmentItemFullRead): number {
  return (
    e.locacao_sem_op_mes + e.total_combustivel_mes +
    e.total_lubmaint_mes + e.mob_demob_mes + e.outros_mes
  )
}

// ─── NumCell: inline editable numeric cell ────────────────────────────────────

function NumCell({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <input
      type="number"
      step="0.01"
      min="0"
      value={value}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      className="w-full border-0 border-b border-transparent focus:border-blue-400 focus:outline-none text-right text-xs px-1 py-0.5 bg-transparent"
    />
  )
}

// ─── BD_MO ────────────────────────────────────────────────────────────────────

function BdMo() {
  const qc = useQueryClient()
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['labor-roles-full'],
    queryFn: baseDataApi.getLaborRoles,
  })

  // Local edits: id → partial overrides
  const [edits, setEdits] = useState<Record<string, Partial<LaborRoleFullRead>>>({})
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'direct' | 'indirect'>('all')

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

  if (isLoading) return <div className="py-12 text-center text-gray-400">Carregando...</div>

  const MO_COLS: { key: keyof LaborRoleFullRead; label: string; color?: string }[] = [
    { key: 'custo_bruto_mes',  label: 'Custo Bruto/mês' },
    { key: 'he_50_pct',        label: 'HE 50%' },
    { key: 'he_100_pct',       label: 'HE 100%' },
    { key: 'encargos',         label: 'Encargos' },
    { key: 'transporte',       label: 'Transporte' },
    { key: 'alimentacao',      label: 'Alimentação' },
    { key: 'epi',              label: 'EPI' },
    { key: 'seguro_vida',      label: 'Seg. Vida' },
    { key: 'aux_moradia',      label: 'Aux. Mor.' },
    { key: 'cesta_basica',     label: 'Cesta Básica' },
    { key: 'ppr',              label: 'PPR' },
    { key: 'assist_medica',    label: 'Assist. Méd.' },
  ]

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex gap-3 flex-wrap items-center">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar código ou descrição..."
          className="border rounded-lg px-3 py-1.5 text-sm w-60 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <div className="flex rounded-lg border overflow-hidden text-sm">
          {(['all', 'direct', 'indirect'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 font-medium transition ${
                filterType === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t === 'all' ? 'Todos' : t === 'direct' ? 'Direto' : 'Indireto'}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500">{filtered.length} registros</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border shadow-sm bg-white">
        <table className="text-xs w-full">
          <thead className="bg-gray-50 border-b sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 w-14">Cód</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 min-w-[180px]">Descrição</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-600 w-16">Tipo</th>
              {MO_COLS.map(c => (
                <th key={c.key} className="px-2 py-2 text-right font-semibold text-gray-600 w-24 whitespace-nowrap">
                  {c.label}
                </th>
              ))}
              <th className="px-2 py-2 text-right font-semibold text-blue-700 bg-blue-50 w-28">Total/mês</th>
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
                  <td className="px-3 py-1 font-mono font-bold text-gray-700">{row.code}</td>
                  <td className="px-3 py-1">
                    <input
                      value={row.description}
                      onChange={e => setField(orig.id, 'description', e.target.value)}
                      className="w-full border-0 border-b border-transparent focus:border-blue-400 focus:outline-none text-xs bg-transparent"
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      row.role_type === 'direct' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {row.role_type === 'direct' ? 'D' : 'I'}
                    </span>
                  </td>
                  {MO_COLS.map(c => (
                    <td key={c.key} className="px-1 py-1">
                      <NumCell
                        value={row[c.key] as number}
                        onChange={v => setField(orig.id, c.key, v)}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1 text-right font-bold text-blue-700 bg-blue-50">{brl(total)}</td>
                  <td className="px-2 py-1 text-right text-blue-600 bg-blue-50">{brl(perDia)}</td>
                  <td className="px-2 py-1 text-right text-blue-600 bg-blue-50">{brl(perHH)}</td>
                  <td className="px-2 py-1 text-center">
                    {isSaved ? (
                      <span className="text-green-600 text-xs font-medium">✓ Salvo</span>
                    ) : (
                      <button
                        disabled={!isDirty || saveMutation.isPending}
                        onClick={() => saveMutation.mutate({ id: orig.id, data: edits[orig.id]! })}
                        className="px-2 py-1 text-xs rounded font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
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
    </div>
  )
}

// ─── BD_VEM ───────────────────────────────────────────────────────────────────

function BdVem() {
  const qc = useQueryClient()
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['equipment-items-full'],
    queryFn: baseDataApi.getEquipmentItems,
  })

  const [edits, setEdits] = useState<Record<string, Partial<EquipmentItemFullRead>>>({})
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const saveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EquipmentItemFullRead> }) => {
      const { tipo_combustivel, ...rest } = data
      const payload = { ...rest, ...(tipo_combustivel !== null ? { tipo_combustivel: tipo_combustivel ?? undefined } : {}) }
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

  const VEM_COLS: { key: keyof EquipmentItemFullRead; label: string }[] = [
    { key: 'locacao_sem_op_mes',    label: 'Locação s/Op./mês' },
    { key: 'consumo_combustivel_dia', label: 'Consumo Comb./dia' },
    { key: 'total_combustivel_mes', label: 'Total Comb./mês' },
    { key: 'total_lubmaint_mes',    label: 'Lub. & Manut./mês' },
    { key: 'mob_demob_mes',         label: 'Mob/Demob/mês' },
    { key: 'outros_mes',            label: 'Outros/mês' },
  ]

  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-center">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar código ou descrição..."
          className="border rounded-lg px-3 py-1.5 text-sm w-60 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <span className="text-xs text-gray-500">{filtered.length} registros</span>
      </div>

      <div className="overflow-x-auto rounded-xl border shadow-sm bg-white">
        <table className="text-xs w-full">
          <thead className="bg-gray-50 border-b sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 w-14">Cód</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 min-w-[200px]">Descrição</th>
              <th className="px-2 py-2 text-center font-semibold text-gray-600 w-20">Combustível</th>
              {VEM_COLS.map(c => (
                <th key={c.key} className="px-2 py-2 text-right font-semibold text-gray-600 w-28 whitespace-nowrap">
                  {c.label}
                </th>
              ))}
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
              const total = calcVemTotal(row)
              const perDia = total / 25.0

              return (
                <tr key={orig.id} className={`border-b last:border-b-0 hover:bg-gray-50 ${isDirty ? 'bg-amber-50' : ''}`}>
                  <td className="px-3 py-1 font-mono font-bold text-gray-700">{row.code}</td>
                  <td className="px-3 py-1">
                    <input
                      value={row.description}
                      onChange={e => setField(orig.id, 'description', e.target.value)}
                      className="w-full border-0 border-b border-transparent focus:border-blue-400 focus:outline-none text-xs bg-transparent"
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <input
                      value={row.tipo_combustivel ?? ''}
                      onChange={e => setField(orig.id, 'tipo_combustivel', e.target.value)}
                      className="w-16 border rounded px-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </td>
                  {VEM_COLS.map(c => (
                    <td key={c.key} className="px-1 py-1">
                      <NumCell
                        value={row[c.key] as number}
                        onChange={v => setField(orig.id, c.key, v)}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1 text-right font-bold text-blue-700 bg-blue-50">{brl(total)}</td>
                  <td className="px-2 py-1 text-right text-blue-600 bg-blue-50">{brl(perDia)}</td>
                  <td className="px-2 py-1 text-center">
                    {isSaved ? (
                      <span className="text-green-600 text-xs font-medium">✓ Salvo</span>
                    ) : (
                      <button
                        disabled={!isDirty || saveMutation.isPending}
                        onClick={() => saveMutation.mutate({ id: orig.id, data: edits[orig.id]! })}
                        className="px-2 py-1 text-xs rounded font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
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
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BaseDataPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'mo' | 'vem'>('mo')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
          >
            ←
          </button>
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
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
                tab === t.key
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-6">
        {tab === 'mo'  && <BdMo />}
        {tab === 'vem' && <BdVem />}
      </main>
    </div>
  )
}
