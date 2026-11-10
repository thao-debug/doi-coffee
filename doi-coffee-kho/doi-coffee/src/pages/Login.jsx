import { useState } from 'react'
import { User, Lock, Box, FileText, BarChart3 } from 'lucide-react'

export default function Login({ onLogin }) {
  const [u, setU] = useState(() => localStorage.getItem('remember-user') || '')
  const [p, setP] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(() => !!localStorage.getItem('remember-user'))
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')

  const submit = (e) => {
    e.preventDefault()
    setInfo('')
    if (!u.trim() || !p) return setErr('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.')
    if (u.trim() !== 'chuquan' || p !== '123456') return setErr('Tên đăng nhập hoặc mật khẩu không đúng.')
    if (remember) localStorage.setItem('remember-user', u.trim())
    else localStorage.removeItem('remember-user')
    onLogin()
  }

  return (
    <div className="login-page">
      <section className="login-hero">
        <span className="circle c1" />
        <span className="circle c2" />
        <span className="circle c3" />
        <div className="hero-brand">
          <h1>Đợi Coffee</h1>
          <span>Quản lí kho</span>
        </div>
        <div className="hero-content">
          <h2>Kho gọn gàng,<br />quán vận hành trơn tru.</h2>
          <p>Theo dõi tồn kho, phiếu nhập, hao hụt và công thức<br />món ngay trên một hệ thống.</p>
          <div className="hero-tags">
            <span><Box size={14} /> Tồn kho</span>
            <span><FileText size={14} /> Phiếu nhập</span>
            <span><BarChart3 size={14} /> Báo cáo</span>
          </div>
        </div>
      </section>

      <section className="login-side">
        <form className="login-card" onSubmit={submit}>
          <div className="login-icon"><User size={20} /></div>
          <h3>Chào mừng trở lại</h3>
          <p className="sub">Đăng nhập bằng tài khoản được cấp để quản lý kho.</p>

          {err && <div className="banner error">{err}</div>}
          {info && <div className="banner success">{info}</div>}

          <label>Tên đăng nhập</label>
          <div className="login-input">
            <User size={17} />
            <input value={u} onChange={(e) => setU(e.target.value)} placeholder="Nhập tên đăng nhập" autoFocus />
          </div>

          <label>Mật khẩu</label>
          <div className="login-input">
            <Lock size={17} />
            <input type={show ? 'text' : 'password'} value={p} onChange={(e) => setP(e.target.value)} placeholder="Nhập mật khẩu" />
            <button type="button" className="toggle" onClick={() => setShow(!show)}>{show ? 'Ẩn' : 'Hiện'}</button>
          </div>

          <div className="login-row">
            <label className="check">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Ghi nhớ đăng nhập
            </label>
            <button type="button" className="link" onClick={() => { setErr(''); setInfo('Vui lòng liên hệ người quản trị để được cấp lại mật khẩu.') }}>Quên mật khẩu?</button>
          </div>

          <button className="login-btn">Đăng nhập</button>
          <div className="login-foot">Quên thông tin? Liên hệ người quản trị để được hỗ trợ.</div>
        </form>
      </section>
    </div>
  )
}