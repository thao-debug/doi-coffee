import { useMemo, useState } from 'react'
import { Plus, Search, RefreshCw } from 'lucide-react'
import { normalizeText, useStore } from '../store.jsx'
import { DataTable, RowActions, SearchBox, Select, Modal, Field, ConfirmModal, fmtNum, fmtDate, useToast } from '../components/ui.jsx'
import { stockStatus, expiryStatus } from '../components/helpers.js'
import { GROUPS } from '../data.js'

const empty = { name: '', group: '', unit: '', stock: 0, min: '', expiry: '', ratio: '', subUnit: '', supplier: '' }

function MaterialForm({ initial, suppliers, materials, onSave, onClose, title }) {
  const [f, setF] = useState(initial ? { ...initial, ratio: initial.ratio ?? '', subUnit: initial.subUnit ?? '', expiry: initial.expiry ?? '' } : empty)
  const [errs, setErrs] = useState({})
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = () => {
    const e = {}
    ;['name', 'group', 'unit', 'supplier'].forEach((k) => { if (!String(f[k]).trim()) e[k] = 'Trường bắt buộc, không được để trống' })
    if (f.min === '' || !Number.isInteger(Number(f.min)) || Number(f.min) < 0) e.min = 'Định mức phải là số nguyên không âm'
    if (!!String(f.subUnit).trim() !== !!String(f.ratio).trim()) { e.subUnit = 'Nhập đồng thời đơn vị và tỷ lệ quy đổi'; e.ratio = e.subUnit }
    if (String(f.ratio).trim() && (!Number.isFinite(Number(f.ratio)) || Number(f.ratio) <= 0)) e.ratio = 'Tỷ lệ quy đổi phải lớn hơn 0'
    if (suppliers.some((s) => !s.deleted && s.name === f.supplier) === false) e.supplier = 'Vui lòng chọn nhà cung cấp đang hoạt động'
    if (materials.some((m) => !m.deleted && m.id !== initial?.id && normalizeText(m.name) === normalizeText(f.name))) e.name = 'Tên nguyên vật liệu đã tồn tại'
    setErrs(e)
    if (Object.keys(e).length) return
    onSave({ ...f, stock: initial ? initial.stock : 0, min: Number(f.min), ratio: f.ratio === '' ? null : Number(f.ratio), subUnit: f.subUnit || '' })
  }
  const inp = (k, props = {}) => <input className={`input ${errs[k] ? 'err' : ''}`} value={f[k]} onChange={set(k)} {...props} />
  return (
    <Modal title={title} subtitle="Trường có dấu * là bắt buộc" size="lg" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Hủy bỏ</button><button className="btn primary" onClick={submit}>Lưu</button></>}>
      <div className="grid2">
        <Field label="Mã nguyên vật liệu" hint="Hệ thống tự động tạo"><input className="input" readOnly value={initial?.id ?? 'Tự động tạo'} /></Field>
        <Field label="Tên nguyên vật liệu" required error={errs.name}>{inp('name')}</Field>
        <Field label="Nhóm nguyên vật liệu" required error={errs.group}>
          <select className={`select ${errs.group ? 'err' : ''}`} value={f.group} onChange={set('group')}>
            <option value="">Chọn nhóm</option>{GROUPS.map((g) => <option key={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="Nhà cung cấp" required error={errs.supplier}>
          <select className={`select ${errs.supplier ? 'err' : ''}`} value={f.supplier} onChange={set('supplier')}>
            <option value="">Chọn nhà cung cấp</option>{suppliers.filter((s) => !s.deleted).map((s) => <option key={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Đơn vị tính" required error={errs.unit}>{inp('unit')}</Field>
        <Field label="Đơn vị quy đổi" error={errs.subUnit} hint="Tùy chọn; phải nhập cùng tỷ lệ quy đổi">{inp('subUnit')}</Field>
        <Field label="Tỷ lệ quy đổi" error={errs.ratio} hint="Tùy chọn; phải lớn hơn 0">{inp('ratio', { type: 'number', min: 0, step: 'any' })}</Field>
        <Field label="Số lượng tồn kho"><input className="input" readOnly value={`${fmtNum(initial ? initial.stock : 0)} ${f.unit}`} /></Field>
        <Field label="Định mức tồn tối thiểu" required error={errs.min}>{inp('min', { type: 'number', min: 0, step: 1 })}</Field>
        <Field label="Hạn sử dụng" hint="Được xác định từ các lô nhập còn tồn kho"><input className="input" readOnly value={initial?.expiry || 'Không áp dụng'} /></Field>
      </div>
    </Modal>
  )
}

export default function Materials() {
  const s = useStore()
  const [q, setQ] = useState('')
  const [group, setGroup] = useState('')
  const [stat, setStat] = useState('')
  const [exp, setExp] = useState('')
  const [modal, setModal] = useState(null) // {type, item}
  const [err, setErr] = useState('')
  const [toast, notify] = useToast()

  const rows = useMemo(() => s.materials.filter((m) => !m.deleted &&
    (!q || normalizeText(m.id + m.name).includes(normalizeText(q))) &&
    (!group || m.group === group) && (!stat || stockStatus(m) === stat) && (!exp || expiryStatus(m.expiry, m.stock) === exp)
  ), [s.materials, q, group, stat, exp])

  const reset = () => { setQ(''); setGroup(''); setStat(''); setExp('') }
  const close = () => { setModal(null); setErr('') }

  const cols = [
    { label: 'Mã NVL', render: (m) => <span className="code">{m.id}</span> },
    { label: 'Tên nguyên vật liệu', render: (m) => <span className="name">{m.name}</span> },
    { label: 'Nhóm NVL', key: 'group' },
    { label: 'Đơn vị tính', key: 'unit' },
    { label: 'Số lượng tồn kho', render: (m) => <span className={m.stock <= m.min ? 'red' : ''}>{fmtNum(m.stock)}</span> },
    { label: 'Hạn sử dụng', render: (m) => <span className={['Đã hết hạn', 'Sắp hết hạn'].includes(expiryStatus(m.expiry, m.stock)) ? 'red' : ''}>{expiryStatus(m.expiry, m.stock) === 'Không áp dụng' ? 'Không áp dụng' : fmtDate(m.expiry)}</span> },
    { label: 'Thao tác', render: (m) => <RowActions onView={() => setModal({ type: 'view', item: m })} onEdit={() => setModal({ type: 'edit', item: m })} onDelete={() => setModal({ type: 'del', item: m })} /> },
  ]

  return (
    <>
      <div className="page-head">
        <h2>Quản lý nguyên vật liệu</h2>
        <button className="btn" onClick={() => setModal({ type: 'add' })}><Plus size={18} /> Thêm nguyên vật liệu</button>
      </div>
      <div className="card">
        <div className="toolbar">
          <SearchBox value={q} onChange={setQ} placeholder="Tìm theo mã hoặc tên nguyên vật liệu" />
          <Select value={group} onChange={setGroup} options={GROUPS} placeholder="Tất cả nhóm NVL" />
          <Select value={stat} onChange={setStat} options={['Còn hàng', 'Sắp hết', 'Hết hàng']} placeholder="Trạng thái tồn kho" />
          <Select value={exp} onChange={setExp} options={['Còn hạn', 'Sắp hết hạn', 'Đã hết hạn', 'Không áp dụng']} placeholder="Trạng thái hạn sử dụng" />
          <button className="btn primary square" title="Tìm kiếm"><Search size={18} /></button>
          <button className="btn square" title="Làm mới" onClick={reset}><RefreshCw size={18} /></button>
        </div>
        <DataTable columns={cols} rows={rows} emptyText="Không tìm thấy nguyên vật liệu phù hợp" />
      </div>

      {modal?.type === 'view' && (
        <Modal title="Chi tiết nguyên vật liệu" subtitle="Chỉ xem – không thể chỉnh sửa thông tin tại màn hình này" size="lg" onClose={close}
          footer={<button className="btn primary" onClick={close}>Đóng</button>}>
          <div className="grid2">
            {[['Mã nguyên vật liệu', modal.item.id], ['Tỷ lệ quy đổi', modal.item.ratio], ['Tên nguyên vật liệu', modal.item.name],
              ['Số lượng tồn kho', `${fmtNum(modal.item.stock)} ${modal.item.unit}`], ['Nhóm nguyên vật liệu', modal.item.group],
              ['Định mức tồn tối thiểu', `${fmtNum(modal.item.min)} ${modal.item.unit}`], ['Đơn vị tính', modal.item.unit],
              ['Hạn sử dụng', fmtDate(modal.item.expiry)], ['Đơn vị quy đổi', modal.item.subUnit], ['Nhà cung cấp', modal.item.supplier],
            ].map(([l, v]) => <Field key={l} label={l}><input className="input" readOnly value={v} /></Field>)}
          </div>
        </Modal>
      )}
      {modal?.type === 'add' && (
        <MaterialForm title="Thêm nguyên vật liệu" suppliers={s.suppliers} materials={s.materials} onClose={close}
          onSave={(v) => { s.addMaterial(v); close(); notify('Thêm nguyên vật liệu thành công') }} />
      )}
      {modal?.type === 'edit' && (
        <MaterialForm title="Chỉnh sửa nguyên vật liệu" initial={modal.item} suppliers={s.suppliers} materials={s.materials} onClose={close}
          onSave={(v) => { s.updateMaterial(modal.item.id, v); close(); notify('Cập nhật nguyên vật liệu thành công') }} />
      )}
      {modal?.type === 'del' && (
        <ConfirmModal title="Xóa nguyên vật liệu" danger confirmText="Xóa" error={err} onClose={close}
          message={`Bạn có chắc chắn muốn xóa "${modal.item.name}"?`}
          onConfirm={() => {
            if (modal.item.stock > 0) { close(); return notify({ type: 'error', message: 'Không thể xóa nguyên vật liệu còn tồn kho.' }) }
            if (s.isMaterialUsed(modal.item.id)) { close(); return notify({ type: 'error', message: 'Nguyên vật liệu đang được tham chiếu bởi công thức hoặc phiếu.' }) }
            s.deleteMaterial(modal.item.id); close(); notify('Xóa nguyên vật liệu thành công')
          }} />
      )}
      {toast}
    </>
  )
}
