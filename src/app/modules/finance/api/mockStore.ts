import { bangkokTodayIsoDate, bangkokYearMonthPrefix } from '../../../../shared/dates/bangkok'
import type { CustomerOption, FinanceSummary, Payment, PaymentInput } from '../types'

const KEY = 'npcreate_payments_dev'
const CUST_KEY = 'npcreate_customers_dev'

function load(): Payment[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Payment[]) : []
  } catch {
    return []
  }
}

function save(rows: Payment[]) {
  localStorage.setItem(KEY, JSON.stringify(rows))
}

type StoredCustomer = {
  id: string
  brand_name: string
  status?: string
}

function loadCustomers(): StoredCustomer[] {
  try {
    const raw = localStorage.getItem(CUST_KEY)
    return raw ? (JSON.parse(raw) as StoredCustomer[]) : []
  } catch {
    return []
  }
}

function saveCustomers(rows: StoredCustomer[]) {
  localStorage.setItem(CUST_KEY, JSON.stringify(rows))
}

function loadCustomerNames(): Map<string, string> {
  return new Map(loadCustomers().map((c) => [c.id, c.brand_name]))
}

let rcSeq = 1001
let invSeq = 1001

export const mockFinanceApi = {
  async listPayments(): Promise<Payment[]> {
    const names = loadCustomerNames()
    return load()
      .map((p) => ({ ...p, customer_brand_name: names.get(p.customer_id) ?? 'ลูกค้า' }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  },

  async listPaymentsForCustomer(customerId: string): Promise<Payment[]> {
    const names = loadCustomerNames()
    return load()
      .filter((p) => p.customer_id === customerId)
      .map((p) => ({ ...p, customer_brand_name: names.get(p.customer_id) ?? 'ลูกค้า' }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  },

  async getPayment(id: string): Promise<Payment | null> {
    const row = load().find((p) => p.id === id)
    if (!row) return null
    const names = loadCustomerNames()
    return { ...row, customer_brand_name: names.get(row.customer_id) ?? null }
  },

  async listCustomersForSelect(): Promise<CustomerOption[]> {
    return loadCustomers().map((c) => ({ id: c.id, brand_name: c.brand_name }))
  },

  async createPayment(input: PaymentInput): Promise<Payment> {
    const now = new Date().toISOString()
    const row: Payment = {
      id: crypto.randomUUID(),
      ...input,
      slip_path: null,
      receipt_number: input.issue_receipt
        ? `RC-${new Date().getFullYear()}-${String(rcSeq++).padStart(4, '0')}`
        : null,
      tax_invoice_number: input.issue_tax_invoice
        ? `INV-${new Date().getFullYear()}-${String(invSeq++).padStart(4, '0')}`
        : null,
      confirmed_at: input.status === 'paid' ? now : null,
      created_at: now,
      updated_at: now,
    }
    const all = load()
    all.unshift(row)
    save(all)
    if (input.status === 'paid') {
      await mockFinanceApi.confirmPayment(row.id)
    }
    return (await mockFinanceApi.getPayment(row.id)) ?? row
  },

  async updatePayment(id: string, input: PaymentInput): Promise<Payment> {
    const all = load()
    const idx = all.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('ไม่พบรายการ')
    const now = new Date().toISOString()
    const prev = all[idx]
    all[idx] = {
      ...prev,
      ...input,
      receipt_number:
        input.issue_receipt && !prev.receipt_number
          ? `RC-${new Date().getFullYear()}-${String(rcSeq++).padStart(4, '0')}`
          : prev.receipt_number,
      tax_invoice_number:
        input.issue_tax_invoice && !prev.tax_invoice_number
          ? `INV-${new Date().getFullYear()}-${String(invSeq++).padStart(4, '0')}`
          : prev.tax_invoice_number,
      confirmed_at: input.status === 'paid' ? prev.confirmed_at ?? now : prev.confirmed_at,
      updated_at: now,
    }
    save(all)
    if (input.status === 'paid' && prev.status !== 'paid') {
      await mockFinanceApi.confirmPayment(id)
    }
    return (await mockFinanceApi.getPayment(id)) ?? all[idx]
  },

  async confirmPayment(id: string): Promise<void> {
    const all = load()
    const idx = all.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('ไม่พบรายการ')
    const now = new Date().toISOString()
    all[idx] = {
      ...all[idx],
      status: 'paid',
      payment_date: all[idx].payment_date ?? now.slice(0, 10),
      confirmed_at: now,
      updated_at: now,
    }
    save(all)

    const customers = loadCustomers()
    const ci = customers.findIndex((c) => c.id === all[idx].customer_id)
    if (ci >= 0) {
      customers[ci] = { ...customers[ci], status: 'active' }
      saveCustomers(customers)
    }
  },

  async uploadSlip(paymentId: string, path: string): Promise<void> {
    const all = load()
    const idx = all.findIndex((p) => p.id === paymentId)
    if (idx >= 0) {
      all[idx].slip_path = path
      save(all)
    }
  },

  async getSummary(): Promise<FinanceSummary> {
    const rows = load()
    const ym = bangkokYearMonthPrefix()
    const today = bangkokTodayIsoDate()
    let revenue = 0
    let paidMonth = 0
    let pending = 0
    let overdue = 0
    for (const p of rows) {
      if (p.status === 'paid' && p.payment_date?.startsWith(ym)) {
        revenue += p.total_amount
        paidMonth += 1
      }
      if (p.status === 'pending') {
        pending += p.total_amount
        if (p.due_date && p.due_date < today) overdue += 1
      }
      if (p.status === 'overdue') overdue += 1
    }
    return {
      revenue_this_month: revenue,
      pending_total: pending,
      overdue_count: overdue,
      paid_count_this_month: paidMonth,
    }
  },
}
