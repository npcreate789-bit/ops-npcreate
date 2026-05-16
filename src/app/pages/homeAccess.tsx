import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { AppRole } from '../../shared/types/roles'
import { canAccessNavItem, canAccessNavPath, type NavItem } from '../config/navigation'

export function HomeNavLink({
  path,
  roles,
  children,
}: {
  path: string
  roles: AppRole[]
  children: ReactNode
}) {
  if (!canAccessNavPath(roles, path)) return null
  return <Link to={path}>{children}</Link>
}

export function HomeLinks({
  roles,
  items,
}: {
  roles: AppRole[]
  items: { path: string; label: string }[]
}) {
  const visible = items.filter((item) => canAccessNavPath(roles, item.path))
  if (visible.length === 0) return null
  return (
    <>
      {visible.map((item, index) => (
        <span key={item.path}>
          {index > 0 ? ', ' : null}
          <Link to={item.path}>{item.label}</Link>
        </span>
      ))}
    </>
  )
}

export function phaseCountsForRoles(items: NavItem[], roles: AppRole[]) {
  const accessible = items.filter((i) => canAccessNavItem(roles, i))
  return {
    ready: accessible.filter((i) => i.ready).length,
    total: accessible.length,
  }
}
