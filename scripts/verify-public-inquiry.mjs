/**
 * ทดสอบ RPC submit_public_inquiry (ต้องมี migration 00044 บน Supabase แล้ว)
 * ใช้: node scripts/verify-public-inquiry.mjs [--submit]
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
const key = process.env.VITE_SUPABASE_ANON_KEY
const doSubmit = process.argv.includes('--submit')

if (!url || !key) {
  console.error('ตั้ง VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน .env.local')
  process.exit(1)
}

const supabase = createClient(url, key)

const { error: fnErr } = await supabase.rpc('submit_public_inquiry', {
  p_brand_name: '   ',
})

if (fnErr) {
  const msg = fnErr.message ?? String(fnErr)
  if (msg.includes('Could not find the function') || msg.includes('schema cache')) {
    console.error('❌ RPC submit_public_inquiry ยังไม่มี — รัน: npm run db:push (หลัง supabase login)')
    process.exit(1)
  }
  if (msg.includes('brand_name is required')) {
    if (!doSubmit) {
      console.log('✅ RPC submit_public_inquiry พร้อมใช้งาน')
      console.log('   ทดสอบส่งจริง: node scripts/verify-public-inquiry.mjs --submit')
      process.exit(0)
    }
  } else if (msg.includes('no lead owner')) {
    console.error('❌ RPC มีแล้ว แต่ยังไม่มี Sales/owner — มอบ role sales หรือตั้ง platform_settings.default_lead_owner_id')
    process.exit(1)
  } else {
    console.error('❌ RPC error:', msg)
    process.exit(1)
  }
} else if (!doSubmit) {
  console.log('✅ RPC ตอบกลับ (ไม่คาด validation error) — ลอง --submit')
  process.exit(0)
}

const stamp = Date.now()
const { data: leadId, error: submitErr } = await supabase.rpc('submit_public_inquiry', {
  p_brand_name: `ทดสอบฟอร์ม ${stamp}`,
  p_contact_name: 'ระบบทดสอบ',
  p_phone: '0800000000',
  p_notes: 'auto verify-public-inquiry.mjs',
})

if (submitErr) {
  console.error('❌ ส่งไม่สำเร็จ:', submitErr.message)
  process.exit(1)
}

console.log('✅ สร้าง Lead สำเร็จ:', leadId)
