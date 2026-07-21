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
