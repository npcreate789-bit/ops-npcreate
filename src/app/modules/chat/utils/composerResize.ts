/** สูงสุด ~4 บรรทัด — เกินแล้วเลื่อนในช่องพิมพ์ (แบบ LINE) */
export const CHAT_COMPOSER_MAX_HEIGHT_PX = 104
export const CHAT_COMPOSER_MIN_HEIGHT_PX = 40

export function resizeChatComposerTextarea(el: HTMLTextAreaElement) {
  el.style.height = '0'
  const scrollHeight = el.scrollHeight

  if (scrollHeight > CHAT_COMPOSER_MAX_HEIGHT_PX) {
    el.style.height = `${CHAT_COMPOSER_MAX_HEIGHT_PX}px`
    el.style.overflowY = 'auto'
  } else {
    el.style.height = `${Math.max(scrollHeight, CHAT_COMPOSER_MIN_HEIGHT_PX)}px`
    el.style.overflowY = 'hidden'
  }

  const feed = el.closest('.chat-shell')?.querySelector('.chat-feed')
  if (feed instanceof HTMLElement) {
    const gap = feed.scrollHeight - feed.scrollTop - feed.clientHeight
    if (gap < 96) {
      feed.scrollTop = feed.scrollHeight
    }
  }
}

export function resetChatComposerTextarea(el: HTMLTextAreaElement) {
  el.style.height = `${CHAT_COMPOSER_MIN_HEIGHT_PX}px`
  el.style.overflowY = 'hidden'
}
