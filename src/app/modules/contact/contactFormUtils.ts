import type { PreferredContactChannel } from '../../../shared/crm/preferredContactChannel'
import {
  isFacebookLoginConfigured,
  isLineOAuthConfigured,
} from '../../../shared/contact/channelConnectConfig'

export interface ContactFormFields {
  brandName: string
  preferredChannel: PreferredContactChannel | ''
  lineId: string
  lineUserId: string
  facebook: string
  facebookPsid: string
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
  if (m.includes('line connection required') || m.includes('line_id is required')) {
    return 'กรุณาเชื่อมต่อ LINE หรือระบุ LINE ID เพื่อให้ทีมติดต่อกลับ'
  }
  return message
}

export function validateContactForm(fields: ContactFormFields): {
  brand?: string
  preferredChannel?: string
  lineId?: string
  channelConnect?: string
} {
  const errors: {
    brand?: string
    preferredChannel?: string
    lineId?: string
    channelConnect?: string
  } = {}
  if (!fields.brandName.trim()) {
    errors.brand = 'กรุณาระบุชื่อแบรนด์'
  } else if (fields.brandName.trim().length < 2) {
    errors.brand = 'ชื่อแบรนด์สั้นเกินไป'
  }
  if (!fields.preferredChannel) {
    errors.preferredChannel = 'กรุณาเลือกช่องทางติดต่อกลับ'
  }
  if (fields.preferredChannel === 'line') {
    const hasOAuth = isLineOAuthConfigured()
    const connected = Boolean(fields.lineUserId.trim())
    const manualId = Boolean(fields.lineId.trim())
    if (hasOAuth && !connected && !manualId) {
      errors.channelConnect = 'กรุณากดเชื่อมต่อ LINE ก่อนส่งข้อมูล'
    } else if (!hasOAuth && !manualId) {
      errors.lineId = 'กรุณาระบุ LINE ID เพื่อให้ทีมติดต่อกลับ'
    }
  }
  if (fields.preferredChannel === 'facebook') {
    const hasLogin = isFacebookLoginConfigured()
    const connected = Boolean(fields.facebookPsid.trim())
    if (hasLogin && !connected) {
      errors.channelConnect = 'กรุณากดเชื่อมต่อ Facebook ก่อนส่งข้อมูล'
    }
  }
  return errors
}
