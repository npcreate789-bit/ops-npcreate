/** ส่งผ่าน react-router location.state เมื่อเปิดแชทจาก toast */
export type LeadLineChatNavState = {
  focusLineChat?: boolean
}

export function readFocusLineChatFromState(state: unknown): boolean {
  if (!state || typeof state !== 'object') return false
  return Boolean((state as LeadLineChatNavState).focusLineChat)
}
