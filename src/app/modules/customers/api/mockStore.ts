import type { Customer360, CustomerListFilters, CustomerListRow } from '../types'

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
}
