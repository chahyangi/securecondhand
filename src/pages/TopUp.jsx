import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadTossPayments } from '@tosspayments/tosspayments-sdk'
import { useAuth } from '../context/AuthContext'
import { fetchPaymentConfig, createPaymentOrder } from '../api'

export default function TopUp() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [amount, setAmount] = useState('10000')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handlePay = async () => {
    const value = Number(amount)
    if (!Number.isInteger(value) || value <= 0) {
      setError('충전 금액을 1원 이상의 숫자로 입력해주세요.')
      return
    }
    setBusy(true)
    setError('')
    try {
      // 금액을 결제창을 열기 전에 서버에 먼저 기록해둬야, 나중에 결제 승인 시
      // 클라이언트가 위젯 호출을 조작했는지 대조할 기준이 생긴다.
      const order = await createPaymentOrder(value)
      const { client_key } = await fetchPaymentConfig()
      if (!client_key) {
        throw new Error('결제 설정을 불러오지 못했어요. 서버의 TOSS_CLIENT_KEY 설정을 확인해주세요.')
      }
      const tossPayments = await loadTossPayments(client_key)
      const payment = tossPayments.payment({ customerKey: `user-${user.id}` })
      await payment.requestPayment({
        method: 'CARD',
        amount: { value: order.amount, currency: 'KRW' },
        orderId: order.order_id,
        orderName: '지갑 충전',
        // 이 앱은 HashRouter를 쓰기 때문에 라우트는 "#" 뒤에 와야 한다. 토스가 successUrl/failUrl
        // 뒤에 paymentKey/orderId/amount(또는 code/message) 쿼리스트링을 그대로 append하는데,
        // "#" 없이 넘기면 HashRouter가 이걸 그냥 "/" 로 인식해서 TopUpResult가 아니라 메인 화면이
        // 뜨고, confirmPaymentOrder가 아예 호출되지 않아 결제는 성공해도 잔액이 충전되지 않았다.
        successUrl: `${window.location.origin}/#/wallet/topup/result`,
        failUrl: `${window.location.origin}/#/wallet/topup/result`,
      })
    } catch (err) {
      setError(err.message || '결제 요청에 실패했어요.')
      setBusy(false)
    }
  }

  return (
    <div className="screen">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        지갑 충전
      </div>

      <div className="create-body">
        <div className="filter-label">충전 금액 (원)</div>
        <input
          type="number"
          min="1"
          step="1"
          className="form-input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={busy}
        />

        {error && <p className="modal-sub" style={{ color: 'var(--danger)' }}>{error}</p>}

        <button className="chat-cta" onClick={handlePay} disabled={busy} style={{ marginTop: 16 }}>
          {busy ? '결제 요청 중...' : '결제하기 (테스트)'}
        </button>

        <p className="modal-sub" style={{ marginTop: 8 }}>
          테스트 연동이라 실제 결제는 발생하지 않아요. 토스페이먼츠 문서의 테스트 카드번호로 결제를 완료할 수 있어요.
        </p>
      </div>
    </div>
  )
}
