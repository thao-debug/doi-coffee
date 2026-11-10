import { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { DataTable, SearchBox, Select, Modal, Field, fmtNum, fmtDateTime, useToast } from '../components/ui.jsx'
import { GROUPS } from '../data.js'

const REASONS = ['Kiểm kê thực tế', 'Sai lệch nhập liệu', 'Thất thoát', 'Khác']

export default function StockAdjust() {
  const s = useStore()
  const [q, setQ] = useState('')
  const [group, setGroup] = useState('')
  const [sel, setSel] = useState(null)
  const [actual, setActual] = useState('')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [toast, notify] = useToast()

  const lastTx = (id) => s.transactions.find((t) => t.materialId === id)?.time
  const rows = useMemo(() => s.materials.filter((m) =>
    (!q || (m.id + m.name).toLowerCase().includes(q.toLowerCase())) && (!group || m.group === group)), [s.materials, q, group])

  const open = (m) => { setSel(m); setActual(''); setReason(''); setNote(''); setErr('') }
  const save = () => {
    if (actual === '' || !reason) return setErr('Vui lòng nhập số lượng thực tế và chọn lý do điều chỉnh.')
    const n = Number(actual)
    if (!Number.isFinite(n) || n < 0) return setErr('Số lượng thực tế không hợp lệ (phải là số không âm).')
    if (n === sel.stock) return setErr('Chênh lệch bằng 0, không cần điều chỉnh tồn kho.')
    const transactionId = s.adjustStock(sel.id, n, reason, note)
    sessionStorage.setItem('stock-history-highlight', JSON.stringify({ id: transactionId, type: 'success' }))
    setSel(null); notify('Điều chỉnh tồn kho thành công')
  }

  const cols = [
    { label: 'Mã NVL', render: (m) => <span className="code">{m.id}</span> },
    { label: 'Tên nguyên vật liệu', render: (m) => <span className="name">{m.name}</span> },
    { label: 'Đơn vị tính', key: 'unit' },
    { label: 'Tồn kho hiện tại', render: (m) => fmtNum(m.stock) },
    { label: 'Cập nhật lần cuối', render: (m) => (lastTx(m.id) ? fmtDateTime(lastTx(m.id)) : '—') },
    { label: 'Thao tác', render: (m) => <button className="btn sm" style={{ background: '#e8f1fb', color: 'var(--primary)', borderColor: 'transparent' }} onClick={() => open(m)}>Điều chỉnh tồn kho</button> },
  ]
  return (
    <>
      <div className="page-head"><h2>Điều chỉnh tồn kho</h2></div>
      <div className="card">
        <div className="toolbar">
          <SearchBox value={q} onChange={setQ} placeholder="Tìm theo mã hoặc tên nguyên vật liệu" />
          <Select value={group} onChange={setGroup} options={GROUPS} placeholder="Tất cả nhóm" />
        </div>
        <DataTable columns={cols} rows={rows} />
      </div>
      {sel && (
        <Modal title="Điều chỉnh tồn kho" onClose={() => setSel(null)}
          footer={<><button className="btn" onClick={() => setSel(null)}>Hủy bỏ</button><button className="btn primary" onClick={save}>Lưu</button></>}>
          {err && <div className="banner error">{err}</div>}
          <div className="grid2">
            <Field label="Tên nguyên vật liệu"><input className="input" readOnly value={sel.name} /></Field>
            <Field label="Đơn vị tính"><input className="input" readOnly value={sel.unit} /></Field>
            <Field label="Tồn kho hiện tại"><input className="input" readOnly value={`${fmtNum(sel.stock)} ${sel.unit}`} /></Field>
            <Field label="Số lượng thực tế" required><input className="input" type="number" min="0" step="any" value={actual} onChange={(e) => setActual(e.target.value)} placeholder="Nhập số lượng thực tế" /></Field>
            <Field label="Lý do điều chỉnh" required full><Select value={reason} onChange={setReason} options={REASONS} placeholder="Chọn lý do" /></Field>
            <Field label="Ghi chú" full><textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nhập ghi chú" /></Field>
          </div>
        </Modal>
      )}
      {toast}
    </>
  )
}
