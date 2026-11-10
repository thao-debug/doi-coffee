import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Materials from './pages/Materials.jsx'
import StockCheck from './pages/StockCheck.jsx'
import StockAdjust from './pages/StockAdjust.jsx'
import StockHistory from './pages/StockHistory.jsx'
import Recipes from './pages/Recipes.jsx'
import Suppliers from './pages/Suppliers.jsx'
import Receipts from './pages/Receipts.jsx'
import LossSlips from './pages/LossSlips.jsx'
import Report from './pages/Report.jsx'

export default function App() {
  const [auth, setAuth] = useState(() => sessionStorage.getItem('auth') === '1')
  const login = () => { sessionStorage.setItem('auth', '1'); setAuth(true) }
  const logout = () => { sessionStorage.removeItem('auth'); setAuth(false) }

  useEffect(() => {
    if (!auth) return undefined
    let timer
    const expire = () => logout()
    const reset = () => { clearTimeout(timer); timer = setTimeout(expire, 30 * 60 * 1000) }
    const events = ['pointerdown', 'keydown', 'mousemove', 'touchstart']
    events.forEach((event) => window.addEventListener(event, reset, { passive: true }))
    reset()
    return () => { clearTimeout(timer); events.forEach((event) => window.removeEventListener(event, reset)) }
  }, [auth])

  if (!auth) return <Login onLogin={login} />
  return (
    <Routes>
      <Route element={<Layout onLogout={logout} />}>
        <Route path="/" element={<Navigate to="/nguyen-vat-lieu" replace />} />
        <Route path="/nguyen-vat-lieu" element={<Materials />} />
        <Route path="/ton-kho/kiem-tra" element={<StockCheck />} />
        <Route path="/ton-kho/dieu-chinh" element={<StockAdjust />} />
        <Route path="/ton-kho/lich-su" element={<StockHistory />} />
        <Route path="/cong-thuc-mon" element={<Recipes />} />
        <Route path="/nha-cung-cap" element={<Suppliers />} />
        <Route path="/phieu-nhap-kho" element={<Receipts />} />
        <Route path="/hao-hut" element={<LossSlips />} />
        <Route path="/bao-cao" element={<Report />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
