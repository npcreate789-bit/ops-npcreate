import type { ClientReport } from '../types'

const MOCK: ClientReport = {
  customer: {
    id: 'cust-demo',
    brand_name: 'แบรนด์เดโม่',
    status: 'active',
    contract_end: '2026-12-31',
    ready_for_ads: true,
  },
  onboarding_progress: 88,
  ads_summary: {
    last_7_days_spend: 42000,
    last_7_days_gmv: 156000,
    last_7_days_roi: 3.71,
    latest_report_date: new Date().toISOString().slice(0, 10),
  },
  delivered_content: [
    {
      id: 'cjob-1',
      title: 'คลิปเปิดตัวสินค้า A',
      format: 'short_clip',
      deliverable_url: 'https://example.com/clip-a',
      delivered_at: new Date().toISOString(),
    },
  ],
}

export const mockClientApi = {
  async getClientReport(): Promise<ClientReport | null> {
    return MOCK
  },
}
