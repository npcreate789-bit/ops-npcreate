import { isLocalDevHost } from '../../../shared/config/appUrl'
import { isLineOAuthConfigured } from '../../../shared/contact/channelConnectConfig'

export interface ContactFormFields {
  contactName: string
  phone: string
  services: string[]
  lineUserId: string
}

export function friendlyContactSubmitError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('submit_public_inquiry') || m.includes('could not find the function')) {
    return 'ระบบยังไม่พร้อมรับแบบฟอร์มออนไลน์ชั่วคราว กรุณาติดต่อทีม NP Create ทาง LINE'
  }
  if (m.includes('network') || m.includes('failed to fetch')) {
    return 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่'
  }
  if (m.includes('leads_owner_id_fkey') || m.includes('no lead owner')) {
    return 'ระบบยังไม่ได้ตั้งผู้รับ Lead — กรุณาติดต่อทีม NP Create ทาง LINE'
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
  if (m.includes('line connection required') || m.includes('line_id is required')) {
    return 'กรุณาเชื่อมต่อ LINE Login ก่อน'
  }
  return message
}

export function validateContactDetails(fields: ContactFormFields): {
  contactName?: string
  phone?: string
} {
  const errors: { contactName?: string; phone?: string } = {}
  if (!fields.contactName.trim()) {
    errors.contactName = 'กรุณาระบุชื่อผู้ติดต่อ'
  }
  if (!fields.phone.trim()) {
    errors.phone = 'กรุณาระบุเบอร์โทร'
  }
  return errors
}

export function validateLineLogin(lineUserId: string): { channelConnect?: string } {
  if (isLineOAuthConfigured() && !lineUserId.trim() && !isLocalDevHost()) {
    return { channelConnect: 'กรุณาเชื่อมต่อ LINE Login ก่อน (ขั้นที่ 1)' }
  }
  if (!isLineOAuthConfigured() && !isLocalDevHost()) {
    return { channelConnect: 'LINE Login ยังไม่พร้อม' }
  }
  return {}
}

export function isContactLineLoginReady(lineUserId: string): boolean {
  if (!isLineOAuthConfigured()) return isLocalDevHost()
  return Boolean(lineUserId.trim())
}
