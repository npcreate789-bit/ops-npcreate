import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { STAFF_PROMPT_OPTIONS } from '../constants'
import type { StaffCustomerContext, StaffPromptKey, StaffReplyInput } from '../types'

export async function fetchStaffCustomerContext(
  customerId: string,
): Promise<StaffCustomerContext | null> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      brand_name: 'แบรนด์ตัวอย่าง',
      status: 'active',
      contract_end: '2026-12-31',
      ready_for_ads: true,
      onboarding_progress: 75,
      open_tasks: 2,
    }
  }

  const { data: customer, error: cErr } = await supabase
    .from('customers')
    .select('brand_name, status, contract_end, ready_for_ads')
    .eq('id', customerId)
    .maybeSingle()

  if (cErr) throw new Error(cErr.message)
  if (!customer) return null

  let onboarding_progress: number | null = null
  const { data: checklist } = await supabase
    .from('onboarding_checklist')
    .select('status, item_key')
    .eq('customer_id', customerId)

  if (checklist?.length) {
    const total = 8
    let done = 0
    for (const row of checklist) {
      const key = row.item_key as string
      const st = row.status as string
      if (
        (['shop_link', 'product_link', 'pricing', 'ad_budget', 'system_access'].includes(key) &&
          st === 'done') ||
        (key === 'clips_ready' && st === 'yes') ||
        (['product_page', 'commission'].includes(key) && st === 'ready')
      ) {
        done += 1
      }
    }
    onboarding_progress = Math.round((done / total) * 100)
  }

  const { count } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', customerId)
    .neq('status', 'done')

  return {
    brand_name: customer.brand_name as string,
    status: customer.status as string,
    contract_end: (customer.contract_end as string | null) ?? null,
    ready_for_ads: Boolean(customer.ready_for_ads),
    onboarding_progress,
    open_tasks: count ?? 0,
  }
}

export function buildStaffReply(input: StaffReplyInput): string {
  const { promptKey, customer, userDisplayName } = input
  const who = userDisplayName?.trim() || 'ทีม NP Create'
  const brand = customer?.brand_name ?? '[ชื่อแบรนด์]'

  switch (promptKey) {
    case 'crm_followup':
      return `สวัสดีค่ะ/ครับ จาก ${who} นะคะ/ครับ

ขออัปเดตการดูแล ${brand} — หลังจากคุยครั้งที่แล้น อยากสอบถามว่าตอนนี้สนใจเริ่มแพ็กเกจหรือมีคำถามเพิ่มเติมไหมคะ/ครับ

หากสะดวก แจ้งช่วงเวลาที่โทรกลับได้ หรือตอบกลับข้อความนี้ได้เลยค่ะ/ครับ ขอบคุณมากค่ะ/ครับ`

    case 'renewal_pitch':
      return `เรียนคุณลูกค้า ${brand}

${who} ติดต่อเรื่องการต่อสัญญาบริการค่ะ/ครับ${
        customer?.contract_end
          ? ` สัญญาปัจจุบันสิ้นสุดประมาณ ${formatBangkokDate(customer.contract_end)}`
          : ''
      }

เราพร้อมเสนอแพ็กเกจต่อเนื่องที่สอดคล้องผลลัพธ์ช่วงที่ผ่านมา หากสะดวกนัดคุย 30 นาทีเพื่อสรุปตัวเลขและข้อเสนอใหม่ได้ค่ะ/ครับ

รบกวนแจ้งช่วงเวลาที่สะดวก หรือต้องการใบเสนอราคาเบื้องต้นก่อนได้เลยค่ะ/ครับ`

    case 'content_brief':
      return `บรีฟคอนเทนต์ — ${brand}

1. เป้าหมายคลิป: [ระบุ เช่น ขาย/รีวิว/ให้ความรู้]
2. โทนและสไตล์: [สนุก / มืออาชีพ / UGC]
3. สินค้า/โปรโมชันที่ต้องเน้น:
4. ความยาวและฟอร์แมต: Short clip / Live / Graphic
5. กำหนดส่งมอบ:
6. ข้อห้าม/ข้อควรระวัง:

${
  customer?.onboarding_progress != null
    ? `ความคืบหน้า Onboarding ปัจจุบัน ~${customer.onboarding_progress}% — ใช้ข้อมูลสินค้าที่มีในระบบเป็นฐานได้`
    : 'กรอกรายละเอียดสินค้าจาก Onboarding ก่อนส่งต่อทีมผลิต'
}`

    case 'ads_summary':
      return `สรุปผลแอดสำหรับ ${brand} (ร่างส่งลูกค้า)

ช่วง 7 วันที่ผ่านมา ทีมดูแลแคมเปญอยู่ระหว่างรวบรวมตัวเลขรายวัน — โดยทั่วไปจะสรุป Spend, GMV และ ROI ให้ในรายงานประจำสัปดาห์

${
  customer?.ready_for_ads
    ? 'บัญชีอยู่ในสถานะพร้อมยิงแอด — หากต้องการปรับงบหรือโปรโมชัน แจ้ง Account ได้เลย'
    : 'ยังอยู่ระหว่างเตรียมบัญชี/สินค้า — แนะนำเช็ก Onboarding ให้ครบก่อนเร่งงบ'
}

ข้อความนี้เป็นร่าง — แทนที่ตัวเลขจริงจากหน้า Ads ก่อนส่งลูกค้า`

    case 'onboarding_checkin':
      return `เช็กลิสต์ Onboarding — ${brand}

${
  customer?.onboarding_progress != null
    ? `ความคืบหน้าโดยประมาณ ${customer.onboarding_progress}%`
    : 'ยังไม่มีข้อมูล checklist ในระบบ'
}${customer?.open_tasks != null && customer.open_tasks > 0 ? `\nงานภายในที่ผูกลูกค้านี้ค้าง: ${customer.open_tasks} รายการ` : ''}

แนะนำติดตาม:
- ลิงก์ร้าน / สินค้า / ราคา
- งบแอดและเป้า ROI
- สิทธิ์เข้าระบบ (Seller / BC)
- คลิปตัวอย่างพร้อมยิง

เมื่อครบแล้วตั้ง ready_for_ads และมอบทีม Ads ตามขั้นตอนในระบบ`
    default:
      return 'เลือกประเภทคำตอบด้านบนแล้วกดสร้างข้อความ'
  }
}

export function staffPromptLabel(key: StaffPromptKey): string {
  return STAFF_PROMPT_OPTIONS.find((o) => o.value === key)?.label ?? key
}
