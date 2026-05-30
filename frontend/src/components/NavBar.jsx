import { NavLink } from 'react-router-dom'

const ROUTES = [
  { path: '/', label: '🔔 리스크 레이더' },
  { path: '/scoreboard', label: '📊 스코어보드' },
  { path: '/sum-map', label: '🗺 리뷰 키워드 맵' },
  { path: '/consultant', label: '🤖 AI 컨설턴트' },
]

export default function NavBar() {
  return (
    <nav style={{
      background: '#fff',
      borderBottom: '1px solid #e5e7eb',
      padding: '0 24px',
      height: 52,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <span style={{ fontSize: 15, fontWeight: 800, color: '#111827', marginRight: 20 }}>
        Neurons
      </span>
      {ROUTES.map(({ path, label }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/'}
          style={({ isActive }) => ({
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: isActive ? 700 : 500,
            color: isActive ? '#6366f1' : '#6b7280',
            background: isActive ? '#eef2ff' : 'transparent',
            textDecoration: 'none',
            transition: 'all 0.15s',
          })}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
