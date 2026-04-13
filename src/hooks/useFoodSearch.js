import { useState, useRef, useCallback, useEffect } from 'react'
import { searchFood } from '../services/foodApi'
import { getRecentFoods, mergeWithRecents } from '../services/recentFoods'

/**
 * Reusable food-search hook.
 *
 * Returns { query, results, loading, searched, search }
 *   - query:    current input string
 *   - results:  array of food objects (recent items flagged with _isRecent)
 *   - loading:  true while the API request is in-flight
 *   - searched: true once at least one API search has completed
 *   - search:   call with the new input value to trigger a search
 *
 * Behaviour:
 *   • Seeds with recent foods immediately (zero latency for common items)
 *   • Surfaces matching recents instantly as the user types
 *   • Debounces the Open Food Facts API call by 500 ms
 *   • Merges API results with recents, deduplicating by barcode/name
 *   • Results are cached in localStorage for 7 days (via foodApi)
 */
export function useFoodSearch() {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef(null)

  // Seed with recent foods on mount; clear debounce timer on unmount
  useEffect(() => {
    const recent = getRecentFoods()
    if (recent.length) setResults(recent.map(f => ({ ...f, _isRecent: true })))
    return () => clearTimeout(debounceRef.current)
  }, [])

  const search = useCallback((val) => {
    setQuery(val)
    clearTimeout(debounceRef.current)

    if (!val.trim()) {
      setResults(getRecentFoods().map(f => ({ ...f, _isRecent: true })))
      setSearched(false)
      return
    }

    // Instantly surface matching recents while the API loads
    const q = val.toLowerCase()
    const matchingRecents = getRecentFoods()
      .filter(f =>
        (f.name  || '').toLowerCase().includes(q) ||
        (f.brand || '').toLowerCase().includes(q)
      )
      .map(f => ({ ...f, _isRecent: true }))

    if (matchingRecents.length) setResults(matchingRecents)

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const apiData = await searchFood(val.trim())
        setResults(mergeWithRecents(val.trim(), apiData))
        setSearched(true)
      } catch {
        // Keep showing whatever recents we already surfaced
        setSearched(true)
      } finally {
        setLoading(false)
      }
    }, 500)
  }, [])

  return { query, results, loading, searched, search }
}
