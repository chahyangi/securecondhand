import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchNotificationFeed } from '../api'

const TABS = [
  { key: 'home', label: '홈', path: '/' },
  { key: 'chat', label: '채팅', path: '/chats' },
  { key: 'settings', label: '설정', path: '/settings' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const [notifCounts, setNotifCounts] = useState({ unread_chat: 0, unread_trade: 0 })

  // 경로가 바뀔 때마다(탭을 오갈 때마다) 안 읽은 알림이 있는지 다시 확인한다. 채팅(빨강)/거래(파랑)
  // 알림은 설정(chat_enabled/trade_enabled)이 꺼져 있으면 애초에 서버에서 생성되지 않으므로,
  // 여기서 따로 필터링할 필요 없이 카운트 자체가 설정을 반영한다.
  useEffect(() => {
    if (!user) {
      setNotifCounts({ unread_chat: 0, unread_trade: 0 })
      return
    }
    let alive = true
    fetchNotificationFeed()
      .then((data) => {
        if (alive) setNotifCounts(data)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [user, pathname])

  const hasUnreadChat = notifCounts.unread_chat > 0
  const hasUnreadTrade = notifCounts.unread_trade > 0

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
          <span className="nav-dot-wrap">
            <span className="nav-dot" />
            {tab.key === 'chat' && hasUnreadChat && <span className="nav-unread-dot nav-unread-dot-chat" />}
            {tab.key === 'chat' && hasUnreadTrade && <span className="nav-unread-dot nav-unread-dot-trade" />}
          </span>
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
