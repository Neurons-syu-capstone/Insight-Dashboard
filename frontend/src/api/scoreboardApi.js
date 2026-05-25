const BASE = "/api/scoreboard"

export async function fetchProducts({ brand = null, search = null } = {}) {
  const params = new URLSearchParams()
  if (brand)  params.append("brand", brand)
  if (search) params.append("search", search)
  const res = await fetch(`${BASE}/products?${params}`)
  if (!res.ok) throw new Error("상품 목록 조회 실패")
  return res.json()
}

export async function fetchBrands() {
  const res = await fetch(`${BASE}/products/brands`)
  if (!res.ok) throw new Error("브랜드 목록 조회 실패")
  return res.json()
}

export async function fetchProduct(asin) {
  const res = await fetch(`${BASE}/products/${asin}`)
  if (!res.ok) throw new Error("상품 조회 실패")
  return res.json()
}

export async function fetchSentences(asin, { category = null, sentiment = null } = {}) {
  const params = new URLSearchParams()
  if (category)  params.append("category", category)
  if (sentiment) params.append("sentiment", sentiment)
  const res = await fetch(`${BASE}/sentences/${asin}?${params}`)
  if (!res.ok) throw new Error("문장 조회 실패")
  return res.json()
}
