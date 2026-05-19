export const LEAD_LINE_MESSAGE_PREFIX = 'lead-line-msg-'

export function isLeadLineMessageNotification(dedupeKey: string): boolean {
  return dedupeKey.startsWith(LEAD_LINE_MESSAGE_PREFIX)
}

export function leadLineMessageNotificationDedupeKey(leadId: string): string {
  return `${LEAD_LINE_MESSAGE_PREFIX}${leadId}`
}
