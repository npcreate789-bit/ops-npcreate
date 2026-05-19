import { isInquiryNotification } from './inquiryNotification'
import { isLeadNotification } from './leadNotification'
import { isLeadLineMessageNotification } from './leadLineMessageNotification'

/** Lead / คำขอติดต่อ / ข้อความ LINE เข้า — toast เสียงวนและไม่ถูก sync ลบ */
export function isStaffAlertNotification(dedupeKey: string): boolean {
  return (
    isLeadNotification(dedupeKey) ||
    isInquiryNotification(dedupeKey) ||
    isLeadLineMessageNotification(dedupeKey)
  )
}
