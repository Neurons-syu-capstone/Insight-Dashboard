import { useState, useEffect } from 'react'
import { fetchResults } from '../api/resultsApi'
import WordCloudSection from '../components/sum_map/WordCloudSection.jsx'
import ProductSidebar from '../components/ProductSidebar.jsx'

const SESSION_KEY = "sum_map_state"
const getSaved = () => {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}") } catch { return {} }
}

function StarRating({ rating }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, marginRight: 4 }}>
        {rating?.toFixed(1)}
      </span>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{
          fontSize: 18,
          color: i < Math.round(rating) ? 'var(--accent-yellow)' : 'var(--bg-elevated)',
          filter: i < Math.round(rating) ? 'drop-shadow(0 0 4px rgba(245,200,66,0.5))' : 'none',
        }}>★</span>
      ))}
    </div>
  )
}

function Dashboard({ data }) {
  const [selectedProductId, setSelectedProductId] = useState(() => getSaved().selectedProductId || "")
  const [smProducts, setSmProducts] = useState([])

  useEffect(() => {
    fetch('/api/sum-map/products')
      .then(r => r.json())
      .then(setSmProducts)
      .catch(() => {})
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ selectedProductId }))
    } catch {}
  }, [selectedProductId])

  const product = data.find(p => p.product_id === selectedProductId) || null
  const { average_rating = 0, validation_status } = product || {}

  return (
    <div style={{ minHeight: 'calc(100vh - 52px)', background: 'var(--bg-base)' }}>
      {/* ── 페이지 타이틀 헤더 ── */}
      <header style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 52, zIndex: 100, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <span style={{ fontSize: 24 }}>🗺</span>
        <span style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>
          리뷰 키워드 맵
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 12, color: '#9ca3af',
          background: '#f3f4f6', padding: '4px 10px', borderRadius: 99,
        }}>
          키워드 클릭 → 관련 리뷰 검색
        </span>
      </header>

      {/* ── 본문 ── */}
      <main style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <ProductSidebar
          products={smProducts}
          selectedId={selectedProductId}
          onSelect={setSelectedProductId}
          nameKey="product_name"
          stickyTop={116}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          {!product ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', minHeight: '60vh', gap: 16,
              color: '#9ca3af', textAlign: 'center',
            }}>
              <span style={{ fontSize: 64 }}>🗺</span>
              <h2 style={{ fontSize: 20, color: '#374151', fontWeight: 700 }}>상품을 선택해주세요</h2>
              <p style={{ fontSize: 14, lineHeight: 1.8 }}>
                왼쪽 목록에서 상품을 선택하면<br />리뷰 키워드 맵을 확인할 수 있습니다.
              </p>
            </div>
          ) : (
            <>
              {/* ── 상품 헤더 ── */}
              <div style={{
                background: 'linear-gradient(180deg, #e8eaf0 0%, var(--bg-base) 100%)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 12, padding: '18px 24px', marginBottom: 20,
              }}>
                <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, wordBreak: 'break-word' }}>
                  {product.product_name || product.product_id}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <StarRating rating={average_rating} />
                  {validation_status && validation_status !== 'ok' && (
                    <span style={{ fontSize: 11, color: 'var(--accent-orange)', background: 'rgba(255,140,0,0.1)', borderRadius: 6, padding: '2px 10px' }}>
                      ⚠ {validation_status}
                    </span>
                  )}
                </div>
              </div>

              <WordCloudSection product={product} />
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default function SumMapPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchResults()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: 'calc(100vh - 52px)', gap: 16, color: 'var(--text-muted)',
    }}>
      <div style={{
        width: 32, height: 32, border: '3px solid var(--border-default)',
        borderTop: '3px solid var(--accent-blue)', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <span style={{ fontSize: 12, letterSpacing: 1 }}>Loading...</span>
    </div>
  )

  if (error) return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: 'calc(100vh - 52px)', color: 'var(--accent-red)', fontSize: 13, gap: 10,
    }}>
      <div>⚠ 로딩 실패</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{error}</div>
    </div>
  )

  return <Dashboard data={data} />
}
