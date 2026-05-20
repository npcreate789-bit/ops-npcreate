import type { LineStaffSticker } from '../../../shared/line/lineStickers'

const STORAGE_KEY = 'npc-line-chat-recent-expressions'
const MAX_RECENT = 28

export type RecentExpression =
  | { kind: 'emoji'; emoji: string }
  | { kind: 'sticker'; packageId: string; stickerId: string }

function readAll(): RecentExpression[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentExpression[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(items: RecentExpression[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_RECENT)))
  } catch {
    /* private mode */
  }
}

function sameItem(a: RecentExpression, b: RecentExpression): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'emoji' && b.kind === 'emoji') return a.emoji === b.emoji
  if (a.kind === 'sticker' && b.kind === 'sticker') {
    return a.packageId === b.packageId && a.stickerId === b.stickerId
  }
  return false
}

export function listRecentExpressions(): RecentExpression[] {
  return readAll()
}

export function pushRecentExpression(item: RecentExpression) {
  const next = [item, ...readAll().filter((x) => !sameItem(x, item))]
  writeAll(next)
}

export function pushRecentEmoji(emoji: string) {
  pushRecentExpression({ kind: 'emoji', emoji })
}

export function pushRecentSticker(sticker: LineStaffSticker) {
  pushRecentExpression({
    kind: 'sticker',
    packageId: sticker.packageId,
    stickerId: sticker.stickerId,
  })
}
