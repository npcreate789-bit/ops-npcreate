import type { AppRole } from '../../../../shared/types/roles'
import { customer360TimelineKindsForContext } from '../access'
import type {
  Customer360,
  CustomerListFilters,
  CustomerListRow,
  CustomerTimelineContext,
  CustomerTimelineEntry,
  CustomerTimelineFilters,
} from '../types'

const MOCK_CUSTOMERS: CustomerListRow[] = [
  {
    id: 'c-mock-001',
    brand_name: 'แบรนด์ตัวอย่าง A',
    contact_name: 'คุณสมชาย',
    status: 'active',
    package_name: 'ดูแล GMV Max',
    contract_start: '2025-01-01',
    contract_end: '2025-12-31',
    ready_for_ads: true,
    phone: '081-000-0001',
  },
  {
    id: 'c-mock-002',
    brand_name: 'แบรนด์ตัวอย่าง B',
    contact_name: 'คุณสมหญิง',
    status: 'pending',
    package_name: 'ผลิตคอนเทนต์',
    contract_start: null,
    contract_end: null,
    ready_for_ads: false,
    phone: null,
  },
]

export const mockCustomersApi = {
  async list(filters: CustomerListFilters): Promise<CustomerListRow[]> {
    let rows = [...MOCK_CUSTOMERS]
    if (filters.status) rows = rows.filter((r) => r.status === filters.status)
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase()
      rows = rows.filter(
        (r) =>
          r.brand_name.toLowerCase().includes(q) ||
          (r.contact_name?.toLowerCase().includes(q) ?? false),
      )
    }
    return rows
  },

  async get360(id: string): Promise<Customer360 | null> {
    const row = MOCK_CUSTOMERS.find((c) => c.id === id)
    if (!row) return null
    return {
      customer: { ...row, line_id: null, business_type: 'E-commerce', lead_id: null },
      summary: {
        payments_count: 2,
        payments_paid_total: 45000,
        payments_pending: 1,
        open_tasks: 3,
        content_in_progress: 1,
        campaigns_count: 2,
        ads_spend_30d: 125000,
        renewal_status: null,
      },
    }
  },

  async listTimeline(
    ctx: CustomerTimelineContext,
    roles: AppRole[],
    filters: CustomerTimelineFilters,
  ): Promise<CustomerTimelineEntry[]> {
    const kinds = new Set(customer360TimelineKindsForContext(roles, ctx.leadId))
    const mock: CustomerTimelineEntry[] = []
    if (kinds.has('task')) {
      mock.push({
        id: 'task-mock-1',
        kind: 'task',
        at: new Date().toISOString(),
        title: 'ติดตามลูกค้าใหม่',
        detail: 'รอทำ',
        href: '/app/tasks/task-mock-1',
        overdue: false,
      })
    }
    if (kinds.has('payment')) {
      mock.push({
        id: 'payment-mock-1',
        kind: 'payment',
        at: new Date().toISOString(),
        title: 'การชำระ — 45,000 บาท',
        detail: 'ชำระแล้ว',
        href: '/app/finance',
        overdue: false,
      })
    }
    if (kinds.has('content')) {
      mock.push({
        id: 'content-mock-1',
        kind: 'content',
        at: new Date().toISOString(),
        title: 'คลิปรีวิวสินค้า',
        detail: 'กำลังผลิต',
        href: '/app/content',
        overdue: false,
      })
    }
    if (kinds.has('contract') && ctx.contractEnd) {
      mock.push({
        id: 'contract-mock',
        kind: 'contract',
        at: ctx.contractEnd,
        title: `สิ้นสุดสัญญา — ${ctx.brandName}`,
        detail: 'สัญญา',
        href: '/app/renewals',
        overdue: false,
      })
    }
    let rows = mock
    if (filters.kind) rows = rows.filter((r) => r.kind === filters.kind)
    if (!ctx.leadId) rows = rows.filter((r) => r.kind !== 'lead')
    return rows.sort((a, b) => b.at.localeCompare(a.at))
  },
}
