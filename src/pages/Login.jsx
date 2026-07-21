import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const from = location.state?.from ?? '/'

  const submit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('아이디와 비밀번호를 입력해주세요.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="screen">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>←</button>
        로그인
      </div>
      <form className="create-body" onSubmit={submit}>
        <div className="filter-label">아이디</div>
        <input
          className="form-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />

        <div className="filter-label">비밀번호</div>
        <input
          className="form-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{error}</p>}

        <button type="submit" className="chat-cta" style={{ marginTop: 20, width: '100%' }} disabled={submitting}>
          {submitting ? '로그인 중...' : '로그인'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 16 }}>
          계정이 없으신가요?{' '}
          <Link to="/signup" style={{ color: 'var(--moss)', fontWeight: 500 }}>
            회원가입
          </Link>
        </p>
      </form>
    </div>
  )
}
