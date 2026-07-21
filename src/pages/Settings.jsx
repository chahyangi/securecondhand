import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Swatch } from '../components/Common'
import { useAuth } from '../context/AuthContext'
import {
  fetchFriends,
  fetchFriendRequests,
  lookupUser,
  sendFriendRequest,
  respondFriendRequest,
  deleteFriendRequest,
  fetchNotificationSettings,
  updateNotificationSettings,
  changePassword,
  deleteAccount,
  setToken,
  fetchMyReports,
  fetchWishlist,
  removeWishlist,
  normalizeProduct,
} from '../api'

const MENU = [
  { section: '내 활동', items: ['찜 목록'] },
  { section: '관계', items: ['친구 관리'] },
  { section: '환경설정', items: ['알림 설정', '계정 관리'] },
  { section: '', items: ['신고 내역', '로그아웃'] },
]

export default function Settings() {
  const navigate = useNavigate()
  const { user, loading, logout } = useAuth()
  const [view, setView] = useState('main') // main | friends | notifications | account

  if (loading) {
    return (
      <div className="screen">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate('/')}>←</button>
          설정
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="screen">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate('/')}>←</button>
          설정
        </div>
        <div className="empty-note" style={{ paddingTop: 80 }}>
          로그인하면 프로필, 친구, 알림 설정을 이용할 수 있어요.
        </div>
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="chat-cta" onClick={() => navigate('/login')}>로그인</button>
          <button
            className="chat-cta"
            style={{ background: 'var(--surface)', color: 'var(--moss)', border: '0.5px solid var(--line)' }}
            onClick={() => navigate('/signup')}
          >
            회원가입
          </button>
        </div>
      </div>
    )
  }

  if (view === 'friends') return <FriendsView onBack={() => setView('main')} currentUserId={user.id} />
  if (view === 'notifications') return <NotificationsView onBack={() => setView('main')} />
  if (view === 'account') return <AccountView onBack={() => setView('main')} />
  if (view === 'reports') return <ReportsView onBack={() => setView('main')} />
  if (view === 'wishlist') return <WishlistView onBack={() => setView('main')} />

  const handleMenu = (item) => {
    if (item === '친구 관리') setView('friends')
    else if (item === '알림 설정') setView('notifications')
    else if (item === '계정 관리') setView('account')
    else if (item === '신고 내역') setView('reports')
    else if (item === '찜 목록') setView('wishlist')
    else if (item === '로그아웃') {
      logout()
      navigate('/')
    }
  }

  return (
    <div className="screen">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>←</button>
        설정
      </div>

      <div className="settings-profile">
        <Avatar user={user} />
        <div>
          <div className="name">{user.nickname}</div>
          <div className="edit">{user.username}</div>
        </div>
      </div>

      {user.isStaff && (
        <div className="settings-list">
          <div className="settings-row" onClick={() => navigate('/admin')}>
            <span style={{ color: 'var(--moss)' }}>관리자 대시보드</span>
            <span className="chev">›</span>
          </div>
        </div>
      )}

      {MENU.map((group) => (
        <div key={group.section || 'etc'}>
          {group.section && <div className="section-label">{group.section}</div>}
          <div className="settings-list">
            {group.items.map((item) => (
              <div key={item} className="settings-row" onClick={() => handleMenu(item)}>
                <span>{item}</span>
                <span className="chev">›</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function FriendsView({ onBack, currentUserId }) {
  const [tab, setTab] = useState('list') // list | requests
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [friendList, requestList] = await Promise.all([fetchFriends(), fetchFriendRequests()])
      setFriends(friendList)
      setRequests(requestList)
    } catch {
      // 조회 실패해도 빈 목록으로 둠
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const received = requests.filter((r) => r.status === 'pending' && r.receiver === currentUserId)
  const sent = requests.filter((r) => r.status === 'pending' && r.requester?.id === currentUserId)

  const handleAdd = async () => {
    const username = usernameInput.trim()
    if (!username) return
    setAddBusy(true)
    setAddError('')
    try {
      const target = await lookupUser(username)
      await sendFriendRequest(target.id)
      setUsernameInput('')
      setAddOpen(false)
      await load()
    } catch (err) {
      setAddError(err.message || '친구 요청에 실패했어요.')
    } finally {
      setAddBusy(false)
    }
  }

  const handleRespond = async (requestId, status) => {
    try {
      await respondFriendRequest(requestId, status)
      await load()
    } catch (err) {
      alert(err.message || '처리에 실패했어요.')
    }
  }

  const handleRemove = async (requestId) => {
    if (!window.confirm('친구를 삭제할까요?')) return
    try {
      await deleteFriendRequest(requestId)
      await load()
    } catch (err) {
      alert(err.message || '삭제에 실패했어요.')
    }
  }

  const friendRequestIdFor = (friendId) => {
    const match = requests.find(
      (r) =>
        r.status === 'accepted' &&
        ((r.requester?.id === currentUserId && r.receiver === friendId) ||
          (r.requester?.id === friendId && r.receiver === currentUserId)),
    )
    return match?.id
  }

  return (
    <div className="screen">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>←</button>
        친구 관리
      </div>

      <div className="chip-row" style={{ padding: '0 16px' }}>
        <button className={`chip ${tab === 'list' ? 'on' : ''}`} onClick={() => setTab('list')}>
          친구 목록
        </button>
        <button className={`chip ${tab === 'requests' ? 'on' : ''}`} onClick={() => setTab('requests')}>
          요청함 {received.length > 0 && `(${received.length})`}
        </button>
      </div>

      {loading ? (
        <div className="empty-note">불러오는 중이에요.</div>
      ) : tab === 'list' ? (
        <div className="settings-list">
          {friends.map((f) => (
            <div key={f.id} className="settings-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar user={f} />
                {f.nickname}
              </span>
              <button className="text-btn" onClick={() => handleRemove(friendRequestIdFor(f.id))}>
                삭제
              </button>
            </div>
          ))}
          {friends.length === 0 && <div className="empty-note">아직 친구가 없어요.</div>}
          <div className="settings-row" onClick={() => setAddOpen(true)}>
            <span style={{ color: 'var(--moss)' }}>+ 친구 추가</span>
          </div>
        </div>
      ) : (
        <div className="settings-list">
          <div className="section-label">받은 요청</div>
          {received.map((r) => (
            <div key={r.id} className="settings-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar user={r.requester} />
                {r.requester.nickname}
              </span>
              <span style={{ display: 'flex', gap: 8 }}>
                <button className="text-btn" onClick={() => handleRespond(r.id, 'accepted')}>
                  수락
                </button>
                <button className="text-btn" onClick={() => handleRespond(r.id, 'rejected')}>
                  거절
                </button>
              </span>
            </div>
          ))}
          {received.length === 0 && <div className="empty-note">받은 요청이 없어요.</div>}

          <div className="section-label">보낸 요청</div>
          {sent.map((r) => (
            <div key={r.id} className="settings-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar user={r.receiver_detail} />
                {r.receiver_detail.nickname}
              </span>
              <button className="text-btn" onClick={() => handleRemove(r.id)}>
                취소
              </button>
            </div>
          ))}
          {sent.length === 0 && <div className="empty-note">보낸 요청이 없어요.</div>}
        </div>
      )}

      {addOpen && (
        <div className="modal-backdrop" onClick={() => setAddOpen(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">친구 추가</h3>
            <input
              type="text"
              className="form-input"
              placeholder="아이디(username) 입력"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
            />
            {addError && <p className="modal-sub" style={{ color: 'var(--danger)' }}>{addError}</p>}
            <button className="chat-cta" onClick={handleAdd} disabled={addBusy} style={{ marginTop: 10 }}>
              {addBusy ? '요청 중...' : '친구 요청 보내기'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function NotificationsView({ onBack }) {
  const [notif, setNotif] = useState({ chat_enabled: true, trade_enabled: true })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetchNotificationSettings()
      .then((data) => {
        if (alive) setNotif(data)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const toggle = async (key) => {
    const next = { ...notif, [key]: !notif[key] }
    setNotif(next)
    try {
      await updateNotificationSettings({ [key]: next[key] })
    } catch (err) {
      alert(err.message || '알림 설정 저장에 실패했어요.')
      setNotif(notif)
    }
  }

  return (
    <div className="screen">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>←</button>
        알림 설정
      </div>
      {loading ? (
        <div className="empty-note">불러오는 중이에요.</div>
      ) : (
        <div className="settings-list">
          <div className="settings-row">
            <span>채팅 알림</span>
            <button
              className={`toggle ${notif.chat_enabled ? 'on' : ''}`}
              onClick={() => toggle('chat_enabled')}
              aria-label="채팅 알림 토글"
            />
          </div>
          <div className="settings-row">
            <span>거래 상태 알림</span>
            <button
              className={`toggle ${notif.trade_enabled ? 'on' : ''}`}
              onClick={() => toggle('trade_enabled')}
              aria-label="거래 상태 알림 토글"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function WishlistView({ onBack }) {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetchWishlist()
      .then((data) => {
        if (alive) setItems(data)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const handleRemove = async (wishlistId) => {
    try {
      await removeWishlist(wishlistId)
      setItems((prev) => prev.filter((item) => item.id !== wishlistId))
    } catch (err) {
      alert(err.message || '찜 해제에 실패했어요.')
    }
  }

  return (
    <div className="screen">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>←</button>
        찜 목록
      </div>
      {loading ? (
        <div className="empty-note">불러오는 중이에요.</div>
      ) : (
        <div className="settings-list">
          {items.map((item) => {
            const product = normalizeProduct(item.product_detail)
            return (
              <div key={item.id} className="friend-row" onClick={() => navigate(`/product/${product.id}`)}>
                <Swatch colors={product.colors} image={product.images?.[0]} style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>{product.title}</span>
                <button
                  className="text-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove(item.id)
                  }}
                >
                  삭제
                </button>
              </div>
            )
          })}
          {items.length === 0 && <div className="empty-note">찜한 상품이 없어요.</div>}
        </div>
      )}
    </div>
  )
}

const REPORT_TARGET_LABEL = { user: '사용자', product: '상품' }

function ReportsView({ onBack }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetchMyReports()
      .then((data) => {
        if (alive) setReports(data)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="screen">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>←</button>
        신고 내역
      </div>
      {loading ? (
        <div className="empty-note">불러오는 중이에요.</div>
      ) : (
        <div className="settings-list">
          {reports.map((r) => (
            <div key={r.id} className="settings-row">
              <span>[{REPORT_TARGET_LABEL[r.target_type] ?? r.target_type}] {r.reason}</span>
              <span>{r.status === 'resolved' ? '처리완료' : '대기중'}</span>
            </div>
          ))}
          {reports.length === 0 && <div className="empty-note">신고한 내역이 없어요.</div>}
        </div>
      )}
    </div>
  )
}

function AccountView({ onBack }) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const handleChangePassword = async () => {
    if (!current || !next) return
    setBusy(true)
    setMsg('')
    try {
      const data = await changePassword({ currentPassword: current, newPassword: next })
      setToken(data.token)
      setMsg('비밀번호가 변경되었어요.')
      setCurrent('')
      setNext('')
    } catch (err) {
      setMsg(err.message || '비밀번호 변경에 실패했어요.')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('정말 탈퇴할까요? 되돌릴 수 없어요.')) return
    try {
      await deleteAccount()
      await logout()
      navigate('/')
    } catch (err) {
      alert(err.message || '회원 탈퇴에 실패했어요.')
    }
  }

  return (
    <div className="screen">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>←</button>
        계정 관리
      </div>
      <div className="create-body">
        <div className="filter-label">비밀번호 변경</div>
        <input
          type="password"
          className="form-input"
          placeholder="현재 비밀번호"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <input
          type="password"
          className="form-input"
          placeholder="새 비밀번호"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          style={{ marginTop: 8 }}
        />
        {msg && <p className="modal-sub">{msg}</p>}
        <button className="chat-cta" onClick={handleChangePassword} disabled={busy} style={{ marginTop: 10 }}>
          {busy ? '변경 중...' : '비밀번호 변경'}
        </button>

        <div className="filter-label" style={{ marginTop: 28 }}>회원 탈퇴</div>
        <button
          className="chat-cta"
          style={{ background: 'var(--danger)' }}
          onClick={handleDeleteAccount}
        >
          계정 삭제
        </button>
      </div>
    </div>
  )
}
