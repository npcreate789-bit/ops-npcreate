/**
 * ลบข้อมูลการติดต่อ / ปฏิบัติการทั้งหมด — เก็บ packages, line snippets, products, settings และผู้ใช้ทุกคน
 * ใช้: npm run db:wipe
 * ต้องมี SUPABASE_SERVICE_ROLE_KEY ใน .env.local
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

const confirm = process.argv[2] ?? 'WIPE_KEEP_PACKAGES_CEO'
if (confirm !== 'WIPE_KEEP_PACKAGES_CEO') {
  console.error('ใช้: npm run db:wipe')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

console.log('⚠️  กำลังลบข้อมูลการติดต่อและงานปฏิบัติการทั้งหมด')
console.log('    เก็บ: packages · line snippets · products · platform settings · ผู้ใช้ทุกคน\n')

const { data, error } = await supabase.rpc('admin_wipe_data_keep_packages_and_ceo', {
  p_confirm: confirm,
})

if (error) {
  const msg = error.message ?? String(error)
  if (msg.includes('Could not find the function')) {
    console.error('❌ ยังไม่มีฟังก์ชัน — รัน: npm run db:push')
  } else {
    console.error('❌', msg)
  }
  process.exit(1)
}

console.log('✅ ลบข้อมูลการติดต่อเสร็จแล้ว')
console.log(JSON.stringify(data, null, 2))
