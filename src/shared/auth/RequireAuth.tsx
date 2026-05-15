import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { AppRole } from '../types/roles'
import { useAuth } from './AuthProvider'
import './auth.css'

interface RequireAuthProps {
  children: ReactNode
  roles?: AppRole[]
}

export function RequireAuth({ children, roles }: RequireAuthProps) {
  const { session, profile, loading, configured } = useAuth()
  const location = useLocation()

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

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (profile && profile.roles.length === 0) {
    return (
      <div className="auth-loading auth-loading--blocked">
        <h2>ยังไม่ได้รับสิทธิ์ใช้งาน</h2>
        <p className="muted">
          บัญชี {profile.email} ยังไม่มีบทบาทในระบบ — ติดต่อผู้ดูแลเพื่อมอบหมาย role
        </p>
      </div>
    )
  }

  if (roles?.length && profile && !roles.some((r) => profile.roles.includes(r))) {
    return <Navigate to="/app" replace />
  }

  return <>{children}</>
}
