import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { saveRecipe, deleteRecipe } from '../services/firebase'
import { calcNutrition } from '../services/foodApi'
import FoodSearch from './FoodSearch'

// ─── Ingredient serving-size configurator ────────────────────────────────────
function IngredientConfig({ food, onConfirm, onBack }) {
  const [serving, setServing] = useState(String(food.servingSize || 100))
  const grams = parseFloat(serving) || 0
  const nutrition = calcNutrition(food, grams)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center" onClick={onBack}>
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl pb-safe shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="px-5 pt-2 pb-6">
          {/* Food info */}
          <div className="flex items-center gap-3 mb-4">
            {food.imageThumbnail ? (
              <img src={food.imageThumbnail} alt="" className="w-12 h-12 rounded-xl object-cover bg-gray-100 shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-2xl shrink-0">🥫</div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 leading-tight truncate">{food.name}</p>
              {food.brand && <p className="text-xs text-gray-400">{food.brand}</p>}
            </div>
          </div>

          {/* Macro preview */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: 'Calories', value: nutrition.kcal, unit: 'kcal', color: 'text-orange-500' },
              { label: 'Protein',  value: nutrition.protein, unit: 'g', color: 'text-blue-500' },
              { label: 'Carbs',    value: nutrition.carbs,   unit: 'g', color: 'text-yellow-500' },
              { label: 'Fat',      value: nutrition.fat,     unit: 'g', color: 'text-red-400' },
            ].map(m => (
              <div key={m.label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                <p className={`text-base font-bold ${m.color}`}>{m.value}</p>
                <p className="text-xs text-gray-400">{m.unit}</p>
                <p className="text-xs text-gray-500">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Serving input */}
          <label className="block mb-5">
            <span className="text-sm font-medium text-gray-700 mb-1 block">Serving size for this recipe</span>
            <div className="relative">
              <input
                autoFocus
                type="number"
                value={serving}
                onChange={e => setServing(e.target.value)}
                min="1"
                max="5000"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">g</span>
            </div>
          </label>

          <button
            onClick={() => grams && onConfirm(food, grams, nutrition)}
            disabled={!grams}
            className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold rounded-xl py-3.5 transition-colors disabled:opacity-50"
          >
            Add to recipe
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── RecipeEditor ─────────────────────────────────────────────────────────────
export default function RecipeEditor({ recipe, onSaved, onDeleted, onClose }) {
  const { user } = useAuth()
  const [name, setName] = useState(recipe?.name || '')
  const [ingredients, setIngredients] = useState(recipe?.ingredients || [])
  const [view, setView] = useState('editor')   // 'editor' | 'search'
  const [pendingFood, setPendingFood] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const totals = ingredients.reduce(
    (acc, i) => ({
      kcal:    acc.kcal    + (i.kcal    || 0),
      protein: acc.protein + (i.protein || 0),
      carbs:   acc.carbs   + (i.carbs   || 0),
      fat:     acc.fat     + (i.fat     || 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const handleFoodSelected = (food) => {
    setPendingFood(food)
    // stay on 'search' — IngredientConfig renders on top
  }

  const handleConfirmIngredient = (food, grams, nutrition) => {
    setIngredients(prev => [...prev, {
      foodName: food.name,
      brand: food.brand || '',
      barcode: food.barcode || '',
      imageThumbnail: food.imageThumbnail || '',
      per100g: food.per100g,
      servingSize: grams,
      ...nutrition,
    }])
    setPendingFood(null)
    setView('editor')
  }

  const removeIngredient = (idx) => {
    setIngredients(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSave = async () => {
    if (!name.trim() || !ingredients.length) return
    setSaving(true)
    try {
      const data = { name: name.trim(), ingredients }
      const id = await saveRecipe(user.uid, recipe ? { ...data, id: recipe.id } : data)
      onSaved({ id, ...data, createdAt: recipe?.createdAt || Date.now() })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    await deleteRecipe(user.uid, recipe.id)
    onDeleted(recipe.id)
  }

  // ── Search view ──────────────────────────────────────────────────────────
  if (view === 'search') {
    return (
      <div className="fixed inset-0 z-40 bg-white flex flex-col">
        <div className="shrink-0 flex items-center gap-3 px-4 pt-4 pb-2 border-b border-gray-100">
          <button
            onClick={() => { setView('editor'); setPendingFood(null) }}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h2 className="text-lg font-bold text-gray-900 flex-1">Add ingredient</h2>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col pt-3">
          <FoodSearch onSelect={handleFoodSelected} />
        </div>

        {/* Serving config sheet */}
        {pendingFood && (
          <IngredientConfig
            food={pendingFood}
            onConfirm={handleConfirmIngredient}
            onBack={() => setPendingFood(null)}
          />
        )}
      </div>
    )
  }

  // ── Editor view ──────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-40 bg-white flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h2 className="text-lg font-bold text-gray-900 flex-1">
          {recipe ? 'Edit recipe' : 'New recipe'}
        </h2>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-10">

        {/* Name */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Recipe name</label>
          <input
            autoFocus={!recipe}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. My Breakfast, Post-workout shake…"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-gray-300"
          />
        </div>

        {/* Ingredients */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">
              Ingredients
              {ingredients.length > 0 && (
                <span className="ml-1.5 text-xs font-normal text-gray-400">
                  ({ingredients.length})
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={() => setView('search')}
              className="flex items-center gap-1 text-sm font-semibold text-green-600 hover:text-green-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
              </svg>
              Add
            </button>
          </div>

          {ingredients.length === 0 ? (
            <button
              type="button"
              onClick={() => setView('search')}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 text-center hover:border-green-300 hover:bg-green-50 transition-colors"
            >
              <p className="text-gray-400 text-sm">Tap to search and add ingredients</p>
            </button>
          ) : (
            <div className="space-y-2">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm">
                  {ing.imageThumbnail ? (
                    <img src={ing.imageThumbnail} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0"
                      onError={e => { e.currentTarget.style.display = 'none' }} />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-green-50 shrink-0 flex items-center justify-center text-lg">🥫</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{ing.foodName}</p>
                    <p className="text-xs text-gray-400">{ing.servingSize}g · {ing.kcal} kcal · {ing.protein}g protein</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeIngredient(idx)}
                    className="p-1.5 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nutrition totals */}
        {ingredients.length > 0 && (
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recipe totals</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Calories', value: Math.round(totals.kcal),    unit: 'kcal', color: 'text-orange-500' },
                { label: 'Protein',  value: Math.round(totals.protein), unit: 'g',    color: 'text-blue-500' },
                { label: 'Carbs',    value: Math.round(totals.carbs),   unit: 'g',    color: 'text-yellow-500' },
                { label: 'Fat',      value: Math.round(totals.fat),     unit: 'g',    color: 'text-red-400' },
              ].map(m => (
                <div key={m.label} className="bg-white rounded-xl p-2.5 text-center shadow-sm">
                  <p className={`text-base font-bold ${m.color}`}>{m.value}</p>
                  <p className="text-xs text-gray-400">{m.unit}</p>
                  <p className="text-xs text-gray-500">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim() || !ingredients.length}
          className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold rounded-xl py-3.5 transition-colors disabled:opacity-40"
        >
          {saving ? 'Saving…' : recipe ? 'Save changes' : 'Save recipe'}
        </button>

        {/* Delete */}
        {recipe && (
          confirmDelete ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl py-3 text-sm transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 bg-gray-100 text-gray-600 font-semibold rounded-xl py-3 text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full border border-red-200 text-red-500 font-medium rounded-xl py-3 text-sm hover:bg-red-50 transition-colors"
            >
              Delete recipe
            </button>
          )
        )}
      </div>
    </div>
  )
}
