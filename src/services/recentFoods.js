const KEY = 'nutritrack_recent_foods'
const MAX = 20

export const getRecentFoods = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

// Call this whenever a food is added to the diary
export const recordRecentFood = (food) => {
  const recent = getRecentFoods().filter(f => f.barcode
    ? f.barcode !== food.barcode
    : f.name !== food.name
  )
  // Increment use count
  const count = (food._useCount || 0) + 1
  recent.unshift({ ...food, _useCount: count, _lastUsed: Date.now() })
  localStorage.setItem(KEY, JSON.stringify(recent.slice(0, MAX)))
}

// Merge recent foods into search results, boosting recently-used items to the top
export const mergeWithRecents = (query, apiResults) => {
  const recent = getRecentFoods()
  if (!recent.length) return apiResults

  const q = query.toLowerCase().trim()

  // Filter recents that match the query (or return all if no query)
  const matchingRecents = recent
    .filter(f => !q || f.name.toLowerCase().includes(q) || (f.brand || '').toLowerCase().includes(q))
    .map(f => ({ ...f, _isRecent: true }))

  // Remove recents that already appear in API results (dedup by barcode or name)
  const recentKeys = new Set(matchingRecents.map(f => f.barcode || f.name))
  const filteredApi = apiResults.filter(f => !recentKeys.has(f.barcode || f.name))

  return [...matchingRecents, ...filteredApi]
}
