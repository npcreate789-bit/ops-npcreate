#!/usr/bin/env node
/**
 * Step 1 — Supabase setup verification for NP Create OS
 * Usage: npm run setup:step1
 */
import { readFileSync, existsSync, copyFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = resolve(root, '.env.local')
const examplePath = resolve(root, '.env.example')

function loadEnvFile(path) {
  if (!existsSync(path)) return {}
  const vars = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    vars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1).replace(/^["']|["']$/g, '')
  }
  return vars
}

function isPlaceholder(value) {
  if (!value) return true
  return (
    value.includes('your-project') ||
    value.includes('your-anon-key') ||
    value === ''
  )
}

console.log('\n=== NP Create OS — ขั้นตอนที่ 1: Supabase ===\n')

if (!existsSync(envPath)) {
  if (existsSync(examplePath)) {
    copyFileSync(examplePath, envPath)
    console.log('✓ สร้าง .env.local จาก .env.example')
    console.log('→ แก้ไข .env.local ใส่ URL และ anon key จาก Supabase Dashboard\n')
  } else {
    console.error('✗ ไม่พบ .env.example')
    process.exit(1)
  }
}

const fileEnv = loadEnvFile(envPath)
const url = process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY

if (isPlaceholder(url) || isPlaceholder(anonKey)) {
  console.log('⚠ ยังไม่ได้ตั้งค่า Supabase ใน .env.local\n')
  console.log('ทำตามนี้:')
  console.log('  1. เปิด https://supabase.com/dashboard → New project (region: Singapore)')
  console.log('  2. Settings → API → คัดลอก Project URL และ anon public key')
  console.log('  3. ใส่ใน .env.local แล้วรัน: npm run setup:step1\n')
  console.log('หรือรัน migrations ใน SQL Editor:')
  console.log('  - supabase/migrations/00001_foundation.sql')
  console.log('  - supabase/migrations/00002_leads.sql\n')
  process.exit(1)
}

const supabase = createClient(url, anonKey)

console.log('กำลังเชื่อมต่อ Supabase...')

const checks = [
  { name: 'profiles', table: 'profiles' },
  { name: 'user_roles', table: 'user_roles' },
  { name: 'audit_logs', table: 'audit_logs' },
  { name: 'leads', table: 'leads' },
  { name: 'packages', table: 'packages', sprint: 3 },
  { name: 'customers', table: 'customers', sprint: 3 },
  { name: 'quotations', table: 'quotations', sprint: 3 },
  { name: 'payments', table: 'payments', sprint: 4 },
  { name: 'onboarding_forms', table: 'onboarding_forms', sprint: 5 },
  { name: 'onboarding_checklist', table: 'onboarding_checklist', sprint: 5 },
  { name: 'campaigns', table: 'campaigns', sprint: 6 },
  { name: 'daily_metrics', table: 'daily_metrics', sprint: 6 },
  { name: 'tasks', table: 'tasks', sprint: 7 },
  { name: 'content_jobs', table: 'content_jobs', sprint: 10 },
  { name: 'client_customer_access', table: 'client_customer_access', sprint: 11 },
]

let allOk = true
for (const { name, table, sprint } of checks) {
  const { error } = await supabase.from(table).select('*', { head: true, count: 'exact' })
  if (error) {
    console.log(`✗ ตาราง ${name}: ${error.message}`)
    if (error.message.includes('does not exist') || error.code === 'PGRST205') {
      const hint =
        sprint === 11
          ? '00027_phase2_client_portal.sql'
          : sprint === 10
            ? '00026_phase2_content_jobs.sql'
            : sprint === 7
          ? '00009_tasks.sql'
          : sprint === 6
            ? '00008_ads.sql'
            : sprint === 5
            ? '00007_onboarding.sql'
            : sprint === 4
              ? '00006_finance.sql'
              : sprint === 3
                ? '00005_sales.sql'
                : 'migrations ใน SQL Editor'
      console.log(`  → รัน ${hint} หรือ: npm run db:push`)
    }
    allOk = false
  } else {
    console.log(`✓ ตาราง ${name}`)
  }
}

if (!allOk) {
  console.log('\n⚠ Migrations ยังไม่ครบ — ดูคำสั่งด้านบน\n')
  process.exit(1)
}

console.log('\n✓ ขั้นตอนที่ 1 (ฐานข้อมูล) พร้อมแล้ว')
console.log('\nขั้นต่อไป:')
console.log('  1. Dashboard → Authentication → Users → Add user')
console.log('  2. รัน SQL ใน supabase/snippets/assign_ceo_role.sql (แทน USER_ID)')
console.log('  3. npm run dev → เปิด /login\n')
