import type { SearchResult } from '../types'

const MOCK: SearchResult[] = [
  {
    id: 'lead-mock-1',
    kind: 'lead',
    title: 'แบรนด์ตัวอย่าง Lead',
    subtitle: 'สนใจ · Facebook Ads',
    href: '/app/crm/lead-mock-1',
  },
  {
    id: 'c-mock-001',
    kind: 'customer',
    title: 'แบรนด์ตัวอย่าง A',
    subtitle: 'ใช้งานอยู่',
    href: '/app/customers/c-mock-001',
  },
  {
    id: 'task-mock-1',
    kind: 'task',
    title: 'ติดตามลูกค้าใหม่',
    subtitle: 'กำลังทำ',
    href: '/app/tasks/task-mock-1',
  },
]

export const mockSearchApi = {
  async search(query: string, kinds: SearchResult['kind'][]): Promise<SearchResult[]> {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return MOCK.filter(
      (r) =>
        kinds.includes(r.kind) &&
        (r.title.toLowerCase().includes(q) || (r.subtitle?.toLowerCase().includes(q) ?? false)),
    )
  },
}
