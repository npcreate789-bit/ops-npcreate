import { formatBangkokDate, formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import { CLIENT_QUESTION_OPTIONS } from '../constants'
import type { ClientQuestionKey, ClientReplyInput } from '../types'

function formatMoney(n: number) {
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
}

export function buildClientReply(input: ClientReplyInput): string {
  const { report, questionKey } = input
  const { customer, onboarding_progress, ads_summary, delivered_content } = report

  switch (questionKey) {
    case 'ads_performance': {
      const roi =
        ads_summary.last_7_days_roi != null
          ? ads_summary.last_7_days_roi.toFixed(2)
          : 'ยังไม่มีข้อมูล ROI'
      return `ผลแอดช่วง 7 วันล่าสุดของ ${customer.brand_name}:

- ใช้จ่าย (Spend): ${formatMoney(ads_summary.last_7_days_spend)} บาท
- GMV: ${formatMoney(ads_summary.last_7_days_gmv)} บาท
- ROI: ${roi}
${
  ads_summary.latest_report_date
    ? `\nรายงานล่าสุดระบบ: ${formatBangkokDate(ads_summary.latest_report_date)}`
    : ''
}

ตัวเลขนี้ดึงจากรายงานที่ทีม NP Create บันทึกในระบบ — หากต้องการรายละเอียดเชิงลึก ติดต่อ Account ของคุณได้ค่ะ/ครับ`
    }

    case 'onboarding_status':
      return `ความคืบหน้า Onboarding ของ ${customer.brand_name} อยู่ที่ประมาณ ${onboarding_progress}%

${
  onboarding_progress >= 100
    ? 'รายการหลักครบแล้ว — ทีมกำลังเตรียมขั้นตอนถัดไป (เช่น ยิงแอดหรือผลิตคอนเทนต์) ตามแพ็กเกจของคุณ'
    : 'ยังมีรายการที่ต้องเติมข้อมูล — Account จะติดตามให้จนครบก่อนเริ่มยิงแอดเต็มรูปแบบ'
}

ดูรายละเอียดเพิ่มได้จากทีม Account หรือในส่วนรายงานด้านบนของหน้านี้`

    case 'delivered_content':
      if (delivered_content.length === 0) {
        return `ยังไม่มีคอนเทนต์สถานะ "ส่งมอบแล้ว" ในระบบสำหรับ ${customer.brand_name}

เมื่อทีมอัปโหลดงานแล้ว รายการจะแสดงในส่วน "คอนเทนต์ที่ส่งมอบแล้ว" ด้านล่าง`
      }
      return `คอนเทนต์ที่ส่งมอบแล้ว (${delivered_content.length} รายการ):

${delivered_content
  .map(
    (c, i) =>
      `${i + 1}. ${c.title} (${c.format}) — ${formatBangkokDateTime(c.delivered_at)}${c.deliverable_url ? ' · มีลิงก์ไฟล์' : ''}`,
  )
  .join('\n')}`

    case 'contract_info':
      return `ข้อมูลบริการ ${customer.brand_name}:

- สถานะ: ${customer.status}
- สัญญาถึง: ${formatBangkokDate(customer.contract_end)}
- พร้อมยิงแอด: ${customer.ready_for_ads ? 'ใช่' : 'ยังไม่พร้อม'}

หากต้องการต่อสัญญาหรือปรับแพ็กเกจ ติดต่อ Account ของคุณได้โดยตรงค่ะ/ครับ`
    default:
      return 'เลือกคำถามด้านบนเพื่อดูคำตอบจากข้อมูลรายงานของคุณ'
  }
}

export function clientQuestionLabel(key: ClientQuestionKey): string {
  return CLIENT_QUESTION_OPTIONS.find((o) => o.value === key)?.label ?? key
}
