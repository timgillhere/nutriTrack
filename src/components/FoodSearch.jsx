import { useState, useRef, useCallback, useEffect } from 'react'
import { searchFood } from '../services/foodApi'
import { getRecentFoods, mergeWithRecents } from '../services/recentFoods'

export default function FoodSearch({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef(null)

  // Show recent foods immediately when sheet opens
  useEffect(() => {
    const recent = getRecentFoods()
    if (recent.length) setResults(recent.map(f => ({ ...f, _isRecent: true })))
  }, [])

  const handleChange = useCallback((e) => {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)

    if (!val.trim()) {
      const recent = getRecentFoods()
      setResults(recent.map(f => ({ ...f, _isRecent: true })))
      setSearched(false)
      return
    }

    // Instantly surface matching recents while API loads
    const q = val.toLowerCase()
    const recent = getRecentFoods()
    const matchingRecents = recent
      .filter(f => {
        const name = (f.name || '').toLowerCase()
        const brand = (f.brand || '').toLowerCase()
        return name.includes(q) || brand.includes(q)
      })
      .map(f => ({ ...f, _isRecent: true }))

    if (matchingRecents.length) setResults(matchingRecents)

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const apiData = await searchFood(val.trim())
        setResults(mergeWithRecents(val.trim(), apiData))
        setSearched(true)
      } catch {
        // Keep showing whatever recents we have
        setSearched(true)
      } finally {
        setLoading(false)
      }
    }, 500)
  }, [])

  const hasRecents = results.some(r => r._isRecent)
  const noQuery = !query.trim()

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* Search input — pinned at top, never scrolls away */}
      <div className="shrink-0 px-4 pb-3 pt-1">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            autoFocus
            type="search"
            placeholder="Search foods…"
            value={query}
            onChange={handleChange}
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition-colors"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {/* Section label */}
        {(hasRecents) && (
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-2 px-1">
            {noQuery ? 'Recently used' : 'Recent matches · more results below'}
          </p>
        )}
      </div>

      {/* Scrollable results */}
      <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-6">

        {/* Empty state — no query, no recents */}
        {noQuery && results.length === 0 && (
          <div className="pt-12 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-gray-500 text-sm font-medium">Search for a food</p>
            <p className="text-gray-300 text-xs mt-1">Recently added items will appear here</p>
          </div>
        )}

        {/* No results after search */}
        {!loading && searched && results.length === 0 && (
          <div className="pt-12 text-center">
            <p className="text-gray-500 text-sm">No results for "{query}"</p>
            <p className="text-gray-400 text-xs mt-1">Try a different search term</p>
          </div>
        )}

        {/* Divider between recents and API results */}
        {results.map((food, i) => {
          const isFirstApiResult = !food._isRecent && i > 0 && results[i - 1]?._isRecent
          return (
            <div key={`${food.barcode || food.name}-${i}`}>
              {isFirstApiResult && query && (
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2 pb-1 px-1">
                  All results
                </p>
              )}
              <FoodRow food={food} onSelect={onSelect} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FoodRow({ food, onSelect }) {
  // Guard: if somehow per100g is missing (e.g. old stored data), fall back to zeros
  const per100g = food.per100g || { kcal: 0, protein: 0 }

  return (
    <button
      onClick={() => onSelect(food)}
      className="w-full flex items-center gap-3 bg-white rounded-xl p-3 text-left shadow-sm active:scale-[0.98] active:shadow-none transition-all"
    >
      {food.imageThumbnail ? (
        <img
          src={food.imageThumbnail}
          alt=""
          className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0"
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-green-50 shrink-0 flex items-center justify-center text-2xl">
          🥫
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="font-medium text-gray-900 text-sm truncate">{food.name || 'Unknown food'}</p>
          {food._isRecent && (
            <span className="shrink-0 text-[10px] font-semibold text-green-600 bg-green-50 rounded px-1.5 py-0.5 leading-tight">
              Recent
            </span>
          )}
        </div>
        {food.brand && (
          <p className="text-xs text-gray-400 truncate">{food.brand}</p>
        )}
        <p className="text-xs text-gray-500 mt-0.5">
          {per100g.kcal} kcal · {per100g.protein}g protein
          <span className="text-gray-300"> / 100g</span>
        </p>
      </div>

      <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
      </svg>
    </button>
  )
}
