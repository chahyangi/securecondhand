import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { products, users, CONDITIONS } from '../mock/data'
import { Swatch, Avatar } from '../components/Common'
import { fetchProduct, fetchWishlist, addWishlist, removeWishlist, createReport, deleteProduct, updateProductStatus } from '../api'
import { useAuth } from '../context/AuthContext'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [wished, setWished] = useState(false)
  const [wishlistId, setWishlistId] = useState(null)
  const [wishBusy, setWishBusy] = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState('product')
  const [reportReason, setReportReason] = useState('')
  const [reportBusy, setReportBusy] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchProduct(id)
      .then((item) => {
        if (alive) setProduct(item)
      })
      .catch(() => {
        if (alive) setProduct(products.find((p) => p.id === id) ?? products[0])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [id])

  useEffect(() => {
    if (!user || !product) return
    let alive = true
    fetchWishlist()
      .then((items) => {
        if (!alive) return
        const match = items.find((item) => String(item.product) === String(product.id))
        setWished(!!match)
        setWishlistId(match ? match.id : null)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [user, product])

  if (loading || !product) {
    return (
      <div className="screen">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        </div>
        <div className="empty-note">상품을 불러오는 중이에요.</div>
      </div>
    )
  }

  const seller = product.seller ?? users[product.sellerId] ?? users.me

  // 실제 업로드 사진이 있으면 그걸 쓰고, 없으면(목업 상품) 색 스와치 3장으로 대체.
  const photos = product.images?.length
    ? product.images.map((url) => ({ image: url }))
    : [
        { colors: product.colors },
        { colors: [product.colors[1], product.colors[0]] },
        { colors: product.colors },
      ]

  const soldOrReserved = product.status !== '판매중'

  const requireLogin = () => {
    navigate('/login', { state: { from: `/product/${product.id}` } })
  }

  const toggleWish = async () => {
    if (!user) return requireLogin()
    if (wishBusy) return
    setWishBusy(true)
    try {
      if (wished && wishlistId) {
        await removeWishlist(wishlistId)
        setWished(false)
        setWishlistId(null)
      } else {
        const item = await addWishlist(Number(product.id))
        setWished(true)
        setWishlistId(item.id)
      }
    } catch (err) {
      alert(err.message || '찜 처리에 실패했어요.')
    } finally {
      setWishBusy(false)
    }
  }

  const openReport = () => {
    if (!user) return requireLogin()
    setReportTarget('product')
    setReportReason('')
    setReportOpen(true)
  }

  const submitReport = async () => {
    if (!reportReason.trim()) return
    setReportBusy(true)
    try {
      const targetId = reportTarget === 'product' ? Number(product.id) : Number(seller.id)
      await createReport({ targetType: reportTarget, targetId, reason: reportReason.trim() })
      setReportOpen(false)
      alert('신고가 접수되었어요.')
    } catch (err) {
      alert(err.message || '신고 접수에 실패했어요.')
    } finally {
      setReportBusy(false)
    }
  }

  const isOwner = user && String(user.id) === product.sellerId

  const handleDelete = async () => {
    if (!window.confirm('이 상품을 삭제할까요? 되돌릴 수 없어요.')) return
    try {
      await deleteProduct(product.id)
      navigate('/', { replace: true })
    } catch (err) {
      alert(err.message || '상품 삭제에 실패했어요.')
    }
  }

  return (
    <div className="screen">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <span style={{ flex: 1 }} />
        {isOwner ? (
          <>
            <button className="text-btn" onClick={() => navigate(`/product/${product.id}/edit`)}>
              수정
            </button>
            <button className="text-btn" onClick={handleDelete}>
              삭제
            </button>
          </>
        ) : (
          <button className="text-btn" onClick={openReport}>
            신고
          </button>
        )}
      </div>

      <div
        className="detail-photo-area"
        onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
      >
        <Swatch colors={photos[photoIdx].colors} image={photos[photoIdx].image} />
        {soldOrReserved && <div className="status-badge">{product.status}</div>}
        <div className="photo-dots">
          {photos.map((_, i) => (
            <span key={i} className={`dot ${i === photoIdx ? 'on' : ''}`} />
          ))}
        </div>
      </div>

      <div className="detail-body">
        <h1 className="detail-title">{product.title}</h1>
        <div className="detail-price">{(product.price ?? 0).toLocaleString('ko-KR')}원</div>

        <div className="detail-meta">
          <span className="pill">{product.category}</span>
          <span className="pill">{CONDITIONS[product.condition]}</span>
          <span className="pill">{product.tradeType}</span>
        </div>

        <div className="detail-dates">
          등록일 {product.createdAt} · 최종 수정일 {product.updatedAt}
        </div>

        {isOwner && (
          <div className="chip-row" style={{ marginBottom: 12 }}>
            {['판매중', '예약중', '판매완료'].map((label) => (
              <button
                key={label}
                className={`chip ${product.status === label ? 'on' : ''}`}
                onClick={async () => {
                  try {
                    await updateProductStatus(product.id, label)
                    setProduct((prev) => ({ ...prev, status: label }))
                  } catch (err) {
                    alert(err.message || '상태 변경에 실패했어요.')
                  }
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <p className="detail-desc">{product.desc}</p>

        <div
          className="seller-row"
          onClick={() => alert('판매자 프로필 (등록 상품 목록) — 구현 예정')}
        >
          <Avatar user={seller} />
          <span>{seller.nickname}</span>
        </div>
      </div>

      <div className="action-bar">
        <button
          className={`wish-btn ${wished ? 'on' : ''}`}
          onClick={toggleWish}
          disabled={wishBusy}
          aria-label="찜하기"
        >
          {wished ? '♥' : '♡'}
        </button>
        <button
          className="chat-cta"
          disabled={soldOrReserved && product.status === '판매완료'}
          onClick={() => (user ? navigate(`/chat/${product.id}`) : requireLogin())}
        >
          {product.status === '판매완료' ? '판매가 완료된 상품이에요' : '채팅하기'}
        </button>
      </div>

      {reportOpen && (
        <div className="modal-backdrop" onClick={() => setReportOpen(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">신고하기</h3>
            <div className="chip-row">
              <button
                className={`chip ${reportTarget === 'product' ? 'on' : ''}`}
                onClick={() => setReportTarget('product')}
              >
                이 상품
              </button>
              <button
                className={`chip ${reportTarget === 'user' ? 'on' : ''}`}
                onClick={() => setReportTarget('user')}
              >
                판매자 ({seller.nickname})
              </button>
            </div>
            <textarea
              className="form-textarea"
              placeholder="신고 사유를 입력해주세요."
              rows={4}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              style={{ marginTop: 10 }}
            />
            <button className="chat-cta" onClick={submitReport} disabled={reportBusy || !reportReason.trim()} style={{ marginTop: 10 }}>
              {reportBusy ? '접수 중...' : '신고 접수'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
