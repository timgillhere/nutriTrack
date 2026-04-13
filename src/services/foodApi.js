const OFF_BASE = 'https://world.openfoodfacts.org'

// Parse raw Open Food Facts product into a clean nutrition object
const parseProduct = (product) => {
  const n = product.nutriments || {}
  const per100 = (key) => parseFloat(n[`${key}_100g`] ?? n[key] ?? 0) || 0

  return {
    barcode: product.code || product._id || '',
    name: product.product_name || product.product_name_en || 'Unknown product',
    brand: product.brands || '',
    imageThumbnail: product.image_thumb_url || product.image_small_url || '',
    servingSize: parseFloat(product.serving_size) || 100,
    servingUnit: 'g',
    per100g: {
      kcal: per100('energy-kcal') || Math.round(per100('energy') / 4.184),
      protein: per100('proteins'),
      carbs: per100('carbohydrates'),
      fat: per100('fat'),
      fiber: per100('fiber'),
      sugar: per100('sugars'),
    },
  }
}

// Look up a product by barcode
export const fetchByBarcode = async (barcode) => {
  const res = await fetch(`${OFF_BASE}/api/v0/product/${barcode}.json`)
  const data = await res.json()
  if (data.status !== 1) throw new Error('Product not found')
  return parseProduct(data.product)
}

// Search by text query
export const searchFood = async (query, page = 1) => {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: 1,
    action: 'process',
    json: 1,
    page,
    page_size: 20,
    fields: 'code,product_name,product_name_en,brands,image_thumb_url,image_small_url,nutriments,serving_size',
  })
  const res = await fetch(`${OFF_BASE}/cgi/search.pl?${params}`)
  const data = await res.json()
  return (data.products || [])
    .filter(p => p.product_name)
    .map(parseProduct)
}

// Calculate macros for a given food at a specific serving size
export const calcNutrition = (food, servingGrams) => {
  const ratio = servingGrams / 100
  return {
    kcal: Math.round(food.per100g.kcal * ratio),
    protein: Math.round(food.per100g.protein * ratio * 10) / 10,
    carbs: Math.round(food.per100g.carbs * ratio * 10) / 10,
    fat: Math.round(food.per100g.fat * ratio * 10) / 10,
  }
}
