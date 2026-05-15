import { logAudit } from '../../../../shared/audit/logAudit'
import { bangkokTodayIsoDate } from '../../../../shared/dates/bangkok'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { contentFormatLabel } from '../../content/constants'
import type { ContentFormat } from '../../content/types'
import type { ClientReport } from '../types'
import { mockClientApi } from './mockStore'

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return bangkokTodayIsoDate(d)
}

async function buildClientReport(customerId: string): Promise<ClientReport | null> {
  if (!isSupabaseConfigured || !supabase) return mockClientApi.getClientReport()

  const { data: customer, error: cErr } = await supabase
    .from('customers')
    .select('id, brand_name, status, contract_end, ready_for_ads')
    .eq('id', customerId)
    .maybeSingle()

  if (cErr) throw new Error(cErr.message)
  if (!customer) return null

  const { data: checklist } = await supabase
    .from('onboarding_checklist')
    .select('status, item_key')
    .eq('customer_id', customerId)

  const total = 8
  let done = 0
  for (const row of checklist ?? []) {
    const key = row.item_key as string
    const st = row.status as string
    if (
      (['shop_link', 'product_link', 'pricing', 'ad_budget', 'system_access'].includes(key) &&
        st === 'done') ||
      (key === 'clips_ready' && st === 'yes') ||
      (['product_page', 'commission'].includes(key) && st === 'ready')
    ) {
      done += 1
    }
  }
  const onboarding_progress = Math.round((done / total) * 100)

  const since = daysAgoIso(6)
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id')
    .eq('customer_id', customerId)

  const campaignIds = (campaigns ?? []).map((c) => c.id as string)

  let last_7_days_spend = 0
  let last_7_days_gmv = 0
  let latest_report_date: string | null = null

  if (campaignIds.length > 0) {
    const { data: metrics } = await supabase
      .from('daily_metrics')
      .select('report_date, spend, gmv, roi')
      .in('campaign_id', campaignIds)
      .gte('report_date', since)
      .order('report_date', { ascending: false })

    for (const m of metrics ?? []) {
      last_7_days_spend += Number(m.spend ?? 0)
      last_7_days_gmv += Number(m.gmv ?? 0)
      if (!latest_report_date) latest_report_date = m.report_date as string
    }
  }

  const last_7_days_roi =
    last_7_days_spend > 0 ? last_7_days_gmv / last_7_days_spend : null

  const { data: contentRows } = await supabase
    .from('content_jobs')
    .select('id, title, format, deliverable_url, delivered_at')
    .eq('customer_id', customerId)
    .eq('status', 'delivered')
    .order('delivered_at', { ascending: false })
    .limit(20)

  return {
    customer: {
      id: customer.id as string,
      brand_name: customer.brand_name as string,
      status: customer.status as string,
      contract_end: (customer.contract_end as string | null) ?? null,
      ready_for_ads: Boolean(customer.ready_for_ads),
    },
    onboarding_progress,
    ads_summary: {
      last_7_days_spend,
      last_7_days_gmv,
      last_7_days_roi,
      latest_report_date,
    },
    delivered_content: (contentRows ?? []).map((r) => ({
      id: r.id as string,
      title: r.title as string,
      format: contentFormatLabel(r.format as ContentFormat),
      deliverable_url: (r.deliverable_url as string | null) ?? null,
      delivered_at: (r.delivered_at as string | null) ?? null,
    })),
  }
}

export async function fetchClientReport(
  userId: string,
  previewCustomerId?: string | null,
): Promise<ClientReport | null> {
  if (!isSupabaseConfigured || !supabase) return mockClientApi.getClientReport()

  if (previewCustomerId) {
    return buildClientReport(previewCustomerId)
  }

  const { data: access, error: accessErr } = await supabase
    .from('client_customer_access')
    .select('customer_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (accessErr) throw new Error(accessErr.message)

  const customerId = access?.customer_id as string | undefined
  if (!customerId) return null

  return buildClientReport(customerId)
}

/** privileged: ผูกบัญชี client กับลูกค้า */
export async function setClientCustomerAccess(
  userId: string,
  customerId: string | null,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return

  if (!customerId) {
    const { error } = await supabase
      .from('client_customer_access')
      .delete()
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    await logAudit('client_access.clear', 'profile', userId)
    return
  }

  const { error } = await supabase.from('client_customer_access').upsert({
    user_id: userId,
    customer_id: customerId,
  })
  if (error) throw new Error(error.message)
  await logAudit('client_access.set', 'profile', userId, { customer_id: customerId })
}

export async function getClientCustomerAccess(
  userId: string,
): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null

  const { data, error } = await supabase
    .from('client_customer_access')
    .select('customer_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data?.customer_id as string | null) ?? null
}
