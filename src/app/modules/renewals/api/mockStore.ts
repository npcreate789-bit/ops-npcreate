import { bangkokTodayIsoDate } from '../../../../shared/dates/bangkok'
import { addDaysIso, daysUntilContractEnd } from '../constants'
import type { ContractRenewal, RenewalFilters, RenewalInput, RenewalRow } from '../types'

const KEY = 'npcreate_renewals_dev'
const CUST_KEY = 'npcreate_customers_dev'
const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

function loadRenewals(): ContractRenewal[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ContractRenewal[]) : []
  } catch {
    return []
  }
}

function saveRenewals(rows: ContractRenewal[]) {
  localStorage.setItem(KEY, JSON.stringify(rows))
}

function loadCustomers(): {
  id: string
  brand_name: string
  status: string
  contract_end: string | null
  account_owner_id: string | null
}[] {
  try {
    const raw = localStorage.getItem(CUST_KEY)
    if (raw) {
      return (JSON.parse(raw) as {
        id: string
        brand_name: string
        status: string
        contract_end?: string | null
        account_owner_id?: string | null
      }[]).map((r) => ({
        id: r.id,
        brand_name: r.brand_name,
        status: r.status,
        contract_end: r.contract_end ?? null,
        account_owner_id: r.account_owner_id ?? DEV_OWNER,
      }))
    }
  } catch {
    /* ignore */
  }
  return [
    {
      id: 'cust-dev-1',
      brand_name: 'แบรนด์ตัวอย่าง',
      status: 'active',
      contract_end: addDaysIso(bangkokTodayIsoDate(), 45),
      account_owner_id: DEV_OWNER,
    },
  ]
}

function buildRows(filters: RenewalFilters): RenewalRow[] {
  const within = filters.within_days ?? 60
  const today = bangkokTodayIsoDate()
  const limit = addDaysIso(today, within)
  const renewals = loadRenewals()
  const byCustomer = new Map(renewals.map((r) => [r.customer_id, r]))

  return loadCustomers()
    .filter((c) => {
      if (!['active', 'at_risk'].includes(c.status) || !c.contract_end) return false
      if (c.contract_end > limit) return false
      if (!filters.include_expired && c.contract_end < today) return false
      return true
    })
    .map((c) => {
      const renewal = byCustomer.get(c.id)
      return {
        customer_id: c.id,
        brand_name: c.brand_name,
        contract_end: c.contract_end,
        customer_status: c.status,
        days_until_end: daysUntilContractEnd(c.contract_end),
        renewal_id: renewal?.id ?? null,
        renewal_status: renewal?.status ?? null,
        owner_id: renewal?.owner_id ?? c.account_owner_id,
        notes: renewal?.notes ?? null,
      }
    })
    .filter((row) => {
      if (filters.renewal_status) {
        if (filters.renewal_status === 'no_case' && row.renewal_status != null) return false
        if (
          filters.renewal_status !== 'no_case' &&
          row.renewal_status !== filters.renewal_status
        ) {
          return false
        }
      }
      const q = filters.search?.trim().toLowerCase()
      if (q && !row.brand_name.toLowerCase().includes(q)) return false
      if (filters.customer_id && row.customer_id !== filters.customer_id) return false
      return true
    })
    .sort((a, b) => (a.days_until_end ?? 999) - (b.days_until_end ?? 999))
}

export const mockRenewalsApi = {
  async list(filters: RenewalFilters): Promise<RenewalRow[]> {
    return buildRows(filters)
  },

  async countExpiring(withinDays: number): Promise<number> {
    return buildRows({ within_days: withinDays }).filter(
      (r) => (r.days_until_end ?? 999) <= withinDays && (r.days_until_end ?? -1) >= 0,
    ).length
  },

  async upsert(input: RenewalInput): Promise<ContractRenewal> {
    const rows = loadRenewals()
    const existing = rows.find(
      (r) => r.customer_id === input.customer_id && !['renewed', 'declined'].includes(r.status),
    )
    const now = new Date().toISOString()
    if (existing) {
      existing.status = input.status
      existing.owner_id = input.owner_id
      existing.notes = input.notes
      existing.updated_at = now
      saveRenewals(rows)
      return existing
    }
    const row: ContractRenewal = {
      id: crypto.randomUUID(),
      customer_id: input.customer_id,
      status: input.status,
      contract_end: input.contract_end,
      extension_months: null,
      owner_id: input.owner_id,
      notes: input.notes,
      created_by: input.created_by,
      created_at: now,
      updated_at: now,
    }
    rows.push(row)
    saveRenewals(rows)
    return row
  },

  async extendContract(customerId: string, months: number): Promise<void> {
    const raw = localStorage.getItem(CUST_KEY)
    const today = bangkokTodayIsoDate()
    if (raw) {
      const customers = JSON.parse(raw) as {
        id: string
        contract_end?: string | null
        status?: string
      }[]
      const c = customers.find((x) => x.id === customerId)
      if (c) {
        const base = c.contract_end && c.contract_end >= today ? c.contract_end : today
        c.contract_end = addDaysIso(base, months * 30)
        if (c.status === 'ended') c.status = 'active'
        localStorage.setItem(CUST_KEY, JSON.stringify(customers))
      }
    }
    const renewals = loadRenewals()
    const open = renewals.find((r) => r.customer_id === customerId)
    if (open) {
      open.status = 'renewed'
      open.extension_months = months
      saveRenewals(renewals)
    }
  },
}
