import { bangkokTodayIsoDate } from '../../../shared/dates/bangkok'

/** ข้อความภาษาไทยสำหรับพื้นที่ลูกค้า — ไม่แสดงค่า raw จาก DB ต่อผู้ใช้ */
export function formatClientCustomerStatus(status: string): string {
  const map: Record<string, string> = {
    active: 'ใช้งานอยู่',
    onboarding: 'เริ่มต้น / รับบรีฟ',
    paused: 'พักชั่วคราว',
    churned: 'สิ้นสุดความร่วมมือ',
    prospect: 'รอเริ่มสัญญา',
  }
  return map[status] ?? status
}

export function formatClientReadyForAds(ready: boolean, briefSubmitted: boolean): string {
  if (ready) return 'พร้อมยิงแอด'
  if (briefSubmitted) return 'รอทีมตรวจบรีฟ'
  return 'รอกรอกบรีฟ'
}

/** วันก่อนสิ้นสัญญา (ติดลบ = เลยกำหนดแล้ว) */
export function daysUntilContractEnd(contractEnd: string | null): number | null {
  if (!contractEnd) return null
  const end = new Date(`${contractEnd}T12:00:00+07:00`)
  const todayMid = new Date(`${bangkokTodayIsoDate()}T12:00:00+07:00`)
  return Math.ceil((end.getTime() - todayMid.getTime()) / (24 * 60 * 60 * 1000))
}

export function contractEndHint(days: number | null): string | null {
  if (days == null) return null
  if (days < 0) return `สัญญาหมดอายุแล้ว ${Math.abs(days)} วัน — ติดต่อทีมต่อสัญญา`
  if (days === 0) return 'สัญญาสิ้นสุดวันนี้ — ติดต่อทีมต่อสัญญา'
  if (days <= 30) return `สัญญาเหลือ ${days} วัน — ดูรายละเอียดที่การชำระเงิน`
  return null
}
