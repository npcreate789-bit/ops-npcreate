import { useCallback, useEffect, useState } from 'react'
import type { AppRole } from '../../../shared/types/roles'
import { canViewPaymentSlipReviewQueue } from '../../../shared/auth/access'
import { useNotificationRealtime } from '../../modules/notifications/NotificationRealtimeContext'
import { NOTIFICATION_PUSH_EVENT } from '../../modules/notifications/leadNotification'
import { listPaymentsVerifyingSlip } from '../../modules/finance/api/paymentSlipReview'
import type { PaymentSlipVerifyingItem } from '../../modules/finance/types/paymentSlipQueue'

const VERIFYING_POLL_MS = 12_000

export function useHomeSlipVerifyingQueue(roles: AppRole[], configured: boolean) {
  const enabled = canViewPaymentSlipReviewQueue(roles) || !configured
  const realtime = useNotificationRealtime()

  const [items, setItems] = useState<PaymentSlipVerifyingItem[]>([])
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
    void listPaymentsVerifyingSlip()
      .then(setItems)
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
        setItems([])
      })
      .finally(() => setLoading(false))
  }, [enabled])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    if (!enabled) return

    const onRefresh = () => reload()
    window.addEventListener(NOTIFICATION_PUSH_EVENT, onRefresh)
    window.addEventListener('focus', onRefresh)

    const interval = window.setInterval(onRefresh, VERIFYING_POLL_MS)
    const unsubUnread = realtime?.subscribeUnread(onRefresh) ?? (() => {})
    const unsubInsert =
      realtime?.subscribeStaffAlertInsert((row) => {
        if (
          row.dedupe_key.includes('payment-slip-verifying') ||
          row.dedupe_key.includes('payment-slip-pending') ||
          row.dedupe_key.includes('payment-confirmed') ||
          row.dedupe_key.includes('payment-auto-confirmed')
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
