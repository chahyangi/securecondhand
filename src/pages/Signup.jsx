import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const navigate = useNavigate()
  const { signup } = useAuth()
  const [form, setForm] = useState({ username: '', nickname: '', password: '', passwordConfirm: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.username.trim() || !form.password) {
      setError('아이디와 비밀번호를 입력해주세요.')
      return
    }
    if (form.password !== form.passwordConfirm) {
      setError('비밀번호가 일치하지 않아요.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await signup(form.username.trim(), form.password, form.nickname.trim())
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="screen">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        회원가입
      </div>
      <form className="create-body" onSubmit={submit}>
        <div className="filter-label">아이디</div>
        <input
          className="form-input"
          value={form.username}
          onChange={(e) => setField('username', e.target.value)}
          autoFocus
        />

        <div className="filter-label">닉네임</div>
        <input
          className="form-input"
          placeholder="비워두면 아이디로 설정돼요"
          value={form.nickname}
          onChange={(e) => setField('nickname', e.target.value)}
        />

        <div className="filter-label">비밀번호</div>
        <input
          className="form-input"
          type="password"
          value={form.password}
          onChange={(e) => setField('password', e.target.value)}
        />

        <div className="filter-label">비밀번호 확인</div>
        <input
          className="form-input"
          type="password"
          value={form.passwordConfirm}
          onChange={(e) => setField('passwordConfirm', e.target.value)}
        />

        {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{error}</p>}

        <button type="submit" className="chat-cta" style={{ marginTop: 20, width: '100%' }} disabled={submitting}>
          {submitting ? '가입 중...' : '회원가입'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 16 }}>
          이미 계정이 있으신가요?{' '}
          <Link to="/login" style={{ color: 'var(--moss)', fontWeight: 500 }}>
            로그인
          </Link>
        </p>
      </form>
    </div>
  )
}
