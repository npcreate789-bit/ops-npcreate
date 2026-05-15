import { bangkokYearMonthPrefix } from '../../../../shared/dates/bangkok'
import type { AdvancedReport } from '../types'

export const mockReportsApi = {
  async fetch(month: string): Promise<AdvancedReport> {
    const current = bangkokYearMonthPrefix()
    const factor = month === current ? 1 : 0.85
    return {
      month,
      revenue_paid: Math.round(420_000 * factor),
      payments_paid_count: Math.round(8 * factor),
      pending_receivables: 95_000,
      active_customers: 12,
      contracts_expiring_30d: 2,
      ads_spend: Math.round(180_000 * factor),
      ads_gmv: Math.round(520_000 * factor),
      ads_avg_roi: 2.4,
      content_delivered: Math.round(6 * factor),
      open_tasks: 14,
    }
  },
}
