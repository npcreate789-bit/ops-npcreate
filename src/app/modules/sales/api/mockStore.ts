import type { Customer, Package, PublicQuotation, Quotation, QuotationInput } from '../types'
import { calcQuotationTotals, isQuotationSentLike } from '../constants'

const PKG_KEY = 'npcreate_packages_dev'
const QT_KEY = 'npcreate_quotations_dev'
const CUST_KEY = 'npcreate_customers_dev'
const SEED_PACKAGES: Package[] = [
  { id: 'p1', code: 'gmv_max', name: 'ดูแล GMV Max', description: null, base_price: 15000, is_active: true },
  { id: 'p2', code: 'content', name: 'ผลิตคอนเทนต์', description: null, base_price: 12000, is_active: true },
  { id: 'p3', code: 'tiktok_one', name: 'TikTok One / Creator', description: null, base_price: 20000, is_active: true },
]

function loadPackages(): Package[] {
  try {
    const raw = localStorage.getItem(PKG_KEY)
    if (!raw) {
      localStorage.setItem(PKG_KEY, JSON.stringify(SEED_PACKAGES))
      return SEED_PACKAGES
    }
    return JSON.parse(raw) as Package[]
  } catch {
    return SEED_PACKAGES
  }
}

function loadQuotations(): Quotation[] {
  try {
    const raw = localStorage.getItem(QT_KEY)
    return raw ? (JSON.parse(raw) as Quotation[]) : []
  } catch {
    return []
  }
}

function saveQuotations(rows: Quotation[]) {
  localStorage.setItem(QT_KEY, JSON.stringify(rows))
}

function loadCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(CUST_KEY)
    return raw ? (JSON.parse(raw) as Customer[]) : []
  } catch {
    return []
  }
}

function saveCustomers(rows: Customer[]) {
  localStorage.setItem(CUST_KEY, JSON.stringify(rows))
}

let qtSeq = 1001

export const mockSalesApi = {
  async listPackages(): Promise<Package[]> {
    return loadPackages()
  },

  async listQuotations(): Promise<Quotation[]> {
    return loadQuotations().sort((a, b) => b.created_at.localeCompare(a.created_at))
  },

  async getQuotation(id: string): Promise<Quotation | null> {
    return loadQuotations().find((q) => q.id === id) ?? null
  },

  async createQuotation(input: QuotationInput): Promise<Quotation> {
    const now = new Date().toISOString()
    const items = input.items.map((item, i) => ({
      id: crypto.randomUUID(),
      quotation_id: '',
      package_id: item.package_id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.quantity * item.unit_price,
      sort_order: item.sort_order ?? i,
    }))
    const totals = calcQuotationTotals(items, input.discount, input.vat_rate)
    const id = crypto.randomUUID()
    items.forEach((it) => {
      it.quotation_id = id
    })
    const row: Quotation = {
      id,
      quotation_number: `QT-${new Date().getFullYear()}-${String(qtSeq++).padStart(4, '0')}`,
      lead_id: input.lead_id,
      customer_id: null,
      owner_id: input.owner_id,
      status: input.status,
      subtotal: totals.subtotal,
      discount: input.discount,
      vat_rate: input.vat_rate,
      vat_amount: totals.vat_amount,
      total: totals.total,
      contract_months: input.contract_months,
      terms: input.terms,
      notes: input.notes,
      sent_at: isQuotationSentLike(input.status) ? now : null,
      viewed_at: null,
      accepted_at: null,
      paid_at: input.status === 'paid' ? now : null,
      public_token: isQuotationSentLike(input.status) ? crypto.randomUUID() : null,
      created_at: now,
      updated_at: now,
      items,
    }
    const all = loadQuotations()
    all.unshift(row)
    saveQuotations(all)
    return row
  },

  async updateQuotation(id: string, input: QuotationInput): Promise<Quotation> {
    const all = loadQuotations()
    const idx = all.findIndex((q) => q.id === id)
    if (idx === -1) throw new Error('ไม่พบใบเสนอราคา')
    const now = new Date().toISOString()
    const items = input.items.map((item, i) => ({
      id: crypto.randomUUID(),
      quotation_id: id,
      package_id: item.package_id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.quantity * item.unit_price,
      sort_order: item.sort_order ?? i,
    }))
    const totals = calcQuotationTotals(items, input.discount, input.vat_rate)
    const prev = all[idx]
    const paid = input.status === 'paid'
    all[idx] = {
      ...prev,
      lead_id: input.lead_id,
      status: input.status,
      subtotal: totals.subtotal,
      discount: input.discount,
      vat_rate: input.vat_rate,
      vat_amount: totals.vat_amount,
      total: totals.total,
      contract_months: input.contract_months,
      terms: input.terms,
      notes: input.notes,
      sent_at: isQuotationSentLike(input.status) && !prev.sent_at ? now : prev.sent_at,
      viewed_at: prev.viewed_at,
      accepted_at: prev.accepted_at,
      paid_at: paid ? (prev.paid_at ?? now) : prev.paid_at,
      public_token:
        prev.public_token ??
        (isQuotationSentLike(input.status) ? crypto.randomUUID() : null),
      updated_at: now,
      items,
    }
    saveQuotations(all)
    return all[idx]
  },

  async ensureCustomer(leadId: string, quotation: Quotation): Promise<string> {
    return mockSalesApi.linkCustomer(leadId, quotation)
  },

  async promoteLead(leadId: string, quotation: Quotation): Promise<string> {
    return mockSalesApi.linkCustomer(leadId, quotation)
  },

  async linkCustomer(leadId: string, quotation: Quotation): Promise<string> {
    const customers = loadCustomers()
    const existing = customers.find((c) => c.lead_id === leadId)
    if (existing) {
      mockSalesApi.attachCustomerToQuotation(quotation.id, existing.id)
      return existing.id
    }
    const now = new Date().toISOString()
    const customer: Customer = {
      id: crypto.randomUUID(),
      lead_id: leadId,
      brand_name: quotation.lead_brand_name ?? 'ลูกค้า',
      contact_name: null,
      phone: null,
      line_id: null,
      business_type: null,
      package_name: quotation.items?.[0]?.description ?? null,
      contract_start: null,
      contract_end: null,
      status: 'pending',
      account_owner_id: null,
      ads_owner_id: null,
      sales_owner_id: quotation.owner_id,
      created_at: now,
      updated_at: now,
    }
    customers.push(customer)
    saveCustomers(customers)
    mockSalesApi.attachCustomerToQuotation(quotation.id, customer.id)
    return customer.id
  },

  attachCustomerToQuotation(quotationId: string, customerId: string) {
    const qts = loadQuotations()
    const qi = qts.findIndex((q) => q.id === quotationId)
    if (qi >= 0) {
      qts[qi].customer_id = customerId
      saveQuotations(qts)
    }
  },

  async deleteQuotation(id: string): Promise<void> {
    saveQuotations(loadQuotations().filter((q) => q.id !== id))
  },

  async ensurePublicToken(quotationId: string): Promise<string> {
    const all = loadQuotations()
    const idx = all.findIndex((q) => q.id === quotationId)
    if (idx === -1) throw new Error('ไม่พบใบเสนอราคา')
    if (!isQuotationSentLike(all[idx].status)) {
      throw new Error('ต้องส่งใบเสนอราคาก่อนสร้างลิงก์ให้ลูกค้า')
    }
    if (!all[idx].public_token) {
      all[idx].public_token = crypto.randomUUID()
      all[idx].updated_at = new Date().toISOString()
      saveQuotations(all)
    }
    return all[idx].public_token!
  },

  toPublicPayload(q: Quotation): PublicQuotation {
    return {
      id: q.id,
      quotation_number: q.quotation_number,
      status: q.status,
      subtotal: q.subtotal,
      discount: q.discount,
      vat_rate: q.vat_rate,
      vat_amount: q.vat_amount,
      total: q.total,
      contract_months: q.contract_months,
      terms: q.terms,
      notes: q.notes,
      sent_at: q.sent_at,
      viewed_at: q.viewed_at,
      accepted_at: q.accepted_at,
      created_at: q.created_at,
      brand_name: q.lead_brand_name ?? null,
      items: (q.items ?? []).map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
        sort_order: item.sort_order,
      })),
      can_accept: q.status === 'sent' || q.status === 'viewed',
    }
  },

  async getPublicByToken(token: string): Promise<PublicQuotation | null> {
    const q = loadQuotations().find((row) => row.public_token === token)
    if (!q || !isQuotationSentLike(q.status)) return null
    return mockSalesApi.toPublicPayload(q)
  },

  async markPublicViewed(token: string): Promise<PublicQuotation | null> {
    const all = loadQuotations()
    const idx = all.findIndex((row) => row.public_token === token)
    if (idx === -1 || !isQuotationSentLike(all[idx].status)) return null
    const now = new Date().toISOString()
    if (all[idx].status === 'sent') {
      all[idx].status = 'viewed'
      all[idx].viewed_at = all[idx].viewed_at ?? now
    } else if (!all[idx].viewed_at) {
      all[idx].viewed_at = now
    }
    all[idx].updated_at = now
    saveQuotations(all)
    return mockSalesApi.toPublicPayload(all[idx])
  },

  async acceptPublic(token: string, _acceptedByName?: string): Promise<PublicQuotation | null> {
    const all = loadQuotations()
    const idx = all.findIndex((row) => row.public_token === token)
    if (idx === -1 || !isQuotationSentLike(all[idx].status)) return null
    if (all[idx].status !== 'sent' && all[idx].status !== 'viewed') {
      return mockSalesApi.toPublicPayload(all[idx])
    }
    const now = new Date().toISOString()
    all[idx].status = 'accepted'
    all[idx].viewed_at = all[idx].viewed_at ?? now
    all[idx].accepted_at = now
    all[idx].updated_at = now
    saveQuotations(all)
    return mockSalesApi.toPublicPayload(all[idx])
  },
}
