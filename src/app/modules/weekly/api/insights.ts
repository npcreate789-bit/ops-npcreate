import type { AppRole } from '../../../../shared/types/roles'
import {
  canShowWeeklyInsightLink,
  canViewWeeklyAdsMetrics,
  canViewWeeklyLeadMetrics,
} from '../access'
import type { ReportInsight } from '../../reports/types'
import type { WeeklyReport } from '../types'

export function buildWeeklyInsights(
  report: WeeklyReport,
  roles: AppRole[] = [],
): ReportInsight[] {
  const insights: ReportInsight[] = []

  function withNav(insight: ReportInsight): ReportInsight | null {
    if (insight.link && !canShowWeeklyInsightLink(roles, insight.link)) {
      return { ...insight, link: undefined }
    }
    return insight
  }

  if (report.contracts_expiring_14d > 0) {
    const item = withNav({
      id: 'weekly-renewals',
      severity: 'warn',
      title: 'สัญญาใกล้หมด (14 วัน)',
      body: `${report.contracts_expiring_14d} ลูกค้า — เปิดเคสต่อสัญญาภายในสัปดาห์นี้`,
      link: '/app/renewals',
    })
    if (item) insights.push(item)
  }

  if (report.open_tasks >= 8) {
    const item = withNav({
      id: 'weekly-tasks',
      severity: report.open_tasks >= 15 ? 'warn' : 'info',
      title: 'งานเปิดค้าง',
      body: `มีงานเปิด ${report.open_tasks} รายการ — ดูไทม์ไลน์เพื่อจัดลำดับ`,
      link: '/app/work',
    })
    if (item) insights.push(item)
  }

  if (
    canViewWeeklyAdsMetrics(roles) &&
    report.ads_spend > 0 &&
    report.ads_avg_roi != null &&
    report.ads_avg_roi < 1.5
  ) {
    const item = withNav({
      id: 'weekly-roi',
      severity: 'warn',
      title: 'ROI แอดสัปดาห์นี้ต่ำ',
      body: `ROI เฉลี่ย ${report.ads_avg_roi.toFixed(2)} จาก Spend ${report.ads_spend.toLocaleString('th-TH')} บาท`,
      link: '/app/ads',
    })
    if (item) insights.push(item)
  }

  if (canViewWeeklyLeadMetrics(roles) && report.new_leads > 0) {
    const item = withNav({
      id: 'weekly-leads',
      severity: 'info',
      title: 'Lead ใหม่',
      body: `รับ Lead ใหม่ ${report.new_leads} รายการในสัปดาห์นี้`,
      link: '/app/crm',
    })
    if (item) insights.push(item)
  }

  if (report.tasks_done > 0 && insights.length < 4) {
    const item = withNav({
      id: 'weekly-done',
      severity: 'info',
      title: 'งานเสร็จในสัปดาห์',
      body: `ปิดงานสำเร็จ ${report.tasks_done} รายการ`,
      link: '/app/tasks',
    })
    if (item) insights.push(item)
  }

  if (insights.length === 0) {
    const item = withNav({
      id: 'weekly-ok',
      severity: 'info',
      title: 'สัปดาห์นี้โดยรวมปกติ',
      body: 'ไม่พบประเด็นเร่งด่วน — ตรวจรายงานรายเดือนเพิ่มเติมได้ที่เมนูรายงาน',
      link: '/app/reports',
    })
    if (item) insights.push(item)
  }

  return insights
}
