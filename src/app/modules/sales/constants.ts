import type { QuotationStatus } from './types'

export const QUOTATION_STATUS_OPTIONS: { value: QuotationStatus; label: string }[] = [
  { value: 'draft', label: 'แบบร่าง' },
  { value: 'sent', label: 'ส่งแล้ว' },
  { value: 'awaiting_payment', label: 'รอชำระเงิน' },
  { value: 'paid', label: 'ชำระแล้ว' },
  { value: 'cancelled', label: 'ยกเลิก' },
]

export const PIPELINE_STAGES: { status: QuotationStatus; label: string }[] = [
  { status: 'draft', label: 'แบบร่าง' },
  { status: 'sent', label: 'ส่งใบเสนอราคา' },
  { status: 'awaiting_payment', label: 'รอชำระ' },
  { status: 'paid', label: 'ปิดการขาย' },
]

export const DEFAULT_TERMS =
  'รับดูแลขั้นต่ำ 3 เดือน มัดจำงวแรกก่อนเริ่มงาน ราคายังไม่รวมค่าแอด'

export function quotationStatusLabel(status: QuotationStatus): string {
  return QUOTATION_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
}

export function calcQuotationTotals(
  items: { quantity: number; unit_price: number }[],
  discount: number,
  vatRate: number,
) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const afterDiscount = Math.max(0, subtotal - discount)
  const vat_amount = Math.round(afterDiscount * (vatRate / 100) * 100) / 100
  const total = Math.round((afterDiscount + vat_amount) * 100) / 100
  return { subtotal, vat_amount, total }
}
