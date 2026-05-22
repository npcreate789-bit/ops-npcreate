import { useEffect, useState } from 'react'
import {
  getCustomerLineActivity,
  type CustomerLineActivity,
} from '../api/customerLineActivity'

const POLL_INTERVAL_MS = 60_000

/**
 * Polling ทุก 60 วินาที เพื่อให้แบนเนอร์ "ลูกค้ามี LINE OA — ดู/ตอบที่ CRM"
 * อัปเดต latest inbound timestamp โดยไม่ต้องสมัคร realtime
 *
 * เลือก polling เพราะ:
 *   - ข้อความ LINE มาผ่าน webhook → row insert → ไม่จำเป็นต้องเรียลไทม์ระดับวินาที
 *   - หลีกเลี่ยง Postgres-changes subscription บน lead_line_messages เพิ่ม
 *     (ตารางนี้ subscribe อยู่ใน CRM lead page แล้ว — กันการสมัครซ้ำ)
 */
export function useCustomerLineActivity(customerId: string | null | undefined) {
  const [state, setState] = useState<CustomerLineActivity>({
    leadId: null,
    hasLineEvidence: false,
    latestInboundAt: null,
    preview: [],
  })

  useEffect(() => {
    const id = customerId?.trim()
    if (!id) {
      setState({
        leadId: null,
        hasLineEvidence: false,
        latestInboundAt: null,
        preview: [],
      })
      return
    }
    let cancelled = false

    const tick = async () => {
      try {
        const next = await getCustomerLineActivity(id)
        if (!cancelled) setState(next)
      } catch {
        /* RLS / network — ปล่อยให้แบนเนอร์ซ่อนต่อไป */
      }
    }

    void tick()
    const timer = window.setInterval(tick, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [customerId])

  return state
}
