import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  fetchAdminStats,
  fetchAdminUsers,
  suspendAdminUser,
  fetchAdminProducts,
  deleteAdminProduct,
  toggleAdminProductBlock,
  fetchAdminReports,
  resolveAdminReport,
  sanctionAdminReport,
} from '../api'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [tab, setTab] = useState('stats') // stats | users | products | reports
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [products, setProducts] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user || !user.isStaff) {
      navigate('/', { replace: true })
    }
  }, [user, authLoading, navigate])

  const load = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const [statsData, usersData, productsData, reportsData] = await Promise.all([
        fetchAdminStats(),
        fetchAdminUsers(),
        fetchAdminProducts(),
        fetchAdminReports(),
      ])
      setStats(statsData)
      setUsers(usersData)
      setProducts(productsData)
      setReports(reportsData)
    } catch (err) {
      setErrorMsg(err.message || '관리자 데이터를 불러오지 못했어요.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.isStaff) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.isStaff])

  if (authLoading || !user || !user.isStaff) return null

  const handleSuspend = async (id) => {
    try {
      const updated = await suspendAdminUser(id)
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)))
    } catch (err) {
      alert(err.message || '처리에 실패했어요.')
    }
  }

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('이 상품을 강제 삭제할까요?')) return
    try {
      await deleteAdminProduct(id)
      setProducts((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      alert(err.message || '삭제에 실패했어요.')
    }
  }

  const handleToggleBlock = async (id) => {
    try {
      const updated = await toggleAdminProductBlock(id)
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    } catch (err) {
      alert(err.message || '처리에 실패했어요.')
    }
  }

  const handleResolveReport = async (id) => {
    try {
      const updated = await resolveAdminReport(id)
      setReports((prev) => prev.map((r) => (r.id === id ? updated : r)))
    } catch (err) {
      alert(err.message || '처리에 실패했어요.')
    }
  }

  const handleSanctionReport = async (report) => {
    const label = report.target_type === 'product' ? '이 상품을 차단할까요?' : '이 사용자를 정지할까요?'
    if (!window.confirm(label)) return
    try {
      const updated = await sanctionAdminReport(report.id)
      setReports((prev) => prev.map((r) => (r.id === report.id ? updated : r)))
      await load()
    } catch (err) {
      alert(err.message || '처리에 실패했어요.')
    }
  }

  return (
    <div className="screen">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/settings')}>←</button>
        관리자 대시보드
      </div>

      <div className="chip-row" style={{ padding: '0 16px' }}>
        {[
          ['stats', '통계'],
          ['users', '사용자'],
          ['products', '상품'],
          ['reports', '신고'],
        ].map(([key, label]) => (
          <button key={key} className={`chip ${tab === key ? 'on' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-note">불러오는 중이에요.</div>
      ) : errorMsg ? (
        <div className="empty-note">{errorMsg}</div>
      ) : (
        <>
          {tab === 'stats' && stats && (
            <div className="settings-list">
              <div className="settings-row"><span>전체 사용자</span><span>{stats.users.total} (활성 {stats.users.active})</span></div>
              <div className="settings-row"><span>전체 상품</span><span>{stats.products.total}</span></div>
              <div className="settings-row"><span>판매중</span><span>{stats.products.on_sale}</span></div>
              <div className="settings-row"><span>예약중</span><span>{stats.products.reserved}</span></div>
              <div className="settings-row"><span>판매완료</span><span>{stats.products.sold}</span></div>
              <div className="settings-row"><span>대기중 신고</span><span>{stats.reports.pending}</span></div>
              <div className="settings-row"><span>처리완료 신고</span><span>{stats.reports.resolved}</span></div>
              <div className="settings-row"><span>채팅방 수</span><span>{stats.chatrooms}</span></div>
            </div>
          )}

          {tab === 'users' && (
            <div className="settings-list">
              {users.map((u) => (
                <div key={u.id} className="settings-row">
                  <span>{u.nickname || u.username} ({u.username}){!u.is_active && ' · 정지됨'}</span>
                  <button className="text-btn" onClick={() => handleSuspend(u.id)}>
                    {u.is_active ? '정지' : '정지 해제'}
                  </button>
                </div>
              ))}
              {users.length === 0 && <div className="empty-note">사용자가 없어요.</div>}
            </div>
          )}

          {tab === 'products' && (
            <div className="settings-list">
              {products.map((p) => (
                <div key={p.id} className="settings-row">
                  <span>{p.title} · {p.status}{p.isBlocked && ' · 차단됨'}</span>
                  <span style={{ display: 'flex', gap: 8 }}>
                    <button className="text-btn" onClick={() => handleToggleBlock(p.id)}>
                      {p.isBlocked ? '차단 해제' : '차단'}
                    </button>
                    <button className="text-btn" onClick={() => handleDeleteProduct(p.id)}>삭제</button>
                  </span>
                </div>
              ))}
              {products.length === 0 && <div className="empty-note">상품이 없어요.</div>}
            </div>
          )}

          {tab === 'reports' && (
            <div className="settings-list">
              {reports.map((r) => (
                <div key={r.id} className="settings-row">
                  <span>
                    [{r.target_type}] {r.reason} · {r.status === 'resolved' ? '처리완료' : '대기중'}
                  </span>
                  {r.status !== 'resolved' && (
                    <span style={{ display: 'flex', gap: 8 }}>
                      <button className="text-btn" onClick={() => handleSanctionReport(r)}>
                        {r.target_type === 'product' ? '상품 차단' : '유저 정지'}
                      </button>
                      <button className="text-btn" onClick={() => handleResolveReport(r.id)}>처리완료</button>
                    </span>
                  )}
                </div>
              ))}
              {reports.length === 0 && <div className="empty-note">신고 내역이 없어요.</div>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
