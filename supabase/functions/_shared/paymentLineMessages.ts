export type PaymentLineEvent =
  | 'slip_received'
  | 'review_pending'
  | 'payment_confirmed'
  | 'slip_rejected'

export function formatThaiBaht(amount: number): string {
  return (
    amount.toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' บาท'
  )
}

export function publicQuotationUrl(publicToken: string | null): string | null {
  if (!publicToken?.trim()) return null
  const origin =
    Deno.env.get('VITE_APP_URL')?.trim() ||
    Deno.env.get('CONTACT_OAUTH_RETURN_ORIGIN')?.trim() ||
    'https://app.npcreate.co.th'
  return `${origin.replace(/\/$/, '')}/q/${publicToken.trim()}`
}

export function buildPaymentLineMessage(
  event: PaymentLineEvent,
  input: {
    brandName: string
    quotationNumber: string | null
    total: number
    publicUrl: string | null
    rejectNote?: string | null
  },
): string {
  const ref = input.quotationNumber ? ` (${input.quotationNumber})` : ''
  const brand = input.brandName.trim() || 'ลูกค้า'

  switch (event) {
    case 'slip_received':
      return [
        'สวัสดีครับ/ค่ะ — ทีม NP Create',
        '',
        `ได้รับสลิปชำระเงิน${ref} สำหรับ ${brand} แล้ว`,
        'ระบบกำลังตรวจสอบอัตโนมัติ — โดยทั่วไปใช้เวลาไม่เกิน 2 นาที',
        input.publicUrl ? `ติดตามสถานะ: ${input.publicUrl}` : '',
      ]
        .filter(Boolean)
        .join('\n')

    case 'review_pending':
      return [
        'สวัสดีครับ/ค่ะ — ทีม NP Create',
        '',
        `ได้รับสลิปชำระเงิน${ref} สำหรับ ${brand} แล้ว`,
        'ทีมงานกำลังยืนยันการชำระเงิน — จะแจ้งอีกครั้งเมื่อเสร็จสิ้น',
        input.publicUrl ? `ติดตามสถานะ: ${input.publicUrl}` : '',
      ]
        .filter(Boolean)
        .join('\n')

    case 'payment_confirmed':
      return [
        'สวัสดีครับ/ค่ะ — ทีม NP Create',
        '',
        `ยืนยันรับชำระเงิน${ref} สำหรับ ${brand} แล้ว`,
        `ยอด ${formatThaiBaht(input.total)}`,
        '',
        'ขั้นถัดไป: ทีมจะติดต่อเรื่องรับบรีฟและเริ่มงานตามแพ็กเกจ',
        'หากมีคำถาม ตอบกลับทางแชทนี้ได้เลยครับ/ค่ะ',
      ].join('\n')

    case 'slip_rejected': {
      const lines = [
        'สวัสดีครับ/ค่ะ — ทีม NP Create',
        '',
        `สลิปชำระเงิน${ref} สำหรับ ${brand}`,
        'ยังไม่ผ่านการตรวจสอบ',
      ]
      if (input.rejectNote?.trim()) {
        lines.push('', `หมายเหตุ: ${input.rejectNote.trim()}`)
      }
      if (input.publicUrl) {
        lines.push('', 'กรุณาอัปโหลดสลิปใหม่ที่ลิงก์ใบเสนอราคา:', input.publicUrl)
      } else {
        lines.push('', 'กรุณาส่งสลิปใหม่ทางแชทนี้')
      }
      return lines.join('\n')
    }
  }
}
