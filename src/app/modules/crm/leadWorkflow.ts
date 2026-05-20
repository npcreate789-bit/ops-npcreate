import { resolveLineMessagingRecipientId } from '../../../shared/line/lineUserIdResolution'
import type { Lead, LeadStatus } from './types'

const EARLY_SALES: LeadStatus[] = ['interested', 'scheduled', 'follow_up']

export function isLineMessagingReady(
  lead: Pick<Lead, 'line_user_id' | 'line_oa_chat_user_id'>,
): boolean {
  return Boolean(resolveLineMessagingRecipientId(lead))
}

export function hasLeadBrief(lead: Pick<Lead, 'pain_points' | 'services_interested'>): boolean {
  return Boolean(lead.pain_points?.trim() || (lead.services_interested?.length ?? 0) > 0)
}

/**
 * ปรับสถานะอัตโนมัติหลังบันทึก — สอดคล้อง pipeline: เชื่อม LINE → นัดคุย → ส่งใบเสนอราคา
 * ไม่ทับสถานะที่ผู้ใช้เลือกขั้นสูงกว่า (quotation_sent ขึ้นไป / ไม่สนใจ)
 */
export function mergeAutoLeadStatus(
  lead: Lead,
  previous: Lead | null,
  formStatus: LeadStatus,
): LeadStatus {
  if (
    formStatus === 'quotation_sent' ||
    formStatus === 'awaiting_payment' ||
    formStatus === 'won' ||
    formStatus === 'not_interested'
  ) {
    return formStatus
  }

  const hadOa = Boolean(previous?.line_oa_chat_user_id?.trim())
  const hasOa = Boolean(lead.line_oa_chat_user_id?.trim())

  if (hasOa && !hadOa && (formStatus === 'interested' || formStatus === 'follow_up')) {
    return 'scheduled'
  }

  const lineReady = isLineMessagingReady(lead)
  const brief = hasLeadBrief(lead)

  if (
    lineReady &&
    brief &&
    formStatus === 'scheduled' &&
    lead.preferred_contact_channel === 'line'
  ) {
    return 'quotation_sent'
  }

  return formStatus
}

export function isEarlySalesStage(status: LeadStatus): boolean {
  return EARLY_SALES.includes(status)
}
