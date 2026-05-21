export interface PaymentLineNotifyResult {
  ok: boolean
  skipped?: string
  pushed?: boolean
  error?: string
}

/** ข้อความสถานะหลังยืนยันชำระ / ปฏิเสธสลิป + แจ้ง LINE */
export function formatPaymentLineNotifyFeedback(
  actionLabel: string,
  result: PaymentLineNotifyResult | null,
): string {
  if (!result) {
    return `${actionLabel}แล้ว`
  }
  if (result.error) {
    return `${actionLabel}แล้ว — แจ้ง LINE ไม่สำเร็จ (${result.error})`
  }
  const skip = result.skipped
  if (skip === 'disabled_in_settings') {
    return `${actionLabel}แล้ว — ไม่ส่ง LINE (ปิดใน Settings)`
  }
  if (skip === 'no_line_recipient' || skip === 'push_failed') {
    return `${actionLabel}แล้ว — แจ้งลูกค้าทางช่องทางอื่น (ไม่มี LINE / push ไม่สำเร็จ)`
  }
  if (skip === 'review_pending_already_sent' || skip === 'payment_confirmed_already_sent') {
    return `${actionLabel}แล้ว — แจ้ง LINE แล้ว`
  }
  if (result.pushed || result.ok) {
    return `${actionLabel}แล้ว — แจ้งลูกค้าทาง LINE แล้ว`
  }
  return `${actionLabel}แล้ว`
}
