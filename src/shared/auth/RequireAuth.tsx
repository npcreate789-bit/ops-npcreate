import { Link, Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { AppRole } from '../types/roles'
import { useAuth } from './AuthProvider'
import { defaultAppHome, loginPathForAudience } from './postLoginPath'
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
  const { session, profile, loading, configured, signOut } = useAuth()
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
    const loginPath = location.pathname.startsWith('/app/client')
      ? loginPathForAudience('client')
      : '/login'
    return <Navigate to={loginPath} state={{ from: location }} replace />
  }

  if (profile && profile.roles.length === 0) {
    return (
      <div className="auth-loading auth-loading--blocked">
        <h2>ยังไม่ได้รับสิทธิ์ใช้งาน</h2>
        <p className="muted">
          บัญชี <strong>{profile.login_id || profile.email}</strong> ยังไม่ถูกเปิดใช้งาน
          — ทีมจะมอบสิทธิ์หลังเริ่มสัญญาหรือสร้างบัญชีให้แล้ว
        </p>
        <div className="auth-blocked__actions">
          <Link to="/contact" className="auth-blocked__btn auth-blocked__btn--primary">
            ติดต่อทีมงาน
          </Link>
          <Link to={loginPathForAudience('client')} className="auth-blocked__btn">
            กลับหน้าเข้าสู่ระบบ
          </Link>
          <button
            type="button"
            className="auth-blocked__btn auth-blocked__btn--ghost"
            onClick={() => void signOut()}
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    )
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
