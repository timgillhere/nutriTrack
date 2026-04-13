import { useState, useEffect } from 'react'
import FoodSearch from './FoodSearch'
import AddFoodModal from './AddFoodModal'
import { addDiaryEntry, getRecipes } from '../services/firebase'
import { useAuth } from '../hooks/useAuth'

// ─── Recipe nutrition totals ──────────────────────────────────────────────────
const recipeTotals = (recipe) =>
  recipe.ingredients.reduce(
    (acc, i) => ({
      kcal:    acc.kcal    + (i.kcal    || 0),
      protein: acc.protein + (i.protein || 0),
      carbs:   acc.carbs   + (i.carbs   || 0),
      fat:     acc.fat     + (i.fat     || 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  )

// ─── Recipe preview bottom sheet ─────────────────────────────────────────────
function RecipePreview({ recipe, mealLabel, onConfirm, onBack, adding }) {
  const totals = recipeTotals(recipe)
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center" onClick={onBack}>
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl pb-safe shadow-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-5 pt-2 pb-1 shrink-0">
          {/* Recipe header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-2xl shrink-0">🍳</div>
            <div>
              <h3 className="font-semibold text-gray-900">{recipe.name}</h3>
              <p className="text-xs text-gray-400">
                {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''} · adding to {mealLabel}
              </p>
            </div>
          </div>

          {/* Nutrition totals */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: 'Calories', value: Math.round(totals.kcal),    unit: 'kcal', color: 'text-orange-500' },
              { label: 'Protein',  value: Math.round(totals.protein), unit: 'g',    color: 'text-blue-500' },
              { label: 'Carbs',    value: Math.round(totals.carbs),   unit: 'g',    color: 'text-yellow-500' },
              { label: 'Fat',      value: Math.round(totals.fat),     unit: 'g',    color: 'text-red-400' },
            ].map(m => (
              <div key={m.label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                <p className={`text-base font-bold ${m.color}`}>{m.value}</p>
                <p className="text-xs text-gray-400">{m.unit}</p>
                <p className="text-xs text-gray-500">{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Ingredient list */}
        <div className="flex-1 overflow-y-auto px-5 space-y-1.5 mb-4">
          {recipe.ingredients.map((ing, idx) => (
            <div key={idx} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{ing.foodName}</p>
                <p className="text-xs text-gray-400">{ing.servingSize}g</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-700">{ing.kcal} kcal</p>
                <p className="text-xs text-blue-400">{ing.protein}g P</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-6 shrink-0">
          <button
            onClick={onConfirm}
            disabled={adding}
            className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold rounded-xl py-3.5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {adding ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Adding…
              </>
            ) : `Add ${recipe.ingredients.length} item${recipe.ingredients.length !== 1 ? 's' : ''} to diary`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Recipe list for the Recipes tab ─────────────────────────────────────────
function RecipeList({ onSelect }) {
  const { user } = useAuth()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getRecipes(user.uid).then(setRecipes).finally(() => setLoading(false))
  }, [user])

  if (loading) {
    return <div className="py-10 text-center text-gray-400 text-sm">Loading recipes…</div>
  }

  if (recipes.length === 0) {
    return (
      <div className="py-16 text-center px-6">
        <p className="text-4xl mb-3">🍳</p>
        <p className="font-semibold text-gray-700 mb-1">No recipes yet</p>
        <p className="text-sm text-gray-400">Go to the Recipes tab to create your regular meals</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {recipes.map(recipe => {
        const totals = recipeTotals(recipe)
        return (
          <button
            key={recipe.id}
            onClick={() => onSelect(recipe)}
            className="w-full flex items-center gap-3 bg-white rounded-xl p-3 text-left shadow-sm active:scale-[0.98] transition-all"
          >
            <div className="w-12 h-12 rounded-lg bg-orange-50 shrink-0 flex items-center justify-center text-2xl">🍳</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">{recipe.name}</p>
              <p className="text-xs text-gray-400">
                {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-gray-700">{Math.round(totals.kcal)} kcal</p>
              <p className="text-xs text-blue-400">{Math.round(totals.protein)}g P</p>
            </div>
            <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        )
      })}
    </div>
  )
}

const MEAL_LABELS = {
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks',
}

// ─── AddFoodSheet ─────────────────────────────────────────────────────────────
export default function AddFoodSheet({ defaultMeal, date, onAdded, onClose }) {
  const { user } = useAuth()
  const [tab, setTab] = useState('search')
  const [selectedFood, setSelectedFood] = useState(null)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [addingRecipe, setAddingRecipe] = useState(false)

  const handleAddFood = async (entry) => {
    const id = await addDiaryEntry(user.uid, date, entry)
    onAdded({ id, ...entry })
  }

  const handleAddRecipe = async () => {
    if (!selectedRecipe) return
    setAddingRecipe(true)
    try {
      const entries = []
      for (const ing of selectedRecipe.ingredients) {
        const entry = {
          foodName: ing.foodName,
          brand: ing.brand || '',
          barcode: ing.barcode || '',
          servingSize: ing.servingSize,
          servingUnit: 'g',
          meal: defaultMeal,
          kcal: ing.kcal,
          protein: ing.protein,
          carbs: ing.carbs,
          fat: ing.fat,
        }
        const id = await addDiaryEntry(user.uid, date, entry)
        entries.push({ id, ...entry })
      }
      onAdded(entries) // array — DiaryDay handles bulk-add
    } finally {
      setAddingRecipe(false)
    }
  }

  if (selectedFood) {
    return (
      <AddFoodModal
        food={selectedFood}
        defaultMeal={defaultMeal}
        onAdd={handleAddFood}
        onClose={() => setSelectedFood(null)}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-40 bg-white flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 pt-4 pb-2 border-b border-gray-100">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h2 className="text-lg font-bold text-gray-900 flex-1">Add Food</h2>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex gap-2 px-4 py-3">
        <button
          onClick={() => setTab('search')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'search' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Search
        </button>
        <button
          onClick={() => setTab('recipes')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'recipes' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          My Recipes
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === 'search' && (
          <FoodSearch onSelect={setSelectedFood} />
        )}

        {tab === 'recipes' && (
          <div className="flex-1 overflow-y-auto px-4 py-2 pb-6">
            <RecipeList onSelect={setSelectedRecipe} />
          </div>
        )}
      </div>

      {/* Recipe preview sheet */}
      {selectedRecipe && (
        <RecipePreview
          recipe={selectedRecipe}
          mealLabel={MEAL_LABELS[defaultMeal] || defaultMeal}
          onConfirm={handleAddRecipe}
          onBack={() => setSelectedRecipe(null)}
          adding={addingRecipe}
        />
      )}
    </div>
  )
}
