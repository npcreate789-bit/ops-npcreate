import { Navigate } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthProvider'
import { SupabaseRequiredGate } from '../../shared/auth/SupabaseRequiredGate'
import { resolvePostLoginPath } from '../../shared/auth/postLoginPath'
import { allowDevAuthBypass, requiresSupabaseInProduction } from '../../shared/supabase/runtime'
import '../../shared/auth/auth.css'

export function RootRedirect() {
  const { session, profile, loading, configured } = useAuth()

  if (requiresSupabaseInProduction()) {
    return <SupabaseRequiredGate />
  }

  if (!configured && allowDevAuthBypass) {
    return <Navigate to="/app" replace />
  }

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading__spinner" aria-hidden />
        <p>กำลังโหลด...</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (profile?.must_change_password) {
    return <Navigate to="/set-password" replace />
  }

  return <Navigate to={resolvePostLoginPath(profile?.roles ?? [])} replace />
}
