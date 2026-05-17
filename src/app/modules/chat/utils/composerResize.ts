/** ค่า fallback เมื่ออ่านจาก CSS ไม่ได้ */
export const CHAT_COMPOSER_MAX_HEIGHT_PX = 104
export const CHAT_COMPOSER_MIN_HEIGHT_PX = 40

export function readComposerHeightLimits(el: HTMLTextAreaElement): {
  minHeight: number
  maxHeight: number
} {
  const style = getComputedStyle(el)
  const maxHeight = parseFloat(style.maxHeight)
  const minHeight = parseFloat(style.minHeight)
  return {
    minHeight: Number.isFinite(minHeight) ? minHeight : CHAT_COMPOSER_MIN_HEIGHT_PX,
    maxHeight: Number.isFinite(maxHeight) ? maxHeight : CHAT_COMPOSER_MAX_HEIGHT_PX,
  }
}

export function getChatFeedElement(from: HTMLElement): HTMLElement | null {
  const feed = from.closest('.chat-shell')?.querySelector('.chat-feed')
  return feed instanceof HTMLElement ? feed : null
}

/** เลื่อน feed ล่างสุดถ้าผู้ใช้อยู่ใกล้ล่าง (ไม่รบกวนตอนเลื่อนดูประวัติ) */
export function stickChatFeedToBottomIfNear(from: HTMLElement, threshold = 96) {
  const feed = getChatFeedElement(from)
  if (!feed) return
  const gap = feed.scrollHeight - feed.scrollTop - feed.clientHeight
  if (gap < threshold) {
    feed.scrollTop = feed.scrollHeight
  }
}

export function resizeChatComposerTextarea(
  el: HTMLTextAreaElement,
  opts?: { stickFeedToBottom?: boolean },
) {
  const { minHeight, maxHeight } = readComposerHeightLimits(el)

  el.style.height = `${minHeight}px`
  el.style.overflowY = 'hidden'

  const contentHeight = el.scrollHeight
  const nextHeight = Math.min(Math.max(contentHeight, minHeight), maxHeight)

  el.style.height = `${nextHeight}px`
  el.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden'

  if (opts?.stickFeedToBottom !== false) {
    stickChatFeedToBottomIfNear(el)
  }
}

export function resetChatComposerTextarea(el: HTMLTextAreaElement) {
  const { minHeight } = readComposerHeightLimits(el)
  el.style.height = `${minHeight}px`
  el.style.overflowY = 'hidden'
}
