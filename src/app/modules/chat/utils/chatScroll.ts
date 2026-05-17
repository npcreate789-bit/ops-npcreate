/** เลื่อนรายการข้อความ — ไม่ใช้ scrollIntoView เพื่อไม่ดันทั้งหน้าแอป */
export function scrollChatFeedToBottom(
  feed: HTMLElement | null,
  behavior: ScrollBehavior = 'smooth',
) {
  if (!feed) return
  const top = feed.scrollHeight
  if (behavior === 'auto') {
    feed.scrollTop = top
    return
  }
  feed.scrollTo({ top, behavior })
}

export function findChatFeedFromAnchor(anchor: HTMLElement | null): HTMLElement | null {
  if (!anchor) return null
  const feed = anchor.closest('.chat-feed')
  return feed instanceof HTMLElement ? feed : null
}
