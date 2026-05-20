/** Lead CRM ที่กำลังเปิดแชท LINE อยู่ — ใช้กับ toast / เสียงแจ้งเตือน */

let activeLeadId: string | null = null

export function setActiveLeadLineChatFocus(leadId: string | null) {
  activeLeadId = leadId?.trim() || null
}

export function clearActiveLeadLineChatFocus() {
  activeLeadId = null
}

export function getActiveLeadLineChatLeadId(): string | null {
  return activeLeadId
}

export function isActiveLeadLineChat(leadId: string): boolean {
  return Boolean(activeLeadId && activeLeadId === leadId.trim())
}

export function parseLeadCrmNotificationLeadId(link: string | null | undefined): string | null {
  if (!link?.trim()) return null
  const path = link.trim()
  const match = path.match(/^\/app\/crm\/([^/?#]+)/)
  return match?.[1] ?? null
}

export function isActiveLeadLineChatNotificationLink(link: string | null | undefined): boolean {
  const leadId = parseLeadCrmNotificationLeadId(link)
  return leadId != null && isActiveLeadLineChat(leadId)
}
