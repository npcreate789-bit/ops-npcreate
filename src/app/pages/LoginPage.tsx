import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthProvider'
import { appHostLabel } from '../../shared/config/appUrl'
import { COMPANY_ICON_SRC } from '../../shared/company/companyProfile'
import { normalizeLoginId } from '../../shared/auth/loginId'
import {
  loginPathForAudience,
  parseLoginAudience,
  resolvePostLoginPath,
  type LoginAudience,
} from '../../shared/auth/postLoginPath'
import '../../shared/auth/auth.css'
import './LoginPage.css'

const COPY = {
  client: {
    title: 'พื้นที่ลูกค้า',
    subtitle: 'ดูรายงาน บรีฟงาน และความคืบหน้าของแบรนด์คุณ',
    loginLabel: 'รหัสผู้ใช้',
    loginPlaceholder: 'เช่น brandabc',
    hintPrimary: 'ใช้รหัสผู้ใช้และรหัสผ่านที่ทีม NP Create แจ้งให้หลังเริ่มสัญญา',
    hintSecondary: 'ยังไม่มีบัญชี?',
    ctaSecondary: 'ส่งคำขอติดต่อทีมงาน',
    ctaSecondaryTo: '/contact',
  },
  staff: {
    title: 'NP Create OS',
    subtitle: 'เข้าสู่ระบบทีมงานภายใน',
    loginLabel: 'รหัสผู้ใช้',
    loginPlaceholder: 'เช่น sales01',
    hintPrimary: 'ใช้รหัสผู้ใช้ที่ผู้ดูแลระบบแจ้ง — ไม่ใช่อีเมล',
    hintSecondary: 'ลูกค้าที่มีบัญชีแล้ว?',
    ctaSecondary: 'เข้าสู่พื้นที่ลูกค้า',
    ctaSecondaryTo: '/login?mode=client',
  },
} as const satisfies Record<
  LoginAudience,
  {
    title: string
    subtitle: string
    loginLabel: string
    loginPlaceholder: string
    hintPrimary: string
    hintSecondary: string
    ctaSecondary: string
    ctaSecondaryTo: string
  }
>

export function LoginPage() {
  const { signIn, session, profile, loading, configured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const mode = parseLoginAudience(searchParams.toString())
  const copy = COPY[mode]
  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ?? null

  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function setMode(next: LoginAudience) {
    setSearchParams(next === 'client' ? { mode: 'client' } : { mode: 'staff' }, { replace: true })
    setError(null)
  }

  useEffect(() => {
    if (from?.startsWith('/app/client') && mode !== 'client') {
      setSearchParams({ mode: 'client' }, { replace: true })
    }
  }, [from, mode, setSearchParams])

  if (!configured) {
    return <Navigate to="/app" replace />
  }

  if (session && !loading && profile) {
    if (profile.must_change_password) {
      return <Navigate to="/set-password" replace />
    }
    return (
      <Navigate
        to={resolvePostLoginPath(profile.roles, from)}
        replace
      />
    )
  }

  if (session && loading) {
    return (
      <div className="login">
        <div className="login__card login__card--loading" role="status">
          <div className="auth-loading__spinner" aria-hidden />
          <p className="muted">กำลังตรวจสอบบัญชี…</p>
        </div>
      </div>
    )
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

    if (result.profile?.must_change_password) {
      navigate('/set-password', { replace: true })
      return
    }

    const roles = result.profile?.roles ?? []
    navigate(resolvePostLoginPath(roles, from), { replace: true })
  }

  return (
    <div className={`login login--${mode}`}>
      <form className="login__card" onSubmit={handleSubmit} noValidate>
        <div className="login__tabs" role="tablist" aria-label="ประเภทการเข้าสู่ระบบ">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'client'}
            className={`login__tab${mode === 'client' ? ' login__tab--active' : ''}`}
            onClick={() => setMode('client')}
          >
            ลูกค้า
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'staff'}
            className={`login__tab${mode === 'staff' ? ' login__tab--active' : ''}`}
            onClick={() => setMode('staff')}
          >
            ทีมงาน
          </button>
        </div>

        <div className="login__brand">
          <img
            className="login__logo"
            src={COMPANY_ICON_SRC}
            alt="NP Create"
            width={64}
            height={64}
          />
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
          <p className="login__domain muted">{appHostLabel()}</p>
        </div>

        <div className="login-field">
          <label className="login-field__label" htmlFor="login-id">
            {copy.loginLabel}
            <span className="login-field__req" aria-hidden>
              {' '}
              *
            </span>
          </label>
          <input
            id="login-id"
            className="login-field__input"
            type="text"
            value={loginId}
            onChange={(e) => setLoginId(normalizeLoginId(e.target.value))}
            required
            autoComplete="username"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={copy.loginPlaceholder}
            minLength={3}
            maxLength={32}
          />
        </div>

        <div className="login-field">
          <label className="login-field__label" htmlFor="login-password">
            รหัสผ่าน
            <span className="login-field__req" aria-hidden>
              {' '}
              *
            </span>
          </label>
          <div className="login-field__password">
            <input
              id="login-password"
              className="login-field__input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="login-field__toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
            >
              {showPassword ? 'ซ่อน' : 'แสดง'}
            </button>
          </div>
        </div>

        {error ? (
          <p className="login__error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="login__submit" disabled={submitting}>
          {submitting ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
        </button>

        <p className="login__hint muted">{copy.hintPrimary}</p>

        <p className="login__hint login__hint--switch muted">
          {copy.hintSecondary}{' '}
          {copy.ctaSecondaryTo.startsWith('/login') ? (
            <button
              type="button"
              className="login__link-btn"
              onClick={() =>
                setMode(copy.ctaSecondaryTo.includes('client') ? 'client' : 'staff')
              }
            >
              {copy.ctaSecondary}
            </button>
          ) : (
            <Link to={copy.ctaSecondaryTo}>{copy.ctaSecondary}</Link>
          )}
        </p>

        {mode === 'staff' ? (
          <p className="login__hint muted">
            <Link to={loginPathForAudience('client')}>ลูกค้าเข้าสู่ระบบที่นี่</Link>
          </p>
        ) : null}
      </form>
    </div>
  )
}
