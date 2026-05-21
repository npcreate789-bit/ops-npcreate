/**
 * แก้ Lead ที่ค้าง awaiting_payment ขณะใบเสนอราคายัง accepted (flow เฟส 3)
 * ใช้: node scripts/backfill-lead-status-after-accept.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    const key = t.slice(0, i)
    const val = t.slice(i + 1).replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvLocal()

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('ตั้ง VITE_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

const { data: quotations, error: qErr } = await supabase
  .from('quotations')
  .select('id, lead_id')
  .eq('status', 'accepted')
  .not('lead_id', 'is', null)

if (qErr) {
  console.error(qErr.message)
  process.exit(1)
}

const leadIds = [
  ...new Set((quotations ?? []).map((q) => q.lead_id).filter(Boolean)),
]

if (leadIds.length === 0) {
  console.log('ไม่มีใบ accepted ที่ผูก Lead')
  process.exit(0)
}

const { data: leads, error: lErr } = await supabase
  .from('leads')
  .select('id, brand_name, status')
  .in('id', leadIds)
  .eq('status', 'awaiting_payment')

if (lErr) {
  console.error(lErr.message)
  process.exit(1)
}

if (!leads?.length) {
  console.log('ไม่มี Lead ที่ต้อง backfill')
  process.exit(0)
}

const { error: upErr } = await supabase
  .from('leads')
  .update({ status: 'quotation_sent' })
  .in(
    'id',
    leads.map((l) => l.id),
  )

if (upErr) {
  console.error(upErr.message)
  process.exit(1)
}

for (const l of leads) {
  console.log(`  ${l.brand_name} (${l.id}) → quotation_sent`)
}
console.log(`อัปเดต ${leads.length} Lead`)
