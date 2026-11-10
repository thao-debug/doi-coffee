import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useStore } from '../store.jsx'
import { ConfirmModal, DataTable, Field, fmtDate, fmtMoney, fmtNum, Modal, RowActions, todayISO, useToast } from '../components/ui.jsx'

const blankLine = () => ({ materialId: '', qty: '', unitPrice: '', expiry: '' })

function ReceiptForm({ initial, onSave, onClose }) {
  const s = useStore()
  const [f, setF] = useState(() => ({ date: initial?.date || todayISO(), supplier: initial?.supplier || '', invoice: initial?.invoice || '', note: initial?.note || '', items: initial?.items?.map((x) => ({ ...x })) || [blankLine()] }))
  const [error, setError] = useState('')
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const setLine = (idx, k, v) => set('items', f.items.map((x, i) => i === idx ? { ...x, [k]: v } : x))
  const activeMaterials = s.materials.filter((m) => !m.deleted)
  const total = f.items.reduce((sum, x) => sum + (Number(x.qty) || 0) * (Number(x.unitPrice) || 0), 0)
  const save = () => {
    if (!f.date || !f.supplier || f.items.length === 0) return setError('Vui lòng nhập ngày, nhà cung cấp và ít nhất một nguyên vật liệu.')
    if (f.date > todayISO()) return setError('Ngày nhập không được lớn hơn ngày hiện tại.')
    if (f.invoice.length > 100 || f.note.length > 500) return setError('Số hóa đơn tối đa 100 ký tự, ghi chú tối đa 500 ký tự.')
    const ids = f.items.map((x) => x.materialId)
    if (ids.some((x) => !x) || new Set(ids).size !== ids.length) return setError('Mỗi dòng phải có nguyên vật liệu riêng, không được chọn trùng.')
    for (const item of f.items) {
      if (!Number.isFinite(Number(item.qty)) || Number(item.qty) <= 0 || !Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) < 0) return setError('Số lượng phải lớn hơn 0 và đơn giá phải từ 0 trở lên.')
      if (item.expiry && item.expiry < f.date) return setError('Hạn sử dụng phải bằng hoặc sau ngày nhập.')
      const oldQty = initial?.items?.filter((x) => x.materialId === item.materialId).reduce((sum, x) => sum + x.qty, 0) || 0
      const stock = s.materials.find((m) => m.id === item.materialId)?.stock || 0
      if (Number(item.qty) > stock + oldQty) return setError(`Tồn kho không đủ để lưu thay đổi cho ${s.materials.find((m) => m.id === item.materialId)?.name}.`)
    }
    if (initial) {
      const oldTotals = new Map()
      const newTotals = new Map()
      initial.items?.forEach((x) => oldTotals.set(x.materialId, (oldTotals.get(x.materialId) || 0) + x.qty))
      f.items.forEach((x) => newTotals.set(x.materialId, (newTotals.get(x.materialId) || 0) + Number(x.qty)))
      for (const [id, oldQty] of oldTotals) {
        const stock = s.materials.find((m) => m.id === id)?.stock || 0
        if (stock + oldQty - (newTotals.get(id) || 0) < -1e-9) return setError(`Không thể giảm số lượng đã nhập vì tồn kho ${s.materials.find((m) => m.id === id)?.name} không đủ.`)
      }
    }
    onSave({ ...f, items: f.items.map((x) => ({ ...x, qty: Number(x.qty), unitPrice: Number(x.unitPrice) })) })
  }
  return <Modal title={initial ? `Chỉnh sửa phiếu nhập ${initial.id}` : 'Thêm phiếu nhập kho'} subtitle="Ghi nhận nguyên vật liệu nhập kho và đơn giá" size="lg" onClose={onClose}
    footer={<><button className="btn" onClick={onClose}>Hủy bỏ</button><button className="btn primary" onClick={save}>{initial ? 'Lưu thay đổi' : 'Lưu phiếu nhập'}</button></>}>
    {error && <div className="banner error">{error}</div>}
    <div className="grid2">
      <Field label="Mã phiếu nhập"><input className="input" readOnly value={initial?.id || 'Tự động tạo'} /></Field>
      <Field label="Ngày nhập" required><input className="input" type="date" max={todayISO()} value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>
      <Field label="Nhà cung cấp" required><select className="select" value={f.supplier} onChange={(e) => set('supplier', e.target.value)}><option value="">Chọn nhà cung cấp</option>{s.suppliers.filter((x) => !x.deleted).map((x) => <option key={x.id}>{x.name}</option>)}</select></Field>
      <Field label="Số hóa đơn"><input className="input" maxLength={100} value={f.invoice} onChange={(e) => set('invoice', e.target.value)} placeholder="Không bắt buộc" /></Field>
    </div>
    <div style={{ marginTop: 18 }}>
      <div className="line" style={{ marginBottom: 5 }}><b>Nguyên vật liệu nhập</b><b>SL / Đơn giá (VNĐ)</b></div>
      {f.items.map((item, idx) => <div className="line" key={idx} style={{ alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 8, flex: 1 }}>
          <select className="select" value={item.materialId} onChange={(e) => setLine(idx, 'materialId', e.target.value)}><option value="">Chọn nguyên vật liệu</option>{activeMaterials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}</select>
          <input className="input" type="date" aria-label="Hạn sử dụng" min={f.date} value={item.expiry || ''} onChange={(e) => setLine(idx, 'expiry', e.target.value)} />
        </div>
        <div style={{ display: 'grid', gap: 8, flex: 1 }}>
          <input className="input" type="number" min="0" step="any" placeholder="Số lượng" value={item.qty} onChange={(e) => setLine(idx, 'qty', e.target.value)} />
          <input className="input" type="number" min="0" step="1" placeholder="Đơn giá / đơn vị" value={item.unitPrice} onChange={(e) => setLine(idx, 'unitPrice', e.target.value)} />
        </div>
        {f.items.length > 1 ? <button className="x-btn" aria-label="Xóa dòng" onClick={() => set('items', f.items.filter((_, i) => i !== idx))}><X size={16} /></button> : <span />}
      </div>)}
      <button className="btn sm" onClick={() => set('items', [...f.items, blankLine()])}><Plus size={14} /> Thêm dòng nguyên vật liệu</button>
    </div>
    <Field label="Ghi chú"><textarea className="textarea" maxLength={500} value={f.note} onChange={(e) => set('note', e.target.value)} /></Field>
    <div className="report-total"><span>Tổng tiền</span><span className="v">{fmtMoney(total)} VNĐ</span></div>
  </Modal>
}

export default function Receipts() {
  const s = useStore()
  const [modal, setModal] = useState(null)
  const [toast, notify] = useToast()
  const rows = useMemo(() => s.receipts.filter((r) => !r.deleted).slice().sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)), [s.receipts])
  const close = () => setModal(null)
  const cols = [
    { label: 'Mã phiếu', render: (r) => <span className="code">{r.id}</span> },
    { label: 'Ngày nhập', render: (r) => fmtDate(r.date) },
    { label: 'Nhà cung cấp', render: (r) => <span className="name">{r.supplier}</span> },
    { label: 'Số nguyên vật liệu', render: (r) => `${r.items?.length || 0} mặt hàng` },
    { label: 'Tổng tiền (VNĐ)', num: true, render: (r) => fmtMoney(r.total) },
    { label: 'Thao tác', render: (r) => <RowActions onView={() => setModal({ kind: 'view', receipt: r })} onEdit={() => setModal({ kind: 'edit', receipt: r })} onDelete={() => setModal({ kind: 'delete', receipt: r })} /> },
  ]
  return <>
    <div className="page-head"><h2>Quản lý phiếu nhập kho</h2><button className="btn" onClick={() => setModal({ kind: 'add' })}><Plus size={18} /> Thêm phiếu nhập</button></div>
    <div className="card"><DataTable columns={cols} rows={rows} emptyText="Chưa có phiếu nhập kho" /></div>
    {modal?.kind === 'add' && <ReceiptForm onClose={close} onSave={(v) => { s.addReceipt(v); close(); notify('Thêm phiếu nhập kho thành công') }} />}
    {modal?.kind === 'edit' && <ReceiptForm initial={modal.receipt} onClose={close} onSave={(v) => { s.updateReceipt(modal.receipt.id, v); close(); notify('Cập nhật phiếu nhập kho thành công') }} />}
    {modal?.kind === 'view' && <Modal title={`Chi tiết phiếu nhập ${modal.receipt.id}`} onClose={close} footer={<button className="btn primary" onClick={close}>Đóng</button>}>
      <div className="grid2" style={{ marginBottom: 14 }}>{[['Ngày nhập', fmtDate(modal.receipt.date)], ['Nhà cung cấp', modal.receipt.supplier], ['Số hóa đơn', modal.receipt.invoice || '—'], ['Ghi chú', modal.receipt.note || '—']].map(([k, v]) => <Field key={k} label={k}><input className="input" readOnly value={v} /></Field>)}</div>
      <table className="tbl"><thead><tr><th>Nguyên vật liệu</th><th>Hạn sử dụng</th><th className="num">Số lượng</th><th className="num">Đơn giá</th><th className="num">Thành tiền</th></tr></thead><tbody>{(modal.receipt.items || []).map((i) => { const m = s.materials.find((x) => x.id === i.materialId); return <tr key={i.materialId}><td>{m?.name || i.materialId}</td><td>{fmtDate(i.expiry)}</td><td className="num">{fmtNum(i.qty)} {m?.unit}</td><td className="num">{fmtMoney(i.unitPrice)} đ</td><td className="num">{fmtMoney(i.qty * i.unitPrice)} đ</td></tr> })}</tbody></table>
      <div className="report-total"><span>Tổng tiền</span><span className="v">{fmtMoney(modal.receipt.total)} VNĐ</span></div>
    </Modal>}
    {modal?.kind === 'delete' && <ConfirmModal title="Xóa phiếu nhập kho" danger confirmText="Xóa phiếu" error={modal.error} message={`Bạn có chắc muốn xóa phiếu ${modal.receipt.id}? Số lượng đã nhập sẽ được trừ lại khỏi tồn kho.`} onClose={close} onConfirm={() => {
      const unavailable = (modal.receipt.items || []).find((i) => (s.materials.find((m) => m.id === i.materialId)?.stock ?? 0) < i.qty)
      if (unavailable) { close(); return notify({ type: 'error', message: `Không thể xóa phiếu vì tồn kho ${s.materials.find((m) => m.id === unavailable.materialId)?.name} không đủ.` }) }
      s.deleteReceipt(modal.receipt.id); close(); notify('Xóa phiếu nhập kho thành công!')
    }} />}
    {toast}
  </>
}
