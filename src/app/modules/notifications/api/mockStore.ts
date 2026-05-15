import type { UserNotification } from '../types'

const KEY = 'npcreate_notifications_dev'
const DEV_USER = '00000000-0000-4000-8000-000000000001'

function load(): UserNotification[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as UserNotification[]) : []
  } catch {
    return []
  }
}

function save(rows: UserNotification[]) {
  localStorage.setItem(KEY, JSON.stringify(rows))
}

export const mockNotificationsApi = {
  async list(userId: string): Promise<UserNotification[]> {
    return load()
      .filter((n) => n.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  },

  async sync(userId: string, inputs: { dedupe_key: string; title: string; body: string; link: string; severity: string }[]) {
    const now = new Date().toISOString()
    const existing = load().filter((n) => n.user_id === userId)
    const keys = new Set(inputs.map((i) => i.dedupe_key))
    const kept = existing.filter((n) => keys.has(n.dedupe_key))
    const keptKeys = new Set(kept.map((n) => n.dedupe_key))

    for (const input of inputs) {
      if (keptKeys.has(input.dedupe_key)) continue
      kept.push({
        id: `n-${input.dedupe_key}`,
        user_id: userId,
        dedupe_key: input.dedupe_key,
        title: input.title,
        body: input.body,
        link: input.link,
        severity: input.severity as UserNotification['severity'],
        read_at: null,
        created_at: now,
        updated_at: now,
      })
    }

    const others = load().filter((n) => n.user_id !== userId)
    save([...others, ...kept])
  },

  async markRead(userId: string, id: string) {
    const rows = load()
    const row = rows.find((n) => n.id === id && n.user_id === userId)
    if (row) row.read_at = new Date().toISOString()
    save(rows)
  },

  async markAllRead(userId: string) {
    const now = new Date().toISOString()
    save(
      load().map((n) =>
        n.user_id === userId && !n.read_at ? { ...n, read_at: now } : n,
      ),
    )
  },

  async unreadCount(userId: string): Promise<number> {
    return load().filter((n) => n.user_id === userId && !n.read_at).length
  },

  seedUserId: DEV_USER,
}
