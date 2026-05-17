import { useEffect, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { effectiveRolesForNav } from '../../../config/navigation'
import { useScrollToHash } from '../../../hooks/useScrollToHash'
import { LayoutPreferencesSection } from '../../layout/components/LayoutPreferencesSection'
import { updateProfileFullName } from '../api/profile'
import { settingsRelatedLinksForRoles } from '../access'
import { SettingsNextActionBanner } from '../components/SettingsNextActionBanner'
import { SettingsRelatedToolbar } from '../components/SettingsRelatedToolbar'
import { SettingsRoleGuide } from '../components/SettingsRoleGuide'
import {
  labelAccountBackend,
  labelDisplayName,
  labelSettingsRole,
} from '../settingsLabels'
import '../../crm/crm.css'
import '../../tasks/tasks.css'
import '../../phase2/phase2.css'
import '../../layout/layout-prefs.css'
import '../settings.css'

export function SettingsPage() {
  useScrollToHash()
  const location = useLocation()
  const { profile, configured, loading, profileLoadError, refreshProfile } = useAuth()
  const roles = profile?.roles ?? []
  const navRoles = effectiveRolesForNav(roles, configured)
  const relatedLinks = settingsRelatedLinksForRoles(roles, configured)

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setFullName(profile?.full_name ?? '')
  }, [profile?.full_name])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await updateProfileFullName(profile.id, fullName)
      await refreshProfile()
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  if (loading && configured) {
    return (
      <div className="page">
        <header className="page__header phase2-page__header">
          <h1>ตั้งค่า</h1>
          <p className="muted">กำลังโหลดข้อมูลบัญชี…</p>
        </header>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__header phase2-page__header">
        <h1>ตั้งค่า</h1>
        <p className="muted">
          บัญชีของคุณและการจัดวางหน้าจอ · {labelAccountBackend(configured)}
        </p>
      </header>

      <SettingsNextActionBanner
        configured={configured}
        profile={profile}
        profileLoadError={profileLoadError}
        search={location.search}
      />

      <SettingsRoleGuide roles={roles} configured={configured} search={location.search} />

      <section id="account" className="card card--wide">
        <h2>บัญชี</h2>
        <p className="muted settings-account__intro">
          ข้อมูลส่วนตัวที่แสดงในระบบ — รหัสเข้าใช้และบทบาทจัดการที่{' '}
          <strong>ผู้ดูแลระบบ</strong> (ไม่ใช่หน้านี้)
        </p>

        <dl className="settings-summary">
          <div>
            <dt>ชื่อที่แสดง</dt>
            <dd>{labelDisplayName(profile?.full_name)}</dd>
          </div>
          <div>
            <dt>บทบาท</dt>
            <dd>
              {navRoles.length
                ? navRoles.map((r) => labelSettingsRole(r)).join(' · ')
                : 'ยังไม่ได้มอบบทบาท'}
            </dd>
          </div>
        </dl>

        <form className="settings-form" onSubmit={(e) => void handleSubmit(e)}>
          <label className="task-field task-field--full">
            <span className="task-field__label">รหัสผู้ใช้ (เข้าสู่ระบบ)</span>
            <input className="crm-input" value={profile?.login_id ?? ''} disabled readOnly />
            <span className="muted settings-field-hint">ใช้ตอนเข้าสู่ระบบ — เปลี่ยนได้เฉพาะผู้ดูแล</span>
          </label>

          <label className="task-field task-field--full">
            <span className="task-field__label">อีเมล (ระบบภายใน)</span>
            <input className="crm-input" value={profile?.email ?? ''} disabled readOnly />
            <span className="muted settings-field-hint">ใช้ยืนยันตัวตนกับ Supabase — ไม่แสดงให้ลูกค้า</span>
          </label>

          <label className="task-field task-field--full">
            <span className="task-field__label">ชื่อที่แสดง</span>
            <input
              className="crm-input"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value)
                setSaved(false)
              }}
              placeholder="ชื่อ-นามสกุล"
              maxLength={120}
              autoComplete="name"
            />
          </label>

          <div className="task-field task-field--full">
            <span className="task-field__label">บทบาทในระบบ</span>
            <div className="settings-roles">
              {(profile?.roles ?? []).map((r) => (
                <span key={r} className="settings-role-chip">
                  {labelSettingsRole(r)}
                </span>
              ))}
              {!profile?.roles?.length && (
                <span className="muted">ยังไม่ได้มอบบทบาท — ติดต่อผู้ดูแล</span>
              )}
            </div>
            <span className="muted settings-field-hint">
              แก้บทบาทที่หน้าผู้ดูแลระบบ · ไม่ใช่ที่นี่
            </span>
          </div>

          {error && <p className="crm-error">{error}</p>}
          {saved && <p className="phase2-banner--ok">บันทึกชื่อแล้ว</p>}

          <div className="settings-form__actions">
            <button type="submit" className="crm-btn crm-btn--primary" disabled={saving || !profile}>
              {saving ? 'กำลังบันทึก...' : 'บันทึกชื่อ'}
            </button>
          </div>
        </form>

        {configured && (
          <p className="muted admin-hint settings-password-hint">
            เปลี่ยนรหัสผ่าน: ใช้ลิงก์ reset จากอีเมล หรือขอผู้ดูแลระบบรีเซ็ตให้
          </p>
        )}
      </section>

      <section id="layout" className="card card--wide">
        <h2>การจัดวางหน้าจอ</h2>
        <LayoutPreferencesSection />
      </section>

      <SettingsRelatedToolbar links={relatedLinks} search={location.search} />
    </div>
  )
}
