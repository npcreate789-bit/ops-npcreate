/**
 * Flow /contact — ออกแบบให้ชัดเจน
 *
 * เป้าหมาย: ข้อมูลจากฟอร์มไปถึงทีม NP Create ทางแชท LINE @npcreate
 *
 * ชั้นที่ 1 (บังคับ): บันทึก Lead ใน CRM — submit_public_inquiry
 * ชั้นที่ 2 (บังคับ): เปิดแชท LINE พร้อมข้อความ — ลูกค้ากดส่ง → ทีมเห็นใน OA inbox
 * ชั้นที่ 3 (เสริม): Push ข้อความยืนยันจาก OA → ลูกค้า (ถ้า Messaging API พร้อม)
 *
 * หมายเหตุ: Push จาก OA ไปลูกค้า ≠ ข้อความเข้า inbox ทีม
 * ข้อความเข้า inbox ต้องมาจากลูกค้ากดส่งในแชทเท่านั้น
 */
import { submitPublicInquiry, type PublicInquiryInput } from './api/submitInquiry'
import { deliverContactLineConfirmation } from './api/contactLineHandoffApi'
import { buildContactLineInquiryMessage, contactLineHandoffUrl } from './contactLineHandoff'

export interface ContactSubmitInput {
  contactName: string
  phone: string
  lineUserId: string
  services: string[]
  serviceLabels: string[]
  companyWebsite?: string
}

export type ContactLineDelivery =
  | 'user_send_required'
  | 'confirmation_pushed'

export interface ContactSubmitResult {
  leadId: string
  lineMessage: string
  chatUrl: string
  lineDelivery: ContactLineDelivery
}

export async function runContactSubmit(input: ContactSubmitInput): Promise<ContactSubmitResult> {
  const name = input.contactName.trim()
  const phone = input.phone.trim()
  const lineUserId = input.lineUserId.trim()

  const lineMessage = buildContactLineInquiryMessage({
    contactName: name,
    phone,
    serviceLabels: input.serviceLabels,
  })

  const chatUrl = contactLineHandoffUrl(lineMessage)

  const inquiry: PublicInquiryInput = {
    brand_name: name,
    preferred_contact_channel: 'line',
    contact_name: name,
    phone,
    line_user_id: lineUserId,
    services_interested: input.services,
    company_website: input.companyWebsite,
  }

  const leadId = await submitPublicInquiry(inquiry)

  const confirmation = await deliverContactLineConfirmation({
    leadId,
    lineUserId,
    inquiryText: lineMessage,
  })

  return {
    leadId,
    lineMessage,
    chatUrl,
    lineDelivery: confirmation.pushed ? 'confirmation_pushed' : 'user_send_required',
  }
}
