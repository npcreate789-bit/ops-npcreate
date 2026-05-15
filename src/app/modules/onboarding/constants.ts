import type { ChecklistValue } from './types'

export const CHECKLIST_ITEMS: {
  key: string
  label: string
  options: { value: ChecklistValue; label: string }[]
}[] = [
  {
    key: 'shop_link',
    label: 'ได้ลิงก์ร้านแล้ว',
    options: [
      { value: 'pending', label: 'รอ' },
      { value: 'done', label: 'ได้แล้ว' },
    ],
  },
  {
    key: 'product_link',
    label: 'ได้ลิงก์สินค้าแล้ว',
    options: [
      { value: 'pending', label: 'รอ' },
      { value: 'done', label: 'ได้แล้ว' },
    ],
  },
  {
    key: 'pricing',
    label: 'ได้ราคา / โปรแล้ว',
    options: [
      { value: 'pending', label: 'รอ' },
      { value: 'done', label: 'ได้แล้ว' },
    ],
  },
  {
    key: 'ad_budget',
    label: 'ได้งบแอดแล้ว',
    options: [
      { value: 'pending', label: 'รอ' },
      { value: 'done', label: 'ได้แล้ว' },
    ],
  },
  {
    key: 'system_access',
    label: 'ได้สิทธิ์ระบบแล้ว',
    options: [
      { value: 'pending', label: 'รอ' },
      { value: 'done', label: 'ได้แล้ว' },
    ],
  },
  {
    key: 'clips_ready',
    label: 'มีคลิปพร้อมยิงแล้ว',
    options: [
      { value: 'no', label: 'ไม่มี' },
      { value: 'yes', label: 'มี' },
    ],
  },
  {
    key: 'product_page',
    label: 'หน้าสินค้าพร้อมแล้ว',
    options: [
      { value: 'needs_fix', label: 'ต้องแก้' },
      { value: 'ready', label: 'พร้อม' },
    ],
  },
  {
    key: 'commission',
    label: 'คอมมิชชั่นพร้อมแล้ว',
    options: [
      { value: 'needs_fix', label: 'ต้องแก้' },
      { value: 'ready', label: 'พร้อม' },
    ],
  },
]

export function isChecklistItemComplete(key: string, status: ChecklistValue): boolean {
  if (['shop_link', 'product_link', 'pricing', 'ad_budget', 'system_access'].includes(key)) {
    return status === 'done'
  }
  if (key === 'clips_ready') return status === 'yes'
  if (['product_page', 'commission'].includes(key)) return status === 'ready'
  return false
}

export function calcProgress(items: { item_key: string; status: ChecklistValue }[]): number {
  const done = CHECKLIST_ITEMS.filter((def) => {
    const row = items.find((i) => i.item_key === def.key)
    return row ? isChecklistItemComplete(def.key, row.status) : false
  }).length
  return Math.round((done / CHECKLIST_ITEMS.length) * 100)
}

export function computeReadyForAdsFromChecklist(
  items: { item_key: string; status: ChecklistValue }[],
): boolean {
  return CHECKLIST_ITEMS.every((def) => {
    const row = items.find((i) => i.item_key === def.key)
    return row ? isChecklistItemComplete(def.key, row.status) : false
  })
}
