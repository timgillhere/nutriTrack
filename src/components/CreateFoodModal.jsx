import { useState } from 'react'

const FIELDS = [
  { key: 'kcal',    label: 'Calories', unit: 'kcal', color: 'text-orange-500', required: true },
  { key: 'protein', label: 'Protein',  unit: 'g',    color: 'text-blue-500' },
  { key: 'carbs',   label: 'Carbs',    unit: 'g',    color: 'text-yellow-500' },
  { key: 'fat',     label: 'Fat',      unit: 'g',    color: 'text-red-400' },
]

export default function CreateFoodModal({ defaultName = '', onSelect, onClose }) {
  const [name, setName] = useState(defaultName)
  const [values, setValues] = useState({ kcal: '', protein: '', carbs: '', fat: '' })

  const set = (key, val) => setValues(v => ({ ...v, [key]: val }))
  const canSubmit = name.trim() && values.kcal !== ''

  const handleCreate = () => {
    if (!canSubmit) return
    onSelect({
      barcode: '',
      name: name.trim(),
      brand: '',
      imageThumbnail: '',
      servingSize: 100,
      servingUnit: 'g',
      per100g: {
        kcal:    parseFloat(values.kcal)    || 0,
        protein: parseFloat(values.protein) || 0,
        carbs:   parseFloat(values.carbs)   || 0,
        fat:     parseFloat(values.fat)     || 0,
        fiber: 0,
        sugar: 0,
      },
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl overflow-y-auto"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-5 pt-2 pb-8">
          <h3 className="font-semibold text-gray-900 text-lg mb-0.5">Add custom food</h3>
          <p className="text-sm text-gray-400 mb-5">Enter nutritional values per 100g</p>

          {/* Name */}
          <label className="block mb-5">
            <span className="text-sm font-medium text-gray-700 mb-1.5 block">Food name</span>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Chia Seeds, Banana, Oat Milk…"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-gray-300"
            />
          </label>

          {/* Nutrition grid */}
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Nutrition <span className="font-normal text-gray-400">per 100g</span>
          </p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {FIELDS.map(f => (
              <label key={f.key} className="block">
                <span className={`text-xs font-semibold ${f.color} mb-1.5 block`}>
                  {f.label}{f.required ? ' *' : ''}
                </span>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={values[f.key]}
                    onChange={e => set(f.key, e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-gray-300"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    {f.unit}
                  </span>
                </div>
              </label>
            ))}
          </div>

          <button
            onClick={handleCreate}
            disabled={!canSubmit}
            className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold rounded-xl py-3.5 transition-colors disabled:opacity-40"
          >
            Use this food
          </button>
        </div>
      </div>
    </div>
  )
}
