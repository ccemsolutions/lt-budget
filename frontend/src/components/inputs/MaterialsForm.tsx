import { useFormContext, useFieldArray } from 'react-hook-form'
import type { ProjectInputsWrite } from '../../types/api'

export default function MaterialsForm() {
  const { register, control } = useFormContext<ProjectInputsWrite>()
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'materials_supply.items',
  })

  function addRow() {
    append({ code: '', description: '', unit: '', unit_price: 0, observations: '' })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">Fornecimento de Materiais</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Preços unitários dos materiais fornecidos (M1–M63). Usados no cálculo das CPUs correspondentes.
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium"
        >
          + Adicionar item
        </button>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed rounded-xl">
          Nenhum material cadastrado. Clique em "+ Adicionar item" para começar.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border shadow-sm bg-white">
          <table className="text-sm w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 w-20">Código</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 min-w-[200px]">Descrição</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 w-20">Unidade</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 w-32">Preço Unit. (R$)</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-yellow-700 bg-yellow-50 min-w-[160px]">Observações</th>
                <th className="px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, idx) => (
                <tr key={field.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="px-2 py-1">
                    <input
                      {...register(`materials_supply.items.${idx}.code`)}
                      placeholder="M1"
                      className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      {...register(`materials_supply.items.${idx}.description`)}
                      placeholder="Ex.: Cabo ACSR 954"
                      className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      {...register(`materials_supply.items.${idx}.unit`)}
                      placeholder="km"
                      className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      step="0.01"
                      {...register(`materials_supply.items.${idx}.unit_price`, { valueAsNumber: true })}
                      className="w-full border rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </td>
                  <td className="px-2 py-1 bg-yellow-50">
                    <input
                      {...register(`materials_supply.items.${idx}.observations`)}
                      placeholder="Obs..."
                      className="w-full border rounded px-2 py-1 text-xs bg-yellow-50 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      className="text-red-400 hover:text-red-600 text-lg leading-none font-bold"
                      title="Remover"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
