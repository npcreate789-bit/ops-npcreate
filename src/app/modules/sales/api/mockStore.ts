import type {
  Customer,
  Package,
  PackageInput,
  PackageListOptions,
  PublicQuotation,
  Quotation,
  QuotationInput,
} from '../types'
import { calcQuotationTotals, isQuotationSentLike } from '../constants'

const PKG_KEY = 'npcreate_packages_dev'
const PKG_VERSION_KEY = 'npcreate_packages_dev_version'
/** Bump when SEED_PACKAGES changes so dev localStorage picks up new rows. */
const PKG_SEED_VERSION = 2
const QT_KEY = 'npcreate_quotations_dev'
const CUST_KEY = 'npcreate_customers_dev'

/** Mirrors supabase/migrations/00005_sales.sql + 00065_seed_sales_packages.sql */
const SEED_PACKAGES: Package[] = [
  {
    id: 'p-gmv-max',
    code: 'gmv_max',
    name: 'ดูแล GMV Max',
    description: 'บริการดูแลแคมเปญ GMV Max รายเดือน — วางแผน ยิงแอด รายงานผล',
    base_price: 15000,
    is_active: true,
  },
  {
    id: 'p-gmv-course',
    code: 'gmv_course',
    name: 'คอร์ส GMV Max',
    description: 'อบรม GMV Max แบบ intensive — กลุ่มเล็ก + แนวทางปฏิบัติ',
    base_price: 9900,
    is_active: true,
  },
  {
    id: 'p-tiktok-one',
    code: 'tiktok_one',
    name: 'TikTok One / Creator',
    description: 'บริการ Creator & TikTok One — จับคู่ครีเอเตอร์และดูแลโปรเจกต์',
    base_price: 20000,
    is_active: true,
  },
  {
    id: 'p-content',
    code: 'content',
    name: 'ผลิตคอนเทนต์',
    description: 'ผลิตคลิปและคอนเทนต์สำหรับ TikTok / Reels — ตามแพ็กเกจชิ้น',
    base_price: 12000,
    is_active: true,
  },
  {
    id: 'p-live',
    code: 'live',
    name: 'Live Commerce',
    description: 'บริการไลฟ์ขาย — จัดไลฟ์ ดูแลห้อง และสรุปผลหลังไลฟ์',
    base_price: 18000,
    is_active: true,
  },
  {
    id: 'p-consulting',
    code: 'consulting',
    name: 'Private Consulting',
    description: 'ที่ปรึกษาแบบส่วนตัว — วิเคราะห์ธุรกิจและแผนการตลาด',
    base_price: 25000,
    is_active: true,
  },
  {
    id: 'p-software',
    code: 'software',
    name: 'Software / License',
    description: 'ซอฟต์แวร์และไลเซนส์ NP Create — รายเดือนหรือรายปี',
    base_price: 8000,
    is_active: true,
  },
  {
    id: 'p-other',
    code: 'other',
    name: 'บริการอื่น ๆ',
    description: 'บริการอื่นตามข้อตกลง — กำหนดราคาในใบเสนอราคา',
    base_price: 0,
    is_active: true,
  },
]

function persistPackages(packages: Package[]) {
  localStorage.setItem(PKG_KEY, JSON.stringify(packages))
  localStorage.setItem(PKG_VERSION_KEY, String(PKG_SEED_VERSION))
}

function loadAllPackagesRaw(): Package[] {
  try {
    const version = localStorage.getItem(PKG_VERSION_KEY)
    const raw = localStorage.getItem(PKG_KEY)
    if (!raw || version !== String(PKG_SEED_VERSION)) {
      persistPackages(SEED_PACKAGES)
      return [...SEED_PACKAGES]
    }
    const parsed = JSON.parse(raw) as Package[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      persistPackages(SEED_PACKAGES)
      return [...SEED_PACKAGES]
    }
    return parsed
  } catch {
    persistPackages(SEED_PACKAGES)
    return [...SEED_PACKAGES]
  }
}

function filterPackages(rows: Package[], options: PackageListOptions): Package[] {
  if (options.activeOnly === true) return rows.filter((p) => p.is_active)
  if (options.activeOnly === false) return rows.filter((p) => !p.is_active)
  return rows
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
    return filterPackages(loadAllPackagesRaw(), { activeOnly: true }).sort((a, b) =>
      a.name.localeCompare(b.name, 'th'),
    )
  },

  async listAllPackages(options: PackageListOptions = {}): Promise<Package[]> {
    return filterPackages(loadAllPackagesRaw(), options).sort((a, b) =>
      a.name.localeCompare(b.name, 'th'),
    )
  },

  async getPackage(id: string): Promise<Package | null> {
    return loadAllPackagesRaw().find((p) => p.id === id) ?? null
  },

  async createPackage(input: PackageInput): Promise<Package> {
    const rows = loadAllPackagesRaw()
    const code = input.code.trim()
    if (rows.some((p) => p.code === code)) {
      throw new Error('รหัสแพ็กเกจซ้ำ — ใช้รหัสอื่น')
    }
    const row: Package = {
      id: crypto.randomUUID(),
      code,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      base_price: input.base_price,
      is_active: input.is_active,
    }
    persistPackages([row, ...rows])
    return row
  },

  async updatePackage(id: string, input: PackageInput): Promise<Package> {
    const rows = loadAllPackagesRaw()
    const idx = rows.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('ไม่พบแพ็กเกจ')
    const code = input.code.trim()
    if (rows.some((p) => p.code === code && p.id !== id)) {
      throw new Error('รหัสแพ็กเกจซ้ำ — ใช้รหัสอื่น')
    }
    const updated: Package = {
      ...rows[idx],
      code,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      base_price: input.base_price,
      is_active: input.is_active,
    }
    rows[idx] = updated
    persistPackages(rows)
    return updated
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
    const awaitingPay = q.status === 'awaiting_payment'
    const paid = q.status === 'paid'
    const verification = paid
      ? ('confirmed' as const)
      : awaitingPay
        ? ('none' as const)
        : undefined
    const paymentStatusMessage = paid
      ? 'ยืนยันการชำระเงินแล้ว'
      : awaitingPay
        ? null
        : null

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
      paid_at: q.paid_at,
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
      can_upload_slip: awaitingPay && verification === 'none',
      slip_submitted: false,
      payment_verification_status: verification,
      payment_status_message: paymentStatusMessage,
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
