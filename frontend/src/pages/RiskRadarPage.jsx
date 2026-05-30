import React, { useEffect, useState, useCallback } from "react"
import AlertCard from "../components/risk_radar/AlertCard"
import { RatingTrendChart, KeywordTrendChart } from "../components/risk_radar/TrendChart"
import { fetchMeta, fetchAlerts, fetchRatingTrend, fetchKeywordTrend } from "../api/riskApi"
import ProductSidebar from "../components/ProductSidebar"

const SESSION_KEY = "risk_radar_state"
const getSaved = () => {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}") } catch { return {} }
}

export default function RiskRadarPage() {
  const [meta, setMeta] = useState(null)
  const [productId,     setProductId]     = useState(() => getSaved().productId     || "")
  const [referenceDate, setReferenceDate] = useState(() => getSaved().referenceDate || "")
  const [windowDays,    setWindowDays]    = useState(() => getSaved().windowDays    || 90)
  const [selectedAttr,  setSelectedAttr]  = useState(() => getSaved().selectedAttr  || "")

  const [alerts,       setAlerts]       = useState([])
  const [ratingTrend,  setRatingTrend]  = useState([])
  const [keywordTrend, setKeywordTrend] = useState([])

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")

  useEffect(() => {
    fetchMeta()
      .then((data) => {
        setMeta(data)
        if (!referenceDate) setReferenceDate(data.date_range.max)
        if (!selectedAttr)  setSelectedAttr(data.attributes[0] ?? "")
      })
      .catch(() => setError("API 서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인하세요."))
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ productId, referenceDate, windowDays, selectedAttr }))
    } catch {}
  }, [productId, referenceDate, windowDays, selectedAttr])

  const loadAlerts = useCallback(async () => {
    if (!productId) return
    setLoading(true)
    setError("")
    try {
      const [alertData, trendData] = await Promise.all([
        fetchAlerts(productId, referenceDate, windowDays),
        fetchRatingTrend(productId),
      ])
      setAlerts(alertData.alerts)
      setRatingTrend(trendData.trend)
    } catch (e) {
      setError("데이터 로드 실패: " + e.message)
    } finally {
      setLoading(false)
    }
  }, [productId, referenceDate, windowDays])

  useEffect(() => { loadAlerts() }, [loadAlerts])

  useEffect(() => {
    if (!productId || !selectedAttr) return
    fetchKeywordTrend(productId, selectedAttr)
      .then((data) => setKeywordTrend(data.trend))
      .catch(() => {})
  }, [productId, selectedAttr])

  const levelCount = (level) => alerts.filter((a) => a.level === level).length
  const currentProduct = meta?.products.find((p) => p.product_id === productId)

  if (!meta) return <div className="rr-page" style={{ padding: "32px 24px", color: "#999" }}>{error || "로딩 중…"}</div>

  return (
    <div className="rr-page" style={{ padding: "32px 24px" }}>
      <div style={{ marginBottom: 24, maxWidth: 1400, margin: "0 auto 24px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>🔔 부정 리스크 감지 및 조기 경보</h1>
        <p style={{ color: "#666", marginTop: 4, fontSize: 14 }}>
          기준 날짜 기준 부정 키워드 급증 · 평점 하락 이상 패턴을 자동 감지합니다
        </p>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", maxWidth: 1400, margin: "0 auto" }}>
        <ProductSidebar
          products={meta.products}
          selectedId={productId}
          onSelect={setProductId}
          nameKey="title"
          stickyTop={76}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          {!productId ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", minHeight: "60vh", gap: 16,
              color: "#9ca3af", textAlign: "center",
            }}>
              <span style={{ fontSize: 64 }}>🔔</span>
              <h2 style={{ fontSize: 20, color: "#374151", fontWeight: 700 }}>상품을 선택해주세요</h2>
              <p style={{ fontSize: 14, lineHeight: 1.8 }}>
                왼쪽 목록에서 분석할 상품을 선택하면<br />부정 리스크 감지 결과를 확인할 수 있습니다.
              </p>
            </div>
          ) : (
            <>
              <div className="card" style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 24, alignItems: "flex-end" }}>
                <div>
                  <label htmlFor="reference-date" style={labelStyle}>기준 날짜</label>
                  <input id="reference-date" type="date" value={referenceDate}
                    min={meta.date_range.min} max={meta.date_range.max}
                    onChange={(e) => setReferenceDate(e.target.value)} style={selectStyle} />
                </div>
                <div>
                  <label htmlFor="window-select" style={labelStyle}>비교 윈도우</label>
                  <select id="window-select" value={windowDays} onChange={(e) => setWindowDays(Number(e.target.value))} style={selectStyle}>
                    <option value={30}>최근 30일</option>
                    <option value={60}>최근 60일</option>
                    <option value={90}>최근 90일</option>
                    <option value={180}>최근 180일</option>
                  </select>
                </div>
                <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>
                  데이터 범위<br />
                  <strong>{meta.date_range.min} ~ {meta.date_range.max}</strong>
                </div>
              </div>

              {error && <div style={{ color: "#d32f2f", marginBottom: 16, fontSize: 14 }}>⚠️ {error}</div>}

              <div className="grid-3" style={{ marginBottom: 24 }}>
                {[
                  { level: "위험", color: "#d32f2f", bg: "#ffe5e5" },
                  { level: "경고", color: "#e65100", bg: "#fff3e0" },
                  { level: "양호", color: "#2e7d32", bg: "#e8f5e9" },
                ].map(({ level, color, bg }) => (
                  <div key={level} className="card" style={{ background: bg, textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color }}>{levelCount(level)}</div>
                    <div style={{ fontSize: 13, color, fontWeight: 600 }}>{level}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 32 }}>
                <div className="section-title">
                  상품
                  {currentProduct && (
                    <span style={{ fontSize: 20, fontWeight: 600, color: "#111827", marginLeft: 8 }}>
                      — {currentProduct.title}
                    </span>
                  )}
                </div>
                {loading ? (
                  <div style={{ color: "#999", fontSize: 14 }}>분석 중…</div>
                ) : alerts.length === 0 ? (
                  <div className="card" style={{ color: "#888", fontSize: 14 }}>이상 패턴이 감지되지 않았습니다.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {alerts.map((a, i) => <AlertCard key={i} alert={a} />)}
                  </div>
                )}
              </div>

              <div className="grid-2">
                <div className="card">
                  <div className="section-title">📈 월별 평균 평점 추이</div>
                  <RatingTrendChart data={ratingTrend} />
                </div>
                <div className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <span className="section-title" style={{ margin: 0 }}>📉 속성별 부정 키워드 비율</span>
                    <select value={selectedAttr} onChange={(e) => setSelectedAttr(e.target.value)} style={{ ...selectStyle, width: "auto" }}>
                      {meta.attributes.map((a) => <option key={a}>{a}</option>)}
                    </select>
                  </div>
                  <KeywordTrendChart data={keywordTrend} attribute={selectedAttr} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const labelStyle = { display: "block", fontSize: 12, color: "#666", marginBottom: 4, fontWeight: 600 }
const selectStyle = {
  padding: "7px 12px", borderRadius: 8, border: "1px solid #ddd",
  fontSize: 14, outline: "none", background: "#fff", cursor: "pointer",
}
