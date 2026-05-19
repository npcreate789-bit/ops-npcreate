/** รูปแบบ URL chat.line.biz / manager.line.biz ที่ทีมใช้เปิดแชท OA */
const LINE_CHAT_BIZ_URL_RE =
  /chat\.line\.biz\/(U[0-9a-f]{32})\/chat(?:\/(U[0-9a-f]{32}))?/i

const LINE_MANAGER_CHAT_URL_RE =
  /manager\.line\.biz\/account\/(U[0-9a-f]{32})\/chat(?:\/(U[0-9a-f]{32}))?/i

const LINE_MESSAGING_USER_ID_RE = /^U[0-9a-f]{32}$/i

export function isLineMessagingUserIdForUrl(id: string | null | undefined): boolean {
  const trimmed = id?.trim()
  return Boolean(trimmed && LINE_MESSAGING_USER_ID_RE.test(trimmed))
}

export interface ParsedLineChatBizUrl {
  accountId: string
  chatUserId: string | null
}

/** แยก account id (segment แรก) และ user id (หลัง /chat/) จาก URL หรือ path */
export function parseLineChatBizUrl(input: string): ParsedLineChatBizUrl | null {
  const raw = input.trim()
  if (!raw) return null

  const fromChatBiz = raw.match(LINE_CHAT_BIZ_URL_RE)
  if (fromChatBiz?.[1]) {
    return {
      accountId: fromChatBiz[1],
      chatUserId: fromChatBiz[2] ?? null,
    }
  }

  const fromManager = raw.match(LINE_MANAGER_CHAT_URL_RE)
  if (fromManager?.[1]) {
    return {
      accountId: fromManager[1],
      chatUserId: fromManager[2] ?? null,
    }
  }

  if (LINE_MESSAGING_USER_ID_RE.test(raw)) {
    return { accountId: raw, chatUserId: null }
  }

  return null
}

/** account id จาก URL เต็มเท่านั้น (ไม่เดาจาก U เปล่า — มักเป็น user id ลูกค้า) */
export function parseLineChatBizAccountFromUrl(input: string): string | null {
  const raw = input.trim()
  if (!raw.includes('line.biz')) return null
  return parseLineChatBizUrl(raw)?.accountId ?? null
}

/**
 * Account id บน chat.line.biz (U + 32 hex) — ไม่ใช่ @npcreate
 * รับได้ทั้งค่าเปล่า หรือ URL เต็มที่วางผิดใน env
 */
export function normalizeLineChatBizAccountId(input: string | undefined): string {
  const raw = (input ?? '').trim()
  if (!raw || raw === 'undefined' || raw === 'null') return ''

  const parsed = parseLineChatBizUrl(raw)
  if (parsed) return parsed.accountId

  if (LINE_MESSAGING_USER_ID_RE.test(raw)) return raw

  return ''
}

export function buildLineChatBizInboxUrl(accountId: string): string | null {
  const aid = normalizeLineChatBizAccountId(accountId)
  if (!aid) return null
  return `https://chat.line.biz/${aid}/chat`
}

/** https://chat.line.biz/{accountId}/chat/{chatUserId} */
export function buildLineChatBizDirectUrl(
  chatUserId: string,
  accountId: string,
): string | null {
  const uid = chatUserId.trim()
  const aid = normalizeLineChatBizAccountId(accountId)
  if (!isLineMessagingUserIdForUrl(uid) || !aid) return null
  if (aid.toLowerCase() === uid.toLowerCase()) return null
  return `https://chat.line.biz/${aid}/chat/${uid}`
}

/** https://manager.line.biz/account/{accountId}/chat/{chatUserId} */
export function buildLineManagerDirectUrl(
  chatUserId: string,
  accountId: string,
): string | null {
  const uid = chatUserId.trim()
  const aid = normalizeLineChatBizAccountId(accountId)
  if (!isLineMessagingUserIdForUrl(uid) || !aid) return null
  return `https://manager.line.biz/account/${aid}/chat/${uid}`
}

export function buildLineManagerInboxUrl(accountId: string): string | null {
  const aid = normalizeLineChatBizAccountId(accountId)
  if (!aid) return null
  return `https://manager.line.biz/account/${aid}/chat`
}

export function lineChatBizAccountIdConfigError(accountId: string): string | null {
  if (accountId) return null
  return (
    'ยังไม่ได้ตั้ง VITE_LINE_CHAT_BIZ_ACCOUNT_ID — ใส่ account id จาก URL chat.line.biz ' +
    '(เช่น U2626213ac7c9081487572e27c76826db ไม่ใช่ @npcreate)'
  )
}
