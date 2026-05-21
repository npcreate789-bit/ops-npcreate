import type { CompanyPaymentSettings } from './companyPaymentSettings'
import { getCachedCompanyPaymentSettings } from './companyPaymentSettings'

export function formatThaiBaht(amount: number): string {
  return `${amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`
}

export function buildPaymentInstructionsMessage(
  input: {
    brandName: string
    quotationNumber: string
    total: number
    itemsSummary?: string | null
    contractMonths?: number | null
  },
  settings: CompanyPaymentSettings = getCachedCompanyPaymentSettings(),
): string {
  const lines = [
    `สวัสดีครับ/ค่ะ — ทีม NP Create`,
    `ขอบคุณที่ยอมรับใบเสนอราคา ${input.quotationNumber} (${input.brandName})`,
    '',
    'รายละเอียดการชำระเงิน',
    `ธนาคาร: ${settings.bank_name}`,
    `เลขบัญชี: ${settings.account_number}`,
    `ชื่อบัญชี: ${settings.account_name}`,
    `ยอดโอน: ${formatThaiBaht(input.total)}`,
    `อ้างอิง: ${input.quotationNumber}`,
  ]

  if (input.itemsSummary?.trim()) {
    lines.push('', 'แพ็กเกจ/รายการ:', input.itemsSummary.trim())
  }
  if (input.contractMonths != null && input.contractMonths > 0) {
    lines.push(`ระยะสัญญา: ${input.contractMonths} เดือน`)
  }

  lines.push(
    '',
    'กรุณาโอนตามยอดด้านบน แล้วแจ้งสลิปกลับทางแชทนี้',
    'หากมีคำถาม ติดต่อทีมงานได้เลยครับ/ค่ะ',
  )

  return lines.join('\n')
}
