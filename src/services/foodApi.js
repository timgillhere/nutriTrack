// Product API  — barcodes via world.openfoodfacts.org/api/v0  (CORS: ✓)
//              — search  via /off-search (proxied through Vite in dev,
//                vercel.json rewrite in prod) because search.openfoodfacts.org
//                omits Access-Control-Allow-Origin and is CORS-blocked in browsers.
const OFF_BASE    = 'https://world.openfoodfacts.org'
const SEARCH_PATH = '/off-search'   // proxied → https://search.openfoodfacts.org/search

// ─── Search result cache ───────────────────────────────────────────────────
const CACHE_KEY = 'nutritrack_search_cache'
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

const loadCache = () => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {} }
  catch { return {} }
}

const saveCache = (cache) => {
  const entries = Object.entries(cache)
  let pruned = cache
  if (entries.length > 200) {
    pruned = Object.fromEntries(entries.sort((a, b) => b[1].ts - a[1].ts).slice(0, 160))
  }
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(pruned)) } catch { /* storage full */ }
}

export const pruneSearchCache = () => {
  const cache = loadCache()
  const now = Date.now()
  const pruned = Object.fromEntries(
    Object.entries(cache).filter(([, v]) => now - v.ts < CACHE_TTL)
  )
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(pruned)) } catch { /* ignore */ }
}

// ─── Parse a raw OFF product into a clean nutrition object ────────────────
// Handles both the v0 barcode format (brands: string)
// and the new search API format  (brands: string[])
const parseProduct = (product) => {
  const n = product.nutriments || {}
  const per100 = (key) => parseFloat(n[`${key}_100g`] ?? n[key] ?? 0) || 0

  return {
    barcode: product.code || product._id || '',
    name: product.product_name || product.product_name_en || 'Unknown product',
    brand: Array.isArray(product.brands)
      ? product.brands.filter(Boolean).join(', ')
      : (product.brands || ''),
    imageThumbnail: product.image_thumb_url || product.image_small_url || '',
    servingSize: parseFloat(product.serving_size) || 100,
    servingUnit: 'g',
    per100g: {
      kcal:    per100('energy-kcal') || Math.round(per100('energy') / 4.184),
      protein: per100('proteins'),
      carbs:   per100('carbohydrates'),
      fat:     per100('fat'),
      fiber:   per100('fiber'),
      sugar:   per100('sugars'),
    },
  }
}

// ─── Barcode lookup (v0 endpoint — still working) ─────────────────────────
export const fetchByBarcode = async (barcode) => {
  const res = await fetch(`${OFF_BASE}/api/v0/product/${barcode}.json`)
  const data = await res.json()
  if (data.status !== 1) throw new Error('Product not found')
  return parseProduct(data.product)
}

// ─── Text search (new Meilisearch endpoint) ───────────────────────────────
export const searchFood = async (query, page = 1) => {
  const cacheKey = `${query.toLowerCase().trim()}__p${page}`
  const cache = loadCache()
  const hit = cache[cacheKey]
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data

  const params = new URLSearchParams({
    q: query,
    page_size: 20,
    page,
    fields: 'code,product_name,brands,image_thumb_url,image_small_url,nutriments,serving_size',
  })
  const res = await fetch(`${SEARCH_PATH}?${params}`)
  const data = await res.json()
  const results = (data.hits || [])
    .filter(p => p.product_name && p.nutriments)  // skip entries with no nutrition data
    .map(parseProduct)
    .filter(p => p.per100g.kcal > 0)              // skip zero-calorie ghost entries

  saveCache({ ...cache, [cacheKey]: { ts: Date.now(), data: results } })
  return results
}

// ─── Macro calculator ─────────────────────────────────────────────────────
export const calcNutrition = (food, servingGrams) => {
  const ratio = servingGrams / 100
  return {
    kcal:    Math.round(food.per100g.kcal    * ratio),
    protein: Math.round(food.per100g.protein * ratio * 10) / 10,
    carbs:   Math.round(food.per100g.carbs   * ratio * 10) / 10,
    fat:     Math.round(food.per100g.fat     * ratio * 10) / 10,
  }
}
