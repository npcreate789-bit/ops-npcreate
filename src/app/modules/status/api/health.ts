import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'

export type HealthStatus = 'ok' | 'warn' | 'error' | 'skip'

export interface HealthCheckResult {
  id: string
  label: string
  status: HealthStatus
  detail: string
  latencyMs?: number
}

export async function runHealthChecks(): Promise<HealthCheckResult[]> {
  const checks: HealthCheckResult[] = [
    {
      id: 'spa',
      label: 'แอปเว็บ',
      status: 'ok',
      detail: 'โหลดและรันในบราว์เซอร์ได้',
    },
  ]

  if (!isSupabaseConfigured || !supabase) {
    checks.push({
      id: 'config',
      label: 'การตั้งค่า Supabase',
      status: 'warn',
      detail: 'ไม่พบ VITE_SUPABASE_URL / ANON_KEY — ใช้โหมดพัฒนา',
    })
    checks.push({
      id: 'db',
      label: 'ฐานข้อมูล',
      status: 'skip',
      detail: 'ข้าม — ยังไม่ได้ตั้งค่า backend',
    })
    return checks
  }

  checks.push({
    id: 'config',
    label: 'การตั้งค่า Supabase',
    status: 'ok',
    detail: 'ตัวแปรสภาพแวดล้อมครบ',
  })

  const start = performance.now()
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1)
    const latencyMs = Math.round(performance.now() - start)
    if (error) {
      checks.push({
        id: 'db',
        label: 'ฐานข้อมูล',
        status: 'error',
        detail: error.message,
        latencyMs,
      })
    } else {
      checks.push({
        id: 'db',
        label: 'ฐานข้อมูล',
        status: 'ok',
        detail: `ตอบสนองได้ · ${latencyMs} ms`,
        latencyMs,
      })
    }
  } catch (e) {
    checks.push({
      id: 'db',
      label: 'ฐานข้อมูล',
      status: 'error',
      detail: e instanceof Error ? e.message : 'เชื่อมต่อไม่ได้',
    })
  }

  return checks
}
