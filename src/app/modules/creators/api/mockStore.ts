import type { Creator, CreatorFilters, CreatorInput } from '../types'

const KEY = 'npcreate_creators_dev'
const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

const SEED: Creator[] = [
  {
    id: 'creator-1',
    display_name: 'ครีเอเตอร์ A',
    tiktok_handle: '@creator_a',
    line_id: 'creator_a',
    phone: '0811111111',
    niche: 'Beauty',
    rate_per_clip: 1500,
    status: 'active',
    notes: null,
    created_by: DEV_OWNER,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

function load(): Creator[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Creator[]) : [...SEED]
  } catch {
    return [...SEED]
  }
}

function save(rows: Creator[]) {
  localStorage.setItem(KEY, JSON.stringify(rows))
}

function match(row: Creator, filters: CreatorFilters): boolean {
  if (filters.status && row.status !== filters.status) return false
  const q = filters.search?.trim().toLowerCase()
  if (!q) return true
  return (
    row.display_name.toLowerCase().includes(q) ||
    (row.tiktok_handle?.toLowerCase().includes(q) ?? false) ||
    (row.niche?.toLowerCase().includes(q) ?? false)
  )
}

export const mockCreatorsApi = {
  async list(filters: CreatorFilters): Promise<Creator[]> {
    return load()
      .filter((r) => match(r, filters))
      .sort((a, b) => a.display_name.localeCompare(b.display_name, 'th'))
  },

  async get(id: string): Promise<Creator | null> {
    return load().find((r) => r.id === id) ?? null
  },

  async create(input: CreatorInput): Promise<Creator> {
    const now = new Date().toISOString()
    const row: Creator = { id: crypto.randomUUID(), ...input, created_at: now, updated_at: now }
    save([row, ...load()])
    return row
  },

  async update(id: string, input: CreatorInput): Promise<Creator> {
    const rows = load()
    const idx = rows.findIndex((r) => r.id === id)
    if (idx < 0) throw new Error('ไม่พบ Creator')
    const updated: Creator = {
      ...rows[idx],
      ...input,
      updated_at: new Date().toISOString(),
    }
    rows[idx] = updated
    save(rows)
    return updated
  },

  async remove(id: string): Promise<void> {
    save(load().filter((r) => r.id !== id))
  },
}
