import { useCallback, useEffect, useState } from 'react'
import type { AppRole } from '../../../shared/types/roles'
import { canViewPaymentInstructionQueue } from '../../../shared/auth/access'
import { useNotificationRealtime } from '../../modules/notifications/NotificationRealtimeContext'
import { NOTIFICATION_PUSH_EVENT } from '../../modules/notifications/leadNotification'
import {
  listQuotationsPendingPaymentInstructions,
  notifyPaymentInstructionsSlaOverdue,
} from '../../modules/sales/api/paymentInstructions'
import type { QuotationPaymentQueueItem } from '../../modules/sales/types/paymentQueue'

const PAYMENT_QUEUE_POLL_MS = 45_000

export function useHomePaymentQueue(roles: AppRole[], configured: boolean) {
  const enabled = canViewPaymentInstructionQueue(roles) || !configured
  const realtime = useNotificationRealtime()

  const [items, setItems] = useState<QuotationPaymentQueueItem[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    if (!enabled) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        await notifyPaymentInstructionsSlaOverdue().catch(() => {})
        const rows = await listQuotationsPendingPaymentInstructions()
        setItems(rows)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'โหลดคิวชำระเงินไม่สำเร็จ')
        setItems([])
      } finally {
        setLoading(false)
      }
    })()
  }, [enabled])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    if (!enabled) return

    const onRefresh = () => reload()
    window.addEventListener(NOTIFICATION_PUSH_EVENT, onRefresh)
    window.addEventListener('focus', onRefresh)

    const interval = window.setInterval(onRefresh, PAYMENT_QUEUE_POLL_MS)
    const unsubUnread = realtime?.subscribeUnread(onRefresh) ?? (() => {})
    const unsubInsert =
      realtime?.subscribeStaffAlertInsert((row) => {
        if (
          row.dedupe_key.includes('quotation-accepted') ||
          row.dedupe_key.includes('quotation-viewed') ||
          row.dedupe_key.includes('payment-slip-pending') ||
          row.dedupe_key.includes('payment-confirmed') ||
          row.dedupe_key.includes('payment-instructions-sla')
        ) {
          onRefresh()
        }
      }) ?? (() => {})

    return () => {
      window.removeEventListener(NOTIFICATION_PUSH_EVENT, onRefresh)
      window.removeEventListener('focus', onRefresh)
      window.clearInterval(interval)
      unsubUnread()
      unsubInsert()
    }
  }, [enabled, realtime, reload])

  return {
    enabled,
    items,
    count: items.length,
    loading,
    error,
    reload,
  }
}
