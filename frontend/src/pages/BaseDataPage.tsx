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

function calcVemTotal(e: EquipmentItemFullRead): number {
  return (
    e.locacao_sem_op_mes +
    calcVemCombustivel(e) +
    calcVemLubMaint(e) +
    e.mob_demob_mes + e.outros_mes
  )
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

// ─── BD_MO ────────────────────────────────────────────────────────────────────

const MO_COLS: { key: keyof LaborRoleFullRead; label: string; group: string }[] = [
  { key: 'custo_bruto_mes',    label: 'Custo Bruto', group: 'Salário' },
  { key: 'dissidio',           label: 'Dissídio',    group: 'Salário' },
  { key: 'adic_transf',        label: 'Adic. Transf.', group: 'Salário' },
  { key: 'periculosidade_val', label: 'Periculosidade', group: 'Salário' },
  { key: 'he_50_pct',          label: 'HE 50%',      group: 'HE' },
  { key: 'he_100_pct',         label: 'HE 100%',     group: 'HE' },
  { key: 'encargos',           label: 'Encargos',    group: 'Encargos' },
  { key: 'adic_produtividade', label: 'Adic. Produt.', group: 'Encargos' },
  { key: 'custo_admissao',     label: 'Admissão',    group: 'Admin' },
  { key: 'desp_folga',         label: 'Desp. Folga', group: 'Admin' },
  { key: 'transporte',         label: 'Transporte',  group: 'Benefícios' },
  { key: 'alimentacao',        label: 'Alimentação', group: 'Benefícios' },
  { key: 'epi',                label: 'EPI',         group: 'Benefícios' },
  { key: 'seguro_vida',        label: 'Seg. Vida',   group: 'Benefícios' },
  { key: 'aux_moradia',        label: 'Aux. Moradia',group: 'Benefícios' },
  { key: 'cesta_basica',       label: 'Cesta',       group: 'Benefícios' },
  { key: 'ppr',                label: 'PPR',         group: 'Benefícios' },
  { key: 'assist_medica',      label: 'Assist. Méd.',group: 'Benefícios' },
]

function BdMo() {
  const qc = useQueryClient()
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['labor-roles-full'],
    queryFn: baseDataApi.getLaborRoles,
  })

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

  return (
    <div className="space-y-3">
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
      <div className="flex gap-3 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar código ou descrição..."
          className="border rounded-lg px-3 py-1.5 text-sm w-60 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        <span className="text-xs text-gray-500">{filtered.length} registros</span>
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
              <th className="px-2 py-2 text-right font-semibold text-blue-600 bg-blue-25 w-24">Total Comb.</th>
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
        {tab === 'mo'  && <BdMo />}
        {tab === 'vem' && <BdVem />}
      </main>
    </div>
  )
}
