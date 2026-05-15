import { canAccessNavPath } from '../../../config/navigation'
import type { DashboardAlert } from '../../dashboard/types'
import type { ExecutiveDashboard } from '../../dashboard/types'
import { listLeads } from '../../crm/api/leads'
import { bangkokTodayIsoDate } from '../../../../shared/dates/bangkok'
import {
  canViewRenewals,
  canViewWeeklyReport,
  hasDbPrivilegedRole,
} from '../../../../shared/auth/access'
import { countExpiringContracts } from '../../renewals/api/renewals'
import type { AppRole } from '../../../../shared/types/roles'

export interface SystemAlertInput {
  dedupe_key: string
  title: string
  body: string
  link: string
  severity: 'info' | 'warn' | 'danger'
}

function fromDashboardAlert(alert: DashboardAlert): SystemAlertInput {
  const titles: Record<string, string> = {
    'finance-overdue': 'การเงินเกินกำหนด',
    'finance-pending': 'ลูกหนี้ค้างชำระ',
    'onboarding-pending': 'รอรับบรีฟ',
    'ads-reports': 'รายงานแอดวันนี้',
    'tasks-blocked': 'งานติดขัด',
    'tasks-overdue': 'งานเกินกำหนด',
    'content-review': 'คอนเทนต์รอตรวจ',
    'content-overdue': 'คอนเทนต์เกินกำหนด',
  }
  return {
    dedupe_key: alert.id,
    title: titles[alert.id] ?? 'แจ้งเตือนระบบ',
    body: alert.message,
    link: alert.link,
    severity: alert.severity,
  }
}

function filterByNavAccess(roles: AppRole[], alerts: SystemAlertInput[]): SystemAlertInput[] {
  return alerts.filter((a) => canAccessNavPath(roles, a.link))
}

export async function buildSystemAlerts(
  userId: string,
  roles: AppRole[],
  dashboard: ExecutiveDashboard,
): Promise<SystemAlertInput[]> {
  const base = filterByNavAccess(roles, dashboard.alerts.map(fromDashboardAlert))

  const extra: SystemAlertInput[] = []

  if (hasDbPrivilegedRole(roles) || roles.includes('sales')) {
    try {
      const leads = await listLeads({})
      const now = new Date()
      const due = leads.filter(
        (l) =>
          l.reminder_at &&
          new Date(l.reminder_at) <= now &&
          l.status !== 'won' &&
          l.status !== 'not_interested' &&
          (hasDbPrivilegedRole(roles) || l.owner_id === userId),
      )
      if (due.length > 0) {
        extra.push({
          dedupe_key: 'crm-reminders-due',
          title: 'CRM — ถึงเวลาติดตาม',
          body: `มี ${due.length} Lead ถึงเวลา Reminder แล้ว`,
          link: '/app/crm',
          severity: 'warn',
        })
      }
    } catch {
      /* ignore */
    }
  }

  if (canViewRenewals(roles) && canAccessNavPath(roles, '/app/renewals')) {
    try {
      const expiring = await countExpiringContracts(30)
      if (expiring > 0) {
        extra.push({
          dedupe_key: 'contract-expiring-30d',
          title: 'สัญญาใกล้หมดอายุ',
          body: `มี ${expiring} ลูกค้าที่สัญญาหมดภายใน 30 วัน`,
          link: '/app/renewals',
          severity: expiring >= 3 ? 'danger' : 'warn',
        })
      }
    } catch {
      /* ignore */
    }
  }

  if (canViewWeeklyReport(roles) && canAccessNavPath(roles, '/app/weekly')) {
    extra.push({
      dedupe_key: 'weekly-summary',
      title: 'สรุปรายสัปดาห์',
      body: 'ตรวจ KPI 7 วันและคำแนะนำประจำสัปดาห์',
      link: '/app/weekly',
      severity: 'info',
    })
  }

  const today = bangkokTodayIsoDate()
  if (
    roles.some((r) => ['account', 'ceo', 'operations', 'dev'].includes(r)) &&
    canAccessNavPath(roles, '/app/dashboard')
  ) {
    extra.push({
      dedupe_key: `daily-check-${today}`,
      title: 'เช็กลิสต์ประจำวัน',
      body: 'ตรวจสอบภาพรวมและงานค้างในแดชบอร์ด',
      link: '/app/dashboard',
      severity: 'info',
    })
  }

  return [...base, ...filterByNavAccess(roles, extra)]
}
