import type { PreferredContactChannel } from '../../../shared/crm/preferredContactChannel'

export interface ContactFormFields {
  brandName: string
  preferredChannel: PreferredContactChannel | ''
  lineId: string
  facebook: string
}

/** แปลงข้อความ error จาก API ให้ผู้ใช้เข้าใจ */
export function friendlyContactSubmitError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('submit_public_inquiry') || m.includes('could not find the function')) {
    return 'ระบบยังไม่พร้อมรับแบบฟอร์มออนไลน์ชั่วคราว กรุณาติดต่อทีม NP Create ทาง LINE หรือโทรศัพท์'
  }
  if (m.includes('network') || m.includes('failed to fetch')) {
    return 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่'
  }
  if (m.includes('leads_owner_id_fkey') || m.includes('no lead owner')) {
    return 'ระบบยังไม่ได้ตั้งผู้รับ Lead — กรุณาติดต่อทีม NP Create ทาง LINE หรือโทรศัพท์'
  }
  if (m.includes('rate_limit_duplicate')) {
    return 'ส่งข้อมูลชุดเดิมไปแล้วเมื่อสักครู่ กรุณารอสักครู่ก่อนลองใหม่'
  }
  if (m.includes('rate_limit')) {
    return 'ส่งข้อมูลบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่'
  }
  if (m.includes('too long') || m.includes('too many services')) {
    return 'ข้อมูลยาวเกินไป กรุณาตรวจสอบแล้วลองใหม่'
  }
  if (m.includes('preferred_contact_channel')) {
    return 'กรุณาเลือกช่องทางติดต่อกลับ (LINE หรือ Facebook)'
  }
  if (m.includes('line_id is required')) {
    return 'กรุณาระบุ LINE ID เมื่อเลือกติดต่อทาง LINE'
  }
  return message
}

export function validateContactForm(fields: ContactFormFields): {
  brand?: string
  preferredChannel?: string
  lineId?: string
} {
  const errors: { brand?: string; preferredChannel?: string; lineId?: string } = {}
  if (!fields.brandName.trim()) {
    errors.brand = 'กรุณาระบุชื่อแบรนด์'
  } else if (fields.brandName.trim().length < 2) {
    errors.brand = 'ชื่อแบรนด์สั้นเกินไป'
  }
  if (!fields.preferredChannel) {
    errors.preferredChannel = 'กรุณาเลือกช่องทางติดต่อกลับ'
  }
  if (fields.preferredChannel === 'line' && !fields.lineId.trim()) {
    errors.lineId = 'กรุณาระบุ LINE ID เพื่อให้ทีมติดต่อกลับ'
  }
  return errors
}
