import { useMemo, useState } from 'react'
import { Plus, Lock } from 'lucide-react'
import { normalizeText, useStore } from '../store.jsx'
import { DataTable, RowActions, SearchBox, Modal, Field, ConfirmModal, useToast } from '../components/ui.jsx'

function SupplierForm({ initial, suppliers, onSave, onClose }) {
  const [f, setF] = useState(initial ?? { name: '', phone: '', address: '', email: '' })
  const [e, setE] = useState({})
  const set = (k) => (ev) => setF({ ...f, [k]: ev.target.value })
  const submit = () => {
    const er = {}
    if (!f.name.trim()) er.name = 'Trường bắt buộc, không được để trống'
    else if (suppliers.some((s) => !s.deleted && s.id !== initial?.id && normalizeText(s.name) === normalizeText(f.name))) er.name = 'Tên nhà cung cấp đã tồn tại'
    if (!f.phone.trim()) er.phone = 'Trường bắt buộc, không được để trống'
    else if (!/^0\d{9}$/.test(f.phone.trim())) er.phone = 'Số điện thoại gồm 10 chữ số và bắt đầu bằng 0'
    if (!f.address.trim()) er.address = 'Trường bắt buộc, không được để trống'
    if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) er.email = 'Email không đúng định dạng'
    setE(er)
    if (!Object.keys(er).length) onSave({ ...f, name: f.name.trim(), phone: f.phone.trim(), address: f.address.trim(), email: f.email.trim() })
  }
  const inp = (k, ph) => <input className={`input ${e[k] ? 'err' : ''}`} value={f[k]} onChange={set(k)} placeholder={ph} />
  return (
    <Modal title={initial ? 'Chỉnh sửa thông tin nhà cung cấp' : 'Thêm nhà cung cấp'} subtitle={initial ? 'Cập nhật thông tin nhà cung cấp' : 'Nhập thông tin nhà cung cấp mới'} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Hủy bỏ</button><button className="btn primary" onClick={submit}>Lưu</button></>}>
      <div style={{ display: 'grid', gap: 16 }}>
        <Field label="Mã nhà cung cấp" hint="Mã do hệ thống tự động tạo (NCC + 7 chữ số), không thể chỉnh sửa">
          <div style={{ position: 'relative' }}><input className="input" readOnly value={initial?.id ?? 'Tự động tạo'} /><Lock size={14} style={{ position: 'absolute', right: 12, top: 13, color: '#9ca3af' }} /></div>
        </Field>
        <Field label="Tên nhà cung cấp" required error={e.name}>{inp('name', 'Nhập tên nhà cung cấp')}</Field>
        <Field label="Số điện thoại" required error={e.phone}>{inp('phone', 'Nhập số điện thoại (10 chữ số, bắt đầu bằng 0)')}</Field>
        <Field label="Địa chỉ" required error={e.address}>{inp('address', 'Nhập địa chỉ nhà cung cấp')}</Field>
        <Field label="Email" error={e.email}>{inp('email', 'Nhập email (không bắt buộc)')}</Field>
      </div>
    </Modal>
  )
}

export default function Suppliers() {
  const s = useStore()
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(null)
  const [err, setErr] = useState('')
  const [toast, notify] = useToast()
  const rows = useMemo(() => s.suppliers.filter((x) => !x.deleted && (!q || normalizeText(x.id + x.name).includes(normalizeText(q)))), [s.suppliers, q])
  const close = () => { setModal(null); setErr('') }

  const cols = [
    { label: 'Mã NCC', render: (x) => <span className="code">{x.id}</span> },
    { label: 'Tên nhà cung cấp', render: (x) => <span className="name">{x.name}</span> },
    { label: 'Số điện thoại', render: (x) => <span className="muted">{x.phone}</span> },
    { label: 'Địa chỉ', render: (x) => <span className="muted">{x.address}</span> },
    { label: 'Email', render: (x) => <span className="muted">{x.email || '—'}</span> },
    { label: 'Thao tác', render: (x) => <RowActions onView={() => setModal({ k: 'view', x })} onEdit={() => setModal({ k: 'edit', x })} onDelete={() => setModal({ k: 'del', x })} /> },
  ]
  return (
    <>
      <div className="page-head">
        <h2>Quản lý nhà cung cấp</h2>
        <button className="btn" onClick={() => setModal({ k: 'add' })}><Plus size={18} /> Thêm nhà cung cấp</button>
      </div>
      <div className="card">
        <div className="toolbar"><SearchBox value={q} onChange={setQ} placeholder="Tìm theo mã hoặc tên nhà cung cấp" /></div>
        <DataTable columns={cols} rows={rows} emptyText="Không tìm thấy nhà cung cấp phù hợp" />
      </div>
      {modal?.k === 'add' && <SupplierForm suppliers={s.suppliers} onClose={close} onSave={(v) => { s.addSupplier(v); close(); notify('Thêm nhà cung cấp thành công') }} />}
      {modal?.k === 'edit' && <SupplierForm initial={modal.x} suppliers={s.suppliers} onClose={close} onSave={(v) => { s.updateSupplier(modal.x.id, v); close(); notify('Chỉnh sửa thông tin nhà cung cấp thành công') }} />}
      {modal?.k === 'view' && (
        <Modal title="Chi tiết nhà cung cấp" onClose={close} footer={<button className="btn primary" onClick={close}>Đóng</button>}>
          <div style={{ display: 'grid', gap: 14 }}>
            {[['Mã nhà cung cấp', modal.x.id], ['Tên nhà cung cấp', modal.x.name], ['Số điện thoại', modal.x.phone], ['Địa chỉ', modal.x.address], ['Email', modal.x.email || '—']]
              .map(([l, v]) => <Field key={l} label={l}><input className="input" readOnly value={v} /></Field>)}
          </div>
        </Modal>
      )}
      {modal?.k === 'del' && (
        <ConfirmModal title="Xóa thông tin nhà cung cấp" danger confirmText="Xóa" error={err} onClose={close}
          message={`Bạn có chắc chắn muốn xóa nhà cung cấp "${modal.x.name}"?`}
          onConfirm={() => {
            if (s.isSupplierUsed(modal.x.name)) { close(); return notify({ type: 'error', message: 'Nhà cung cấp đang được sử dụng, không thể xóa.' }) }
            s.deleteSupplier(modal.x.id); close(); notify('Xóa nhà cung cấp thành công')
          }} />
      )}
      {toast}
    </>
  )
}
