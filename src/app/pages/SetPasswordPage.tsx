import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthProvider'
import { updateOwnPassword } from '../../shared/auth/passwordChange'
import '../../shared/auth/auth.css'
import './LoginPage.css'

export function SetPasswordPage() {
  const { profile, configured, refreshProfile } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!configured) {
    return <Navigate to="/app" replace />
  }

  if (profile && !profile.must_change_password) {
    return <Navigate to="/app" replace />
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ตั้งรหัสผ่านไม่สำเร็จ')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={(e) => void handleSubmit(e)}>
        <div className="login__brand">
          <span className="login__logo">NP</span>
          <h1>ตั้งรหัสผ่านใหม่</h1>
          <p>เข้าใช้ครั้งแรก — กำหนดรหัสผ่านของคุณเองก่อนใช้งานระบบ</p>
        </div>

        {profile && (
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            รหัสผู้ใช้: <strong>{profile.login_id}</strong>
          </p>
        )}

        <label>
          รหัสผ่านใหม่
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            autoComplete="new-password"
          />
        </label>
        <label>
          ยืนยันรหัสผ่านใหม่
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
            autoComplete="new-password"
          />
        </label>

        {error && <p className="login__error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'กำลังบันทึก…' : 'บันทึกและเข้าใช้งาน'}
        </button>
      </form>
    </div>
  )
}
