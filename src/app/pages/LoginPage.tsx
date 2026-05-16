import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthProvider'
import { normalizeLoginId } from '../../shared/auth/loginId'
import '../../shared/auth/auth.css'
import './LoginPage.css'

export function LoginPage() {
  const { signIn, session, configured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/app'

  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!configured) {
    return <Navigate to="/app" replace />
  }

  if (session) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const result = await signIn(loginId, password)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={handleSubmit}>
        <div className="login__brand">
          <span className="login__logo">NP</span>
          <h1>NP Create OS</h1>
          <p>เข้าสู่ระบบบริหารงานกลาง</p>
        </div>

        <label>
          รหัสผู้ใช้
          <input
            type="text"
            value={loginId}
            onChange={(e) => setLoginId(normalizeLoginId(e.target.value))}
            required
            autoComplete="username"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="เช่น sales01"
            minLength={3}
            maxLength={32}
          />
        </label>
        <label>
          รหัสผ่าน
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>

        {error && <p className="login__error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
        </button>

        <p className="login__hint muted">
          ใช้รหัสผู้ใช้ที่ผู้ดูแลระบบแจ้ง — ไม่ใช่อีเมล
        </p>
      </form>
    </div>
  )
}
