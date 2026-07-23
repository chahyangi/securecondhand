import { Routes, Route, useLocation } from 'react-router-dom'
import MainGrid from './pages/MainGrid'
import ProductDetail from './pages/ProductDetail'
import ProductCreate from './pages/ProductCreate'
import Chat from './pages/Chat'
import ChatList from './pages/ChatList'
import NotificationFeed from './pages/NotificationFeed'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AdminDashboard from './pages/AdminDashboard'
import TopUp from './pages/TopUp'
import TopUpResult from './pages/TopUpResult'
import BottomNav from './components/BottomNav'

export default function App() {
  const { pathname } = useLocation()
  // 채팅/로그인/회원가입 화면은 자체 레이아웃을 쓰므로 네비 숨김
  const hideNav = pathname.startsWith('/chat/') || pathname === '/login' || pathname === '/signup'

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<MainGrid />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/create" element={<ProductCreate />} />
        <Route path="/product/:id/edit" element={<ProductCreate />} />
        <Route path="/chats" element={<ChatList />} />
        <Route path="/notifications" element={<NotificationFeed />} />
        <Route path="/chat/:productId" element={<Chat key={pathname} />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/wallet/topup" element={<TopUp />} />
        <Route path="/wallet/topup/result" element={<TopUpResult />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </div>
  )
}
