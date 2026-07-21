import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { products as mockProducts, CATEGORIES } from '../mock/data'
import { Swatch } from '../components/Common'
import { fetchProducts } from '../api'
import { useAuth } from '../context/AuthContext'

const TRADE_TYPES = ['전체', '직거래', '택배']
const SORTS = [
  { key: 'latest', label: '최신순' },
  { key: 'popular', label: '인기순' },
]

export default function MainGrid() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('전체')
  const [tradeType, setTradeType] = useState('전체')
  const [sort, setSort] = useState('latest')
  const [items, setItems] = useState(mockProducts)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [apiError, setApiError] = useState('')
  const sentinelRef = useRef(null)

  // 검색/필터 조건이 바뀌면 1페이지부터 새로 불러온다.
  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchProducts({ keyword, category, tradeType, sort, page: 1 })
      .then(({ items: newItems, hasMore: more }) => {
        if (!alive) return
        setItems(newItems)
        setHasMore(more)
        setPage(1)
        setApiError('')
      })
      .catch(() => {
        if (!alive) return
        setItems(mockProducts)
        setHasMore(false)
        setApiError('API 연결 실패로 임시 데이터를 표시 중입니다.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [keyword, category, tradeType, sort])

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const { items: more, hasMore: nextHasMore } = await fetchProducts({
        keyword,
        category,
        tradeType,
        sort,
        page: nextPage,
      })
      setItems((prev) => [...prev, ...more])
      setHasMore(nextHasMore)
      setPage(nextPage)
    } catch {
      setHasMore(false)
    } finally {
      setLoadingMore(false)
    }
  }, [loading, loadingMore, hasMore, page, keyword, category, tradeType, sort])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: '200px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [loadMore])

  return (
    <div className="screen">
      <div className="topbar">
        <span className="wordmark">마당</span>
        <div className="search-bar" onClick={() => setSearchOpen((v) => !v)}>
          {keyword || category !== '전체' || tradeType !== '전체'
            ? `${keyword || ''} ${category !== '전체' ? '· ' + category : ''} ${tradeType !== '전체' ? '· ' + tradeType : ''}`
            : '검색어, 카테고리, 거래방식으로 찾기'}
        </div>
        <button className="icon-btn" onClick={() => navigate('/settings')}>나</button>
      </div>

      {searchOpen && (
        <div className="search-panel">
          <input
            type="text"
            placeholder="검색어 입력"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />

          <div className="filter-group">
            <div className="filter-label">카테고리</div>
            <div className="chip-row">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  className={`chip ${category === c ? 'on' : ''}`}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-label">거래방식</div>
            <div className="chip-row">
              {TRADE_TYPES.map((t) => (
                <button
                  key={t}
                  className={`chip ${tradeType === t ? 'on' : ''}`}
                  onClick={() => setTradeType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-label">정렬</div>
            <div className="chip-row">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  className={`chip ${sort === s.key ? 'on' : ''}`}
                  onClick={() => setSort(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {apiError && <div className="grid-sentinel">{apiError}</div>}

      {loading ? (
        <div className="empty-note">상품을 불러오는 중이에요.</div>
      ) : items.length === 0 ? (
        <div className="empty-note">조건에 맞는 상품이 없어요. 필터를 바꿔보세요.</div>
      ) : (
        <div className="photo-grid">
          {items.map((p) => (
            <div
              key={p.id}
              className="grid-cell"
              onClick={() => navigate(`/product/${p.id}`)}
            >
              <Swatch colors={p.colors} image={p.images?.[0]} />
            </div>
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="grid-sentinel">
        {loadingMore ? '불러오는 중...' : hasMore ? '' : items.length > 0 ? '마지막 상품이에요' : ''}
      </div>

      <button
        className="fab"
        onClick={() => (user ? navigate('/create') : navigate('/login', { state: { from: '/create' } }))}
        aria-label="상품 등록"
      >
        +
      </button>
    </div>
  )
}
