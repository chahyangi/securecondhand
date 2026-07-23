// 실제 업로드 사진이 있으면 그것을 보여주고, 없으면(목업 상품) 색 스와치로 대체.
export function Swatch({ colors, image, style }) {
  if (image) {
    return (
      <div
        className="swatch"
        style={{ backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center', ...style }}
      />
    )
  }
  const bg = Array.isArray(colors)
    ? `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`
    : colors
  return <div className="swatch" style={{ background: bg, ...style }} />
}

export function Avatar({ user, className = '' }) {
  return <div className={`avatar ${className}`}>{user.icon}</div>
}

// "secure" + "cond"/"hand"(짧은 두 조각을 쌓음) + 자물쇠 아이콘.
// 자물쇠 열쇠 구멍은 흔한 원+사다리꼴 대신 사각형(box)으로 뚫어서 표현한다.
export function Logo({ className = '' }) {
  return (
    <div className={`brand-logo ${className}`}>
      <span className="brand-secure">secure</span>
      <div className="brand-lower">
        <div className="brand-condhand">
          <span>cond</span>
          <span>hand</span>
        </div>
        <svg className="brand-lock" viewBox="0 0 40 46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            d="M11 20v-6a9 9 0 0 1 18 0v6"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <mask id="brand-lock-keyhole">
            <rect x="4" y="20" width="32" height="22" rx="5" fill="#fff" />
            <rect x="15" y="27" width="10" height="9" fill="#000" />
          </mask>
          <rect x="4" y="20" width="32" height="22" rx="5" fill="currentColor" mask="url(#brand-lock-keyhole)" />
        </svg>
      </div>
    </div>
  )
}
