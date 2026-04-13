import { useState } from 'react'
import { calcNutrition } from '../services/foodApi'

const MEALS = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch',     label: 'Lunch',     emoji: '☀️' },
  { id: 'dinner',    label: 'Dinner',    emoji: '🌙' },
  { id: 'snacks',    label: 'Snacks',    emoji: '🍎' },
]

export default function AddFoodModal({ food, defaultMeal = 'breakfast', onAdd, onClose }) {
  const [meal, setMeal] = useState(defaultMeal)
  const [serving, setServing] = useState(String(food.servingSize || 100))
  const [saving, setSaving] = useState(false)

  const grams = parseFloat(serving) || 0
  const nutrition = calcNutrition(food, grams)

  const handleAdd = async () => {
    if (!grams) return
    setSaving(true)
    try {
      await onAdd({
        foodName: food.name,
        brand: food.brand || '',
        barcode: food.barcode || '',
        servingSize: grams,
        servingUnit: 'g',
        meal,
        ...nutrition,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl pb-safe shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-5 pt-2 pb-6">
          {/* Food info */}
          <div className="flex items-center gap-3 mb-5">
            {food.imageThumbnail ? (
              <img src={food.imageThumbnail} alt="" className="w-14 h-14 rounded-xl object-cover bg-gray-100" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-green-50 flex items-center justify-center text-3xl">🥫</div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 leading-tight">{food.name}</h3>
              {food.brand && <p className="text-sm text-gray-400">{food.brand}</p>}
            </div>
          </div>

          {/* Macros preview */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {[
              { label: 'Calories', value: nutrition.kcal, unit: 'kcal', color: 'text-orange-500' },
              { label: 'Protein', value: nutrition.protein, unit: 'g', color: 'text-blue-500' },
              { label: 'Carbs', value: nutrition.carbs, unit: 'g', color: 'text-yellow-500' },
              { label: 'Fat', value: nutrition.fat, unit: 'g', color: 'text-red-400' },
            ].map(m => (
              <div key={m.label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                <p className="text-xs text-gray-400">{m.unit}</p>
                <p className="text-xs text-gray-500">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Serving size */}
          <label className="block mb-4">
            <span className="text-sm font-medium text-gray-700 mb-1 block">Serving size</span>
            <div className="relative">
              <input
                type="number"
                value={serving}
                onChange={e => setServing(e.target.value)}
                min="1"
                max="2000"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">g</span>
            </div>
          </label>

          {/* Meal selector */}
          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-2">Add to</p>
            <div className="grid grid-cols-4 gap-2">
              {MEALS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMeal(m.id)}
                  className={`flex flex-col items-center py-2.5 rounded-xl text-xs font-medium transition-all ${
                    meal === m.id
                      ? 'bg-green-500 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-lg mb-0.5">{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Add button */}
          <button
            onClick={handleAdd}
            disabled={saving || !grams}
            className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold rounded-xl py-3.5 transition-colors disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add to diary'}
          </button>
        </div>
      </div>
    </div>
  )
}
