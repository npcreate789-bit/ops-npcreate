import { Navigate } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthProvider'
import { resolvePostLoginPath } from '../../shared/auth/postLoginPath'
import '../../shared/auth/auth.css'

export function RootRedirect() {
  const { session, profile, loading, configured } = useAuth()

  if (!configured) {
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
