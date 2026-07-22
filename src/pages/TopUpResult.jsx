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
    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const amount = searchParams.get('amount')
    const failCode = searchParams.get('code')
    const failMessage = searchParams.get('message')

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
