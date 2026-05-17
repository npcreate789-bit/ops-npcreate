import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { isClientAppPath, loginPathForReturnTo } from './postLoginPath'
import './auth.css'

/** บัญชี login แล้วแต่ยังไม่มีสิทธิ์ หรือโหลดโปรไฟล์ไม่สำเร็จ */
export function AuthAccessBlocked() {
  const { profile, profileLoadError, signOut, refreshProfile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const loginPath = loginPathForReturnTo(
    isClientAppPath(location.pathname) ? location.pathname : '/app',
  )

  async function signOutAndGoToLogin() {
    await signOut()
    navigate(loginPath, { replace: true })
  }

  if (profileLoadError) {
    return (
      <div className="auth-loading auth-loading--blocked" role="alert">
        <h2>โหลดข้อมูลบัญชีไม่สำเร็จ</h2>
        <p className="muted">
          ไม่สามารถดึงสิทธิ์จากระบบได้ชั่วคราว — ลองโหลดใหม่ ออกจากระบบแล้วเข้าใหม่
          หรือติดต่อทีมงาน
        </p>
        <p className="muted auth-blocked__error-detail">{profileLoadError}</p>
        <div className="auth-blocked__actions">
          <button
            type="button"
            className="auth-blocked__btn auth-blocked__btn--primary"
            onClick={() => void refreshProfile()}
          >
            ลองโหลดใหม่
          </button>
          <Link to="/contact" className="auth-blocked__btn">
            ติดต่อทีมงาน
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

  const accountLabel = profile?.login_id || profile?.email || 'บัญชีนี้'

  return (
    <div className="auth-loading auth-loading--blocked" role="alert">
      <h2>ยังไม่ได้รับสิทธิ์ใช้งาน</h2>
      <p className="muted">
        บัญชี <strong>{accountLabel}</strong> ยังไม่ถูกเปิดใช้งาน — ทีมจะมอบสิทธิ์หลังเริ่มสัญญา
        หรือสร้างบัญชีให้แล้ว
      </p>
      <p className="muted auth-blocked__hint">
        หากเพิ่งได้รับรหัสผ่านแล้ว อาจต้องรอทีมเปิดสิทธิ์สักครู่ หรือลองเข้าด้วยบัญชีอื่น
      </p>
      <div className="auth-blocked__actions">
        <Link to="/contact" className="auth-blocked__btn auth-blocked__btn--primary">
          ติดต่อทีมงาน
        </Link>
        <button
          type="button"
          className="auth-blocked__btn"
          onClick={() => void signOutAndGoToLogin()}
        >
          เข้าสู่ระบบด้วยบัญชีอื่น
        </button>
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
