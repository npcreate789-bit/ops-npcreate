export const CHAT_CHANNEL_KEYS = ['client', 'account', 'ads', 'sales'] as const

export type ChatChannelKey = (typeof CHAT_CHANNEL_KEYS)[number]

export const CHAT_CHANNEL_LABELS: Record<ChatChannelKey, string> = {
  client: 'ลูกค้า',
  account: 'Account',
  ads: 'Ads',
  sales: 'Sales',
}

export const CHAT_CHANNEL_HINTS: Record<ChatChannelKey, string> = {
  client: 'สนทนากับลูกค้าและทีมที่เกี่ยวข้อง',
  account: 'ทีม Account — งานบัญชี / บรีฟ / ส่งมอบ',
  ads: 'ทีม Ads — ยิงแอดและรายงาน',
  sales: 'ทีม Sales — ขายและใบเสนอราคา',
}

export function isChatChannelKey(value: string | null | undefined): value is ChatChannelKey {
  return CHAT_CHANNEL_KEYS.includes(value as ChatChannelKey)
}

export function parseChatChannel(value: string | null | undefined): ChatChannelKey {
  if (isChatChannelKey(value)) return value
  return 'client'
}
