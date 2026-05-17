import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { AppRole } from '../types/roles'
import { allowDevAuthBypass, requiresSupabaseInProduction } from '../supabase/runtime'
import { AuthAccessBlocked } from './AuthAccessBlocked'
import { useAuth } from './AuthProvider'
import { defaultAppHome, loginPathForReturnTo } from './postLoginPath'
import { SupabaseRequiredGate } from './SupabaseRequiredGate'
import './auth.css'

interface RequireAuthProps {
  children: ReactNode
  roles?: AppRole[]
  /** หน้าตั้งรหัสผ่านครั้งแรก — ไม่ redirect ซ้ำ */
  allowMustChangePassword?: boolean
}

export function RequireAuth({
  children,
  roles,
  allowMustChangePassword = false,
}: RequireAuthProps) {
  const { session, profile, loading, configured, profileLoadError } = useAuth()
  const location = useLocation()
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

  if (!session) {
    const loginPath = loginPathForReturnTo(location.pathname)
    return <Navigate to={loginPath} state={{ from: location }} replace />
  }

  if (profile && profile.roles.length === 0) {
    return <AuthAccessBlocked />
  }

  if (roles?.length && profile && !roles.some((r) => profile.roles.includes(r))) {
    return <Navigate to={defaultAppHome(profile.roles)} replace />
  }

  if (
    profile?.must_change_password &&
    !allowMustChangePassword &&
    location.pathname !== '/set-password'
  ) {
    return <Navigate to="/set-password" replace />
  }

  return <>{children}</>
}
