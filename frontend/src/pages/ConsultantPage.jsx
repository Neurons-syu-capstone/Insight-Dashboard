import { useState, useEffect, useRef, useCallback } from "react"
import "./ConsultantPage.css"

const API = "/api/consultant"
const SESSION_KEY = "consultant_state"

const getSaved = () => {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}") } catch { return {} }
}

const STATUS_CONFIG = {
  위험: { color: "#ef4444", bg: "#fef2f2", border: "#ffffff", label: "위험" },
  주의: { color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", label: "주의" },
  양호: { color: "#10b981", bg: "#f0fdf4", border: "#a7f3d0", label: "양호" },
}

function ScoreBar({ score }) {
  const pct   = Math.round((score / 10) * 100)
  const color = score < 4 ? "#ef4444" : score < 7 ? "#f59e0b" : "#10b981"
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "#e0e3e8", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color,
                      borderRadius: 99, transition: "width .6s ease" }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 36 }}>{score.toFixed(1)}</span>
    </div>
  )
}

function OverviewCard({ item, selected, onClick }) {
  const cfg = STATUS_CONFIG[item.status]
  return (
    <div className={`cp-overview-card ${selected ? "selected" : ""}`}
         style={{ borderColor: selected ? cfg.color : "#e0e3e8",
                  background: selected ? cfg.bg : "#f4f5f7" }}
         onClick={onClick}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 22 }}>{item.emoji}</span>
        <span className="cp-status-badge" style={{ background: cfg.bg + "33", color: cfg.color, border: `1px solid ${cfg.border}` }}>
          {cfg.label}
        </span>
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1d23", marginBottom: 6 }}>{item.cat_kr}</div>
      <ScoreBar score={item.score} />
      <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 12, color: "#4a5060" }}>
        <span>👍 {item.pos}</span>
        <span>👎 {item.neg}</span>
      </div>
    </div>
  )
}

// ── 전체 진단 결과 ─────────────────────────────────────────────────
function OverviewDiagnosisResult({ result, loading }) {
  if (loading) return (
    <div className="cp-diagnosis-loading">
      <div className="cp-spinner" />
      <p>전체 속성을 종합 분석 중입니다...</p>
    </div>
  )
  if (!result) return (
    <div className="cp-diagnosis-empty">
      <span style={{ fontSize: 48 }}>🤖</span>
      <p>상품을 선택한 후<br/>전체 진단 실행 버튼을 누르세요.</p>
    </div>
  )

  const { sections, usage } = result

  return (
    <div className="cp-diagnosis-result">
      <div className="cp-result-header">
        <span style={{ fontSize: 13, fontWeight: 700, color: "#4a5060", letterSpacing: "0.06em" }}>
          AI 종합 진단 결과
        </span>
      </div>

      {sections.urgent && (
        <div className="cp-urgent-banner">
          <span style={{ fontWeight: 800, color: "#ffffff", fontSize: 13 }}>⚡ 가장 시급한 문제</span>
          <p style={{ margin: "4px 0 0", color: "#ffffff", fontSize: 14, fontWeight: 600 }}>
            {sections.urgent}
          </p>
        </div>
      )}

      {sections.priority?.length > 0 && (
        <div className="cp-section-block">
          <div className="cp-section-title">📋 속성별 개선 우선순위</div>
          <ol className="cp-guidelines-list">
            {sections.priority.map((line, i) => (
              <li key={i}>{line.replace(/^\d+위:\s*/, "")}</li>
            ))}
          </ol>
        </div>
      )}

      {sections.guidelines?.length > 0 && (
        <div className="cp-section-block">
          <div className="cp-section-title">💊 즉시 실행 가이드라인</div>
          <ol className="cp-guidelines-list">
            {sections.guidelines.map((g, i) => (
              <li key={i}>{g.replace(/^\d+\.\s*/, "")}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="cp-usage-footer">
        토큰 {usage.tokens.toLocaleString()}개 &nbsp;|&nbsp; 예상 비용 ${usage.cost}
      </div>
    </div>
  )
}

// ── 속성별 진단 결과 ───────────────────────────────────────────────
function AspectDiagnosisResult({ result, loading }) {
  if (loading) return (
    <div className="cp-diagnosis-loading">
      <div className="cp-spinner" />
      <p>GPT가 분석 중입니다...</p>
    </div>
  )
  if (!result) return (
    <div className="cp-diagnosis-empty">
      <span style={{ fontSize: 48 }}>🔍</span>
      <p>속성을 선택하고<br/>진단 실행 버튼을 누르세요.</p>
    </div>
  )

  const { sections, usage, cat_kr, score } = result
  const color = score < 4 ? "#ef4444" : score < 7 ? "#f59e0b" : "#10b981"

  return (
    <div className="cp-diagnosis-result">
      <div className="cp-result-header">
        <span style={{ fontSize: 13, fontWeight: 700, color: "#4a5060", letterSpacing: "0.06em" }}>
          AI 진단 결과 — {cat_kr}
        </span>
        <span className="cp-score-badge" style={{ background: color + "22", color }}>
          {score.toFixed(1)}점
        </span>
      </div>

      {sections.urgent && (
        <div className="cp-urgent-banner">
          <span style={{ fontWeight: 800, color: "#ffffff", fontSize: 13 }}>⚡ 가장 시급한 문제</span>
          <p style={{ margin: "4px 0 0", color: "#ffffff", fontSize: 14, fontWeight: 600 }}>
            {sections.urgent}
          </p>
        </div>
      )}

      {sections.diagnosis && (
        <div className="cp-section-block">
          <div className="cp-section-title">🔍 진단 요약</div>
          <p className="cp-section-body">{sections.diagnosis}</p>
        </div>
      )}

      {sections.guidelines?.length > 0 && (
        <div className="cp-section-block">
          <div className="cp-section-title">💊 운영 개선 가이드라인</div>
          <ol className="cp-guidelines-list">
            {sections.guidelines.map((g, i) => (
              <li key={i}>{g.replace(/^\d+\.\s*/, "")}</li>
            ))}
          </ol>
        </div>
      )}

      {sections.effect && (
        <div className="cp-section-block">
          <div className="cp-section-title">📊 예상 효과</div>
          <p className="cp-section-body">{sections.effect}</p>
        </div>
      )}

      <div className="cp-usage-footer">
        토큰 {usage.tokens.toLocaleString()}개 &nbsp;|&nbsp; 예상 비용 ${usage.cost}
      </div>
    </div>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────────────
export default function ConsultantPage() {
  const [brands,           setBrands]           = useState([])
  const [products,         setProducts]         = useState([])
  const [selBrand,         setSelBrand]         = useState(() => getSaved().selBrand || "전체")
  const [search,           setSearch]           = useState(() => getSaved().search   || "")
  const [selAsin,          setSelAsin]          = useState(() => getSaved().selAsin  || "")
  const [overview,         setOverview]         = useState(() => getSaved().overview || [])
  const [selCat,           setSelCat]           = useState(() => getSaved().selCat   || "")
  const [overviewDiag,     setOverviewDiag]     = useState(() => getSaved().overviewDiag || null)
  const [overviewLoading,  setOverviewLoading]  = useState(false)
  const [aspectDiag,       setAspectDiag]       = useState(() => getSaved().aspectDiag  || null)
  const [aspectLoading,    setAspectLoading]    = useState(false)
  const [error,            setError]            = useState("")

  const prevFiltersRef = useRef({ selBrand: null, search: null })

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        selBrand, search, selAsin, overview, selCat, overviewDiag, aspectDiag,
      }))
    } catch {}
  }, [selBrand, search, selAsin, overview, selCat, overviewDiag, aspectDiag])

  useEffect(() => {
    fetch(`${API}/brands`)
      .then(r => r.json())
      .then(data => setBrands(["전체", ...data]))
      .catch(() => setError("서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인하세요."))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (selBrand !== "전체") params.set("brand", selBrand)
    if (search)              params.set("search", search)

    const prev = prevFiltersRef.current
    const filtersChanged = prev.selBrand !== null &&
      (prev.selBrand !== selBrand || prev.search !== search)
    prevFiltersRef.current = { selBrand, search }

    fetch(`${API}/products?${params}`)
      .then(r => r.json())
      .then(data => {
        setProducts(data)
        if (filtersChanged) {
          setSelAsin(""); setOverview([]); setOverviewDiag(null); setAspectDiag(null)
        }
      })
      .catch(() => {})
  }, [selBrand, search])

  const selectProduct = useCallback((asin) => {
    setSelAsin(asin)
    setOverviewDiag(null)
    setAspectDiag(null)
    setSelCat("")
    fetch(`${API}/overview/${asin}`)
      .then(r => r.json())
      .then(setOverview)
      .catch(() => {})
  }, [])

  const runOverviewDiagnosis = useCallback(() => {
    if (!selAsin) return
    setOverviewLoading(true)
    setOverviewDiag(null)
    fetch(`${API}/diagnose/overview`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ asin: selAsin }),
    })
      .then(r => r.json())
      .then(data => { setOverviewDiag(data); setOverviewLoading(false) })
      .catch(() => { setOverviewLoading(false); setError("진단 중 오류가 발생했습니다.") })
  }, [selAsin])

  const runAspectDiagnosis = useCallback(() => {
    if (!selAsin || !selCat) return
    setAspectLoading(true)
    setAspectDiag(null)
    fetch(`${API}/diagnose`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ asin: selAsin, category: selCat }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.detail) { setError(data.detail); setAspectLoading(false); return }
        setAspectDiag(data)
        setAspectLoading(false)
      })
      .catch(() => { setAspectLoading(false); setError("진단 중 오류가 발생했습니다.") })
  }, [selAsin, selCat])

  const selectedProd = products.find(p => p.asin === selAsin)

  return (
    <div className="consultant-page">
      {/* ── 페이지 타이틀 헤더 ── */}
      <header style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 52, zIndex: 100, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <span style={{ fontSize: 24 }}>🤖</span>
        <span style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>
          AI 컨설턴트
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 12, color: '#9ca3af',
          background: '#f3f4f6', padding: '4px 10px', borderRadius: 99,
        }}>
          GPT-4o-mini · 리뷰 기반 이슈 진단 & 실행 처방전
        </span>
      </header>

      <div className="cp-main">
        {error && <div className="cp-error-banner">{error}</div>}

        {/* 필터 */}
        <div className="cp-filter-row">
          <select className="cp-select" value={selBrand} onChange={e => setSelBrand(e.target.value)}>
            {brands.map(b => <option key={b}>{b}</option>)}
          </select>
          <input className="cp-input" placeholder="🔍  상품명 검색..."
                 value={search} onChange={e => setSearch(e.target.value)} />
          <span className="cp-count-badge">{products.length.toLocaleString()}개 상품</span>
        </div>

        <div className="cp-layout">
          {/* 상품 목록 */}
          <aside className="cp-sidebar">
            <div className="cp-sidebar-title">상품 선택</div>
            <div className="cp-product-list">
              {products.slice(0, 100).map(p => (
                <div key={p.asin}
                     className={`cp-product-item ${selAsin === p.asin ? "active" : ""}`}
                     onClick={() => selectProduct(p.asin)}>
                  <div className="cp-product-brand">{p.brand}</div>
                  <div className="cp-product-name">{p.product_title.slice(0, 50)}{p.product_title.length > 50 ? "…" : ""}</div>
                  <div className="cp-product-meta">⭐ {p.avg_rating} &nbsp;·&nbsp; {p.review_count.toLocaleString()}건</div>
                </div>
              ))}
              {products.length === 0 && (
                <div style={{ padding: "2rem", textAlign: "center", color: "#4a5060", fontSize: 13 }}>
                  상품이 없습니다.
                </div>
              )}
            </div>
          </aside>

          {/* 메인 콘텐츠 */}
          <section className="cp-content">
            {!selAsin ? (
              <div className="cp-empty-state">
                <span style={{ fontSize: 64 }}>👟</span>
                <h2>상품을 선택해주세요</h2>
                <p>왼쪽 목록에서 분석할 상품을 선택하면<br/>AI 이슈 진단을 시작할 수 있습니다.</p>
              </div>
            ) : (
              <>
                {/* 상품 헤더 */}
                <div className="cp-product-header">
                  <div className="cp-product-header-brand">{selectedProd?.brand}</div>
                  <div className="cp-product-header-title">{selectedProd?.product_title}</div>
                  <div className="cp-product-header-meta">
                    ⭐ {selectedProd?.avg_rating} &nbsp;·&nbsp;
                    리뷰 {selectedProd?.review_count?.toLocaleString()}건
                  </div>
                </div>

                {/* ── 메인: 전체 종합 진단 ── */}
                <div className="cp-section-card" style={{ borderColor: "#6366f144", borderWidth: 2 }}>
                  <div className="cp-card-title">🤖 AI 종합 진단 & 실행 처방전</div>
                  <button
                    className={`cp-run-btn ${overviewLoading ? "disabled" : ""}`}
                    disabled={overviewLoading}
                    onClick={runOverviewDiagnosis}
                    style={{ marginBottom: "1.2rem" }}
                  >
                    {overviewLoading ? "분석 중..." : "🔍 전체 속성 종합 진단 실행"}
                  </button>
                  <OverviewDiagnosisResult result={overviewDiag} loading={overviewLoading} />
                </div>

                {/* ── 속성별 상세 진단 ── */}
                <div className="cp-section-card">
                  <div className="cp-card-title">🔎 속성별 상세 진단</div>
                  <div className="cp-diagnose-row">
                    <div className="cp-diagnose-controls">
                      <div style={{ fontSize: 13, color: "#4a5060", marginBottom: 8 }}>
                        진단할 속성을 선택하세요
                      </div>
                      <div className="cp-cat-buttons">
                        {overview.map(item => {
                          const cfg = STATUS_CONFIG[item.status]
                          return (
                            <button key={item.category}
                                    className={`cp-cat-btn ${selCat === item.category ? "active" : ""}`}
                                    style={selCat === item.category
                                      ? { background: cfg.color, color: "white", borderColor: cfg.color }
                                      : { borderColor: cfg.color + "88", color: cfg.color }}
                                    onClick={() => setSelCat(item.category)}>
                              {item.emoji} {item.cat_kr}
                              <span style={{ fontSize: 11, opacity: 0.85 }}> {item.score.toFixed(1)}점</span>
                            </button>
                          )
                        })}
                      </div>
                      <button className={`cp-run-btn ${(!selCat || aspectLoading) ? "disabled" : ""}`}
                              disabled={!selCat || aspectLoading}
                              onClick={runAspectDiagnosis}>
                        {aspectLoading ? "분석 중..." : `🔍 ${selCat ? overview.find(o => o.category === selCat)?.cat_kr : ""} 상세 진단`}
                      </button>
                    </div>
                    <div className="cp-diagnose-result-area">
                      <AspectDiagnosisResult result={aspectDiag} loading={aspectLoading} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
