import type { HealthCheckResult } from './health'
import { requiresSupabaseInProduction } from '../../../../shared/supabase/runtime'

export function authHealthChecks(
  configured: boolean,
  loading: boolean,
  session: boolean,
  profile: boolean,
  profileLoadError: string | null,
): HealthCheckResult[] {
  const rows: HealthCheckResult[] = []

  if (!configured) {
    rows.push({
      id: 'auth-config',
      label: 'การยืนยันตัวตน',
      status: requiresSupabaseInProduction() ? 'error' : 'warn',
      detail: requiresSupabaseInProduction()
        ? 'Production ต้องตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY'
        : 'โหมดพัฒนา — ไม่ใช้ Supabase Auth',
    })
    return rows
  }

  if (loading) {
    rows.push({
      id: 'auth-loading',
      label: 'การยืนยันตัวตน',
      status: 'skip',
      detail: 'กำลังโหลดเซสชัน…',
    })
    return rows
  }

  rows.push({
    id: 'session',
    label: 'เซสชันเข้าสู่ระบบ',
    status: session ? 'ok' : 'error',
    detail: session ? 'มี session ที่ใช้งานได้' : 'ยังไม่ได้เข้าสู่ระบบ',
  })

  if (profileLoadError) {
    rows.push({
      id: 'profile',
      label: 'โปรไฟล์และบทบาท',
      status: 'error',
      detail: profileLoadError,
    })
  } else {
    rows.push({
      id: 'profile',
      label: 'โปรไฟล์และบทบาท',
      status: profile ? 'ok' : session ? 'warn' : 'skip',
      detail: profile ? 'โหลดโปรไฟล์สำเร็จ' : session ? 'ยังไม่มีบทบาทที่มอบหมาย' : '—',
    })
  }

  return rows
}
