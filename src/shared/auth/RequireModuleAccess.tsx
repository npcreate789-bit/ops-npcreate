import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { canAccessNavPath } from '../../app/config/navigation'
import { useAuth } from './AuthProvider'
import { defaultAppHome } from './postLoginPath'
import './auth.css'

interface RequireModuleAccessProps {
  /** path ใน NAV_ITEMS เช่น `/app/crm` */
  navPath: string
  children: ReactNode
}

export function RequireModuleAccess({ navPath, children }: RequireModuleAccessProps) {
  const { profile, loading, configured } = useAuth()

  if (!configured) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading__spinner" aria-hidden />
        <p>กำลังโหลด...</p>
      </div>
    )
  }

  const roles = profile?.roles ?? []
  if (!canAccessNavPath(roles, navPath)) {
    return <Navigate to={defaultAppHome(roles)} replace />
  }

  return <>{children}</>
}
