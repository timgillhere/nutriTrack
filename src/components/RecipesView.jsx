import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getRecipes } from '../services/firebase'
import RecipeEditor from './RecipeEditor'

const recipeTotals = (recipe) =>
  recipe.ingredients.reduce(
    (acc, i) => ({
      kcal:    acc.kcal    + (i.kcal    || 0),
      protein: acc.protein + (i.protein || 0),
    }),
    { kcal: 0, protein: 0 }
  )

export default function RecipesView() {
  const { user } = useAuth()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null = list | 'new' | recipe object

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getRecipes(user.uid)
      setRecipes(data)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  const handleSaved = (recipe) => {
    setRecipes(prev => {
      const idx = prev.findIndex(r => r.id === recipe.id)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = recipe
        return updated
      }
      return [recipe, ...prev]
    })
    setEditing(null)
  }

  const handleDeleted = (id) => {
    setRecipes(prev => prev.filter(r => r.id !== id))
    setEditing(null)
  }

  if (editing !== null) {
    return (
      <RecipeEditor
        recipe={editing === 'new' ? null : editing}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
        onClose={() => setEditing(null)}
      />
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Sub-header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {loading ? '' : `${recipes.length} recipe${recipes.length !== 1 ? 's' : ''}`}
        </p>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
          </svg>
          New recipe
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-24">
        {loading ? (
          <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>
        ) : recipes.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-5xl mb-3">🍳</p>
            <p className="font-semibold text-gray-700 mb-1">No recipes yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Save your regular meals as recipes<br />to log them in one tap
            </p>
            <button
              onClick={() => setEditing('new')}
              className="mt-5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              Create your first recipe
            </button>
          </div>
        ) : (
          recipes.map(recipe => {
            const totals = recipeTotals(recipe)
            return (
              <button
                key={recipe.id}
                onClick={() => setEditing(recipe)}
                className="w-full bg-white rounded-2xl p-4 shadow-sm text-left active:scale-[0.98] transition-all flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-2xl shrink-0">
                  🍳
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{recipe.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-700">{Math.round(totals.kcal)} kcal</p>
                  <p className="text-xs text-blue-400">{Math.round(totals.protein)}g protein</p>
                </div>
                <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
