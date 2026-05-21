import generatePayload from 'promptpay-qr'
import type { CompanyPaymentSettings } from './companyPaymentSettings'
import { getCachedCompanyPaymentSettings } from './companyPaymentSettings'

/** สร้าง payload PromptPay สำหรับสแกนจ่ายตามยอด */
export function buildPromptPayPayload(
  amount: number,
  settings: CompanyPaymentSettings = getCachedCompanyPaymentSettings(),
): string {
  const safe = Math.max(0, Math.round(amount * 100) / 100)
  return generatePayload(settings.promptpay_id, { amount: safe })
}

export function promptPayQrImageUrl(payload: string, size = 280): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=12&data=${encodeURIComponent(payload)}`
}
