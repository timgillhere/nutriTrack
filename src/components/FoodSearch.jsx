import { useState, useRef, useCallback } from 'react'
import { searchFood } from '../services/foodApi'

export default function FoodSearch({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef(null)

  const handleChange = useCallback((e) => {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)
    if (!val.trim()) { setResults([]); setSearched(false); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchFood(val.trim())
        setResults(data)
        setSearched(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 500)
  }, [])

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

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 space-y-2">
        {loading && (
          <div className="py-10 text-center text-gray-400 text-sm">Searching…</div>
        )}
        {!loading && searched && results.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-gray-500 text-sm">No results found for "{query}"</p>
            <p className="text-gray-400 text-xs mt-1">Try a different search term or scan the barcode</p>
          </div>
        )}
        {!loading && results.map((food, i) => (
          <button
            key={i}
            onClick={() => onSelect(food)}
            className="w-full flex items-center gap-3 bg-white rounded-xl p-3 text-left shadow-sm hover:shadow-md active:scale-[0.99] transition-all"
          >
            {food.imageThumbnail ? (
              <img src={food.imageThumbnail} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-green-50 shrink-0 flex items-center justify-center text-2xl">
                🥫
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">{food.name}</p>
              {food.brand && <p className="text-xs text-gray-400 truncate">{food.brand}</p>}
              <p className="text-xs text-gray-500 mt-0.5">
                {food.per100g.kcal} kcal · {food.per100g.protein}g protein <span className="text-gray-300">per 100g</span>
              </p>
            </div>
            <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}
