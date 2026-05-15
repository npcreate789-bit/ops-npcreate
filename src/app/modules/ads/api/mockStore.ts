import { calcCpa, calcRoi, reportedAtNow, todayIsoDate } from '../constants'
import { normalizeProductLines } from '../productLines'
import type {
  AdsCampaignContext,
  AdsCustomerRow,
  Campaign,
  CatalogProduct,
  DailyMetric,
  DailyMetricInput,
} from '../types'

const KEY = 'npcreate_ads_dev'
const ONBOARDING_KEY = 'npcreate_onboarding_dev'

interface MockState {
  campaigns: Campaign[]
  metrics: DailyMetric[]
}

function load(): MockState {
  try {
    const raw = localStorage.getItem(KEY)
    return raw
      ? (JSON.parse(raw) as MockState)
      : { campaigns: [], metrics: [] }
  } catch {
    return { campaigns: [], metrics: [] }
  }
}

function save(state: MockState) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

function normalizeMockMetric(row: DailyMetric): DailyMetric {
  return {
    ...row,
    product_lines: normalizeProductLines(row.product_lines),
    reported_at: row.reported_at ?? null,
  }
}

function getBriefDailyBudget(customerId: string): number | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Record<
      string,
      { form?: { daily_ad_budget?: number | null } | null }
    >
    const budget = data[customerId]?.form?.daily_ad_budget
    return budget != null && Number.isFinite(Number(budget)) ? Number(budget) : null
  } catch {
    return null
  }
}

function yesterdayIso(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function listMockCustomers(): { id: string; brand_name: string; ready_for_ads: boolean; ads_owner_id: string | null }[] {
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY)
    if (raw) {
      const data = JSON.parse(raw) as Record<
        string,
        { customer: { id: string; brand_name: string; ready_for_ads: boolean; ads_owner_id: string | null } }
      >
      return Object.values(data)
        .map((d) => d.customer)
        .filter((c) => c.ready_for_ads)
    }
  } catch {
    /* ignore */
  }
  return [
    {
      id: 'mock-customer-ads-1',
      brand_name: 'แบรนด์ทดสอบ (Dev)',
      ready_for_ads: true,
      ads_owner_id: null,
    },
  ]
}

function ensureCampaign(
  state: MockState,
  customerId: string,
  adsOwnerId: string,
): Campaign {
  let c = state.campaigns.find((x) => x.customer_id === customerId)
  if (!c) {
    const briefBudget = getBriefDailyBudget(customerId)
    c = {
      id: crypto.randomUUID(),
      customer_id: customerId,
      ads_owner_id: adsOwnerId,
      name: 'แคมเปญหลัก',
      campaign_type: 'gmv_max',
      daily_budget: briefBudget ?? 500,
      status: 'active',
    }
    state.campaigns.push(c)
  } else if (c.ads_owner_id !== adsOwnerId) {
    c.ads_owner_id = adsOwnerId
  }
  return c
}

function claimMockOwner(
  customerId: string,
  adsOwnerId: string,
): { id: string; brand_name: string; ready_for_ads: boolean; ads_owner_id: string | null } | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY)
    if (!raw) return null
    const store = JSON.parse(raw) as Record<
      string,
      { customer: { id: string; brand_name: string; ready_for_ads: boolean; ads_owner_id: string | null } }
    >
    const entry = store[customerId]
    if (!entry?.customer.ready_for_ads) return null
    if (!entry.customer.ads_owner_id) {
      entry.customer.ads_owner_id = adsOwnerId
      localStorage.setItem(ONBOARDING_KEY, JSON.stringify(store))
    }
    return entry.customer
  } catch {
    return null
  }
}

export const mockAdsApi = {
  async listAdsCustomers(userId: string, privileged: boolean): Promise<AdsCustomerRow[]> {
    const state = load()
    const today = todayIsoDate()
    const yday = yesterdayIso()

    const customers = listMockCustomers().filter(
      (c) => privileged || c.ads_owner_id === userId || c.ads_owner_id === null,
    )

    const rows = customers.map((c) => {
      const campaign = state.campaigns.find((x) => x.customer_id === c.id) ?? null
      const todayMetric = campaign
        ? state.metrics.find((m) => m.campaign_id === campaign.id && m.report_date === today)
        : undefined
      const yMetric = campaign
        ? state.metrics.find((m) => m.campaign_id === campaign.id && m.report_date === yday)
        : undefined
      const briefBudget = getBriefDailyBudget(c.id)
      return {
        id: c.id,
        brand_name: c.brand_name,
        ready_for_ads: c.ready_for_ads,
        ads_owner_id: c.ads_owner_id,
        daily_budget: briefBudget ?? campaign?.daily_budget ?? null,
        campaign_id: campaign?.id ?? null,
        today_submitted: Boolean(todayMetric?.report_submitted),
        today_reported_at: todayMetric?.reported_at ?? null,
        yesterday_roi: yMetric?.roi ?? null,
      }
    })
    return rows
  },

  async getCampaignForCustomer(
    customerId: string,
    adsOwnerId: string,
    options?: { allowClaim?: boolean; privileged?: boolean },
  ): Promise<AdsCampaignContext> {
    const state = load()
    let cust = listMockCustomers().find((c) => c.id === customerId)
    if (!cust) throw new Error('ไม่พบลูกค้า')
    if (!cust.ready_for_ads) throw new Error('ลูกค้ายังไม่พร้อมยิงแอด')

    if (!cust.ads_owner_id) {
      if (options?.privileged) {
        /* ไม่ claim — ใช้ owner ชั่วคราวสำหรับแคมเปญ */
      } else if (options?.allowClaim) {
        cust = claimMockOwner(customerId, adsOwnerId) ?? cust
      } else {
        throw new Error('ยังไม่ได้มอบหมายผู้ดูแลยิงแอด — ให้ทีม Ads เปิดรายการเพื่อรับงาน')
      }
    }

    const owner = cust.ads_owner_id ?? adsOwnerId
    const campaign = ensureCampaign(state, customerId, owner)
    save(state)
    const briefDailyBudget = getBriefDailyBudget(customerId)
    return {
      campaign: {
        ...campaign,
        daily_budget: briefDailyBudget ?? campaign.daily_budget,
      },
      customerBrand: cust.brand_name,
      briefDailyBudget,
    }
  },

  async getDailyMetric(campaignId: string, reportDate: string): Promise<DailyMetric | null> {
    const state = load()
    const row = state.metrics.find((m) => m.campaign_id === campaignId && m.report_date === reportDate)
    return row ? normalizeMockMetric(row) : null
  },

  async listRecentMetrics(campaignId: string, limit = 7): Promise<DailyMetric[]> {
    const state = load()
    return state.metrics
      .filter((m) => m.campaign_id === campaignId)
      .sort((a, b) => b.report_date.localeCompare(a.report_date))
      .slice(0, limit)
      .map(normalizeMockMetric)
  },

  async upsertDailyMetric(input: DailyMetricInput): Promise<DailyMetric> {
    const state = load()
    const roi = input.roi ?? calcRoi(input.spend, input.gmv)
    const cpa = input.cpa ?? calcCpa(input.spend, input.orders)
    const idx = state.metrics.findIndex(
      (m) => m.campaign_id === input.campaign_id && m.report_date === input.report_date,
    )
    const product_lines = normalizeProductLines(input.product_lines)
    const prev = idx >= 0 ? state.metrics[idx] : null
    const row: DailyMetric = {
      id: prev?.id ?? crypto.randomUUID(),
      campaign_id: input.campaign_id,
      report_date: input.report_date,
      spend: input.spend,
      gmv: input.gmv,
      orders: input.orders,
      roi,
      cpa,
      product_lines,
      top_product: input.top_product,
      top_video: input.top_video,
      issue: input.issue,
      next_plan: input.next_plan,
      report_submitted: true,
      reported_at: prev?.reported_at ?? reportedAtNow(),
    }
    if (idx >= 0) state.metrics[idx] = row
    else state.metrics.push(row)
    save(state)
    return row
  },

  async listCatalogProducts(customerId: string): Promise<CatalogProduct[]> {
    try {
      const raw = localStorage.getItem(ONBOARDING_KEY)
      if (!raw) return []
      const data = JSON.parse(raw) as Record<
        string,
        { form?: { product_links?: string | null } | null }
      >
      const form = data[customerId]?.form
      if (!form?.product_links?.trim()) return []
      return form.product_links
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, i) => ({
          id: `mock-catalog-${customerId}-${i}`,
          product_name: line,
          sku: null,
          product_link: line.startsWith('http') ? line : null,
        }))
    } catch {
      return []
    }
  },

  async updateCampaignBudget(campaignId: string, dailyBudget: number | null): Promise<void> {
    const state = load()
    const c = state.campaigns.find((x) => x.id === campaignId)
    if (c) {
      c.daily_budget = dailyBudget
      save(state)
    }
  },
}
