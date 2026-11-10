import { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { DataTable, RowActions, SearchBox, Select, Modal, Field, fmtNum } from '../components/ui.jsx'
import { stockStatus } from '../components/helpers.js'
import { GROUPS } from '../data.js'

export default function StockCheck() {
  const { materials } = useStore()
  const [q, setQ] = useState('')
  const [group, setGroup] = useState('')
  const [stat, setStat] = useState('')
  const [view, setView] = useState(null)
  const rows = useMemo(() => materials.filter((m) =>
    (!q || (m.id + m.name).toLowerCase().includes(q.toLowerCase())) && (!group || m.group === group) && (!stat || stockStatus(m) === stat)
  ), [materials, q, group, stat])

  const cols = [
    { label: 'Mã NVL', render: (m) => <span className="code">{m.id}</span> },
    { label: 'Tên nguyên vật liệu', render: (m) => <span className="name">{m.name}</span> },
    { label: 'Nhóm', key: 'group' },
    { label: 'Đơn vị tính', key: 'unit' },
    { label: 'Tồn kho hiện tại', render: (m) => fmtNum(m.stock) },
    { label: 'Mức tồn tối thiểu', render: (m) => fmtNum(m.min) },
    { label: 'Trạng thái', render: (m) => { const t = stockStatus(m); return <span className={`pill ${t === 'Hết hàng' ? 'red' : t === 'Sắp hết' ? 'amber' : 'green'}`}>{t}</span> } },
    { label: 'Chi tiết', render: (m) => <RowActions onView={() => setView(m)} /> },
  ]
  return (
    <>
      <div className="page-head"><h2>Kiểm tra tồn kho</h2></div>
      <div className="card">
        <div className="toolbar">
          <SearchBox value={q} onChange={setQ} placeholder="Tìm theo mã hoặc tên nguyên vật liệu" />
          <Select value={group} onChange={setGroup} options={GROUPS} placeholder="Tất cả nhóm" />
          <Select value={stat} onChange={setStat} options={['Còn hàng', 'Sắp hết', 'Hết hàng']} placeholder="Tất cả trạng thái" />
          <button className="btn" onClick={() => { setQ(''); setGroup(''); setStat('') }}>Xóa bộ lọc</button>
        </div>
        <DataTable columns={cols} rows={rows} emptyText="Không tìm thấy dữ liệu tồn kho" />
      </div>
      {view && (
        <Modal title="Chi tiết tồn kho" onClose={() => setView(null)} footer={<button className="btn primary" onClick={() => setView(null)}>Đóng</button>}>
          <div className="grid2">
            {[['Mã NVL', view.id], ['Tên nguyên vật liệu', view.name], ['Nhóm', view.group], ['Đơn vị tính', view.unit],
              ['Tồn kho hiện tại', fmtNum(view.stock)], ['Mức tồn tối thiểu', fmtNum(view.min)], ['Trạng thái', stockStatus(view)]]
              .map(([l, v]) => <Field key={l} label={l}><input className="input" readOnly value={v} /></Field>)}
          </div>
        </Modal>
      )}
    </>
  )
}
