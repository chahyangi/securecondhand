import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CATEGORIES, CONDITIONS } from '../mock/data'
import { useAuth } from '../context/AuthContext'
import {
  fetchCategories,
  fetchProduct,
  fetchProductRaw,
  createProduct,
  updateProduct,
  uploadProductImage,
  deleteProductImage,
  reorderProductImages,
} from '../api'

export default function ProductCreate() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true, state: { from: isEdit ? `/product/${id}/edit` : '/create' } })
  }, [user, loading, navigate, isEdit, id])

  const fileInputRef = useRef(null)
  const [productId, setProductId] = useState(id ? Number(id) : null)
  const [existingImages, setExistingImages] = useState([]) // { id, image, order, is_representative }
  const [photos, setPhotos] = useState([]) // 새로 추가한 사진: { file, url }
  const [repIdx, setRepIdx] = useState(0) // 대표 사진 인덱스 (existingImages+photos 통합 인덱스)
  const [submitting, setSubmitting] = useState(false)
  const [initializing, setInitializing] = useState(isEdit)
  const [form, setForm] = useState({
    title: '',
    category: '',
    condition: '',
    tradeType: '',
    desc: '',
    price: '',
  })

  useEffect(() => {
    if (!isEdit) return
    let alive = true
    fetchProduct(id)
      .then((product) => {
        if (!alive || !product) return
        setForm({
          title: product.title || '',
          category: product.category || '',
          condition: product.condition || '',
          tradeType: product.tradeType || '',
          desc: product.desc || '',
          price: product.price ? String(product.price) : '',
        })
      })
      .finally(() => {
        if (alive) setInitializing(false)
      })
    return () => {
      alive = false
    }
  }, [id, isEdit])

  useEffect(() => {
    if (!isEdit) return
    let alive = true
    fetchProductRaw(id)
      .then((raw) => {
        if (!alive) return
        setExistingImages(raw.images || [])
        const repIndex = (raw.images || []).findIndex((img) => img.is_representative)
        if (repIndex >= 0) setRepIdx(repIndex)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [id, isEdit])

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }))

  const totalPhotoCount = existingImages.length + photos.length

  const openFilePicker = () => {
    if (totalPhotoCount >= 5) {
      alert('사진은 최대 5장까지 등록할 수 있어요.')
      return
    }
    fileInputRef.current?.click()
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files ?? []).slice(0, 5 - totalPhotoCount)
    setPhotos((prev) => [...prev, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))])
    e.target.value = ''
  }

  const removeNewPhoto = (idx) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[idx].url)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const removeExistingImage = async (imageId) => {
    if (!window.confirm('이 사진을 삭제할까요?')) return
    try {
      await deleteProductImage(productId, imageId)
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId))
    } catch (err) {
      alert(err.message || '사진 삭제에 실패했어요.')
    }
  }

  const moveExistingImage = async (index, direction) => {
    const next = [...existingImages]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setExistingImages(next)
    try {
      await reorderProductImages(
        productId,
        next.map((img, i) => ({ id: img.id, order: i, is_representative: i === repIdx })),
      )
    } catch (err) {
      alert(err.message || '사진 순서 변경에 실패했어요.')
    }
  }

  const submit = async () => {
    if (!isEdit && photos.length === 0) return alert('사진을 1장 이상 등록해주세요. (필수)')
    if (!form.title.trim()) return alert('제목을 입력해주세요.')
    if (!form.category) return alert('카테고리를 선택해주세요.')
    if (!form.condition) return alert('상품 상태를 선택해주세요.')
    if (!form.tradeType) return alert('거래방식을 선택해주세요.')
    const priceValue = Number(form.price)
    if (!form.price || !Number.isInteger(priceValue) || priceValue <= 0) {
      return alert('가격을 1원 이상의 숫자로 입력해주세요.')
    }

    setSubmitting(true)
    try {
      const categories = await fetchCategories()
      const categoryObj = categories.find((c) => c.name === form.category)
      if (!categoryObj) throw new Error('카테고리 정보를 불러오지 못했어요. 다시 시도해주세요.')

      const payload = {
        title: form.title.trim(),
        category: categoryObj.id,
        condition: form.condition,
        tradeType: form.tradeType === '직거래' ? 'direct' : form.tradeType === '택배' ? 'delivery' : form.tradeType,
        description: form.desc.trim(),
        price: priceValue,
      }

      let currentProductId = productId
      if (isEdit) {
        await updateProduct(currentProductId, payload)
      } else {
        const product = await createProduct(payload)
        currentProductId = product.id
        setProductId(product.id)
      }

      for (let i = 0; i < photos.length; i++) {
        await uploadProductImage(currentProductId, photos[i].file, {
          order: existingImages.length + i,
          isRepresentative: existingImages.length + i === repIdx,
        })
      }

      navigate(`/product/${currentProductId}`)
    } catch (err) {
      alert(err.message || (isEdit ? '상품 수정에 실패했어요.' : '상품 등록에 실패했어요.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (initializing) {
    return (
      <div className="screen">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
          <span style={{ flex: 1 }}>상품 수정</span>
        </div>
        <div className="empty-note">불러오는 중이에요.</div>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <span style={{ flex: 1 }}>{isEdit ? '상품 수정' : '상품 등록'}</span>
        <button
          className="text-btn"
          style={{ color: 'var(--moss)', fontWeight: 500 }}
          onClick={submit}
          disabled={submitting}
        >
          {submitting ? '저장 중...' : isEdit ? '저장' : '등록'}
        </button>
      </div>

      <div className="create-body">
        <div className="filter-label">사진 (필수 · 첫 번째 또는 별표가 대표 사진)</div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <div className="photo-upload-row">
          <button className="photo-add-btn" onClick={openFilePicker}>
            + 사진
            <span className="photo-count">{totalPhotoCount}/5</span>
          </button>
          {existingImages.map((image, i) => (
            <div
              key={image.id}
              className={`photo-thumb ${repIdx === i ? 'rep' : ''}`}
              style={{ backgroundImage: `url(${image.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              onClick={() => setRepIdx(i)}
            >
              {repIdx === i && <span className="rep-star">★</span>}
              <button
                className="thumb-remove"
                onClick={(e) => {
                  e.stopPropagation()
                  removeExistingImage(image.id)
                }}
              >
                ×
              </button>
              <div style={{ position: 'absolute', bottom: 2, left: 2, display: 'flex', gap: 2 }}>
                <button
                  className="text-btn"
                  style={{ fontSize: 11, padding: '0 4px' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    moveExistingImage(i, -1)
                  }}
                >
                  ‹
                </button>
                <button
                  className="text-btn"
                  style={{ fontSize: 11, padding: '0 4px' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    moveExistingImage(i, 1)
                  }}
                >
                  ›
                </button>
              </div>
            </div>
          ))}
          {photos.map((photo, i) => {
            const idx = existingImages.length + i
            return (
              <div
                key={photo.url}
                className={`photo-thumb ${repIdx === idx ? 'rep' : ''}`}
                style={{ backgroundImage: `url(${photo.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                onClick={() => setRepIdx(idx)}
              >
                {repIdx === idx && <span className="rep-star">★</span>}
                <button
                  className="thumb-remove"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeNewPhoto(i)
                  }}
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>

        <div className="filter-label">제목</div>
        <input
          type="text"
          className="form-input"
          placeholder="상품 제목"
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
        />

        <div className="filter-label">가격 (원)</div>
        <input
          type="number"
          min="1"
          step="1"
          className="form-input"
          placeholder="예: 30000"
          value={form.price}
          onChange={(e) => setField('price', e.target.value)}
        />

        <div className="filter-label">카테고리</div>
        <div className="chip-row">
          {CATEGORIES.filter((c) => c !== '전체').map((c) => (
            <button
              key={c}
              className={`chip ${form.category === c ? 'on' : ''}`}
              onClick={() => setField('category', c)}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="filter-label">상품 상태</div>
        <div className="chip-row">
          {Object.entries(CONDITIONS).map(([key, label]) => (
            <button
              key={key}
              className={`chip ${form.condition === key ? 'on' : ''}`}
              onClick={() => setField('condition', key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="filter-label">거래방식</div>
        <div className="chip-row">
          {['직거래', '택배'].map((t) => (
            <button
              key={t}
              className={`chip ${form.tradeType === t ? 'on' : ''}`}
              onClick={() => setField('tradeType', t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="filter-label">설명</div>
        <textarea
          className="form-textarea"
          placeholder="상품에 대해 자세히 적어주세요."
          rows={5}
          value={form.desc}
          onChange={(e) => setField('desc', e.target.value)}
        />
      </div>
    </div>
  )
}
