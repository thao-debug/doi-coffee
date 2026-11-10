import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useStore } from '../store.jsx'
import { DataTable, RowActions, SearchBox, Select, Modal, Field, ConfirmModal, fmtNum, fmtDate, todayISO, useToast } from '../components/ui.jsx'
import { LOSS_REASONS } from '../data.js'

function SlipForm({ initial, onSave, onClose }) {
  const s = useStore()
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [reason, setReason] = useState(initial?.reason ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [items, setItems] = useState(initial?.items.map((i) => ({ ...i })) ?? [{ materialId: '', qty: '' }])
  const [err, setErr] = useState('')
  const mat = (id) => s.materials.find((m) => m.id === id)
  // tồn kho khả dụng: khi sửa, cộng lại số lượng của phiếu cũ
  const avail = (id) => (mat(id)?.stock ?? 0) + (initial?.items.filter((i) => i.materialId === id).reduce((a, i) => a + i.qty, 0) ?? 0)
  const setItem = (i, k, v) => setItems(items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)))

  const submit = () => {
    if (!date || !reason) return setErr('Vui lòng nhập ngày hao hụt và chọn lý do hao hụt.')
    if (reason === 'Khác' && !note.trim()) return setErr('Vui lòng nhập ghi chú khi lý do là "Khác".')
    if (items.length === 0) return setErr('Danh sách nguyên vật liệu đang trống.')
    for (const it of items) {
      if (!it.materialId || it.qty === '' || !Number.isFinite(Number(it.qty)) || Number(it.qty) <= 0) return setErr('Nguyên vật liệu và số lượng (> 0) là bắt buộc ở mọi dòng.')
    }
    const ids = items.map((i) => i.materialId)
    if (new Set(ids).size !== ids.length) return setErr('Một nguyên vật liệu chỉ được xuất hiện một lần trong phiếu.')
    for (const it of items) {
      if (Number(it.qty) > avail(it.materialId)) return setErr(`Tồn kho không đủ cho "${mat(it.materialId).name}" (còn ${fmtNum(avail(it.materialId))} ${mat(it.materialId).unit}).`)
    }
    onSave({ date, reason, note, items: items.map((i) => ({ materialId: i.materialId, qty: Number(i.qty), unit: mat(i.materialId).unit })) })
  }
  return (
    <Modal title={initial ? `Sửa phiếu hao hụt ${initial.id}` : 'Tạo phiếu hao hụt'} size="lg" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Hủy</button><button className="btn primary" onClick={submit}>Lưu</button></>}>
      {err && <div className="banner error">{err}</div>}
      <div className="grid2">
        <Field label="Mã phiếu"><input className="input" readOnly value={initial?.id ?? 'Tự động sinh'} /></Field>
        <Field label="Ngày lập"><input className="input" readOnly value={fmtDate(initial?.created ?? todayISO())} /></Field>
        <Field label="Ngày hao hụt" required><input className="input" type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Lý do hao hụt" required><Select value={reason} onChange={setReason} options={LOSS_REASONS} placeholder="Chọn lý do" /></Field>
      </div>
      <div style={{ marginTop: 16 }}>
        <div className="line" style={{ marginBottom: 4 }}><label style={{ fontWeight: 600, fontSize: 13 }}>Nguyên vật liệu <span className="red">*</span></label><label style={{ fontWeight: 600, fontSize: 13 }}>Số lượng <span className="red">*</span></label></div>
        {items.map((it, i) => (
          <div className="line" key={i}>
            <Field hint={it.materialId ? `Tồn kho hiện tại: ${fmtNum(avail(it.materialId))} ${mat(it.materialId).unit}` : ''}>
              <select className="select" value={it.materialId} onChange={(e) => setItem(i, 'materialId', e.target.value)}>
                <option value="">Chọn nguyên vật liệu</option>
                {s.materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
              </select>
            </Field>
            <input className="input" type="number" min="0" step="any" value={it.qty} onChange={(e) => setItem(i, 'qty', e.target.value)} />
            {items.length > 1 ? <button className="x-btn" onClick={() => setItems(items.filter((_, x) => x !== i))}><X size={16} /></button> : <span />}
          </div>
        ))}
        <button className="btn sm" onClick={() => setItems([...items, { materialId: '', qty: '' }])}><Plus size={14} /> Thêm dòng</button>
      </div>
      <Field label={`Ghi chú ${reason === 'Khác' ? '(bắt buộc)' : '(nếu lý do "Khác")'}`} full>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nhập ghi chú nếu có..." style={{ marginTop: 0 }} />
      </Field>
    </Modal>
  )
}

export default function LossSlips() {
  const s = useStore()
  const [q, setQ] = useState('')
  const [reason, setReason] = useState('')
  const [status, setStatus] = useState('')
  const [modal, setModal] = useState(null)
  const [toast, notify] = useToast()
  const mat = (id) => s.materials.find((m) => m.id === id)

  // mỗi dòng NVL của phiếu hiển thị thành 1 hàng, giống thiết kế
  const rows = useMemo(() => s.slips.flatMap((sl) => sl.items.map((it, i) => ({ ...sl, item: it, key: sl.id + i, first: i === 0 })))
    .filter((r) => (!q || (r.id + (mat(r.item.materialId)?.name || '')).toLowerCase().includes(q.toLowerCase())) && (!reason || r.reason === reason) && (!status || r.status === status))
    .map((r) => ({ ...r, id: r.key, slipId: r.id })), [s.slips, s.materials, q, reason, status])

  const slip = (id) => s.slips.find((x) => x.id === id)
  const cols = [
    { label: 'Mã phiếu', render: (r) => <span className="code">{r.slipId}</span> },
    { label: 'Ngày lập', render: (r) => fmtDate(r.created) },
    { label: 'Ngày hao hụt', render: (r) => fmtDate(r.date) },
    { label: 'Tên NVL', render: (r) => mat(r.item.materialId)?.name },
    { label: 'Số lượng', render: (r) => fmtNum(r.item.qty) },
    { label: 'ĐVT', render: (r) => r.item.unit },
    { label: 'Lý do', key: 'reason' },
    { label: 'Trạng thái', render: (r) => <span className={`pill ${r.status === 'Đã hủy' ? 'red' : 'green'}`}>{r.status}</span> },
    { label: 'Thao tác', render: (r) => <RowActions onView={() => setModal({ k: 'view', sl: slip(r.slipId) })} editDisabled={r.status === 'Đã hủy'} onEdit={() => setModal({ k: 'edit', sl: slip(r.slipId) })} deleteDisabled={r.status === 'Đã hủy'} onDelete={() => setModal({ k: 'cancel', sl: slip(r.slipId) })} /> },
  ]
  const close = () => setModal(null)
  return (
    <>
      <div className="page-head">
        <h2>Quản lý hao hụt</h2>
        <button className="btn" onClick={() => setModal({ k: 'add' })}><Plus size={18} /> Tạo phiếu hao hụt</button>
      </div>
      <div className="card">
        <div className="toolbar">
          <SearchBox value={q} onChange={setQ} placeholder="Tìm theo mã phiếu hoặc tên nguyên vật liệu" />
          <Select value={reason} onChange={setReason} options={LOSS_REASONS} placeholder="Tất cả lý do" />
          <Select value={status} onChange={setStatus} options={['Hoàn thành', 'Đã hủy']} placeholder="Tất cả trạng thái" />
        </div>
        <DataTable columns={cols} rows={rows} emptyText="Không tìm thấy phiếu hao hụt" />
      </div>
      {modal?.k === 'add' && <SlipForm onClose={close} onSave={(v) => { s.createSlip(v); close(); notify('Tạo phiếu hao hụt thành công') }} />}
      {modal?.k === 'edit' && <SlipForm initial={modal.sl} onClose={close} onSave={(v) => setModal({ k: 'confirm-edit', sl: modal.sl, value: v })} />}
      {modal?.k === 'confirm-edit' && <ConfirmModal title="Xác nhận thay đổi phiếu hao hụt" confirmText="Lưu thay đổi" message={`Lưu thay đổi cho phiếu ${modal.sl.id}? Tồn kho sẽ được cập nhật theo phần chênh lệch.`} onClose={close}
        onConfirm={() => { s.updateSlip(modal.sl.id, modal.value); close(); notify('Sửa phiếu hao hụt thành công') }} />}
      {modal?.k === 'view' && (
        <Modal title={`Chi tiết phiếu ${modal.sl.id}`} onClose={close} footer={<button className="btn primary" onClick={close}>Đóng</button>}>
          <div className="grid2" style={{ marginBottom: 14 }}>
            {[['Ngày lập', fmtDate(modal.sl.created)], ['Ngày hao hụt', fmtDate(modal.sl.date)], ['Lý do', modal.sl.reason], ['Trạng thái', modal.sl.status], ['Ghi chú', modal.sl.note || '—']]
              .map(([l, v]) => <Field key={l} label={l}><input className="input" readOnly value={v} /></Field>)}
          </div>
          <table className="tbl">
            <thead><tr><th>Nguyên vật liệu</th><th className="num">Số lượng</th></tr></thead>
            <tbody>{modal.sl.items.map((i) => <tr key={i.materialId}><td>{mat(i.materialId)?.name}</td><td className="num">{fmtNum(i.qty)} {i.unit}</td></tr>)}</tbody>
          </table>
        </Modal>
      )}
      {modal?.k === 'cancel' && (
        <ConfirmModal title="Hủy phiếu hao hụt" danger confirmText="Hủy phiếu" message={`Hủy phiếu ${modal.sl.id}? Số lượng nguyên vật liệu sẽ được hoàn lại vào tồn kho.`} onClose={close}
          onConfirm={() => { s.cancelSlip(modal.sl.id); close(); notify('Hủy phiếu hao hụt thành công') }} />
      )}
      {toast}
    </>
  )
}
