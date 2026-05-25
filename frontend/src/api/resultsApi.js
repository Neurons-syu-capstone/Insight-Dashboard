export async function fetchResults() {
  const res = await fetch('/results.json')
  if (!res.ok) throw new Error('results.json 로딩 실패')
  const json = await res.json()
  return Array.isArray(json) ? json : [json]
}
