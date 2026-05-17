import { isInquiryNotification } from './inquiryNotification'
import { isLeadNotification } from './leadNotification'

/** Lead ใหม่ + คำขอติดต่อจากฟอร์มสาธารณะ — toast เสียงวนและไม่ถูก sync ลบ */
export function isStaffAlertNotification(dedupeKey: string): boolean {
  return isLeadNotification(dedupeKey) || isInquiryNotification(dedupeKey)
}
