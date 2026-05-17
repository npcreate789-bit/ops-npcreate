import { canAccessNavPath } from '../../app/config/navigation'
import type { AppRole } from '../types/roles'

export type LoginAudience = 'client' | 'staff'

/** บัญชีที่มีเฉพาะบทบาท client */
export function isClientOnlyAccount(roles: AppRole[]): boolean {
  return roles.length > 0 && roles.every((r) => r === 'client')
}

/** หน้าแรกหลัง login ตามบทบาท */
export function defaultAppHome(roles: AppRole[]): string {
  if (isClientOnlyAccount(roles)) return '/app/client'
  return '/app'
}

function isSafeAppPath(path: string): boolean {
  return path.startsWith('/app') && !path.startsWith('//')
}

/**
 * เลือกปลายทางหลัง login — ใช้ `from` เฉพาะเมื่อ role เข้าถึงได้
 * ลูกค้าที่ขอ `/app` จะไป Client Workspace โดยตรง
 */
export function resolvePostLoginPath(roles: AppRole[], requested?: string | null): string {
  const home = defaultAppHome(roles)

  if (!requested || requested === '/login' || requested.startsWith('/login')) {
    return home
  }

  if (!isSafeAppPath(requested)) {
    return home
  }

  if (requested === '/app' && isClientOnlyAccount(roles)) {
    return '/app/client'
  }

  if (canAccessNavPath(roles, requested)) {
    return requested
  }

  return home
}

export function loginPathForAudience(audience: LoginAudience): string {
  return audience === 'client' ? '/login?mode=client' : '/login?mode=staff'
}

export function parseLoginAudience(search: string): LoginAudience {
  const q = search.startsWith('?') ? search.slice(1) : search
  return new URLSearchParams(q).get('mode') === 'client' ? 'client' : 'staff'
}
