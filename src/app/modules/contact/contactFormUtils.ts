import { isLocalDevHost } from '../../../shared/config/appUrl'
import { isLineOAuthConfigured } from '../../../shared/contact/channelConnectConfig'

export interface ContactFormFields {
  contactName: string
  phone: string
  businessType: string
  services: string[]
  lineUserId: string
  lineOaStepDone: boolean
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
    return 'กรุณาเชื่อมต่อ LINE ก่อนส่งข้อมูล'
  }
  return message
}

export function validateContactForm(fields: ContactFormFields): {
  contactName?: string
  phone?: string
  channelConnect?: string
} {
  const errors: {
    contactName?: string
    phone?: string
    channelConnect?: string
  } = {}

  if (!fields.lineOaStepDone) {
    errors.channelConnect = 'ทักข้อความ "สนใจบริการ" ที่ @npcreate ก่อน (ขั้นที่ 1)'
  } else if (
    isLineOAuthConfigured() &&
    !fields.lineUserId.trim() &&
    !isLocalDevHost()
  ) {
    errors.channelConnect = 'เชื่อมต่อ LINE Login ก่อนส่งข้อมูล (ขั้นที่ 2)'
  }

  if (!fields.contactName.trim()) {
    errors.contactName = 'กรุณาระบุชื่อผู้ติดต่อ'
  }
  if (!fields.phone.trim()) {
    errors.phone = 'กรุณาระบุเบอร์โทร'
  }

  return errors
}

export function isContactLineReady(
  fields: Pick<ContactFormFields, 'lineOaStepDone' | 'lineUserId'>,
): boolean {
  if (!fields.lineOaStepDone) return false
  if (!isLineOAuthConfigured()) return isLocalDevHost()
  return Boolean(fields.lineUserId.trim())
}
