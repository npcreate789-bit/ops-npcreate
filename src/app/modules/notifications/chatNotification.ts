export const CHAT_NOTIFICATION_PREFIX = 'chat-msg-'

export function isChatNotification(dedupeKey: string): boolean {
  return dedupeKey.startsWith(CHAT_NOTIFICATION_PREFIX)
}

export function parseChatNotificationLink(
  link: string | null | undefined,
): { projectId: string; channel: string } | null {
  if (!link) return null
  try {
    const url = link.startsWith('http')
      ? new URL(link)
      : new URL(link, window.location.origin)
    const projectId = url.searchParams.get('project')
    if (!projectId) return null
    return { projectId, channel: url.searchParams.get('channel') ?? 'client' }
  } catch {
    return null
  }
}
