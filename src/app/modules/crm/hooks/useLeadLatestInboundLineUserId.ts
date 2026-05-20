import { useEffect, useState } from 'react'
import { listLeadLineMessages } from '../api/leadLineChat'

/** line_user_id ล่าสุดจากข้อความเข้า — ใช้จัดการ ID แชท OA ก่อนโหลดแผงแชทเต็ม */
export function useLeadLatestInboundLineUserId(leadId: string | undefined): string | null {
  const [lineUserId, setLineUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!leadId) {
      setLineUserId(null)
      return
    }
    let cancelled = false
    void listLeadLineMessages(leadId)
      .then((rows) => {
        if (cancelled) return
        const latest = [...rows]
          .reverse()
          .find((m) => m.direction === 'inbound' && !m.deleted_at)
        setLineUserId(latest?.line_user_id?.trim() ?? null)
      })
      .catch(() => {
        if (!cancelled) setLineUserId(null)
      })
    return () => {
      cancelled = true
    }
  }, [leadId])

  return lineUserId
}
