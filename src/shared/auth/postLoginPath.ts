import { canAccessNavPath } from '../../app/config/navigation'
import type { AppRole } from '../types/roles'

export type LoginAudience = 'client' | 'staff'

export const STAFF_LOGIN_PATH = '/login'
export const CLIENT_LOGIN_PATH = '/client/login'

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

function isLoginPath(path: string): boolean {
  return (
    path === STAFF_LOGIN_PATH ||
    path.startsWith(`${STAFF_LOGIN_PATH}?`) ||
    path === CLIENT_LOGIN_PATH ||
    path.startsWith(`${CLIENT_LOGIN_PATH}?`) ||
    path === '/login/client'
  )
}

/**
 * เลือกปลายทางหลัง login — ใช้ `from` เฉพาะเมื่อ role เข้าถึงได้
 * ลูกค้าที่ขอ `/app` จะไป Client Workspace โดยตรง
 */
export function resolvePostLoginPath(roles: AppRole[], requested?: string | null): string {
  const home = defaultAppHome(roles)

  if (!requested || isLoginPath(requested)) {
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

export function isClientAppPath(pathname: string): boolean {
  const normalized =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname
  return normalized === '/app/client' || normalized.startsWith('/app/client/')
}

export function loginPathForAudience(audience: LoginAudience): string {
  return audience === 'client' ? CLIENT_LOGIN_PATH : STAFF_LOGIN_PATH
}

export function loginPathForReturnTo(pathname: string): string {
  return isClientAppPath(pathname)
    ? loginPathForAudience('client')
    : loginPathForAudience('staff')
}

/** @deprecated ใช้ path แยก — redirect จาก ?mode=client */
export function parseLoginAudience(search: string): LoginAudience {
  const q = search.startsWith('?') ? search.slice(1) : search
  return new URLSearchParams(q).get('mode') === 'client' ? 'client' : 'staff'
}

export function loginAudienceFromPathname(pathname: string): LoginAudience | null {
  const normalized =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname
  if (normalized === CLIENT_LOGIN_PATH || normalized === '/login/client') return 'client'
  if (normalized === STAFF_LOGIN_PATH) return 'staff'
  return null
}
