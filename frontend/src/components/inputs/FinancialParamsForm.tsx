import { useFormContext, useFieldArray } from 'react-hook-form'
import type { ProjectInputsWrite } from '../../types/api'

// Materiais pré-definidos conforme planilha FIN (M1-M8)
const DEFAULT_MATERIALS = [
  { description: 'Cabos Condutores', value: 0, start_month: 1, duration_months: 6 },
  { description: 'Cabos PR Aço e AL', value: 0, start_month: 1, duration_months: 6 },
  { description: 'Cabos OPGW', value: 0, start_month: 1, duration_months: 6 },
  { description: 'Estruturas Metálicas', value: 0, start_month: 1, duration_months: 8 },
  { description: 'Isoladores', value: 0, start_month: 3, duration_months: 6 },
  { description: 'Miscelânias / Aterramento', value: 0, start_month: 3, duration_months: 8 },
  { description: 'Outros Materiais', value: 0, start_month: 1, duration_months: 12 },
]

const fmtBRL = (n: number) =>
  n > 0 ? 'R$ ' + n.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : ''

export default function FinancialParamsForm() {
  const { register, watch, setValue } = useFormContext<ProjectInputsWrite>()
  const { fields, append, remove } = useFieldArray({
    name: 'financial_params.materials',
  })

  const totalMaterials = (watch('financial_params.materials') || []).reduce(
    (s: number, m: { value: number }) => s + (Number(m?.value) || 0),
    0
  )
  const totalOthers =
    (watch('financial_params.cost_implantacao') || 0) +
    (watch('financial_params.cost_projeto') || 0) +
    (watch('financial_params.cost_fundiario') || 0) +
    (watch('financial_params.cost_seguros') || 0) +
    (watch('financial_params.cost_outros') || 0)

  const addDefaults = () => {
    DEFAULT_MATERIALS.forEach(m => append(m))
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-semibold text-gray-800 mb-1">Parâmetros Financeiros</h3>
        <p className="text-sm text-gray-500">
          Configure margens, condições contratuais, materiais e custos complementares.
          Corresponde à aba FIN da planilha de referência.
        </p>
      </div>

      {/* ── Margens e Condições ───────────────────────────────────────────────── */}
      <section>
        <h4 className="text-sm font-semibold text-blue-700 mb-3 border-b pb-1">
          Margens e Condições Contratuais
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Margem de Serviços (%)</label>
            <input
              type="number" min={0} max={100} step={0.1}
              className="w-full border rounded px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              {...register('financial_params.margin_services_pct', { valueAsNumber: true })}
            />
            <p className="text-xs text-gray-400">Planilha referência: 18%</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Margem de Materiais (%)</label>
            <input
              type="number" min={0} max={100} step={0.01}
              className="w-full border rounded px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              {...register('financial_params.margin_materials_pct', { valueAsNumber: true })}
            />
            <p className="text-xs text-gray-400">Planilha referência: 6,38%</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Adiantamento Contratual (%)</label>
            <input
              type="number" min={0} max={50} step={1}
              className="w-full border rounded px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              {...register('financial_params.advance_pct', { valueAsNumber: true })}
            />
            <p className="text-xs text-gray-400">Planilha referência: 10%</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Retenção (%)</label>
            <input
              type="number" min={0} max={20} step={0.5}
              className="w-full border rounded px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              {...register('financial_params.retention_pct', { valueAsNumber: true })}
            />
            <p className="text-xs text-gray-400">Planilha referência: 3%</p>
          </div>
        </div>
      </section>

      {/* ── Custos Complementares ────────────────────────────────────────────── */}
      <section>
        <h4 className="text-sm font-semibold text-green-700 mb-3 border-b pb-1">
          Custos Complementares (além do orçamento de campo)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Implantação / Sondagem / Resistividade (R$)</label>
            <input
              type="number" min={0} step={10000} placeholder="Ex: 3920000"
              className="w-full border rounded px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              {...register('financial_params.cost_implantacao', { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Projeto Básico + Executivo (R$)</label>
            <input
              type="number" min={0} step={10000} placeholder="Ex: 6015000"
              className="w-full border rounded px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              {...register('financial_params.cost_projeto', { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Fundiário / Meio Ambiente (R$)</label>
            <input
              type="number" min={0} step={10000} placeholder="Ex: 2000000"
              className="w-full border rounded px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              {...register('financial_params.cost_fundiario', { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Seguros (R$)</label>
            <input
              type="number" min={0} step={10000} placeholder="Ex: 1089000"
              className="w-full border rounded px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              {...register('financial_params.cost_seguros', { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-medium text-gray-600">Outros Custos (R$)</label>
            <input
              type="number" min={0} step={10000}
              className="w-full border rounded px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              {...register('financial_params.cost_outros', { valueAsNumber: true })}
            />
          </div>
        </div>
        {totalOthers > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            Total complementares: <strong>R$ {totalOthers.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</strong>
          </p>
        )}
      </section>

      {/* ── Materiais ────────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3 border-b pb-1">
          <h4 className="text-sm font-semibold text-amber-700">
            Materiais Principais (M1–M8)
          </h4>
          <div className="flex gap-2">
            {fields.length === 0 && (
              <button
                type="button"
                onClick={addDefaults}
                className="px-3 py-1 text-xs bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition"
              >
                + Inserir padrão
              </button>
            )}
            <button
              type="button"
              onClick={() => append({ description: '', value: 0, start_month: 1, duration_months: 6 })}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              + Linha
            </button>
          </div>
        </div>

        {fields.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            Nenhum material adicionado. Clique em "Inserir padrão" para usar os itens M1-M8 da planilha.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium px-1">
              <div className="col-span-4">Descrição</div>
              <div className="col-span-3 text-right">Valor (R$)</div>
              <div className="col-span-2 text-center">Mês início</div>
              <div className="col-span-2 text-center">Duração (meses)</div>
              <div className="col-span-1"></div>
            </div>
            {fields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <input
                    type="text"
                    placeholder="Descrição"
                    className="w-full border rounded px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                    {...register(`financial_params.materials.${i}.description`)}
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="number" min={0} step={10000}
                    className="w-full border rounded px-2 py-1.5 text-sm text-right focus:border-blue-400 focus:outline-none"
                    {...register(`financial_params.materials.${i}.value`, { valueAsNumber: true })}
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number" min={1} step={1}
                    className="w-full border rounded px-2 py-1.5 text-sm text-center focus:border-blue-400 focus:outline-none"
                    {...register(`financial_params.materials.${i}.start_month`, { valueAsNumber: true })}
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number" min={1} step={1}
                    className="w-full border rounded px-2 py-1.5 text-sm text-center focus:border-blue-400 focus:outline-none"
                    {...register(`financial_params.materials.${i}.duration_months`, { valueAsNumber: true })}
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalMaterials > 0 && (
          <div className="mt-3 text-sm text-right font-medium text-amber-700">
            Total Materiais: R$ {totalMaterials.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </div>
        )}
      </section>
    </div>
  )
}
