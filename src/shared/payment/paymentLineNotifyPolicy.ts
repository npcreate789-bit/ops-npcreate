import {
  fetchCompanyPaymentSettings,
  getCachedCompanyPaymentSettings,
} from './companyPaymentSettings'

export type PaymentLineNotifyEvent =
  | 'slip_received'
  | 'payment_confirmed'
  | 'slip_rejected'
  | 'review_pending'

export async function shouldSendPaymentLineNotify(
  event: PaymentLineNotifyEvent,
  forceRefresh = false,
): Promise<boolean> {
  const s = forceRefresh
    ? await fetchCompanyPaymentSettings(true)
    : getCachedCompanyPaymentSettings()

  switch (event) {
    case 'slip_received':
      return s.line_notify_slip_received
    case 'payment_confirmed':
      return s.line_notify_payment_confirmed
    case 'slip_rejected':
      return s.line_notify_slip_rejected
    case 'review_pending':
      return s.line_notify_review_pending
  }
}
