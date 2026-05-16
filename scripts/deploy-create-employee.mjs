#!/usr/bin/env node
/**
 * Deploy Edge Function create-employee ไปยังโปรเจกต์ใน .env.local
 *
 * ต้อง login ก่อน (ครั้งเดียว):
 *   npx supabase login
 * หรือตั้ง SUPABASE_ACCESS_TOKEN จาก Dashboard → Account → Access Tokens
 *
 * Usage: npm run functions:deploy
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = resolve(root, '.env.local')

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

function projectRefFromUrl(url) {
  const m = String(url).match(/https:\/\/([a-z0-9]+)\.supabase\.co/i)
  return m?.[1] ?? null
}

function run(label, args) {
  console.log(`\n→ ${label}\n`)
  const result = spawnSync('npx', ['supabase', ...args], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

console.log('\n=== Deploy Edge Function: create-employee ===\n')

const fileEnv = loadEnvFile(envPath)
const url = process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL
const projectRef = process.env.SUPABASE_PROJECT_REF || projectRefFromUrl(url)

if (!projectRef) {
  console.error('✗ ไม่พบ project ref — ใส่ VITE_SUPABASE_URL ใน .env.local')
  console.error('  ตัวอย่าง: https://xxxxxxxx.supabase.co\n')
  process.exit(1)
}

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.log('⚠ ยังไม่ได้ login Supabase CLI\n')
  console.log('รันคำสั่งนี้ก่อน (เปิดเบราว์เซอร์ให้ login):')
  console.log('  npx supabase login\n')
  console.log('หรือสร้าง Access Token ที่ https://supabase.com/dashboard/account/tokens')
  console.log('  แล้ว export SUPABASE_ACCESS_TOKEN=...\n')
  process.exit(1)
}

console.log(`Project ref: ${projectRef}`)

run('เชื่อมโปรเจกต์', ['link', '--project-ref', projectRef])
run('Deploy create-employee', ['functions', 'deploy', 'create-employee'])

console.log('\n✓ Deploy สำเร็จ')
console.log('\nถ้ายังไม่ได้รัน migrations สร้างพนักงาน:')
console.log('  npm run db:push')
console.log('  (หรือรัน 00038–00040 ใน SQL Editor)\n')
