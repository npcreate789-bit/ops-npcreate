import { ACTIVE_STATUSES } from '../constants'
import type { Lead } from '../types'
import { listLeads } from './leads'

/** แสดงเฉพาะ Lead ที่สร้างจากฟอร์ม /contact (ช่องทาง website) */
export function isContactFormLead(lead: Lead): boolean {
  return lead.channel === 'website'
}

const RECENT_DAYS = 45

export async function listRecentContactInquiries(limit = 6): Promise<Lead[]> {
  const leads = await listLeads({ channel: 'website', status: 'all' })
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RECENT_DAYS)
  const cutoffIso = cutoff.toISOString()

  return leads
    .filter(
      (lead) =>
        isContactFormLead(lead) &&
        ACTIVE_STATUSES.includes(lead.status) &&
        lead.created_at >= cutoffIso,
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
}
