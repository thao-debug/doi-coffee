import { useState } from 'react'
import { Plus } from 'lucide-react'
import { normalizeText, useStore } from '../store.jsx'
import { DataTable, RowActions, Modal, Field, ConfirmModal, fmtNum, useToast } from '../components/ui.jsx'

const blank = () => ({ materialId: '', qty: '' })

export default function Recipes() {
  const s = useStore()
  const [modal, setModal] = useState(null)
  const [toast, notify] = useToast()
  const [f, setF] = useState({ name: '', group: '', type: 'Món chính', note: '', items: [blank()] })
  const [err, setErr] = useState('')
  const mat = (id) => s.materials.find((m) => m.id === id)
  const setItem = (idx, key, value) => setF((x) => ({ ...x, items: x.items.map((it, i) => i === idx ? { ...it, [key]: value } : it) }))
  const openAdd = () => { setF({ name: '', group: '', type: 'Món chính', note: '', items: [blank()] }); setErr(''); setModal({ k: 'add' }) }
  const openEdit = (r) => { setF({ name: r.name, group: r.group, type: r.type, note: r.note || '', items: r.items.map((i) => ({ ...i })) }); setErr(''); setModal({ k: 'edit', r }) }
  const save = () => {
    const items = f.items
    if (!f.name.trim() || !f.group.trim() || !f.type || !items.length) return setErr('Vui lòng nhập tên món, loại công thức, nhóm món và ít nhất một nguyên vật liệu.')
    if (f.name.trim().length > 100 || f.note.length > 500) return setErr('Tên món tối đa 100 ký tự; ghi chú pha chế tối đa 500 ký tự.')
    if (s.recipes.some((r) => r.id !== modal?.r?.id && r.type === f.type && normalizeText(r.name) === normalizeText(f.name))) return setErr('Tên món đã tồn tại trong cùng loại công thức.')
    if (items.some((i) => !i.materialId || !Number.isFinite(Number(i.qty)) || Number(i.qty) <= 0)) return setErr('Vui lòng chọn nguyên vật liệu và nhập định lượng lớn hơn 0 cho mọi dòng.')
    const ids = items.map((i) => i.materialId)
    if (new Set(ids).size !== ids.length) return setErr('Không được chọn trùng nguyên vật liệu trong cùng một công thức.')
    if (items.some((i) => !mat(i.materialId) || mat(i.materialId).deleted)) return setErr('Nguyên vật liệu không còn hoạt động trong danh mục.')
    const value = { name: f.name.trim(), group: f.group.trim(), type: f.type, note: f.note.trim(), items: items.map((i) => ({ materialId: i.materialId, qty: Number(i.qty), unit: mat(i.materialId).subUnit || mat(i.materialId).unit })) }
    if (modal?.k === 'edit') { s.updateRecipe(modal.r.id, value); notify('Cập nhật công thức món thành công') }
    else { s.addRecipe(value); notify('Thêm công thức món thành công') }
    setModal(null)
  }
  const cols = [
    { label: 'Mã món', render: (r) => <span className="code">{r.id}</span> },
    { label: 'Tên món', render: (r) => <span className="name">{r.name}</span> },
    { label: 'Nhóm món', key: 'group' },
    { label: 'Loại công thức', key: 'type' },
    { label: 'Số lượng nguyên vật liệu', render: (r) => `${r.items.length} nguyên vật liệu` },
    { label: 'Thao tác', render: (r) => <RowActions onView={() => setModal({ k: 'view', r })} onEdit={() => openEdit(r)} onDelete={() => setModal({ k: 'del', r })} /> },
  ]
  return <>
    <div className="page-head"><h2>Quản lý công thức món</h2><button className="btn" onClick={openAdd}><Plus size={18} /> Thêm công thức món</button></div>
    <div className="card"><DataTable columns={cols} rows={s.recipes} /></div>
    {modal?.k === 'view' && <Modal title={`Chi tiết công thức: ${modal.r.name}`} subtitle={`${modal.r.id} • ${modal.r.group} • ${modal.r.type}`} onClose={() => setModal(null)} footer={<button className="btn primary" onClick={() => setModal(null)}>Đóng</button>}>
      {modal.r.note && <p className="muted">Ghi chú pha chế: {modal.r.note}</p>}
      <table className="tbl"><thead><tr><th>Mã NVL</th><th>Tên nguyên vật liệu</th><th className="num">Định lượng</th></tr></thead><tbody>{modal.r.items.map((i, idx) => <tr key={`${i.materialId}-${idx}`}><td className="code">{i.materialId}</td><td>{mat(i.materialId)?.name || 'Nguyên vật liệu đã xóa'}</td><td className="num">{fmtNum(i.qty)} {i.unit}</td></tr>)}</tbody></table>
    </Modal>}
    {(modal?.k === 'add' || modal?.k === 'edit') && <Modal title={modal.k === 'edit' ? `Chỉnh sửa công thức ${modal.r.name}` : 'Thêm công thức món'} size="lg" onClose={() => setModal(null)} footer={<><button className="btn" onClick={() => setModal(null)}>Hủy bỏ</button><button className="btn primary" onClick={save}>{modal.k === 'edit' ? 'Lưu thay đổi' : 'Lưu'}</button></>}>
      {err && <div className="banner error">{err}</div>}
      <div className="grid2" style={{ marginBottom: 16 }}>
        <Field label="Tên món" required><input className="input" maxLength={100} readOnly={modal.k === 'edit'} value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} /></Field>
        <Field label="Nhóm món" required><input className="input" readOnly={modal.k === 'edit'} value={f.group} onChange={(e) => setF((x) => ({ ...x, group: e.target.value }))} /></Field>
        <Field label="Loại công thức"><select className="select" disabled={modal.k === 'edit'} value={f.type} onChange={(e) => setF((x) => ({ ...x, type: e.target.value }))}><option>Món chính</option><option>Extra</option></select></Field>
      </div>
      <label style={{ fontWeight: 600, fontSize: 13 }}>Nguyên vật liệu</label>
      {f.items.map((it, i) => <div className="line" key={i} style={{ marginTop: 8 }}>
        <select className="select" value={it.materialId} onChange={(e) => setItem(i, 'materialId', e.target.value)}><option value="">Chọn nguyên vật liệu</option>{s.materials.filter((m) => !m.deleted).map((m) => <option key={m.id} value={m.id}>{m.name} ({m.subUnit || m.unit})</option>)}</select>
        <input className="input" type="number" min="0" step="any" placeholder="Định lượng" value={it.qty} onChange={(e) => setItem(i, 'qty', e.target.value)} />
        {f.items.length > 1 && <button className="x-btn" aria-label="Xóa dòng" onClick={() => setF((x) => ({ ...x, items: x.items.filter((_, idx) => idx !== i) }))}>✕</button>}
      </div>)}
      <button className="btn sm" onClick={() => setF((x) => ({ ...x, items: [...x.items, blank()] }))}><Plus size={14} /> Thêm dòng</button>
      <Field label="Ghi chú pha chế"><textarea className="textarea" maxLength={500} value={f.note} onChange={(e) => setF((x) => ({ ...x, note: e.target.value }))} /></Field>
    </Modal>}
    {modal?.k === 'del' && <ConfirmModal title="Xóa công thức" danger confirmText="Xóa" message={`Bạn có chắc chắn muốn xóa công thức "${modal.r.name}"?`} onClose={() => setModal(null)} onConfirm={() => { s.deleteRecipe(modal.r.id); setModal(null); notify('Xóa công thức thành công') }} />}
    {toast}
  </>
}
