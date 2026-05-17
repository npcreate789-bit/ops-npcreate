import { useEffect, useRef } from 'react'
import { markStaffAlertReadByLeadId } from './api/notifications'

/** รับทราบแจ้งเตือน Lead / คำขอติดต่อเมื่อเปิดดูหน้า CRM — ปิด toast และหยุดเสียงวน */
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
    void markStaffAlertReadByLeadId(userId, leadId).catch(() => {
      acknowledgedRef.current = null
    })
  }, [userId, leadId, enabled])
}
