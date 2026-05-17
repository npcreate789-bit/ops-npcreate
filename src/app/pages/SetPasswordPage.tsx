import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthProvider'
import { AuthPasswordField } from '../../shared/auth/AuthPasswordField'
import { resolvePostLoginPath } from '../../shared/auth/postLoginPath'
import { updateOwnPassword } from '../../shared/auth/passwordChange'
import { appHostLabel } from '../../shared/config/appUrl'
import { COMPANY_ICON_SRC } from '../../shared/company/companyProfile'
import '../../shared/auth/auth.css'
import './LoginPage.css'

export function SetPasswordPage() {
  const { profile, configured, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!configured) {
    return <Navigate to="/app" replace />
  }

  if (loading) {
    return (
      <div className="login">
        <div className="login__card login__card--loading" role="status">
          <div className="auth-loading__spinner" aria-hidden />
          <p className="muted">กำลังโหลดบัญชี…</p>
        </div>
      </div>
    )
  }

  if (profile && !profile.must_change_password) {
    return <Navigate to={resolvePostLoginPath(profile.roles)} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
      return
    }

    if (password !== confirm) {
      setError('รหัสผ่านกับยืนยันรหัสผ่านไม่ตรงกัน')
      return
    }

    setSubmitting(true)
    try {
      await updateOwnPassword(password)
      await refreshProfile()
      const roles = profile?.roles ?? []
      navigate(resolvePostLoginPath(roles), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ตั้งรหัสผ่านไม่สำเร็จ')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login login--set-password">
      <form className="login__card" onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div className="login__brand">
          <img
            className="login__logo"
            src={COMPANY_ICON_SRC}
            alt="NP Create"
            width={64}
            height={64}
          />
          <h1>ตั้งรหัสผ่านใหม่</h1>
          <p>เข้าใช้ครั้งแรก — กำหนดรหัสผ่านของคุณก่อนใช้งานระบบ</p>
          <p className="login__domain muted">{appHostLabel()}</p>
        </div>

        {profile?.login_id ? (
          <p className="login__user-chip">
            รหัสผู้ใช้: <strong>{profile.login_id}</strong>
          </p>
        ) : null}

        <AuthPasswordField
          id="set-password-new"
          label="รหัสผ่านใหม่"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          placeholder="อย่างน้อย 8 ตัวอักษร"
          hint="ใช้อย่างน้อย 8 ตัวอักษร — หลีกเลี่ยงรหัสที่เดาง่าย เช่น 12345678"
          minLength={8}
          disabled={submitting}
        />

        <AuthPasswordField
          id="set-password-confirm"
          label="ยืนยันรหัสผ่านใหม่"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          placeholder="พิมพ์รหัสผ่านอีกครั้ง"
          minLength={8}
          disabled={submitting}
        />

        {error ? (
          <p className="login__error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="login__submit" disabled={submitting}>
          {submitting ? 'กำลังบันทึก…' : 'บันทึกและเข้าใช้งาน'}
        </button>
      </form>
    </div>
  )
}
