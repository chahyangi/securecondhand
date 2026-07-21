import { useNavigate, useLocation } from 'react-router-dom'

const TABS = [
  { key: 'home', label: '홈', path: '/' },
  { key: 'chat', label: '채팅', path: '/chats' },
  { key: 'settings', label: '설정', path: '/settings' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const isActive = (tab) => {
    if (tab.key === 'home') return pathname === '/'
    return pathname.startsWith(`/${tab.key}`)
  }

  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          className={`nav-item ${isActive(tab) ? 'active' : ''}`}
          onClick={() => navigate(tab.path)}
        >
          <span className="nav-dot" />
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
