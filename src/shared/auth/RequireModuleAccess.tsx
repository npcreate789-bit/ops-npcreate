import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { canAccessNavPath } from '../../app/config/navigation'
import { allowDevAuthBypass, requiresSupabaseInProduction } from '../supabase/runtime'
import { useAuth } from './AuthProvider'
import { defaultAppHome } from './postLoginPath'
import { SupabaseRequiredGate } from './SupabaseRequiredGate'
import './auth.css'

interface RequireModuleAccessProps {
  /** path ใน NAV_ITEMS เช่น `/app/crm` */
  navPath: string
  children: ReactNode
}

export function RequireModuleAccess({ navPath, children }: RequireModuleAccessProps) {
  const { profile, loading, configured, session, profileLoadError } = useAuth()
  const awaitingProfile =
    Boolean(session?.user) && configured && profile === null && !profileLoadError

  if (requiresSupabaseInProduction()) {
    return <SupabaseRequiredGate />
  }

  if (!configured && allowDevAuthBypass) {
    return <>{children}</>
  }

  if (loading || awaitingProfile) {
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
