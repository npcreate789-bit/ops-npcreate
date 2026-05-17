import { bangkokYearMonthPrefix } from '../../../../shared/dates/bangkok'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'

export interface ClientMonthlyAdsDay {
  report_date: string
  spend: number
  gmv: number
  orders: number
  roi: number | null
  report_submitted: boolean
}

export interface ClientMonthlyAdsReport {
  month: string
  brand_name: string
  days: ClientMonthlyAdsDay[]
  totals: {
    spend: number
    gmv: number
    orders: number
    roi: number | null
  }
  submitted_days: number
  days_in_month: number
}

function monthDateRange(monthPrefix: string): { start: string; end: string } {
  const [yearStr, monthStr] = monthPrefix.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const lastDay = new Date(year, month, 0).getDate()
  return {
    start: `${monthPrefix}-01`,
    end: `${monthPrefix}-${String(lastDay).padStart(2, '0')}`,
  }
}

function monthLabel(monthPrefix: string): string {
  const [y, m] = monthPrefix.split('-')
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'long',
    timeZone: 'Asia/Bangkok',
  }).format(new Date(`${y}-${m}-15T12:00:00+07:00`))
}

export { monthLabel as clientAdsMonthLabel }

function buildMockReport(_customerId: string, month: string): ClientMonthlyAdsReport {
  const { start, end } = monthDateRange(month)
  const days: ClientMonthlyAdsDay[] = []
  let d = start
  let i = 0
  while (d <= end) {
    const spend = 1000 + i * 40
    const gmv = 2800 + i * 90
    days.push({
      report_date: d,
      spend,
      gmv,
      orders: 6 + (i % 4),
      roi: spend > 0 ? gmv / spend : null,
      report_submitted: i % 5 !== 0,
    })
    i += 1
    const next = new Date(`${d}T12:00:00+07:00`)
    next.setDate(next.getDate() + 1)
    d = next.toISOString().slice(0, 10)
  }
  const spend = days.reduce((s, r) => s + r.spend, 0)
  const gmv = days.reduce((s, r) => s + r.gmv, 0)
  const orders = days.reduce((s, r) => s + r.orders, 0)
  return {
    month,
    brand_name: 'แบรนด์ Demo',
    days,
    totals: {
      spend,
      gmv,
      orders,
      roi: spend > 0 ? gmv / spend : null,
    },
    submitted_days: days.filter((x) => x.report_submitted).length,
    days_in_month: days.length,
  }
}

export async function fetchClientMonthlyAdsReport(
  customerId: string,
  month?: string,
): Promise<ClientMonthlyAdsReport | null> {
  const monthPrefix = month ?? bangkokYearMonthPrefix()

  if (!isSupabaseConfigured || !supabase) {
    return buildMockReport(customerId, monthPrefix)
  }

  const { data: customer, error: cErr } = await supabase
    .from('customers')
    .select('brand_name')
    .eq('id', customerId)
    .maybeSingle()

  if (cErr) throw new Error(cErr.message)
  if (!customer) return null

  const { data: campaigns, error: campErr } = await supabase
    .from('campaigns')
    .select('id')
    .eq('customer_id', customerId)

  if (campErr) throw new Error(campErr.message)

  const campaignIds = (campaigns ?? []).map((c) => c.id as string)
  if (campaignIds.length === 0) {
    return {
      month: monthPrefix,
      brand_name: customer.brand_name as string,
      days: [],
      totals: { spend: 0, gmv: 0, orders: 0, roi: null },
      submitted_days: 0,
      days_in_month: Number(monthDateRange(monthPrefix).end.slice(-2)),
    }
  }

  const { start, end } = monthDateRange(monthPrefix)

  const { data: metrics, error: mErr } = await supabase
    .from('daily_metrics')
    .select('report_date, spend, gmv, orders, roi, report_submitted')
    .in('campaign_id', campaignIds)
    .gte('report_date', start)
    .lte('report_date', end)
    .order('report_date')

  if (mErr) throw new Error(mErr.message)

  const byDate = new Map<string, ClientMonthlyAdsDay>()
  for (const row of metrics ?? []) {
    const date = row.report_date as string
    const existing = byDate.get(date)
    const spend = Number(row.spend ?? 0)
    const gmv = Number(row.gmv ?? 0)
    const orders = Number(row.orders ?? 0)
    if (existing) {
      existing.spend += spend
      existing.gmv += gmv
      existing.orders += orders
      existing.report_submitted =
        existing.report_submitted || Boolean(row.report_submitted)
      existing.roi = existing.spend > 0 ? existing.gmv / existing.spend : null
    } else {
      byDate.set(date, {
        report_date: date,
        spend,
        gmv,
        orders,
        roi: spend > 0 ? gmv / spend : Number(row.roi) || null,
        report_submitted: Boolean(row.report_submitted),
      })
    }
  }

  const days = [...byDate.values()].sort((a, b) =>
    a.report_date.localeCompare(b.report_date),
  )

  const spendTotal = days.reduce((s, d) => s + d.spend, 0)
  const gmvTotal = days.reduce((s, d) => s + d.gmv, 0)
  const ordersTotal = days.reduce((s, d) => s + d.orders, 0)
  const totals = {
    spend: spendTotal,
    gmv: gmvTotal,
    orders: ordersTotal,
    roi: spendTotal > 0 ? gmvTotal / spendTotal : null,
  }

  const lastDay = Number(end.slice(-2))

  return {
    month: monthPrefix,
    brand_name: customer.brand_name as string,
    days,
    totals,
    submitted_days: days.filter((d) => d.report_submitted).length,
    days_in_month: lastDay,
  }
}
