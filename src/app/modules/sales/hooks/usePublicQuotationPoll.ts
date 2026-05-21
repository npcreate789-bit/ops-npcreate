import { useEffect, useRef } from 'react'
import { fetchPublicQuotation } from '../api/publicQuotation'
import { tryNotifyReviewPendingFromPublic } from '../publicPaymentLineNotify'
import type { PublicQuotation } from '../types'
import {
  publicQuotationPollIntervalMs,
  shouldPollPublicQuotation,
} from '../publicPaymentFlow'

const MAX_BACKOFF_MS = 5 * 60 * 1000

export function usePublicQuotationPoll(
  token: string | undefined,
  data: PublicQuotation | null,
  setData: (next: PublicQuotation) => void,
) {
  const prevVerificationRef = useRef<string | null>(null)
  const reviewLineSentRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!token || !data) return
    void tryNotifyReviewPendingFromPublic(token, data, reviewLineSentRef.current)
  }, [
    token,
    data?.id,
    data?.payment_verification_status,
    data?.payment_verification_decision,
    data?.slip_submitted,
    data?.pending_payment_id,
  ])

  useEffect(() => {
    if (!token || !shouldPollPublicQuotation(data)) return

    const baseInterval = publicQuotationPollIntervalMs(data)
    let backoffMs = baseInterval
    let timerId: number | null = null
    let cancelled = false

    const schedule = (ms: number) => {
      if (cancelled) return
      timerId = window.setTimeout(tick, ms)
    }

    const tick = async () => {
      timerId = null
      if (cancelled) return
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        schedule(Math.min(MAX_BACKOFF_MS, backoffMs * 2))
        return
      }
      try {
        const next = await fetchPublicQuotation(token)
        if (cancelled) return
        if (!next) {
          schedule(baseInterval)
          return
        }

        backoffMs = baseInterval

        const prev = prevVerificationRef.current
        if (
          prev === 'verifying' &&
          next.payment_verification_status === 'review_required'
        ) {
          void tryNotifyReviewPendingFromPublic(
            token,
            next,
            reviewLineSentRef.current,
          )
        }

        prevVerificationRef.current = next.payment_verification_status ?? null
        setData(next)
        schedule(publicQuotationPollIntervalMs(next))
      } catch {
        backoffMs = Math.min(MAX_BACKOFF_MS, Math.max(backoffMs * 2, baseInterval))
        schedule(backoffMs)
      }
    }

    schedule(baseInterval)

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (timerId != null) {
        window.clearTimeout(timerId)
        timerId = null
      }
      schedule(0)
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      if (timerId != null) window.clearTimeout(timerId)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [token, data?.status, data?.payment_verification_status, setData])

  useEffect(() => {
    prevVerificationRef.current = data?.payment_verification_status ?? null
  }, [data?.id, data?.payment_verification_status])
}
