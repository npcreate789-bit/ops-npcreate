import type { UserNotification } from './types'

export const LEAD_NOTIFICATION_PREFIX = 'lead-new-'

export function isLeadNotification(dedupeKey: string): boolean {
  return dedupeKey.startsWith(LEAD_NOTIFICATION_PREFIX)
}

export function leadNotificationDedupeKey(leadId: string): string {
  return `${LEAD_NOTIFICATION_PREFIX}${leadId}`
}

export function buildLeadNotificationInput(lead: {
  id: string
  brand_name: string
  contact_name?: string | null
  owner_id: string
}) {
  return {
    dedupe_key: leadNotificationDedupeKey(lead.id),
    title: `Lead ใหม่: ${lead.brand_name}`,
    body: lead.contact_name?.trim() || 'ยังไม่ระบุผู้ติดต่อ',
    link: `/app/crm/${lead.id}`,
    severity: 'info' as const,
    owner_id: lead.owner_id,
  }
}

export function mapNotificationRow(row: Record<string, unknown>): UserNotification {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    dedupe_key: row.dedupe_key as string,
    title: row.title as string,
    body: row.body as string,
    link: (row.link as string | null) ?? null,
    severity: row.severity as UserNotification['severity'],
    read_at: (row.read_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

/** แจ้งเตือน Lead ในเครื่อง (โหมด dev) */
export const NOTIFICATION_PUSH_EVENT = 'npcreate-notification-push'
