import type { PublicQuotation } from './types'

/** แสดงข้อมูลชำระเงินบนหน้าลิงก์สาธารณะ — หลังทีมส่งบัญชีแล้ว (awaiting_payment) */
export function showPublicPaymentInstructions(status: PublicQuotation['status']): boolean {
  return status === 'awaiting_payment'
}

export function showPublicAcceptedPendingInstructions(
  status: PublicQuotation['status'],
): boolean {
  return status === 'accepted'
}

export function showPublicPaidConfirmation(status: PublicQuotation['status']): boolean {
  return status === 'paid'
}

export function formatPublicItemsSummary(
  items: PublicQuotation['items'],
): string | null {
  if (!items.length) return null
  return items
    .map(
      (i) =>
        `• ${i.description} × ${i.quantity} = ${i.line_total.toLocaleString('th-TH')} บาท`,
    )
    .join('\n')
}
