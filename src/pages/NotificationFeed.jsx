import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchNotificationFeed, markNotificationsRead } from '../api'

const formatTime = (value) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value))

export default function NotificationFeed() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetchNotificationFeed()
      .then((data) => {
        if (alive) setItems(data.results)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    // 이 화면을 여는 것 자체가 "확인했다"는 뜻이므로 열자마자 전부 읽음 처리한다.
    markNotificationsRead().catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="screen">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/chats')}>←</button>
        알림 모음
      </div>

      {loading ? (
        <div className="empty-note">불러오는 중이에요.</div>
      ) : (
        <div className="settings-list">
          {items.map((n) => (
            <div
              key={n.id}
              className="settings-row"
              onClick={() => n.chatroom && navigate(`/chats`)}
              style={{ cursor: n.chatroom ? 'pointer' : 'default' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span className={`notif-dot notif-dot-${n.kind}`} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.content}</span>
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{formatTime(n.created_at)}</span>
            </div>
          ))}
          {items.length === 0 && <div className="empty-note">알림이 없어요.</div>}
        </div>
      )}
    </div>
  )
}
