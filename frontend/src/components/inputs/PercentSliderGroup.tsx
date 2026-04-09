import { useFormContext, useWatch } from 'react-hook-form'
import type { ProjectInputsWrite } from '../../types/api'

interface SliderField {
  name: string
  label: string
}

interface Props {
  title: string
  fields: SliderField[]
}

export default function PercentSliderGroup({ title, fields }: Props) {
  const { register, setValue } = useFormContext<ProjectInputsWrite>()
  const values = useWatch({ name: fields.map((f) => f.name) as any[] })

  const total = (values as number[]).reduce((s, v) => s + (Number(v) || 0), 0)
  const isValid = Math.abs(total - 100) < 0.5 || total === 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        <span
          className={`text-sm font-medium px-2 py-0.5 rounded-full ${
            isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          Total: {total.toFixed(1)}%
        </span>
      </div>
      {!isValid && (
        <p className="text-red-500 text-xs">A soma deve ser 100%. Ajuste os valores.</p>
      )}
      <div className="space-y-3">
        {fields.map((field, i) => (
          <div key={field.name}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">{field.label}</label>
              <div className="flex items-center gap-2">
                <input
                  {...register(field.name as any, { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-24 border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="0.01"
              value={Math.min(Number(values[i]) || 0, 100)}
              onChange={(e) => setValue(field.name as any, Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
