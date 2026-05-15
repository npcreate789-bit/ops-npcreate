import {
  hasContentTeamView,
  hasDbPrivilegedRole,
  hasNavFullAccess,
} from '../../../../shared/auth/access'
import type { AppRole } from '../../../../shared/types/roles'
import { bangkokTodayIsoDate } from '../../../../shared/dates/bangkok'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { listLeads } from '../../crm/api/leads'
import type { Lead } from '../../crm/types'
import { getFinanceSummary } from '../../finance/api/payments'
import { getContentSummary } from '../../content/api/contentJobs'
import { getTaskSummary } from '../../tasks/api/tasks'
import type {
  AdsStats,
  CustomerStats,
  DashboardAlert,
  ExecutiveDashboard,
  LeadStats,
} from '../types'

const PIPELINE: Lead['status'][] = [
  'interested',
  'scheduled',
  'quotation_sent',
  'awaiting_payment',
  'follow_up',
]

function leadStats(leads: Lead[]): LeadStats {
  return {
    total: leads.length,
    pipeline: leads.filter((l) => PIPELINE.includes(l.status)).length,
    won: leads.filter((l) => l.status === 'won').length,
  }
}

async function fetchCustomerStats(): Promise<CustomerStats> {
  if (!isSupabaseConfigured || !supabase) {
    try {
      const raw = localStorage.getItem('npcreate_customers_dev')
      const rows = raw
        ? (JSON.parse(raw) as { status: string; ready_for_ads?: boolean }[])
        : []
      const onboardingRaw = localStorage.getItem('npcreate_onboarding_dev')
      let ready = 0
      if (onboardingRaw) {
        const data = JSON.parse(onboardingRaw) as Record<
          string,
          { customer: { ready_for_ads: boolean } }
        >
        ready = Object.values(data).filter((d) => d.customer.ready_for_ads).length
      }
      return {
        active: rows.filter((c) => c.status === 'active').length,
        pending_onboarding: rows.filter((c) => c.status === 'pending').length,
        ready_for_ads: ready,
      }
    } catch {
      return { active: 0, pending_onboarding: 0, ready_for_ads: 0 }
    }
  }

  const db = supabase
  const [activeRes, pendingRes, readyRes] = await Promise.all([
    db.from('customers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('customers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    db
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('ready_for_ads', true)
      .eq('status', 'active'),
  ])

  if (activeRes.error) throw new Error(activeRes.error.message)
  if (pendingRes.error) throw new Error(pendingRes.error.message)
  if (readyRes.error) throw new Error(readyRes.error.message)

  return {
    active: activeRes.count ?? 0,
    pending_onboarding: pendingRes.count ?? 0,
    ready_for_ads: readyRes.count ?? 0,
  }
}

async function fetchAdsStats(expectedCustomers: number): Promise<AdsStats> {
  const today = bangkokTodayIsoDate()

  if (!isSupabaseConfigured || !supabase) {
    try {
      const raw = localStorage.getItem('npcreate_ads_dev')
      const state = raw
        ? (JSON.parse(raw) as {
            campaigns: { id: string; customer_id: string }[]
            metrics: {
              campaign_id: string
              report_date: string
              spend: number
              gmv: number
              roi: number | null
              report_submitted: boolean
            }[]
          })
        : { campaigns: [], metrics: [] }
      const campaignToCustomer = new Map(
        state.campaigns.map((c) => [c.id, c.customer_id]),
      )
      const todayRows = state.metrics.filter((m) => m.report_date === today)
      const rois = todayRows.map((m) => m.roi).filter((r): r is number => r != null)
      const submittedBrands = new Set<string>()
      for (const row of todayRows) {
        if (!row.report_submitted) continue
        const customerId = campaignToCustomer.get(row.campaign_id)
        if (customerId) submittedBrands.add(customerId)
      }
      return {
        spend_today: todayRows.reduce((s, m) => s + m.spend, 0),
        gmv_today: todayRows.reduce((s, m) => s + m.gmv, 0),
        avg_roi: rois.length ? rois.reduce((a, b) => a + b, 0) / rois.length : null,
        reports_submitted: submittedBrands.size,
        reports_expected: expectedCustomers,
      }
    } catch {
      return {
        spend_today: 0,
        gmv_today: 0,
        avg_roi: null,
        reports_submitted: 0,
        reports_expected: expectedCustomers,
      }
    }
  }

  const { data: campaigns, error: campErr } = await supabase
    .from('campaigns')
    .select('id, customer_id, customers!inner(ready_for_ads, status)')
    .eq('customers.ready_for_ads', true)
    .eq('customers.status', 'active')

  if (campErr) throw new Error(campErr.message)

  const campaignToCustomer = new Map(
    (campaigns ?? []).map((c) => [c.id as string, c.customer_id as string]),
  )
  const campaignIds = [...campaignToCustomer.keys()]
  if (campaignIds.length === 0) {
    return {
      spend_today: 0,
      gmv_today: 0,
      avg_roi: null,
      reports_submitted: 0,
      reports_expected: expectedCustomers,
    }
  }

  const { data, error } = await supabase
    .from('daily_metrics')
    .select('campaign_id, spend, gmv, roi, report_submitted')
    .eq('report_date', today)
    .in('campaign_id', campaignIds)

  if (error) throw new Error(error.message)

  const rows = data ?? []
  const rois = rows.map((r) => Number(r.roi)).filter((n) => !Number.isNaN(n))
  const submittedBrands = new Set<string>()
  for (const row of rows) {
    if (!row.report_submitted) continue
    const customerId = campaignToCustomer.get(row.campaign_id as string)
    if (customerId) submittedBrands.add(customerId)
  }
  return {
    spend_today: rows.reduce((s, r) => s + Number(r.spend), 0),
    gmv_today: rows.reduce((s, r) => s + Number(r.gmv), 0),
    avg_roi: rois.length ? rois.reduce((a, b) => a + b, 0) / rois.length : null,
    reports_submitted: submittedBrands.size,
    reports_expected: expectedCustomers,
  }
}

function buildAlerts(
  finance: ExecutiveDashboard['finance'],
  customers: CustomerStats,
  ads: AdsStats,
  tasks: ExecutiveDashboard['tasks'],
  content: ExecutiveDashboard['content'],
): DashboardAlert[] {
  const alerts: DashboardAlert[] = []

  if (finance.overdue_count > 0) {
    alerts.push({
      id: 'finance-overdue',
      severity: 'danger',
      message: `การชำระเงินเกินกำหนด ${finance.overdue_count} รายการ`,
      link: '/app/finance',
    })
  }
  if (finance.pending_total > 0) {
    alerts.push({
      id: 'finance-pending',
      severity: 'warn',
      message: `ลูกหนี้ค้างชำระ ${finance.pending_total.toLocaleString('th-TH')} บาท`,
      link: '/app/finance',
    })
  }
  if (customers.pending_onboarding > 0) {
    alerts.push({
      id: 'onboarding-pending',
      severity: 'warn',
      message: `ลูกค้ารอรับบรีฟ ${customers.pending_onboarding} ราย`,
      link: '/app/onboarding',
    })
  }
  if (ads.reports_expected > 0 && ads.reports_submitted < ads.reports_expected) {
    alerts.push({
      id: 'ads-reports',
      severity: 'warn',
      message: `ยังไม่ส่งรายงานแอดวันนี้ ${ads.reports_expected - ads.reports_submitted}/${ads.reports_expected} แบรนด์`,
      link: '/app/ads',
    })
  }
  if (tasks.blocked_count > 0) {
    alerts.push({
      id: 'tasks-blocked',
      severity: 'danger',
      message: `งานติดขัด ${tasks.blocked_count} รายการ`,
      link: '/app/tasks',
    })
  }
  if (tasks.overdue_count > 0) {
    alerts.push({
      id: 'tasks-overdue',
      severity: 'warn',
      message: `งานเกินกำหนด ${tasks.overdue_count} รายการ`,
      link: '/app/tasks',
    })
  }
  if (content.review_count > 0) {
    alerts.push({
      id: 'content-review',
      severity: 'warn',
      message: `คอนเทนต์รอตรวจ ${content.review_count} งาน`,
      link: '/app/content',
    })
  }
  if (content.overdue_count > 0) {
    alerts.push({
      id: 'content-overdue',
      severity: 'danger',
      message: `คอนเทนต์เกินกำหนด ${content.overdue_count} งาน`,
      link: '/app/content',
    })
  }

  return alerts
}

function isExecutiveView(roles: AppRole[]): boolean {
  return hasDbPrivilegedRole(roles) || hasNavFullAccess(roles)
}

export async function fetchExecutiveDashboard(
  userId: string,
  roles: AppRole[] = [],
): Promise<ExecutiveDashboard> {
  const teamView = isExecutiveView(roles) || !isSupabaseConfigured
  const contentTeamView = hasContentTeamView(roles) || !isSupabaseConfigured

  const [finance, leads, customers, tasks, content] = await Promise.all([
    getFinanceSummary(),
    listLeads({}),
    fetchCustomerStats(),
    getTaskSummary(userId, teamView),
    getContentSummary(userId, contentTeamView),
  ])

  const ads = await fetchAdsStats(customers.ready_for_ads)
  const lead = leadStats(leads)
  const alerts = buildAlerts(finance, customers, ads, tasks, content)

  return { finance, leads: lead, customers, ads, tasks, content, alerts }
}
