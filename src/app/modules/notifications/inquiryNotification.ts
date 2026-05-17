import type { UserNotification } from './types'

export const INQUIRY_NOTIFICATION_PREFIX = 'inquiry-new-'

export function isInquiryNotification(dedupeKey: string): boolean {
  return dedupeKey.startsWith(INQUIRY_NOTIFICATION_PREFIX)
}

export function inquiryNotificationDedupeKey(leadId: string): string {
  return `${INQUIRY_NOTIFICATION_PREFIX}${leadId}`
}

export function buildInquiryNotificationInput(inquiry: {
  id: string
  brand_name: string
  contact_name?: string | null
  owner_id: string
}) {
  return {
    dedupe_key: inquiryNotificationDedupeKey(inquiry.id),
    title: `คำขอติดต่อ: ${inquiry.brand_name}`,
    body: inquiry.contact_name?.trim() || 'ยังไม่ระบุผู้ติดต่อ',
    link: `/app/crm/${inquiry.id}`,
    severity: 'info' as const,
    owner_id: inquiry.owner_id,
  }
}

export type { UserNotification }
