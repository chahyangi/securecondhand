import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Swatch, Avatar } from '../components/Common'
import { useAuth } from '../context/AuthContext'
import { fetchChatRooms, fetchNotificationFeed, normalizeParticipant } from '../api'

const ROOM_STATUS_LABEL = {
  negotiating: '협의중',
  handover_done: '인계완료',
  confirmed: '거래확정',
  done: '거래완료',
}

export default function ChatList() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [notifCounts, setNotifCounts] = useState({ unread_chat: 0, unread_trade: 0 })

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/chats' } })
      return
    }
    let alive = true
    fetchChatRooms()
      .then((data) => {
        if (alive) setRooms(data)
      })
      .catch((err) => {
        if (alive) setErrorMsg(err.message || '채팅 목록을 불러오지 못했어요.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    fetchNotificationFeed()
      .then((data) => {
        if (alive) setNotifCounts(data)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [user, authLoading, navigate])

  if (loading) {
    return (
      <div className="screen">
        <div className="page-header">
          <span style={{ flex: 1 }}>채팅</span>
        </div>
        <div className="empty-note">채팅 목록을 불러오는 중이에요.</div>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="page-header">
        <span style={{ flex: 1 }}>채팅</span>
      </div>

      {!errorMsg && (
        <div className="friend-row" onClick={() => navigate('/notifications')}>
          <div
            className="avatar"
            style={{ width: 44, height: 44, flexShrink: 0, background: 'var(--moss-light)' }}
          >
            🔔
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500 }}>알림 모음</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>새 메시지·거래 상태 알림</div>
          </div>
          <span style={{ display: 'flex', gap: 6 }}>
            {notifCounts.unread_chat > 0 && (
              <span className="unread-badge" style={{ background: 'var(--danger)' }}>
                {notifCounts.unread_chat}
              </span>
            )}
            {notifCounts.unread_trade > 0 && (
              <span className="unread-badge" style={{ background: '#2f6fa3' }}>
                {notifCounts.unread_trade}
              </span>
            )}
          </span>
        </div>
      )}

      {errorMsg && <div className="empty-note">{errorMsg}</div>}

      {!errorMsg && rooms.length === 0 && (
        <div className="empty-note">아직 채팅한 상품이 없어요.</div>
      )}

      {rooms.map((room) => {
        const participants = room.participants.map(normalizeParticipant)
        const others = participants.filter((p) => p.id !== String(user.id) && !p.leftAt)
        const product = room.product_detail
        const thumb = product?.images?.[0]?.image

        return (
          <div
            key={room.id}
            className="friend-row"
            onClick={() => navigate(`/chat/${room.product}`)}
          >
            <Swatch image={thumb} style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500 }}>{product?.title || '상품 정보 없음'}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {others.map((p) => p.nickname).join(', ') || '참여자 없음'}
                {' · '}
                {ROOM_STATUS_LABEL[room.status] ?? room.status}
              </div>
            </div>
            <div className="participant-stack">
              {others.slice(0, 2).map((p) => (
                <Avatar key={p.id} user={p} />
              ))}
            </div>
            {room.unread_count > 0 && <span className="unread-badge">{room.unread_count}</span>}
          </div>
        )
      })}
    </div>
  )
}
