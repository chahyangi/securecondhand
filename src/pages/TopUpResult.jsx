import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { confirmPaymentOrder } from '../api'

export default function TopUpResult() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { refreshUser } = useAuth()
  const [status, setStatus] = useState('checking') // checking | success | fail
  const [message, setMessage] = useState('')

  useEffect(() => {
    // 이 앱은 HashRouter라 react-router의 useSearchParams()는 "#" 안쪽 쿼리스트링만 읽는다.
    // 그런데 토스가 successUrl/failUrl에 paymentKey 등을 붙일 때 URL()로 파싱해서 붙이는 것으로
    // 보여서(스펙대로면 쿼리스트링은 "#" 앞에 와야 함), 실제 리다이렉트는
    // "http://host/?paymentKey=...#/wallet/topup/result" 형태로 온다 — 즉 진짜 쿼리스트링은
    // "#" 앞(window.location.search)에 있고 useSearchParams()에는 안 잡힌다. 그래서 두 위치를
    // 다 확인하고, 혹시 모를 형태 변경에도 대비해 "#" 앞쪽을 우선한다.
    const topLevelParams = new URLSearchParams(window.location.search)
    const getParam = (key) => topLevelParams.get(key) ?? searchParams.get(key)

    const paymentKey = getParam('paymentKey')
    const orderId = getParam('orderId')
    const amount = getParam('amount')
    const failCode = getParam('code')
    const failMessage = getParam('message')

    if (failCode) {
      setStatus('fail')
      setMessage(failMessage || '결제가 취소되었거나 실패했어요.')
      return
    }
    if (!paymentKey || !orderId || !amount) {
      setStatus('fail')
      setMessage('결제 정보가 올바르지 않아요.')
      return
    }

    let alive = true
    confirmPaymentOrder({ orderId, paymentKey, amount: Number(amount) })
      .then(async () => {
        if (!alive) return
        await refreshUser()
        setStatus('success')
      })
      .catch((err) => {
        if (alive) {
          setStatus('fail')
          setMessage(err.message || '결제 승인에 실패했어요.')
        }
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="screen">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/settings')}>←</button>
        충전 결과
      </div>
      <div className="empty-note" style={{ paddingTop: 60 }}>
        {status === 'checking' && '결제 승인 확인 중이에요...'}
        {status === 'success' && '충전이 완료됐어요!'}
        {status === 'fail' && (message || '충전에 실패했어요.')}
      </div>
      {status !== 'checking' && (
        <div style={{ padding: '0 16px' }}>
          <button className="chat-cta" onClick={() => navigate('/settings')}>설정으로 돌아가기</button>
        </div>
      )}
    </div>
  )
}
