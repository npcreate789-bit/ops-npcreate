import type { OpsChecklistKey } from './access'

export type OpsChecklistUiStatus = 'ok' | 'warn' | 'manual'

export const OPS_CHECKLIST_STATUS_LABEL: Record<OpsChecklistUiStatus, string> = {
  ok: 'ครบแล้ว',
  warn: 'ยังไม่ครบ',
  manual: 'ตรวจเอง',
}

export const OPS_CHECKLIST_STATUS_SYMBOL: Record<OpsChecklistUiStatus, string> = {
  ok: '✓',
  warn: '○',
  manual: '—',
}

export const OPS_CHECKLIST_TITLE: Record<OpsChecklistKey, string> = {
  env: 'ตั้งค่า Supabase',
  migrate: 'รัน migrations',
  build: 'Build production',
  deploy: 'Deploy SPA',
}

export function labelBackendConnection(configured: boolean): string {
  return configured ? 'เชื่อมแล้ว' : 'ยังไม่ตั้งค่า'
}

export function labelQuickSearch(enabled: boolean): string {
  return enabled ? 'เปิดใช้งาน' : 'ไม่มีสิทธิ์'
}

export function labelModuleAccess(count: number): string {
  return `${count} โมดูล`
}
