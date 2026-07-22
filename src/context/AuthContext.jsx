import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  getToken,
  setToken as persistToken,
  login as apiLogin,
  signup as apiSignup,
  logout as apiLogout,
  fetchMe,
} from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken())
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!getToken())

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    let alive = true
    fetchMe()
      .then((me) => {
        if (alive) setUser(me)
      })
      .catch(() => {
        if (!alive) return
        persistToken(null)
        setTokenState(null)
        setUser(null)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [token])

  useEffect(() => {
    const onExpired = () => {
      setTokenState(null)
      setUser(null)
    }
    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [])

  const login = useCallback(async (username, password) => {
    const { token: newToken, user: loggedInUser } = await apiLogin({ username, password })
    persistToken(newToken)
    setTokenState(newToken)
    setUser(loggedInUser)
  }, [])

  const signup = useCallback(async (username, password, nickname) => {
    const { token: newToken, user: newUser } = await apiSignup({ username, password, nickname })
    persistToken(newToken)
    setTokenState(newToken)
    setUser(newUser)
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch {
      // 토큰이 이미 만료/삭제된 경우에도 로컬 상태는 정리한다.
    }
    persistToken(null)
    setTokenState(null)
    setUser(null)
  }, [])

  // 송금 등으로 잔액이 바뀐 뒤 전체 새로고침 없이 헤더/설정 화면의 잔액 표시를 갱신하기 위함.
  const refreshUser = useCallback(async () => {
    const me = await fetchMe()
    setUser(me)
    return me
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있어요.')
  return ctx
}
