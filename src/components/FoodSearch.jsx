import { useState, useRef, useCallback, useEffect } from 'react'
import { searchFood } from '../services/foodApi'
import { getRecentFoods, mergeWithRecents } from '../services/recentFoods'

export default function FoodSearch({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef(null)

  // Show recent foods immediately on open (before any search)
  useEffect(() => {
    const recent = getRecentFoods()
    if (recent.length) setResults(recent.map(f => ({ ...f, _isRecent: true })))
  }, [])

  const handleChange = useCallback((e) => {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)

    if (!val.trim()) {
      // Back to recents
      const recent = getRecentFoods()
      setResults(recent.map(f => ({ ...f, _isRecent: true })))
      setSearched(false)
      return
    }

    // Immediately show matching recents while waiting for API
    const recent = getRecentFoods()
    const q = val.toLowerCase()
    const quickRecents = recent
      .filter(f => f.name.toLowerCase().includes(q) || (f.brand || '').toLowerCase().includes(q))
      .map(f => ({ ...f, _isRecent: true }))
    if (quickRecents.length) setResults(quickRecents)

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const apiData = await searchFood(val.trim())
        setResults(mergeWithRecents(val.trim(), apiData))
        setSearched(true)
      } catch {
        setResults(quickRecents)
      } finally {
        setLoading(false)
      }
    }, 500)
  }, [])

  const recentFoods = getRecentFoods()
  const showingRecents = !query && results.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="px-4 pb-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            autoFocus
            type="search"
            placeholder="Search foods…"
            value={query}
            onChange={handleChange}
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
      </div>

      {/* Section heading */}
      {(showingRecents || (query && results.some(r => r._isRecent))) && (
        <div className="px-4 pb-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {showingRecents ? 'Recently used' : 'Recently used · top results'}
          </p>
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
        {loading && !results.length && (
          <div className="py-10 text-center text-gray-400 text-sm">Searching…</div>
        )}
        {!loading && searched && results.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-gray-500 text-sm">No results found for "{query}"</p>
            <p className="text-gray-400 text-xs mt-1">Try a different term or scan the barcode</p>
          </div>
        )}
        {!loading && !query && !recentFoods.length && (
          <div className="py-10 text-center">
            <p className="text-4xl mb-2">🔍</p>
            <p className="text-gray-400 text-sm">Search for a food or scan a barcode</p>
            <p className="text-gray-300 text-xs mt-1">Recent items will appear here after your first log</p>
          </div>
        )}

        {results.map((food, i) => (
          <FoodRow
            key={food.barcode ? `${food.barcode}-${i}` : `${food.name}-${i}`}
            food={food}
            onSelect={onSelect}
            showDivider={query && i > 0 && food._isRecent === false && results[i - 1]?._isRecent === true}
          />
        ))}

        {/* Loading spinner below existing results */}
        {loading && results.length > 0 && (
          <div className="py-3 text-center text-gray-300 text-xs">Searching…</div>
        )}
      </div>
    </div>
  )
}

function FoodRow({ food, onSelect, showDivider }) {
  return (
    <>
      {showDivider && (
        <div className="pt-1 pb-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-0">All results</p>
        </div>
      )}
      <button
        onClick={() => onSelect(food)}
        className="w-full flex items-center gap-3 bg-white rounded-xl p-3 text-left shadow-sm hover:shadow-md active:scale-[0.99] transition-all"
      >
        {food._isRecent && (
          <div className="absolute top-2 right-2">
          </div>
        )}
        {food.imageThumbnail ? (
          <img src={food.imageThumbnail} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-green-50 shrink-0 flex items-center justify-center text-2xl">
            🥫
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-gray-900 text-sm truncate">{food.name}</p>
            {food._isRecent && (
              <span className="shrink-0 text-[10px] font-semibold text-green-600 bg-green-50 rounded px-1 py-0.5">
                Recent
              </span>
            )}
          </div>
          {food.brand && <p className="text-xs text-gray-400 truncate">{food.brand}</p>}
          <p className="text-xs text-gray-500 mt-0.5">
            {food.per100g.kcal} kcal · {food.per100g.protein}g protein
            <span className="text-gray-300"> per 100g</span>
          </p>
        </div>
        <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
        </svg>
      </button>
    </>
  )
}
