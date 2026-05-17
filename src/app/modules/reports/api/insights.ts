import { canAccessNavPath } from '../../../config/navigation'
import type { AppRole } from '../../../../shared/types/roles'
import type { AdvancedReport, ReportInsight } from '../types'

export function buildReportInsights(
  report: AdvancedReport,
  roles: AppRole[] = [],
): ReportInsight[] {
  const insights: ReportInsight[] = []

  function withNav(insight: ReportInsight): ReportInsight | null {
    if (insight.link && !canAccessNavPath(roles, insight.link)) {
      return { ...insight, link: undefined }
    }
    return insight
  }

  if (report.contracts_expiring_30d > 0) {
    const item = withNav({
      id: 'contracts-expiring',
      severity: report.contracts_expiring_30d >= 3 ? 'danger' : 'warn',
      title: 'สัญญาใกล้หมดอายุ',
      body: `มี ${report.contracts_expiring_30d} ลูกค้าที่สัญญาหมดภายใน 30 วัน — ควรเปิดเคสต่อสัญญา`,
      focus: 'operations',
      link: '/app/renewals',
    })
    if (item) insights.push(item)
  }

  if (report.pending_receivables > 0) {
    const item = withNav({
      id: 'receivables',
      severity: 'warn',
      title: 'ลูกหนี้ค้าง',
      body: `มูลค่าค้างชำระรวม ${report.pending_receivables.toLocaleString('th-TH')} บาท`,
      focus: 'finance',
      link: '/app/finance',
    })
    if (item) insights.push(item)
  }

  if (report.ads_spend > 0 && report.ads_avg_roi != null && report.ads_avg_roi < 1.5) {
    const item = withNav({
      id: 'low-roi',
      severity: 'warn',
      title: 'ROI แอดต่ำ',
      body: `ROI เฉลี่ยเดือนนี้ ${report.ads_avg_roi.toFixed(2)} — ตรวจสอบแคมเปญที่ผลลัพธ์ต่ำ`,
      focus: 'ads',
      link: '/app/ads',
    })
    if (item) insights.push(item)
  }

  if (report.open_tasks >= 10) {
    const item = withNav({
      id: 'tasks-backlog',
      severity: 'info',
      title: 'คิวงานภายใน',
      body: `มีงานเปิดอยู่ ${report.open_tasks} รายการ — แนะนำจัดลำดับงานติดขัดก่อน`,
      focus: 'operations',
      link: '/app/tasks',
    })
    if (item) insights.push(item)
  }

  if (report.revenue_paid > 0 && report.active_customers > 0) {
    const arpu = report.revenue_paid / report.active_customers
    const item = withNav({
      id: 'arpu',
      severity: 'info',
      title: 'รายได้ต่อลูกค้า Active',
      body: `ประมาณ ${arpu.toLocaleString('th-TH', { maximumFractionDigits: 0 })} บาท/ลูกค้า ในเดือนนี้`,
      focus: 'finance',
      link: '/app/finance',
    })
    if (item) insights.push(item)
  }

  if (insights.length === 0) {
    const item = withNav({
      id: 'all-clear',
      severity: 'info',
      title: 'ภาพรวมปกติ',
      body: 'ไม่พบประเด็นที่ต้องเร่งด่วนในเดือนนี้ — ตรวจแดชบอร์ดเป็นระยะ',
      link: '/app/dashboard',
    })
    if (item) insights.push(item)
  }

  return insights
}
