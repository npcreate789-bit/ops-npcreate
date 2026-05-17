import { useEffect, useRef } from 'react'
import { markLeadNotificationReadByLeadId } from './api/notifications'

/** รับทราบแจ้งเตือน Lead เมื่อผู้ใช้เปิดดูหน้า Lead — ปิด toast และหยุดเสียงวน */
export function useAcknowledgeLeadNotificationOnView(
  userId: string | undefined,
  leadId: string | undefined,
  enabled: boolean,
) {
  const acknowledgedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled || !userId || !leadId) return
    if (acknowledgedRef.current === leadId) return
    acknowledgedRef.current = leadId
    void markLeadNotificationReadByLeadId(userId, leadId).catch(() => {
      acknowledgedRef.current = null
    })
  }, [userId, leadId, enabled])
}
