import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthProvider'
import { SupabaseRequiredGate } from '../../shared/auth/SupabaseRequiredGate'
import { allowDevAuthBypass, requiresSupabaseInProduction } from '../../shared/supabase/runtime'
import { appHostLabel } from '../../shared/config/appUrl'
import { COMPANY_ICON_SRC } from '../../shared/company/companyProfile'
import { normalizeLoginId } from '../../shared/auth/loginId'
import { primeNotificationSound } from '../modules/notifications/notificationSound'
import {
  CLIENT_LOGIN_PATH,
  STAFF_LOGIN_PATH,
  isClientOnlyAccount,
  resolvePostLoginPath,
  type LoginAudience,
} from '../../shared/auth/postLoginPath'
import '../../shared/auth/auth.css'
import './LoginPage.css'

const COPY = {
  client: {
    title: 'พื้นที่ลูกค้า',
    subtitle: 'เข้าสู่ระบบลูกค้า NP Create',
    loginPlaceholder: 'เช่น brandabc',
    hintPrimary: 'ใช้รหัสผู้ใช้และรหัสผ่านที่ทีม NP Create แจ้งให้หลังเริ่มสัญญา',
    hintSecondary: 'ยังไม่มีบัญชี?',
    ctaSecondary: 'ส่งคำขอติดต่อทีมงาน',
    ctaSecondaryTo: '/contact',
    otherPortalLabel: 'ทีมงาน NP Create',
    otherPortalTo: STAFF_LOGIN_PATH,
  },
  staff: {
    title: 'NP Create OS',
    subtitle: 'เข้าสู่ระบบทีมงานภายใน',
    loginPlaceholder: 'เช่น sales01',
    hintPrimary: 'ใช้รหัสผู้ใช้ที่ผู้ดูแลระบบแจ้ง — ไม่ใช่อีเมล',
    hintSecondary: 'ลูกค้าที่มีบัญชีแล้ว?',
    ctaSecondary: 'เข้าสู่พื้นที่ลูกค้า',
    ctaSecondaryTo: CLIENT_LOGIN_PATH,
    otherPortalLabel: null,
    otherPortalTo: null,
  },
} as const

interface LoginPageProps {
  audience: LoginAudience
}

export function LoginPage({ audience }: LoginPageProps) {
  const { signIn, session, profile, loading, configured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const copy = COPY[audience]

  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ?? null

  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (requiresSupabaseInProduction()) {
    return <SupabaseRequiredGate />
  }

  if (!configured && allowDevAuthBypass) {
    return <Navigate to="/app" replace />
  }

  if (session && !loading && profile) {
    if (profile.must_change_password) {
      return <Navigate to="/set-password" replace />
    }
    let destination = resolvePostLoginPath(profile.roles, from)
    if (audience === 'client') {
      if (!isClientOnlyAccount(profile.roles) && profile.roles.includes('client')) {
        destination = '/app/client'
      } else if (!destination.startsWith('/app/client')) {
        destination = '/app/client'
      }
    } else if (isClientOnlyAccount(profile.roles)) {
      return <Navigate to={CLIENT_LOGIN_PATH} replace />
    }
    return <Navigate to={destination} replace />
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
    primeNotificationSound()
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
    if (audience === 'client' && !roles.includes('client')) {
      setError('บัญชีนี้ไม่ใช่บัญชีลูกค้า — ทีมงานให้เข้าที่หน้า login ทีมงาน')
      return
    }
    if (audience === 'staff' && isClientOnlyAccount(roles)) {
      navigate(CLIENT_LOGIN_PATH, { replace: true })
      return
    }

    navigate(resolvePostLoginPath(roles, from), { replace: true })
  }

  return (
    <div className={`login login--${audience}`}>
      <form className="login__card" onSubmit={handleSubmit} noValidate>
        <p className="login__portal-badge" aria-hidden>
          {audience === 'client' ? 'ลูกค้า' : 'ทีมงาน'}
        </p>

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
            รหัสผู้ใช้
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
          <Link to={copy.ctaSecondaryTo}>{copy.ctaSecondary}</Link>
        </p>

        {copy.otherPortalTo && copy.otherPortalLabel ? (
          <p className="login__hint muted">
            <Link to={copy.otherPortalTo}>{copy.otherPortalLabel}</Link>
          </p>
        ) : null}
      </form>
    </div>
  )
}
