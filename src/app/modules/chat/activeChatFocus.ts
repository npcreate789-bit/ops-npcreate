import { parseChatChannel } from './constants/channels'

/** ห้องแชทที่ผู้ใช้กำลังเปิดอยู่ — ไม่เล่นเสียงซ้ำ */
let activeRoomId: string | null = null
let activeProjectId: string | null = null
let activeChannel: string | null = null

export function setActiveChatFocus(
  roomId: string | null,
  projectId?: string | null,
  channel?: string | null,
) {
  activeRoomId = roomId
  activeProjectId = projectId ?? null
  activeChannel = channel != null ? parseChatChannel(channel) : null
}

export function clearActiveChatFocus() {
  activeRoomId = null
  activeProjectId = null
  activeChannel = null
}

export function getActiveChatRoomId(): string | null {
  return activeRoomId
}

export function isActiveChatRoom(roomId: string): boolean {
  return Boolean(activeRoomId && activeRoomId === roomId)
}

export function isActiveChatNotificationLink(link: string | null | undefined): boolean {
  if (!activeProjectId || !link) return false
  try {
    const url = link.startsWith('http')
      ? new URL(link)
      : new URL(link, window.location.origin)
    const projectId = url.searchParams.get('project')
    const channel = parseChatChannel(url.searchParams.get('channel'))
    return projectId === activeProjectId && channel === activeChannel
  } catch {
    return false
  }
}
