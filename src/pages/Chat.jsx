import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Swatch, Avatar } from '../components/Common'
import { useAuth } from '../context/AuthContext'
import {
  fetchProduct,
  startChat,
  fetchChatRoom,
  fetchChatMessages,
  inviteParticipant,
  leaveParticipant,
  fetchFriends,
  fetchVerification,
  postVerificationStep,
  updateChatRoomStatus,
  uploadChatImage,
  normalizeChatMessage,
  normalizeParticipant,
  chatSocketUrl,
} from '../api'

// 거래 상태: 협의중 → (구간별 인계완료) → 거래확정 → 거래완료
// 인증 체인: 판매자 → (판매자.대리인) → (구매자.대리인) → 구매자
// 괄호로 표시된 대리인은 없을 수도 있다. 각 구간은 넘기는 쪽/받는 쪽이 각자 버튼을 눌러야 완료된다.
//   판매자: 판매인증(주는 쪽) / 구매자: 구매인증(받는 쪽) / 대리인: 인수인증(받는 쪽) → 인계인증(주는 쪽)
//
// 인증 진행 상태(누가 어느 버튼을 눌렀는지)는 VerificationStep으로 서버에 저장되고, 새로고침 시
// GET .../verification/ 으로 복원된다. 이 화면은 '나'가 항상 구매자인 단일 세션 데모라 구매자
// 대리인만 초대할 수 있다. 판매자 대리인은 실제 판매자 세션이 붙을 때 같은 체인 로직을 그대로 쓰면 된다.
const ROLE_NAME = { seller: '판매자', agent: '대리인', buyer: '구매자' }
const ROLE_ORDER = { seller: 0, agent: 1, buyer: 2 }
const ROOM_STATUS_LABEL = {
  negotiating: '협의중',
  handover_done: '인계완료',
  confirmed: '거래확정',
  done: '거래완료',
}
const giveLabel = (node) => (node.role === 'seller' ? '판매인증' : '인계인증')
const receiveLabel = (node) => (node.role === 'buyer' ? '구매인증' : '인수인증')

const computeChain = (participants) =>
  participants
    .filter((p) => !p.leftAt)
    .slice()
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role])

const computeHops = (chain) => chain.slice(0, -1).map((from, i) => ({ from, to: chain[i + 1] }))

export default function Chat() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [product, setProduct] = useState(null)
  const [room, setRoom] = useState(null)
  const [participants, setParticipants] = useState([])
  const [friends, setFriends] = useState([])
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [input, setInput] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [tradeStatus, setTradeStatus] = useState('협의중')
  const [giveConfirmed, setGiveConfirmed] = useState(new Set())
  const [receiveConfirmed, setReceiveConfirmed] = useState(new Set())

  const wsRef = useRef(null)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)
  const handledHopsRef = useRef(new Set())

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login', { replace: true, state: { from: `/product/${productId}` } })
      return
    }
    let alive = true
    setLoading(true)
    setErrorMsg('')

    const init = async () => {
      const prod = await fetchProduct(productId)
      if (!prod) throw new Error('상품을 찾을 수 없어요.')
      if (!alive) return
      setProduct(prod)

      const roomData = await startChat(Number(prod.id))
      if (!alive) return
      setRoom(roomData)
      const normalizedParticipants = roomData.participants.map(normalizeParticipant)
      setParticipants(normalizedParticipants)
      setTradeStatus(ROOM_STATUS_LABEL[roomData.status] ?? '협의중')

      const [messages, friendList, verification] = await Promise.all([
        fetchChatMessages(roomData.id),
        fetchFriends().catch(() => []),
        fetchVerification(roomData.id).catch(() => ({ steps: [] })),
      ])
      if (!alive) return
      setFeed(messages.map(normalizeChatMessage))
      setFriends(friendList)

      const gives = new Set(
        verification.steps.filter((s) => s.side === 'give').map((s) => String(s.user)),
      )
      const receives = new Set(
        verification.steps.filter((s) => s.side === 'receive').map((s) => String(s.user)),
      )
      setGiveConfirmed(gives)
      setReceiveConfirmed(receives)

      // 이미 완료된 구간은 재접속 시 다시 시스템 메시지를 보내지 않도록 미리 처리 완료로 표시.
      const chain = computeChain(normalizedParticipants)
      const hops = computeHops(chain)
      hops.forEach((hop, i) => {
        if (gives.has(hop.from.id) && receives.has(hop.to.id)) handledHopsRef.current.add(i)
      })

      const socket = new WebSocket(chatSocketUrl(roomData.id))
      wsRef.current = socket
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.kind === 'verification_step') {
          const userId = String(data.user_id)
          if (data.side === 'give') setGiveConfirmed((prev) => new Set(prev).add(userId))
          else setReceiveConfirmed((prev) => new Set(prev).add(userId))
          return
        }
        setFeed((prev) => [...prev, normalizeChatMessage(data)])
      }
      socket.onerror = () => setErrorMsg('실시간 연결에 문제가 있어요. 새로고침해보세요.')
    }

    init()
      .catch((err) => {
        if (alive) setErrorMsg(err.message || '채팅을 불러오지 못했어요.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [productId, user, authLoading, navigate])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [feed])

  const sendSocket = (payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload))
    }
  }

  const refreshParticipants = async () => {
    const fresh = await fetchChatRoom(room.id)
    setRoom(fresh)
    setParticipants(fresh.participants.map(normalizeParticipant))
  }

  const chain = useMemo(() => computeChain(participants), [participants])
  const hops = useMemo(() => computeHops(chain), [chain])
  const isHopDone = (i) => giveConfirmed.has(hops[i].from.id) && receiveConfirmed.has(hops[i].to.id)
  const firstUnfinished = hops.findIndex((_, i) => !isHopDone(i))
  const activeHopIndex = firstUnfinished === -1 ? hops.length : firstUnfinished

  // 구간이 새로 완료될 때(내가 눌렀든, 다른 참여자가 눌러서 실시간으로 반영됐든) 상태 전환/시스템 메시지 처리.
  useEffect(() => {
    hops.forEach((hop, i) => {
      if (handledHopsRef.current.has(i)) return
      if (!(giveConfirmed.has(hop.from.id) && receiveConfirmed.has(hop.to.id))) return
      handledHopsRef.current.add(i)

      sendSocket({
        content: `${hop.from.nickname} → ${hop.to.nickname} 인계가 확인되었어요.`,
        message_type: 'system',
      })

      const isLastHop = i === hops.length - 1
      if (!isLastHop) {
        setTradeStatus('인계완료')
        return
      }

      setTradeStatus('거래확정')
      setTimeout(async () => {
        const agents = chain.filter((p) => p.role === 'agent')
        for (const agent of agents) {
          try {
            await leaveParticipant(room.id, agent.id)
          } catch {
            // 이미 나갔거나 실패해도 데모 흐름은 계속 진행
          }
        }
        if (agents.length) await refreshParticipants()
        setTradeStatus('거래완료')
        try {
          await updateChatRoomStatus(room.id, 'done')
        } catch {
          // 상태 갱신 실패해도 화면 흐름은 계속 진행
        }
        sendSocket({ content: '거래가 완료되었어요.', message_type: 'system' })
      }, 900)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })
  }, [giveConfirmed, receiveConfirmed, hops.length])

  const inviteBuyerAgent = async (friend) => {
    if (chain.length >= 4) {
      alert('채팅방은 최대 4인까지 참여할 수 있어요.')
      return
    }
    try {
      await inviteParticipant(room.id, friend.id, 'agent')
      await refreshParticipants()
    } catch (err) {
      alert(err.message || '대리인 초대에 실패했어요.')
    }
    setInviteOpen(false)
  }

  const confirmStep = async (hopIndex, side) => {
    if (hopIndex !== activeHopIndex) return
    const hop = hops[hopIndex]
    const node = side === 'give' ? hop.from : hop.to
    const already = side === 'give' ? giveConfirmed.has(node.id) : receiveConfirmed.has(node.id)
    if (already) return

    try {
      await postVerificationStep(room.id, {
        hopIndex,
        side,
        fromUser: hop.from.id,
        toUser: hop.to.id,
        isLastHop: hopIndex === hops.length - 1,
      })
    } catch (err) {
      alert(err.message || '인증에 실패했어요.')
      return
    }

    const label = side === 'give' ? giveLabel(node) : receiveLabel(node)
    sendSocket({ content: `${node.nickname}님이 ${label}을 완료했어요.`, message_type: 'system' })

    if (side === 'give') setGiveConfirmed((prev) => new Set(prev).add(node.id))
    else setReceiveConfirmed((prev) => new Set(prev).add(node.id))
  }

  const send = () => {
    const text = input.trim()
    if (!text) return
    sendSocket({ content: text, message_type: 'text' })
    setInput('')
  }

  const openFilePicker = () => fileInputRef.current?.click()

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const url = await uploadChatImage(room.id, file)
      sendSocket({ content: url, message_type: 'image' })
    } catch (err) {
      alert(err.message || '사진 전송에 실패했어요.')
    }
  }

  if (loading) {
    return (
      <div className="screen chat-screen">
        <div className="chat-header">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        </div>
        <div className="empty-note">채팅을 불러오는 중이에요.</div>
      </div>
    )
  }

  if (errorMsg && !room) {
    return (
      <div className="screen chat-screen">
        <div className="chat-header">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        </div>
        <div className="empty-note">{errorMsg}</div>
      </div>
    )
  }

  const byId = Object.fromEntries(participants.map((p) => [p.id, p]))
  const others = chain.filter((p) => p.id !== String(user.id))

  return (
    <div className="screen chat-screen">
      <div className="chat-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <div className="participant-stack">
          {chain.map((p) => (
            <Avatar key={p.id} user={p} />
          ))}
        </div>
        <div className="chat-title">
          <div className="chat-names">
            {others.map((p) => (p.role === 'agent' ? `${p.nickname}(대리)` : p.nickname)).join(', ')}
          </div>
          <div className="chat-status">{tradeStatus} · {chain.length}인</div>
        </div>
        <button
          className="text-btn"
          onClick={() => setInviteOpen(true)}
          disabled={tradeStatus !== '협의중' || chain.some((p) => p.role === 'agent')}
        >
          대리인 초대
        </button>
      </div>

      <div className="product-banner" onClick={() => navigate(`/product/${product.id}`)}>
        <Swatch colors={product.colors} image={product.images?.[0]} style={{ width: 34, height: 34, borderRadius: 8 }} />
        <span>{product.title}</span>
      </div>

      {errorMsg && <div className="system-msg">{errorMsg}</div>}

      <div className="bt-panel" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
        <div className="label">대면 거래 인증</div>

        {hops.map((hop, i) => {
          const done = isHopDone(i)
          const giveDone = giveConfirmed.has(hop.from.id)
          const receiveDone = receiveConfirmed.has(hop.to.id)
          return (
            <div key={i} className="bt-step-row">
              <div className={`bt-step ${done ? 'done' : ''}`}>
                <span className="step-num">{i + 1}</span>
                {hop.from.nickname}({ROLE_NAME[hop.from.role]}) → {hop.to.nickname}({ROLE_NAME[hop.to.role]})
              </div>
              <div className="bt-step-actions">
                <button
                  className="bt-btn"
                  onClick={() => confirmStep(i, 'give')}
                  disabled={i !== activeHopIndex || giveDone}
                >
                  {giveDone ? `${giveLabel(hop.from)} 완료` : giveLabel(hop.from)}
                </button>
                <button
                  className="bt-btn"
                  onClick={() => confirmStep(i, 'receive')}
                  disabled={i !== activeHopIndex || receiveDone}
                >
                  {receiveDone ? `${receiveLabel(hop.to)} 완료` : receiveLabel(hop.to)}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="messages">
        {feed.map((item) =>
          item.kind === 'system' ? (
            <div key={item.id} className="system-msg">{item.content}</div>
          ) : (
            <div key={item.id} className={`msg-row ${item.senderId === String(user.id) ? 'mine' : ''}`}>
              {item.senderId !== String(user.id) && (
                <Avatar user={byId[item.senderId] ?? { icon: '?' }} className="msg-avatar" />
              )}
              {item.senderId === String(user.id) && <span className="msg-time">{item.time}</span>}
              {item.type === 'image' ? (
                <img src={item.content} alt="채팅 사진" className="bubble bubble-image" />
              ) : (
                <div className="bubble">{item.content}</div>
              )}
              {item.senderId !== String(user.id) && <span className="msg-time">{item.time}</span>}
            </div>
          ),
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-bar">
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        <button className="attach-btn" onClick={openFilePicker}>+</button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="메시지를 입력하세요"
        />
        <button className="send-btn" onClick={send} aria-label="전송">↑</button>
      </div>

      {inviteOpen && (
        <div className="modal-backdrop" onClick={() => setInviteOpen(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">대리인 초대</h3>
            <p className="modal-sub">
              대리인은 구매자를 대신해 물건을 인수·인계하는 사람이에요. 판매자에게서 물건을
              받을 때는 인수인증을, 구매자에게 넘길 때는 인계인증을 진행해주세요. 거래가
              완료되면 자동으로 퇴장합니다.
            </p>
            {friends
              .filter((f) => !chain.some((p) => p.id === String(f.id)))
              .map((f) => (
                <div key={f.id} className="friend-row" onClick={() => inviteBuyerAgent(f)}>
                  <Avatar user={f} />
                  <span>{f.nickname}</span>
                </div>
              ))}
            {friends.length === 0 && (
              <p className="modal-sub">초대할 수 있는 친구가 없어요. (친구 요청을 수락한 사이여야 해요)</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
