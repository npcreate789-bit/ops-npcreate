import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import {
  calcCpa,
  calcRoi,
  reportedAtNow,
  todayIsoDate,
  yesterdayIsoDate,
} from '../constants'
import { normalizeProductLines } from '../productLines'
import type {
  AdsCampaignContext,
  AdsCustomerRow,
  CatalogProduct,
  DailyMetric,
  DailyMetricInput,
} from '../types'
import { mockAdsApi } from './mockStore'

export async function listAdsCustomers(
  userId: string,
  privileged: boolean,
): Promise<AdsCustomerRow[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockAdsApi.listAdsCustomers(userId, privileged)
  }

  const db = supabase

  let query = db
    .from('customers')
    .select('id, brand_name, ready_for_ads, ads_owner_id, status')
    .eq('ready_for_ads', true)
    .eq('status', 'active')
    .order('brand_name')

  if (!privileged) {
    query = query.or(`ads_owner_id.eq.${userId},ads_owner_id.is.null`)
  }

  const { data: customers, error } = await query
  if (error) throw new Error(error.message)

  const today = todayIsoDate()
  const yday = yesterdayIsoDate()

  const rows = await Promise.all(
    (customers ?? []).map(async (c) => {
      const customerId = c.id as string

      const [{ data: campaign }, { data: brief }] = await Promise.all([
        db
          .from('campaigns')
          .select('id, daily_budget')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
        db
          .from('onboarding_forms')
          .select('daily_ad_budget')
          .eq('customer_id', customerId)
          .maybeSingle(),
      ])

      const campaignId = (campaign?.id as string | undefined) ?? null
      const briefBudget =
        brief?.daily_ad_budget != null ? Number(brief.daily_ad_budget) : null

      let today_submitted = false
      let today_reported_at: string | null = null
      let yesterday_roi: number | null = null

      if (campaignId) {
        const { data: todayRow } = await db
          .from('daily_metrics')
          .select('report_submitted, reported_at')
          .eq('campaign_id', campaignId)
          .eq('report_date', today)
          .maybeSingle()

        const { data: yRow } = await db
          .from('daily_metrics')
          .select('roi')
          .eq('campaign_id', campaignId)
          .eq('report_date', yday)
          .maybeSingle()

        today_submitted = Boolean(todayRow?.report_submitted)
        today_reported_at = (todayRow?.reported_at as string) ?? null
        yesterday_roi = yRow?.roi != null ? Number(yRow.roi) : null
      }

      return {
        id: customerId,
        brand_name: c.brand_name as string,
        ready_for_ads: Boolean(c.ready_for_ads),
        ads_owner_id: c.ads_owner_id as string | null,
        daily_budget:
          briefBudget ??
          (campaign?.daily_budget != null ? Number(campaign.daily_budget) : null),
        campaign_id: campaignId,
        today_submitted,
        today_reported_at,
        yesterday_roi,
      }
    }),
  )

  return rows
}

export async function getCampaignForCustomer(
  customerId: string,
  adsOwnerId: string,
  options?: { allowClaim?: boolean; privileged?: boolean },
): Promise<AdsCampaignContext> {
  if (!isSupabaseConfigured || !supabase) {
    return mockAdsApi.getCampaignForCustomer(customerId, adsOwnerId, options)
  }

  const { data: customer, error: cErr } = await supabase
    .from('customers')
    .select('brand_name, ads_owner_id, ready_for_ads, status')
    .eq('id', customerId)
    .single()

  if (cErr) throw new Error(cErr.message)
  if (!customer.ready_for_ads) throw new Error('ลูกค้ายังไม่พร้อมยิงแอด')
  if (customer.status !== 'active') throw new Error('ลูกค้ายังไม่ Active')

  let owner = customer.ads_owner_id as string | null
  if (!owner) {
    if (options?.privileged) {
      owner = adsOwnerId
    } else if (!options?.allowClaim) {
      throw new Error('ยังไม่ได้มอบหมายผู้ดูแลยิงแอด — ให้ทีม Ads เปิดรายการเพื่อรับงาน')
    } else {
      const { error: claimErr } = await supabase.rpc('claim_ads_customer', {
        p_customer_id: customerId,
        p_ads_owner_id: adsOwnerId,
      })
      if (claimErr) throw new Error(claimErr.message)
      owner = adsOwnerId
    }
  }

  const { data: campaignId, error: rpcErr } = await supabase.rpc('ensure_default_campaign', {
    p_customer_id: customerId,
    p_ads_owner_id: owner,
  })
  if (rpcErr) throw new Error(rpcErr.message)

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId as string)
    .single()

  if (error) throw new Error(error.message)

  const { data: brief } = await supabase
    .from('onboarding_forms')
    .select('daily_ad_budget')
    .eq('customer_id', customerId)
    .maybeSingle()

  const briefDailyBudget =
    brief?.daily_ad_budget != null ? Number(brief.daily_ad_budget) : null

  return {
    customerBrand: customer.brand_name as string,
    briefDailyBudget,
    campaign: {
      id: campaign.id as string,
      customer_id: campaign.customer_id as string,
      ads_owner_id: campaign.ads_owner_id as string,
      name: campaign.name as string,
      campaign_type: campaign.campaign_type as string,
      daily_budget:
        briefDailyBudget ??
        (campaign.daily_budget != null ? Number(campaign.daily_budget) : null),
      status: campaign.status as AdsCampaignContext['campaign']['status'],
    },
  }
}

export async function getDailyMetric(
  campaignId: string,
  reportDate: string,
): Promise<DailyMetric | null> {
  if (!isSupabaseConfigured || !supabase) {
    return mockAdsApi.getDailyMetric(campaignId, reportDate)
  }

  const { data, error } = await supabase
    .from('daily_metrics')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('report_date', reportDate)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return mapMetric(data)
}

export async function listRecentMetrics(campaignId: string): Promise<DailyMetric[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockAdsApi.listRecentMetrics(campaignId)
  }

  const { data, error } = await supabase
    .from('daily_metrics')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('report_date', { ascending: false })
    .limit(7)

  if (error) throw new Error(error.message)
  return (data ?? []).map(mapMetric)
}

export async function upsertDailyMetric(input: DailyMetricInput): Promise<DailyMetric> {
  const roi = input.roi ?? calcRoi(input.spend, input.gmv)
  const cpa = input.cpa ?? calcCpa(input.spend, input.orders)

  if (!isSupabaseConfigured || !supabase) {
    return mockAdsApi.upsertDailyMetric({ ...input, roi, cpa })
  }

  const product_lines = normalizeProductLines(input.product_lines)

  const { data: existing } = await supabase
    .from('daily_metrics')
    .select('reported_at')
    .eq('campaign_id', input.campaign_id)
    .eq('report_date', input.report_date)
    .maybeSingle()

  const payload = {
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
    reported_at: (existing?.reported_at as string) ?? reportedAtNow(),
    created_by: input.created_by,
  }

  const { data, error } = await supabase
    .from('daily_metrics')
    .upsert(payload, { onConflict: 'campaign_id,report_date' })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapMetric(data)
}

export async function updateCampaignBudget(
  campaignId: string,
  dailyBudget: number | null,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    await mockAdsApi.updateCampaignBudget(campaignId, dailyBudget)
    return
  }

  const { error } = await supabase
    .from('campaigns')
    .update({ daily_budget: dailyBudget })
    .eq('id', campaignId)

  if (error) throw new Error(error.message)
}

export async function listCatalogProducts(customerId: string): Promise<CatalogProduct[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockAdsApi.listCatalogProducts(customerId)
  }

  const { data, error } = await supabase
    .from('products')
    .select('id, product_name, product_link, price')
    .eq('customer_id', customerId)
    .eq('status', 'active')
    .order('product_name')

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    id: row.id as string,
    product_name: row.product_name as string,
    sku: null,
    product_link: (row.product_link as string) ?? null,
  }))
}

function mapMetric(row: Record<string, unknown>): DailyMetric {
  return {
    id: row.id as string,
    campaign_id: row.campaign_id as string,
    report_date: row.report_date as string,
    spend: Number(row.spend),
    gmv: Number(row.gmv),
    orders: Number(row.orders),
    roi: row.roi != null ? Number(row.roi) : null,
    cpa: row.cpa != null ? Number(row.cpa) : null,
    product_lines: normalizeProductLines(row.product_lines),
    top_product: (row.top_product as string) ?? null,
    top_video: (row.top_video as string) ?? null,
    issue: (row.issue as string) ?? null,
    next_plan: (row.next_plan as string) ?? null,
    report_submitted: Boolean(row.report_submitted),
    reported_at: (row.reported_at as string) ?? null,
  }
}
