import type { HealthCheckResult, HealthStatus } from './api/health'

export type OverallHealth = 'checking' | 'ok' | 'degraded' | 'error'

export const HEALTH_STATUS_LABEL: Record<HealthStatus, string> = {
  ok: 'ปกติ',
  warn: 'เตือน',
  error: 'ผิดพลาด',
  skip: 'ข้าม',
}

export const OVERALL_HEALTH_LABEL: Record<OverallHealth, string> = {
  checking: 'กำลังตรวจสอบ',
  ok: 'ระบบปกติ',
  degraded: 'มีคำเตือน',
  error: 'พบปัญหา',
}

export function labelHealthStatus(status: HealthStatus): string {
  return HEALTH_STATUS_LABEL[status] ?? status
}

export function summarizeOverallHealth(
  checks: HealthCheckResult[],
  opts: { checking?: boolean; authLoading?: boolean },
): OverallHealth {
  if (opts.checking || opts.authLoading) return 'checking'
  if (checks.some((c) => c.status === 'error')) return 'error'
  if (checks.some((c) => c.status === 'warn')) return 'degraded'
  return 'ok'
}

export function labelLastChecked(at: Date | null): string {
  if (!at) return 'ยังไม่ได้ตรวจ'
  return `ตรวจล่าสุด ${at.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
}

export function labelModuleMenuCount(count: number): string {
  return `เมนูงาน ${count} รายการ`
}

export function labelHostOk(host: string): string {
  return `${host} — โดเมนหลัก production`
}

export function labelHostDev(host: string): string {
  return `${host} — พัฒนาในเครื่อง`
}

export function labelHostMismatch(expected: string, current: string): string {
  return `คาดหวัง ${expected} · ปัจจุบัน ${current}`
}

export function labelDbOk(latencyMs: number): string {
  return `ตอบสนองได้ · ${latencyMs} ms`
}

export function labelSupabaseDev(): string {
  return 'ไม่พบ VITE_SUPABASE_URL / ANON_KEY — ใช้โหมดพัฒนา'
}

export function labelSupabaseOk(): string {
  return 'ตัวแปรสภาพแวดล้อมครบ'
}

export function labelDbSkipped(): string {
  return 'ข้าม — ยังไม่ได้ตั้งค่า backend'
}
