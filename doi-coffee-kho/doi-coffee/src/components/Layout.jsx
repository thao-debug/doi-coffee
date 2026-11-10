import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Box, FlaskConical, BookOpen, Truck, FileText, TrendingDown, BarChart3, Bell, LogOut, ChevronDown } from 'lucide-react'
import { ConfirmModal, fmtDateTime, Toast } from './ui.jsx'
import { useStore } from '../store.jsx'

const link = ({ isActive }) => (isActive ? 'active' : '')

export default function Layout({ onLogout }) {
  const { pathname } = useLocation()
  const { notifications = [], markNotificationRead, markAllNotificationsRead } = useStore()
  const [open, setOpen] = useState(pathname.startsWith('/ton-kho'))
  const [confirm, setConfirm] = useState(false)
  const [showAlerts, setShowAlerts] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  useEffect(() => {
    const showToast = (event) => setToastMessage(event.detail)
    window.addEventListener('app-toast', showToast)
    return () => window.removeEventListener('app-toast', showToast)
  }, [])
  const clearToast = useCallback(() => setToastMessage(null), [])
  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <h1>Đợi Coffee</h1>
          <span>Quản lý kho</span>
        </div>
        <nav className="nav">
          <button className="nav-parent" onClick={() => setOpen(!open)}>
            <Box size={20} /> Quản lý tồn kho <ChevronDown className="chev" size={16} style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
          </button>
          {open && (
            <div className="sub">
              <NavLink to="/ton-kho/lich-su" className={link}>Lịch sử thay đổi tồn kho</NavLink>
              <NavLink to="/ton-kho/dieu-chinh" className={link}>Điều chỉnh tồn kho</NavLink>
              <NavLink to="/ton-kho/kiem-tra" className={link}>Kiểm tra tồn kho</NavLink>
            </div>
          )}
          <NavLink to="/nguyen-vat-lieu" className={link}><FlaskConical size={20} /> Quản lý nguyên vật liệu</NavLink>
          <NavLink to="/cong-thuc-mon" className={link}><BookOpen size={20} /> Quản lý công thức món</NavLink>
          <NavLink to="/nha-cung-cap" className={link}><Truck size={20} /> Quản lý nhà cung cấp</NavLink>
          <NavLink to="/phieu-nhap-kho" className={link}><FileText size={20} /> Quản lý phiếu nhập kho</NavLink>
          <NavLink to="/hao-hut" className={link}><TrendingDown size={20} /> Quản lý hao hụt</NavLink>
          <NavLink to="/bao-cao" className={link}><BarChart3 size={20} /> Báo cáo Nhập - Xuất - Tồn &amp; CP</NavLink>
        </nav>
        <div className="userbox">
          <div className="avatar">T</div>
          <div className="who"><b>Trần Bảo Khuê</b>Chủ quán</div>
          <button className="icon-btn-dark" title="Thông báo" aria-label={`Thông báo, ${unread} chưa đọc`} aria-expanded={showAlerts} onClick={() => setShowAlerts(!showAlerts)}>
            <Bell size={16} />{unread > 0 && <span className="badge">{unread > 99 ? '99+' : unread}</span>}
          </button>
          <button className="icon-btn-dark" title="Đăng xuất" onClick={() => setConfirm(true)}><LogOut size={16} /></button>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
      {showAlerts && <section className="alert-panel" aria-label="Danh sách thông báo">
        <div className="alert-head"><b>Thông báo</b><button className="link-button" disabled={!unread} onClick={markAllNotificationsRead}>Đánh dấu tất cả đã đọc</button></div>
        {notifications.length ? <div className="alert-list">{notifications.map((n) => <button key={n.id} className={`alert-row ${n.read ? '' : 'unread'}`} onClick={() => markNotificationRead(n.id)}>
          <span className={`alert-dot ${n.type || 'info'}`} />
          <span className="alert-copy"><b>{n.title}</b><span>{n.message}</span><small>{fmtDateTime(n.time)}</small></span>
          {!n.read && <span className="unread-mark" aria-label="Chưa đọc" />}
        </button>)}</div> : <p className="muted alert-empty">Bạn chưa có thông báo.</p>}
      </section>}
      {toastMessage && <Toast message={toastMessage} onDone={clearToast} />}
      {confirm && (
        <ConfirmModal title="Đăng xuất" message="Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?" confirmText="Đăng xuất" onClose={() => setConfirm(false)} onConfirm={onLogout} />
      )}
    </div>
  )
}
