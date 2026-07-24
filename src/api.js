const TRADE_TYPE_LABELS = {
  direct: '직거래',
  delivery: '택배',
}

const STATUS_LABELS = {
  on_sale: '판매중',
  reserved: '예약중',
  sold: '판매완료',
}

const CATEGORY_COLORS = {
  디지털기기: ['#B5D4F4', '#85B7EB'],
  '가구/인테리어': ['#FAC775', '#EF9F27'],
  의류: ['#9FE1CB', '#5DCAA5'],
  도서: ['#CECBF6', '#AFA9EC'],
  스포츠: ['#C0DD97', '#97C459'],
  생활용품: ['#D3D1C7', '#B4B2A9'],
  '취미/게임': ['#F4C0D1', '#ED93B1'],
}

const SWATCHES = [
  ['#B5D4F4', '#85B7EB'],
  ['#FAC775', '#EF9F27'],
  ['#9FE1CB', '#5DCAA5'],
  ['#F5C4B3', '#F0997B'],
  ['#CECBF6', '#AFA9EC'],
]

const formatDate = (value) => {
  if (!value) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value)).replaceAll('. ', '.').replace('.', '')
}

const swatchFor = (product) => {
  const category = product.category_name ?? product.category
  return CATEGORY_COLORS[category] ?? SWATCHES[Number(product.id) % SWATCHES.length]
}

export const normalizeProduct = (product) => {
  const imageUrls = product.images?.map((image) => image.image).filter(Boolean) ?? []
  const seller = product.seller
  const category = product.category_name ?? product.category ?? '기타'

  return {
    id: String(product.id),
    title: product.title,
    category,
    condition: product.condition,
    tradeType: TRADE_TYPE_LABELS[product.trade_type] ?? product.trade_type,
    colors: swatchFor(product),
    images: imageUrls,
    desc: product.description ?? '',
    createdAt: formatDate(product.created_at),
    updatedAt: formatDate(product.updated_at),
    sellerId: seller?.id ? String(seller.id) : 'unknown',
    seller: {
      id: seller?.id ? String(seller.id) : 'unknown',
      nickname: seller?.nickname || seller?.username || '판매자',
      icon: seller?.icon || (seller?.nickname || seller?.username || '판').slice(0, 1),
    },
    price: product.price ?? 0,
    status: STATUS_LABELS[product.status] ?? product.status,
    isBlocked: !!product.is_blocked,
    wishCount: product.wish_count ?? 0,
  }
}

const request = async (url) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`API 요청 실패: ${response.status}`)
  return response.json()
}

const TOKEN_KEY = 'securecondhand_token'

// localStorage는 같은 브라우저의 모든 탭이 공유해서, 탭마다 다른 계정으로 로그인해
// 테스트하면 나중에 로그인한 탭이 다른 탭의 토큰까지 덮어써버린다. sessionStorage는
// 탭/창마다 독립적이라 새로고침 유지는 그대로 되면서 계정이 서로 섞이지 않는다.
export const getToken = () => sessionStorage.getItem(TOKEN_KEY)
export const setToken = (token) => {
  if (token) sessionStorage.setItem(TOKEN_KEY, token)
  else sessionStorage.removeItem(TOKEN_KEY)
}

const authHeaders = () => {
  const token = getToken()
  return token ? { Authorization: `Token ${token}` } : {}
}

// 비밀번호 변경/다른 기기 로그아웃 등으로 토큰이 서버에서 이미 폐기된 뒤에도
// 이 탭은 로그인 상태인 줄 알고 있다가, API를 부를 때마다 "토큰이 없다" 같은
// 원문 에러만 반복해서 보여주는 문제가 있었다. 401을 받으면 로컬 토큰을 지우고
// AuthContext가 들어서 로그아웃 화면으로 전환하도록 이벤트를 쏜다.
const handleUnauthorized = (response) => {
  if (response.status === 401 && getToken()) {
    setToken(null)
    window.dispatchEvent(new Event('auth:expired'))
  }
}

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    handleUnauthorized(response)
    throw new Error(data?.detail || `요청 실패 (${response.status})`)
  }
  return data
}

const normalizeUser = (user, profile) => ({
  id: user.id,
  username: user.username,
  nickname: profile?.nickname || user.nickname || user.username,
  icon: profile?.icon || user.icon || (user.nickname || user.username || '나').slice(0, 1),
  isStaff: !!user.is_staff,
  isActive: user.is_active !== false,
  balance: profile?.balance ?? user.balance ?? null,
})

export const signup = async ({ username, password, nickname }) => {
  const data = await requestJson('/api/auth/signup/', {
    method: 'POST',
    body: JSON.stringify({ username, password, nickname }),
  })
  return { token: data.token, user: normalizeUser(data.user) }
}

export const login = async ({ username, password }) => {
  const data = await requestJson('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  return { token: data.token, user: normalizeUser(data.user) }
}

export const logout = () => requestJson('/api/auth/logout/', { method: 'POST' })

export const fetchMe = async () => {
  const data = await requestJson('/api/profiles/me/')
  return normalizeUser(data.user, data)
}

export const fetchProducts = async ({ keyword, category, tradeType, sort, page }) => {
  const params = new URLSearchParams()
  if (keyword?.trim()) params.set('q', keyword.trim())
  if (category && category !== '전체') params.set('category', category)
  if (tradeType === '직거래') params.set('trade_type', 'direct')
  if (tradeType === '택배') params.set('trade_type', 'delivery')
  if (sort) params.set('sort', sort)
  if (page) params.set('page', String(page))

  const data = await request(`/api/products/?${params.toString()}`)
  const results = Array.isArray(data.results) ? data.results : data
  return {
    items: results.map(normalizeProduct),
    hasMore: Array.isArray(data.results) ? Boolean(data.next) : false,
  }
}

export const fetchProduct = async (id) => normalizeProduct(await request(`/api/products/${id}/`))

export const fetchProductRaw = (id) => requestJson(`/api/products/${id}/`)

export const fetchChatRooms = () => requestJson('/api/chatrooms/')

export const fetchCategories = () => requestJson('/api/categories/')

export const createProduct = ({ title, category, condition, tradeType, description, price }) =>
  requestJson('/api/products/', {
    method: 'POST',
    body: JSON.stringify({
      title,
      category,
      condition,
      trade_type: tradeType,
      description,
      price,
    }),
  })

export const updateProduct = (productId, { title, category, condition, tradeType, description, price }) =>
  requestJson(`/api/products/${productId}/`, {
    method: 'PATCH',
    body: JSON.stringify({
      title,
      category,
      condition,
      trade_type: tradeType,
      description,
      price,
    }),
  })

export const deleteProduct = (productId) => requestJson(`/api/products/${productId}/`, { method: 'DELETE' })

const STATUS_KEYS = { 판매중: 'on_sale', 예약중: 'reserved', 판매완료: 'sold' }

export const updateProductStatus = (productId, statusLabel) =>
  requestJson(`/api/products/${productId}/status/`, {
    method: 'PATCH',
    body: JSON.stringify({ status: STATUS_KEYS[statusLabel] ?? statusLabel }),
  })

export const uploadProductImage = async (productId, file, { order = 0, isRepresentative = false } = {}) => {
  const form = new FormData()
  form.append('image', file)
  form.append('order', String(order))
  form.append('is_representative', String(isRepresentative))
  const response = await fetch(`/api/products/${productId}/images/`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    handleUnauthorized(response)
    throw new Error(data?.detail || `이미지 업로드 실패 (${response.status})`)
  }
  return data
}

export const deleteProductImage = (productId, imageId) =>
  requestJson(`/api/products/${productId}/images/${imageId}/`, { method: 'DELETE' })

export const reorderProductImages = (productId, images) =>
  requestJson(`/api/products/${productId}/images/order/`, { method: 'PATCH', body: JSON.stringify(images) })

export const fetchWishlist = () => requestJson('/api/wishlists/')

export const addWishlist = (productId) =>
  requestJson('/api/wishlists/', { method: 'POST', body: JSON.stringify({ product: productId }) })

export const removeWishlist = (wishlistId) =>
  requestJson(`/api/wishlists/${wishlistId}/`, { method: 'DELETE' })

export const createReport = ({ targetType, targetId, reason }) =>
  requestJson('/api/reports/', {
    method: 'POST',
    body: JSON.stringify({ target_type: targetType, target_id: targetId, reason }),
  })

export const fetchMyReports = () => requestJson('/api/reports/')

// --- 채팅 (실시간) ---

export const startChat = (productId) =>
  requestJson('/api/chatrooms/', { method: 'POST', body: JSON.stringify({ product: productId }) })

export const fetchChatRoom = (roomId) => requestJson(`/api/chatrooms/${roomId}/`)

export const markChatRoomRead = (roomId) => requestJson(`/api/chatrooms/${roomId}/read/`, { method: 'POST' })

export const fetchChatMessages = (roomId) => requestJson(`/api/chatrooms/${roomId}/messages/`)

// role(판매자 측/구매자 측 대리인)은 클라이언트가 정하지 않는다 — 서버가 초대자 본인의
// 역할을 보고 자동으로 정한다.
export const inviteParticipant = (roomId, userId) =>
  requestJson(`/api/chatrooms/${roomId}/participants/`, {
    method: 'POST',
    body: JSON.stringify({ user: userId }),
  })

export const leaveParticipant = (roomId, userId) =>
  requestJson(`/api/chatrooms/${roomId}/participants/${userId}/`, { method: 'DELETE' })

export const fetchFriends = async () => {
  const users = await requestJson('/api/friends/requests/accepted/')
  return users.map((u) => normalizeUser(u))
}

export const fetchFriendRequests = () => requestJson('/api/friends/requests/')

export const lookupUser = async (username) => {
  const data = await requestJson(`/api/users/lookup/?username=${encodeURIComponent(username)}`)
  return normalizeUser(data)
}

export const sendFriendRequest = (receiverId) =>
  requestJson('/api/friends/requests/', { method: 'POST', body: JSON.stringify({ receiver: receiverId }) })

export const respondFriendRequest = (requestId, status) =>
  requestJson(`/api/friends/requests/${requestId}/`, { method: 'PATCH', body: JSON.stringify({ status }) })

export const deleteFriendRequest = (requestId) =>
  requestJson(`/api/friends/requests/${requestId}/`, { method: 'DELETE' })

const formatTime = (value) => {
  if (!value) return ''
  return new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(value))
}

export const normalizeChatMessage = (m) => ({
  kind: m.message_type === 'system' ? 'system' : 'msg',
  id: String(m.id),
  senderId: m.sender ? String(m.sender.id) : 'system',
  type: m.message_type,
  content: m.content,
  time: formatTime(m.created_at),
})

export const normalizeParticipant = (p) => ({
  chatParticipantId: p.id,
  id: String(p.user_detail.id),
  username: p.user_detail.username,
  nickname: p.user_detail.nickname || p.user_detail.username,
  icon: p.user_detail.icon || (p.user_detail.nickname || p.user_detail.username || '?').slice(0, 1),
  role: p.role,
  leftAt: p.left_at,
})

export const chatSocketUrl = (roomId) => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${window.location.host}/ws/chat/${roomId}/?token=${getToken() ?? ''}`
}

export const uploadChatImage = async (roomId, file) => {
  const form = new FormData()
  form.append('image', file)
  const response = await fetch(`/api/chatrooms/${roomId}/images/`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    handleUnauthorized(response)
    throw new Error(data?.detail || `사진 업로드 실패 (${response.status})`)
  }
  return data.url
}

export const fetchVerification = (roomId) => requestJson(`/api/chatrooms/${roomId}/verification/`)

export const postVerificationStep = (roomId, { hopIndex, side, fromUser, toUser, isLastHop }) =>
  requestJson(`/api/chatrooms/${roomId}/verification/`, {
    method: 'POST',
    body: JSON.stringify({
      hop_index: hopIndex,
      side,
      from_user: fromUser,
      to_user: toUser,
      is_last_hop: isLastHop,
    }),
  })

export const updateChatRoomStatus = (roomId, statusValue) =>
  requestJson(`/api/chatrooms/${roomId}/`, { method: 'PATCH', body: JSON.stringify({ status: statusValue }) })

// --- 알림 설정 / 계정 관리 ---

export const fetchNotificationSettings = () => requestJson('/api/notifications/settings/')

export const updateNotificationSettings = (patch) =>
  requestJson('/api/notifications/settings/', { method: 'PATCH', body: JSON.stringify(patch) })

export const fetchNotificationFeed = () => requestJson('/api/notifications/feed/')

export const markNotificationsRead = () => requestJson('/api/notifications/feed/', { method: 'POST' })

export const changePassword = ({ currentPassword, newPassword }) =>
  requestJson('/api/auth/password/', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })

export const deleteAccount = () => requestJson('/api/users/me/', { method: 'DELETE' })

// --- 관리자 ---

export const fetchAdminStats = () => requestJson('/api/admin/stats/')

export const fetchAdminUsers = () => requestJson('/api/admin/users/')

export const suspendAdminUser = (userId) => requestJson(`/api/admin/users/${userId}/suspend/`, { method: 'PATCH' })

export const fetchAdminProducts = async () => {
  const data = await requestJson('/api/admin/products/')
  const results = Array.isArray(data.results) ? data.results : data
  return results.map(normalizeProduct)
}

export const deleteAdminProduct = (productId) => requestJson(`/api/admin/products/${productId}/`, { method: 'DELETE' })

export const toggleAdminProductBlock = async (productId) =>
  normalizeProduct(await requestJson(`/api/admin/products/${productId}/block/`, { method: 'PATCH' }))

export const fetchAdminReports = () => requestJson('/api/admin/reports/')

export const resolveAdminReport = (reportId) => requestJson(`/api/admin/reports/${reportId}/resolve/`, { method: 'PATCH' })

export const sanctionAdminReport = (reportId) => requestJson(`/api/admin/reports/${reportId}/sanction/`, { method: 'PATCH' })

// --- 송금 ---

export const fetchTransfers = () => requestJson('/api/transfers/')

export const createTransfer = ({ receiverUsername, amount, memo, chatroomId }) =>
  requestJson('/api/transfers/', {
    method: 'POST',
    body: JSON.stringify({
      receiver_username: receiverUsername,
      amount,
      memo: memo || '',
      chatroom: chatroomId ?? null,
    }),
  })

// --- 지갑 충전 (토스페이먼츠 결제위젯, 테스트 연동) ---

export const fetchPaymentConfig = () => requestJson('/api/payments/config/')

export const createPaymentOrder = (amount) =>
  requestJson('/api/payments/orders/', { method: 'POST', body: JSON.stringify({ amount }) })

export const confirmPaymentOrder = ({ orderId, paymentKey, amount }) =>
  requestJson('/api/payments/orders/confirm/', {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId, payment_key: paymentKey, amount }),
  })
