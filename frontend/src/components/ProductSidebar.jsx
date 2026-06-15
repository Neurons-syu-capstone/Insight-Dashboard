import { useState, useMemo } from "react"

export default function ProductSidebar({
  products,
  selectedId,
  onSelect,
  nameKey = "title",
  idKey = "product_id",
  stickyTop = 76,
}) {
  const [brand, setBrand] = useState("전체")
  const [search, setSearch] = useState("")

  const brands = useMemo(() => {
    const s = new Set(products.map(p => p.brand).filter(Boolean))
    return ["전체", ...Array.from(s).sort()]
  }, [products])

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchBrand = brand === "전체" || p.brand === brand
      const s = search.toLowerCase()
      const matchSearch = !s ||
        (p[nameKey] || "").toLowerCase().includes(s) ||
        (p.brand || "").toLowerCase().includes(s)
      return matchBrand && matchSearch
    })
  }, [products, brand, search, nameKey])

  return (
    <aside style={{
      width: 260, flexShrink: 0,
      background: "#fff", border: "1px solid #e5e7eb",
      borderRadius: 12, overflow: "hidden",
      position: "sticky", top: stickyTop,
      alignSelf: "flex-start",
      maxHeight: `calc(100vh - ${stickyTop + 24}px)`,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
        <div style={{
          fontWeight: 700, fontSize: 12, color: "#6b7280",
          letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8,
        }}>
          상품 선택
        </div>
        <select value={brand} onChange={e => setBrand(e.target.value)} style={inputStyle}>
          {brands.map(b => <option key={b}>{b}</option>)}
        </select>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 상품명 검색..."
          style={{ ...inputStyle, marginTop: 6 }}
        />
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
          {filtered.length} / {products.length}개
        </div>
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        {filtered.map(p => {
          const isSelected = p[idKey] === selectedId
          return (
            <div
              key={p[idKey]}
              onClick={() => onSelect(p[idKey])}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                borderBottom: "1px solid #f3f4f6",
                borderLeft: isSelected ? "3px solid #6366f1" : "3px solid transparent",
                background: isSelected ? "#eef0ff" : "transparent",
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#f9fafb" }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent" }}
            >
              {p.brand && (
                <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 600, marginBottom: 2 }}>
                  {p.brand}
                </div>
              )}
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1d23", lineHeight: 1.4 }}>
                {(p[nameKey] || "").slice(0, 50)}{(p[nameKey]?.length || 0) > 50 ? "…" : ""}
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>
                리뷰 {(p.review_count || 0).toLocaleString()}건
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
            결과 없음
          </div>
        )}
      </div>
    </aside>
  )
}

const inputStyle = {
  width: "100%", padding: "6px 10px",
  border: "1px solid #e5e7eb", borderRadius: 8,
  fontSize: 13, outline: "none", background: "#f9fafb",
  boxSizing: "border-box",
}
