import { useEffect, useMemo, useState } from 'react'
import { LockKeyhole, Trash2 } from 'lucide-react'
import { useStore } from '../store.jsx'
import { DataTable, RowActions, SearchBox, Select, Modal, Field, ConfirmModal, fmtNum, fmtDateTime, useToast } from '../components/ui.jsx'

const TYPES = ['Nhập kho', 'Xuất kho', 'Hao hụt', 'Điều chỉnh']

export default function StockHistory() {
  const s = useStore()
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [date, setDate] = useState('')
  const [modal, setModal] = useState(null)
  const [highlight, setHighlight] = useState(null)
  const [toast, notify] = useToast()
  const mat = (id) => s.materials.find((m) => m.id === id)
  useEffect(() => {
    const stored = sessionStorage.getItem('stock-history-highlight')
    if (!stored) return
    try { setHighlight(JSON.parse(stored)) } catch { setHighlight(null) }
    sessionStorage.removeItem('stock-history-highlight')
  }, [])
  const detailValues = (t) => {
    const material = mat(t.materialId)
    const unit = material?.unit || ''
    const before = Number.isFinite(Number(t.stockBefore)) ? Number(t.stockBefore) : (material?.stock || 0)
    const after = Number.isFinite(Number(t.stockAfter)) ? Number(t.stockAfter) : before + Number(t.delta || 0)
    const reference = t.reference || t.source || '—'
    const note = t.note || t.reason || (t.type === 'Nhập kho'
      ? `Nhập lô ${material?.name || 'nguyên vật liệu'} từ ${material?.supplier || 'nhà cung cấp'}, đã kiểm tra chất lượng đạt yêu cầu.`
      : `Ghi nhận ${t.type?.toLowerCase() || 'thay đổi'} cho ${material?.name || 'nguyên vật liệu'}.`)
    return { material, unit, before, after, reference, note }
  }

  const rows = useMemo(() => s.transactions.filter((t) => {
    if (t.deleted || !t.time) return false
    const m = mat(t.materialId)
    return (!q || (t.id + (m?.name || '')).toLowerCase().includes(q.toLowerCase())) && (!type || t.type === type) && (!date || t.time.startsWith(date))
  }).slice().sort((a, b) => b.time.localeCompare(a.time) || b.id.localeCompare(a.id)), [s.transactions, s.materials, q, type, date])

  const cols = [
    { label: 'Mã giao dịch', render: (t) => <span className="code">{t.id}</span> },
    { label: 'Thời gian', render: (t) => fmtDateTime(t.time) },
    { label: 'Tên nguyên vật liệu', render: (t) => <span className="name">{mat(t.materialId)?.name}</span> },
    { label: 'Loại giao dịch', key: 'type' },
    { label: 'Số lượng thay đổi', render: (t) => <span className={t.delta >= 0 ? 'green' : 'red'}>{t.delta >= 0 ? '+' : ''}{fmtNum(t.delta)}</span> },
    { label: 'Đơn vị tính', render: (t) => mat(t.materialId)?.unit },
    { label: 'Thao tác', render: (t) => <RowActions onView={() => setModal({ t, kind: 'view' })} onDelete={() => {
      if (t.reversalOf) {
        setHighlight({ id: t.id, type: 'error' })
        return notify({ type: 'error', message: 'Không thể xóa bản ghi đảo ngược!' })
      }
      if (!s.canDeleteTransaction(t.id)) return setModal({ t, kind: 'negative' })
      setModal({ t, kind: 'del' })
    }} /> },
  ]
  const trashCols = [
    { label: 'Mã giao dịch', key: 'id' },
    { label: 'Thời gian', render: (t) => fmtDateTime(t.time) },
    { label: 'Tên NVL', render: (t) => mat(t.materialId)?.name },
    { label: 'Số lượng', render: (t) => fmtNum(t.delta) },
    { label: '', render: (t) => <button className="btn sm" onClick={() => {
      if (!s.canRestoreTransaction(t.id)) return notify({ type: 'error', message: 'Không thể khôi phục vì tồn kho sẽ bị âm.' })
      s.restoreTransaction(t.id); notify('Khôi phục giao dịch thành công!')
    }}>Khôi phục</button> },
  ]
  return (
    <>
      <div className="page-head"><h2>Lịch sử thay đổi tồn kho</h2></div>
      <div className="card">
        <div className="toolbar">
          <SearchBox value={q} onChange={setQ} placeholder="Tìm theo mã giao dịch hoặc tên nguyên vật liệu" />
          <Select value={type} onChange={setType} options={TYPES} placeholder="Tất cả loại giao dịch" />
          <input className="input" type="date" style={{ width: 170 }} value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setModal({ kind: 'trash' })}><Trash2 size={16} /> Thùng rác</button>
        </div>
        <DataTable columns={cols} rows={rows} emptyText="Không tìm thấy giao dịch phù hợp" rowClassName={(t) => t.id === highlight?.id ? `row-${highlight.type}` : undefined} />
      </div>
      {modal?.kind === 'view' && (
        <Modal title="Chi tiết lịch sử thay đổi tồn kho" subtitle={<><LockKeyhole size={11} /> Chỉ xem – không thể chỉnh sửa thông tin tại màn hình này</>} onClose={() => setModal(null)} footer={<button className="btn primary" onClick={() => setModal(null)}>Đóng</button>}>
          {(() => {
            const d = detailValues(modal.t)
            const fields = [
              ['Mã giao dịch', modal.t.id], ['Thời gian', fmtDateTime(modal.t.time)],
              ['Tên nguyên vật liệu', d.material?.name || 'Nguyên vật liệu đã xóa'], ['Loại giao dịch', modal.t.type],
              ['Số lượng thay đổi', `${modal.t.delta >= 0 ? '+' : ''}${fmtNum(modal.t.delta)}`], ['Đơn vị tính', d.unit || '—'],
              ['Tồn kho trước giao dịch', `${fmtNum(d.before)} ${d.unit}`], ['Tồn kho sau giao dịch', `${fmtNum(d.after)} ${d.unit}`],
            ]
            return <>
              <div className="grid2 detail-grid">
                {fields.map(([label, value]) => <Field key={label} label={label}><input className="input" readOnly value={value} /></Field>)}
                <Field label="Mã tham chiếu" full><input className="input" readOnly value={d.reference} /></Field>
                <Field label="Ghi chú" full><textarea className="textarea detail-note" readOnly value={d.note} /></Field>
              </div>
            </>
          })()}
        </Modal>
      )}
      {modal?.kind === 'del' && (
        <ConfirmModal title="Xóa giao dịch" danger confirmText="Xóa" message={`Chuyển giao dịch ${modal.t.id} vào thùng rác?`} onClose={() => setModal(null)}
          onConfirm={() => {
            if (modal.t.reversalOf) {
              setModal(null)
              setHighlight({ id: modal.t.id, type: 'error' })
              return notify({ type: 'error', message: 'Không thể xóa bản ghi đảo ngược!' })
            }
            if (!s.canDeleteTransaction(modal.t.id)) return setModal({ t: modal.t, kind: 'negative' })
            const inverseId = s.deleteTransaction(modal.t.id)
            setModal(null)
            if (inverseId) {
              setQ(''); setType(''); setDate('')
              setHighlight({ id: inverseId, type: 'success' })
            }
            notify('Xóa giao dịch thành công!')
          }} />
      )}
      {modal?.kind === 'negative' && (() => {
        const material = mat(modal.t.materialId)
        const current = Number(material?.stock || 0)
        const reversal = -Number(modal.t.delta || 0)
        const after = current + reversal
        const quantity = (value) => Number(value).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 3 })
        return <Modal
          size="sm"
          header={<h3 className="negative-stock-title">Không thể xóa! Việc xóa giao dịch này làm tồn kho hiện tại bị âm.</h3>}
          onClose={() => setModal(null)}
          footer={<button className="btn primary" onClick={() => setModal(null)}>Đóng</button>}
        >
          <div className="negative-stock-cards">
            <div className="negative-stock-card"><span>Tồn kho hiện tại</span><b>{quantity(current)} {material?.unit}</b></div>
            <div className="negative-stock-card"><span>Giá trị đảo ngược</span><b className="red">{quantity(reversal)} {material?.unit}</b></div>
            <div className="negative-stock-card"><span>Tồn kho sau giao dịch</span><b className="red">{quantity(after)} {material?.unit}</b></div>
          </div>
        </Modal>
      })()}
      {modal?.kind === 'trash' && (
        <Modal title="Thùng rác" size="lg" onClose={() => setModal(null)} footer={<button className="btn primary" onClick={() => setModal(null)}>Đóng</button>}>
          <DataTable columns={trashCols} rows={s.trash} emptyText="Thùng rác trống" />
        </Modal>
      )}
      {toast}
    </>
  )
}
