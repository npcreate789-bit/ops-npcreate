import {
  APP_CANONICAL_HOST,
  appHostLabel,
  isCanonicalProductionHost,
  isLocalDevHost,
} from '../../../../shared/config/appUrl'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import {
  labelDbOk,
  labelDbSkipped,
  labelHostDev,
  labelHostMismatch,
  labelHostOk,
  labelSupabaseDev,
  labelSupabaseOk,
} from '../statusLabels'

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

  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const hostLabel = appHostLabel()
    checks.push({
      id: 'host',
      label: 'โดเมนแอป',
      status: isCanonicalProductionHost()
        ? 'ok'
        : isLocalDevHost()
          ? 'skip'
          : 'warn',
      detail: isCanonicalProductionHost()
        ? labelHostOk(hostLabel)
        : isLocalDevHost()
          ? labelHostDev(hostLabel)
          : labelHostMismatch(APP_CANONICAL_HOST, host),
    })
  }

  if (!isSupabaseConfigured || !supabase) {
    checks.push({
      id: 'config',
      label: 'การตั้งค่า Supabase',
      status: 'warn',
      detail: labelSupabaseDev(),
    })
    checks.push({
      id: 'db',
      label: 'ฐานข้อมูล',
      status: 'skip',
      detail: labelDbSkipped(),
    })
    return checks
  }

  checks.push({
    id: 'config',
    label: 'การตั้งค่า Supabase',
    status: 'ok',
    detail: labelSupabaseOk(),
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
        detail: labelDbOk(latencyMs),
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
