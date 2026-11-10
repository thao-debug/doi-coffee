import { useCallback, useEffect, useState } from 'react'
import { Search, X, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, CheckCircle2, CircleAlert } from 'lucide-react'

export const fmtNum = (n) => (n == null ? '' : Number(n).toLocaleString('vi-VN', { maximumFractionDigits: 3 }))
export const fmtMoney = (n) => Number(n).toLocaleString('vi-VN')
export const fmtDate = (iso) => {
  if (!iso) return 'Không áp dụng'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}
export const fmtDateTime = (iso) => `${fmtDate(iso)} ${iso.slice(11, 16)}`
export const todayISO = () => { const d = new Date(); const offset = d.getTimezoneOffset() * 60000; return new Date(d.getTime() - offset).toISOString().slice(0, 10) }
export const isExpired = (iso) => !!iso && iso <= todayISO()

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="search">
      <Search size={18} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value && (
        <button className="act edit" style={{ width: 22, height: 22, borderRadius: 11 }} onClick={() => onChange('')}>
          <X size={12} />
        </button>
      )}
    </div>
  )
}

export function Select({ value, onChange, options, placeholder, className = '', disabled }) {
  return (
    <select className={`select ${className}`} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((o) =>
        typeof o === 'string' ? (
          <option key={o} value={o}>{o}</option>
        ) : (
          <option key={o.value} value={o.value}>{o.label}</option>
        )
      )}
    </select>
  )
}

export function RowActions({ onView, onEdit, onDelete, editDisabled, deleteDisabled }) {
  return (
    <div className="actions">
      {onView && <button className="act view" title="Xem" onClick={onView}><Eye size={16} /></button>}
      {onEdit && <button className="act edit" title="Sửa" onClick={onEdit} disabled={editDisabled}><Pencil size={16} /></button>}
      {onDelete && <button className="act del" title="Xóa" onClick={onDelete} disabled={deleteDisabled}><Trash2 size={16} /></button>}
    </div>
  )
}

// Bảng + phân trang (10 dòng/trang)
export function DataTable({ columns, rows, pageSize = 10, emptyText = 'Không có dữ liệu', footer, rowClassName }) {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  useEffect(() => { if (page > pages) setPage(pages) }, [pages, page])
  const slice = rows.slice((page - 1) * pageSize, page * pageSize)
  return (
    <>
      <table className="tbl">
        <thead>
          <tr>{columns.map((c) => <th key={c.label} className={c.num ? 'num' : ''}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {slice.length === 0 && <tr><td className="empty" colSpan={columns.length}>{emptyText}</td></tr>}
          {slice.map((r, i) => (
            <tr key={r.id ?? i} className={rowClassName ? rowClassName(r) : undefined}>
              {columns.map((c) => (
                <td key={c.label} className={c.num ? 'num' : ''}>{c.render ? c.render(r) : r[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {footer}
      <div className="pager">
        <span className="info">
          {rows.length > 0 && `Hiển thị ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, rows.length)} trên ${rows.length}`}
        </span>
        <button className="btn sm square" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button>
        <b>{page}/{pages}</b>
        <button className="btn sm square" disabled={page >= pages} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button>
      </div>
    </>
  )
}

export function Modal({ title, subtitle, header, onClose, children, footer, size = '' }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size}`}>
        <div className={`modal-head ${header ? 'custom-modal-head' : ''}`}>
          {header || <div>
            <h3>{title}</h3>
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>}
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, required, hint, error, full, children }) {
  return (
    <div className={`field ${full ? 'full' : ''}`}>
      {label && <label>{label} {required && <span className="req">*</span>}</label>}
      {children}
      {error ? <div className="error">{error}</div> : hint && <div className="hint">{hint}</div>}
    </div>
  )
}

export function ConfirmModal({ title, message, confirmText = 'Xác nhận', danger, onConfirm, onClose, error }) {
  return (
    <Modal
      title={title}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Hủy bỏ</button>
          <button className={`btn ${danger ? 'danger' : 'primary'}`} onClick={onConfirm}>{confirmText}</button>
        </>
      }
    >
      {error && <div className="banner error">{error}</div>}
      <p style={{ margin: 0 }}>{message}</p>
    </Modal>
  )
}

export function Toast({ message, onDone }) {
  const item = typeof message === 'string' ? { type: 'success', text: message } : { type: message.type || 'success', text: message.message }
  const Icon = item.type === 'error' ? CircleAlert : CheckCircle2
  useEffect(() => {
    const t = setTimeout(onDone, 4000)
    return () => clearTimeout(t)
  }, [onDone])
  return <div className={`toast ${item.type}`} role={item.type === 'error' ? 'alert' : 'status'}><Icon size={19} aria-hidden="true" /><span>{item.text}</span></div>
}

export function useToast() {
  const notify = useCallback((message) => {
    window.dispatchEvent(new CustomEvent('app-toast', { detail: message }))
  }, [])
  return [null, notify]
}
