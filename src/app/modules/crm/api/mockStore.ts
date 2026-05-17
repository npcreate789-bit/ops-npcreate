import { pushLeadNotification } from '../../notifications/api/notifications'
import type { Lead, LeadFilters, LeadInsert, LeadUpdate, SalesSummaryRow } from '../types'
import { ACTIVE_STATUSES } from '../constants'

const STORAGE_KEY = 'npcreate_crm_leads_dev'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

function load(): Lead[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seed()
    return JSON.parse(raw) as Lead[]
  } catch {
    return seed()
  }
}

function save(leads: Lead[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads))
}

function seed(): Lead[] {
  const now = new Date().toISOString()
  const leads: Lead[] = [
    {
      id: crypto.randomUUID(),
      owner_id: DEV_OWNER,
      brand_name: 'ร้านสกินแคร์ตัวอย่าง',
      contact_name: 'คุณเอ',
      phone: '0812345678',
      line_id: '@demo',
      facebook: 'facebook.com/demo',
      business_type: 'สกินแคร์',
      ad_budget_daily: 1500,
      ad_budget_monthly: 45000,
      pain_points: 'ROI ต่ำ ยอดไม่โต',
      services_interested: ['GMV Max', 'ผลิตคอนเทนต์'],
      status: 'interested',
      channel: 'tiktok',
      notes: 'Lead ตัวอย่างสำหรับโหมดพัฒนา',
      reminder_at: null,
      customer_id: null,
      converted_at: null,
      created_at: now,
      updated_at: now,
    },
  ]
  save(leads)
  return leads
}

function matchesFilters(lead: Lead, filters: LeadFilters): boolean {
  if (filters.status && filters.status !== 'all' && lead.status !== filters.status) {
    return false
  }
  if (filters.channel && filters.channel !== 'all' && lead.channel !== filters.channel) {
    return false
  }
  if (filters.ownerId && lead.owner_id !== filters.ownerId) return false
  if (filters.search) {
    const q = filters.search.toLowerCase()
    const hay = [
      lead.brand_name,
      lead.contact_name,
      lead.phone,
      lead.line_id,
      lead.notes,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    if (!hay.includes(q)) return false
  }
  return true
}

export const mockLeadsApi = {
  async list(filters: LeadFilters = {}): Promise<Lead[]> {
    return load()
      .filter((l) => matchesFilters(l, filters))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  },

  async getById(id: string): Promise<Lead | null> {
    return load().find((l) => l.id === id) ?? null
  },

  async create(payload: LeadInsert): Promise<Lead> {
    const now = new Date().toISOString()
    const lead: Lead = {
      id: crypto.randomUUID(),
      customer_id: null,
      converted_at: null,
      created_at: now,
      updated_at: now,
      ...payload,
    }
    const leads = load()
    leads.unshift(lead)
    save(leads)
    void pushLeadNotification(lead.owner_id, lead).catch(() => {})
    return lead
  },

  async update(id: string, payload: LeadUpdate): Promise<Lead> {
    const leads = load()
    const idx = leads.findIndex((l) => l.id === id)
    if (idx === -1) throw new Error('ไม่พบ Lead')
    leads[idx] = {
      ...leads[idx],
      ...payload,
      updated_at: new Date().toISOString(),
    }
    save(leads)
    return leads[idx]
  },

  async remove(id: string): Promise<void> {
    save(load().filter((l) => l.id !== id))
  },

  async salesSummary(): Promise<SalesSummaryRow[]> {
    const leads = load()
    const map = new Map<string, SalesSummaryRow>()
    for (const lead of leads) {
      const row = map.get(lead.owner_id) ?? {
        owner_id: lead.owner_id,
        owner_name: 'Dev User',
        total: 0,
        won: 0,
        active: 0,
      }
      row.total += 1
      if (lead.status === 'won') row.won += 1
      if (ACTIVE_STATUSES.includes(lead.status)) row.active += 1
      map.set(lead.owner_id, row)
    }
    return [...map.values()]
  },
}
