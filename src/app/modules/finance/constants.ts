import type { PaymentStatus } from './types'

export const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: 'pending', label: 'รอชำระ' },
  { value: 'paid', label: 'ชำระแล้ว' },
  { value: 'overdue', label: 'เกินกำหนด' },
  { value: 'cancelled', label: 'ยกเลิก' },
]

export const SERVICE_TYPES = [
  { value: 'gmv_max', label: 'ดูแล GMV Max' },
  { value: 'gmv_course', label: 'คอร์ส GMV Max' },
  { value: 'tiktok_one', label: 'TikTok One / Creator' },
  { value: 'content', label: 'ผลิตคอนเทนต์' },
  { value: 'live', label: 'Live Commerce' },
  { value: 'consulting', label: 'Private Consulting' },
  { value: 'software', label: 'Software / License' },
  { value: 'other', label: 'บริการอื่น ๆ' },
]

export function paymentStatusLabel(status: PaymentStatus): string {
  return PAYMENT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
}

export function serviceTypeLabel(code: string): string {
  return SERVICE_TYPES.find((s) => s.value === code)?.label ?? code
}

export function calcPaymentTotals(amount: number, vatRate = 7) {
  const vat_amount = Math.round(amount * (vatRate / 100) * 100) / 100
  const total_amount = Math.round((amount + vat_amount) * 100) / 100
  return { vat_amount, total_amount }
}
