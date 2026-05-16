import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { ROLE_LABELS } from '../../../../shared/types/roles'
import { useScrollToHash } from '../../../hooks/useScrollToHash'
import { LayoutPreferencesSection } from '../../layout/components/LayoutPreferencesSection'
import { updateProfileFullName } from '../api/profile'
import '../../crm/crm.css'
import '../../tasks/tasks.css'
import '../../phase2/phase2.css'
import '../../layout/layout-prefs.css'
import '../settings.css'

export function SettingsPage() {
  useScrollToHash()
  const { profile, configured, refreshProfile } = useAuth()
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

  return (
    <div className="page">
      <header className="page__header phase2-page__header">
        <h1>ตั้งค่า</h1>
        <p className="muted">บัญชีผู้ใช้และการจัดวางหน้าจอ</p>
      </header>

      {!configured && (
        <p className="crm-banner crm-banner--warn">โหมดพัฒนา — การบันทึกชื่อจะไม่ส่งไป Supabase</p>
      )}

      <section className="card card--wide">
        <h2>บัญชี</h2>
        <form className="settings-form" onSubmit={(e) => void handleSubmit(e)}>
          <label className="task-field task-field--full">
            <span className="task-field__label">รหัสผู้ใช้ (เข้าสู่ระบบ)</span>
            <input className="crm-input" value={profile?.login_id ?? ''} disabled />
          </label>

          <label className="task-field task-field--full">
            <span className="task-field__label">อีเมล (ระบบภายใน)</span>
            <input className="crm-input" value={profile?.email ?? ''} disabled />
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
            />
          </label>

          <div className="task-field task-field--full">
            <span className="task-field__label">บทบาทในระบบ</span>
            <div className="settings-roles">
              {(profile?.roles ?? []).map((r) => (
                <span key={r} className="settings-role-chip">
                  {ROLE_LABELS[r]}
                </span>
              ))}
              {!profile?.roles?.length && (
                <span className="muted">ยังไม่ได้มอบบทบาท</span>
              )}
            </div>
          </div>

          {error && <p className="crm-error">{error}</p>}
          {saved && <p className="phase2-banner--ok">บันทึกชื่อแล้ว</p>}

          <div style={{ marginTop: '1rem' }}>
            <button type="submit" className="crm-btn crm-btn--primary" disabled={saving}>
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>

        {configured && (
          <p className="muted admin-hint" style={{ marginTop: '1.25rem' }}>
            เปลี่ยนรหัสผ่านได้จากลิงก์ในอีเมล reset ของ Supabase หรือติดต่อผู้ดูแลระบบ
          </p>
        )}
      </section>

      <section id="layout" className="card card--wide">
        <h2>การจัดวางหน้าจอ</h2>
        <LayoutPreferencesSection />
      </section>
    </div>
  )
}
