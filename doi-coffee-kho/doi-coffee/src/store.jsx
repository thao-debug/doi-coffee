import { createContext, useContext, useEffect, useState } from 'react'
import { MATERIALS, SUPPLIERS, LOSS_SLIPS, TRANSACTIONS, RECIPES, RECEIPTS } from './data.js'

const Ctx = createContext(null)
export const useStore = () => useContext(Ctx)

const KEY = 'doi-coffee-store-v1'
const initial = {
  materials: MATERIALS,
  suppliers: SUPPLIERS,
  slips: LOSS_SLIPS,
  transactions: TRANSACTIONS,
  recipes: RECIPES,
  receipts: RECEIPTS,
  trash: [],
}

const nextCode = (prefix, list, pad) => {
  const max = list.reduce((m, x) => Math.max(m, parseInt(x.id.replace(/\D/g, ''), 10) || 0), 0)
  return prefix + String(max + 1).padStart(pad, '0')
}
const makeTransactions = (rows, existing, build) => {
  const made = []
  rows.forEach((row) => { const id = nextCode('GD', [...existing, ...made], 5); made.push(build(row, id)) })
  return made
}
const recalculateExpiry = (materials, receipts) => materials.map((m) => {
  const expiries = receipts.filter((r) => !r.deleted).flatMap((r) => r.items || []).filter((i) => i.materialId === m.id && i.qty > 0 && i.expiry).map((i) => i.expiry).sort()
  const hasReceiptLot = receipts.some((r) => (r.items || []).some((i) => i.materialId === m.id))
  return { ...m, expiry: expiries[0] || (hasReceiptLot ? '' : m.expiry || '') }
})

export const normalizeText = (value = '') => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').trim().toLocaleLowerCase('vi-VN')
const localDateTime = () => { const d = new Date(); const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 16) }
const makeInitialState = () => ({
  ...initial,
  notifications: MATERIALS.filter((m) => m.stock <= m.min).map((m, i) => ({
    id: `TB${String(i + 1).padStart(6, '0')}`,
    title: 'Tồn kho thấp',
    message: `${m.name}: còn ${m.stock} ${m.unit}, mức tối thiểu ${m.min} ${m.unit}.`,
    time: localDateTime(),
    type: 'warning',
    read: false,
  })),
})
const withNotice = (s, patch, title, message, type = 'success') => {
  const current = s.notifications || []
  const notice = { id: nextCode('TB', current, 6), title, message, time: localDateTime(), type, read: false }
  return { ...patch, notifications: [notice, ...current].slice(0, 100) }
}

export function StoreProvider({ children }) {
  const [state, setState] = useState(() => {
    const fresh = makeInitialState()
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return fresh
      const saved = JSON.parse(raw)
      const receipts = (saved.receipts ?? initial.receipts).map((r) => {
        const fixture = initial.receipts.find((x) => x.id === r.id)
        return { ...fixture, ...r, items: r.items ?? fixture?.items ?? [] }
      })
      return { ...fresh, ...saved, receipts, notifications: saved.notifications ?? fresh.notifications }
    } catch {
      return fresh
    }
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state))
  }, [state])

  const set = (patch) => setState((s) => ({ ...s, ...patch(s) }))

  const actions = {
    reset: () => setState(makeInitialState()),
    markNotificationRead: (id) => set((s) => ({ notifications: (s.notifications || []).map((n) => n.id === id ? { ...n, read: true } : n) })),
    markAllNotificationsRead: () => set((s) => ({ notifications: (s.notifications || []).map((n) => ({ ...n, read: true })) })),

    // ---------- Nguyên vật liệu ----------
    addMaterial: (m) => set((s) => withNotice(s, { materials: [...s.materials, { ...m, id: nextCode('NVL', s.materials, 4) }] }, 'Đã thêm nguyên vật liệu', m.name)),
    updateMaterial: (id, m) => set((s) => withNotice(s, { materials: s.materials.map((x) => (x.id === id ? { ...x, ...m } : x)) }, 'Đã cập nhật nguyên vật liệu', m.name)),
    deleteMaterial: (id) => set((s) => { const item = s.materials.find((x) => x.id === id); return withNotice(s, { materials: s.materials.map((x) => x.id === id ? { ...x, deleted: true } : x) }, 'Đã xóa nguyên vật liệu', item?.name || id) }),
    isMaterialUsed: (id) =>
      state.recipes.some((r) => r.items.some((i) => i.materialId === id)) ||
      state.slips.some((sl) => sl.status !== 'Đã hủy' && sl.items.some((i) => i.materialId === id)) ||
      state.receipts.some((r) => !r.deleted && (r.items || []).some((i) => i.materialId === id)),

    // ---------- Nhà cung cấp ----------
    addSupplier: (v) => set((s) => withNotice(s, { suppliers: [...s.suppliers, { ...v, id: nextCode('NCC', s.suppliers, 7) }] }, 'Đã thêm nhà cung cấp', v.name)),
    updateSupplier: (id, v) => set((s) => withNotice(s, { suppliers: s.suppliers.map((x) => (x.id === id ? { ...x, ...v } : x)) }, 'Đã cập nhật nhà cung cấp', v.name)),
    deleteSupplier: (id) => set((s) => { const item = s.suppliers.find((x) => x.id === id); return withNotice(s, { suppliers: s.suppliers.map((x) => x.id === id ? { ...x, deleted: true } : x) }, 'Đã xóa nhà cung cấp', item?.name || id) }),
    isSupplierUsed: (name) => state.materials.some((m) => !m.deleted && m.supplier === name) || state.receipts.some((r) => !r.deleted && r.supplier === name),

    // ---------- Điều chỉnh tồn kho ----------
    adjustStock: (materialId, actual, reason, note) => {
      const transactionId = nextCode('GD', state.transactions, 5)
      set((s) => {
        const m = s.materials.find((x) => x.id === materialId)
        const delta = +(actual - m.stock).toFixed(3)
        return withNotice(s, {
          materials: s.materials.map((x) => (x.id === materialId ? { ...x, stock: actual } : x)),
          transactions: [
          { id: transactionId, time: localDateTime(), materialId, type: 'Điều chỉnh', delta, reason, note, source: 'Điều chỉnh tồn kho' },
            ...s.transactions,
          ],
        }, 'Đã điều chỉnh tồn kho', `${m.name}: ${m.stock} → ${actual} ${m.unit}.`)
      })
      return transactionId
    },
    deleteTransaction: (id) => {
      const transactionId = nextCode('GD', state.transactions, 5)
      const t = state.transactions.find((x) => x.id === id)
      if (!t || t.reversalOf || t.deleted) return null
      const m = state.materials.find((x) => x.id === t.materialId)
      if (!m || m.stock - t.delta < -1e-9) return null
      set((s) => {
        const t = s.transactions.find((x) => x.id === id)
        if (!t || t.reversalOf || t.deleted) return {}
        const m = s.materials.find((x) => x.id === t.materialId)
        if (!m || m.stock - t.delta < -1e-9) return {}
        const inverse = { ...t, id: transactionId, time: localDateTime(), type: 'Điều chỉnh', delta: -t.delta, reason: `Đảo ngược giao dịch ${t.id}`, source: 'Đảo ngược', reversalOf: t.id }
        const transactions = s.transactions.map((x) => x.id === id ? { ...x, deleted: true } : x)
        return withNotice(s, { materials: s.materials.map((x) => x.id === t.materialId ? { ...x, stock: +Math.max(0, x.stock - t.delta).toFixed(3) } : x), transactions: [inverse, ...transactions], trash: [t, ...s.trash] }, 'Đã xóa giao dịch', `Giao dịch ${t.id} đã được đảo ngược.`)
      })
      return transactionId
    },
    restoreTransaction: (id) =>
      set((s) => {
        const t = s.trash.find((x) => x.id === id)
        if (!t) return {}
        const inverse = { ...t, id: nextCode('GD', s.transactions, 5), time: localDateTime(), type: 'Điều chỉnh', delta: -t.delta, reason: `Khôi phục giao dịch ${t.id}`, source: 'Khôi phục', reversalOf: t.id }
        const m = s.materials.find((x) => x.id === t.materialId)
        if (!m || m.stock + t.delta < -1e-9) return {}
        return withNotice(s, { materials: s.materials.map((x) => x.id === t.materialId ? { ...x, stock: +Math.max(0, x.stock + t.delta).toFixed(3) } : x), trash: s.trash.filter((x) => x.id !== id), transactions: [inverse, ...s.transactions.map((x) => x.id === id ? { ...x, deleted: false } : x)] }, 'Đã khôi phục giao dịch', `Giao dịch ${t.id} và tồn kho đã được khôi phục.`)
      }),
    canDeleteTransaction: (id) => { const t = state.transactions.find((x) => x.id === id); const m = state.materials.find((x) => x.id === t?.materialId); return !!t && !t.deleted && !t.reversalOf && !!m && m.stock - t.delta >= -1e-9 },
    canRestoreTransaction: (id) => { const t = state.trash.find((x) => x.id === id); const m = state.materials.find((x) => x.id === t?.materialId); return !!t && !!m && m.stock + t.delta >= -1e-9 },

    // ---------- Phiếu hao hụt ----------
    createSlip: ({ date, reason, note, items }) =>
      set((s) => {
        const id = nextCode('HH', s.slips, 5)
        let materials = s.materials
        let transactions = s.transactions
        items.forEach((it) => {
          materials = materials.map((m) => (m.id === it.materialId ? { ...m, stock: +(m.stock - it.qty).toFixed(3) } : m))
          transactions = [
            { id: nextCode('GD', transactions, 5), time: localDateTime(), materialId: it.materialId, type: 'Hao hụt', delta: -it.qty, source: id },
            ...transactions,
          ]
        })
        return withNotice(s, {
          materials,
          transactions,
          slips: [{ id, created: localDateTime().slice(0, 10), date, reason, note, status: 'Hoàn thành', items }, ...s.slips],
        }, 'Đã tạo phiếu hao hụt', `${id}: ${items.length} nguyên vật liệu.`)
      }),
    updateSlip: (id, { date, reason, note, items }) =>
      set((s) => {
        const old = s.slips.find((x) => x.id === id)
        if (!old || old.status !== 'Hoàn thành') return {}
        let materials = s.materials
        const before = new Map(old.items.map((it) => [it.materialId, it.qty]))
        const after = new Map(items.map((it) => [it.materialId, it.qty]))
        const deltas = new Map([...new Set([...before.keys(), ...after.keys()])].map((mid) => [mid, (before.get(mid) || 0) - (after.get(mid) || 0)]))
        for (const [mid, delta] of deltas) {
          const m = materials.find((x) => x.id === mid)
          if (!m || m.stock + delta < -1e-9) return {}
          materials = materials.map((x) => x.id === mid ? { ...x, stock: +Math.max(0, x.stock + delta).toFixed(3) } : x)
        }
        const transactions = makeTransactions([...deltas.entries()].filter(([, delta]) => delta), s.transactions, ([materialId, delta], txId) => ({ id: txId, time: localDateTime(), materialId, type: delta < 0 ? 'Hao hụt' : 'Điều chỉnh', delta, reason: 'Điều chỉnh phiếu hao hụt', source: id }))
        return withNotice(s, { materials, transactions: [...transactions, ...s.transactions], slips: s.slips.map((x) => (x.id === id ? { ...x, date, reason, note, items } : x)) }, 'Đã cập nhật phiếu hao hụt', `${id} đã được sửa và cập nhật tồn kho.`)
      }),
    cancelSlip: (id) =>
      set((s) => {
        const sl = s.slips.find((x) => x.id === id)
        if (!sl || sl.status !== 'Hoàn thành') return {}
        let materials = s.materials
        sl.items.forEach((it) => {
          materials = materials.map((m) => (m.id === it.materialId ? { ...m, stock: +(m.stock + it.qty).toFixed(3) } : m))
        })
        const transactions = makeTransactions(sl.items, s.transactions, (it, txId) => ({ id: txId, time: localDateTime(), materialId: it.materialId, type: 'Điều chỉnh', delta: it.qty, reason: 'Hoàn tồn do hủy phiếu hao hụt', source: id }))
        return withNotice(s, { materials, transactions: [...transactions, ...s.transactions], slips: s.slips.map((x) => (x.id === id ? { ...x, status: 'Đã hủy' } : x)) }, 'Đã hủy phiếu hao hụt', `${id}: số lượng đã được hoàn lại kho.`)
      }),

    // ---------- Công thức món ----------
    addRecipe: (r) => set((s) => withNotice(s, { recipes: [...s.recipes, { ...r, id: nextCode('MON', s.recipes, 4) }] }, 'Đã thêm công thức món', r.name)),
    updateRecipe: (id, r) => set((s) => withNotice(s, { recipes: s.recipes.map((x) => x.id === id ? { ...x, ...r } : x) }, 'Đã cập nhật công thức món', r.name)),
    deleteRecipe: (id) => set((s) => { const item = s.recipes.find((x) => x.id === id); return withNotice(s, { recipes: s.recipes.filter((x) => x.id !== id) }, 'Đã xóa công thức món', item?.name || id) }),

    addReceipt: (r) => set((s) => {
      let materials = s.materials
      r.items.forEach((it) => { materials = materials.map((m) => m.id === it.materialId ? { ...m, stock: +(m.stock + it.qty).toFixed(3) } : m) })
      const receipt = { ...r, id: nextCode('PN', s.receipts, 5), total: r.items.reduce((a, i) => a + i.qty * i.unitPrice, 0), status: 'Hoàn thành' }
      const transactions = makeTransactions(r.items, s.transactions, (it, txId) => ({ id: txId, time: localDateTime(), materialId: it.materialId, type: 'Nhập kho', delta: it.qty, source: receipt.id }))
      const receipts = [receipt, ...s.receipts]
      return withNotice(s, { materials: recalculateExpiry(materials, receipts), receipts, transactions: [...transactions, ...s.transactions] }, 'Đã tạo phiếu nhập kho', `${receipt.id}: ${r.supplier}, tổng ${receipt.total.toLocaleString('vi-VN')} VNĐ.`)
    }),
    updateReceipt: (id, r) => set((s) => {
      const old = s.receipts.find((x) => x.id === id)
      if (!old || old.deleted) return {}
      let materials = s.materials
      const before = new Map((old.items || []).map((i) => [i.materialId, i.qty]))
      const after = new Map(r.items.map((i) => [i.materialId, i.qty]))
      const deltas = new Map([...new Set([...before.keys(), ...after.keys()])].map((mid) => [mid, (after.get(mid) || 0) - (before.get(mid) || 0)]))
      for (const [mid, delta] of deltas) { const m = materials.find((x) => x.id === mid); if (!m || m.stock + delta < -1e-9) return {}; materials = materials.map((x) => x.id === mid ? { ...x, stock: +Math.max(0, x.stock + delta).toFixed(3) } : x) }
      const transactions = makeTransactions([...deltas.entries()].filter(([, delta]) => delta), s.transactions, ([materialId, delta], txId) => ({ id: txId, time: localDateTime(), materialId, type: delta > 0 ? 'Nhập kho' : 'Điều chỉnh', delta, reason: 'Điều chỉnh phiếu nhập kho', source: id }))
      const receipts = s.receipts.map((x) => x.id === id ? { ...x, ...r, total: r.items.reduce((a, i) => a + i.qty * i.unitPrice, 0) } : x)
      return withNotice(s, { materials: recalculateExpiry(materials, receipts), receipts, transactions: [...transactions, ...s.transactions] }, 'Đã cập nhật phiếu nhập kho', `${id} đã được lưu.`)
    }),
    deleteReceipt: (id) => set((s) => {
      const receipt = s.receipts.find((x) => x.id === id)
      if (!receipt || receipt.deleted) return {}
      if ((receipt.items || []).some((it) => (s.materials.find((m) => m.id === it.materialId)?.stock ?? 0) < it.qty)) return {}
      let materials = s.materials
      ;(receipt.items || []).forEach((it) => { materials = materials.map((m) => m.id === it.materialId ? { ...m, stock: +(m.stock - it.qty).toFixed(3) } : m) })
      const transactions = makeTransactions(receipt.items || [], s.transactions, (it, txId) => ({ id: txId, time: localDateTime(), materialId: it.materialId, type: 'Điều chỉnh', delta: -it.qty, reason: 'Đảo nhập do xóa mềm phiếu nhập', source: id }))
      const receipts = s.receipts.map((x) => x.id === id ? { ...x, deleted: true } : x)
      return withNotice(s, { materials: recalculateExpiry(materials, receipts), receipts, transactions: [...transactions, ...s.transactions] }, 'Đã xóa phiếu nhập kho', `${id}: tồn kho đã được điều chỉnh lại.`)
    }),
  }

  return <Ctx.Provider value={{ ...state, ...actions }}>{children}</Ctx.Provider>
}
