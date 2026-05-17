/** เลื่อนรายการข้อความ — ไม่ใช้ scrollIntoView เพื่อไม่ดันทั้งหน้าแอป */
export function scrollChatFeedToBottom(
  feed: HTMLElement | null,
  behavior: ScrollBehavior = 'smooth',
) {
  if (!feed) return

  const apply = () => {
    feed.scrollTop = feed.scrollHeight
  }

  if (behavior === 'auto') {
    apply()
    requestAnimationFrame(apply)
    return
  }

  feed.scrollTo({ top: feed.scrollHeight, behavior })
}

export function isChatFeedNearBottom(feed: HTMLElement | null, threshold = 140): boolean {
  if (!feed) return true
  return feed.scrollHeight - feed.scrollTop - feed.clientHeight <= threshold
}

export function findChatFeedFromAnchor(anchor: HTMLElement | null): HTMLElement | null {
  if (!anchor) return null
  const feed = anchor.closest('.chat-feed')
  return feed instanceof HTMLElement ? feed : null
}

/** รอ layout แล้วเลื่อนล่าง — ใช้หลังโหลด/รีเฟรชข้อความ */
export function scrollChatFeedToBottomAfterLayout(
  feed: HTMLElement | null,
  behavior: ScrollBehavior = 'auto',
) {
  if (!feed) return
  requestAnimationFrame(() => {
    scrollChatFeedToBottom(feed, behavior)
    requestAnimationFrame(() => scrollChatFeedToBottom(feed, 'auto'))
  })
}
