import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ROLE_LABELS, type AppRole } from '../../../../shared/types/roles'
import { normalizeLoginId, validateLoginId } from '../../../../shared/auth/loginId'
import {
  assignableStaffRolesForCreator,
  canAssignCeoRole,
  canCreateEmployeeUser,
} from '../access'
import { checkLoginIdAvailable, createEmployeeUser } from '../api/createEmployee'
import type { CreateEmployeeResult } from '../types'

interface CreateEmployeeSheetProps {
  open: boolean
  creatorRoles: AppRole[]
  configured: boolean
  onClose: () => void
  onCreated: (result: CreateEmployeeResult) => void
}

type CreateStep = 'form' | 'success'

function copyText(text: string) {
  void navigator.clipboard?.writeText(text)
}

export function CreateEmployeeSheet({
  open,
  creatorRoles,
  configured,
  onClose,
  onCreated,
}: CreateEmployeeSheetProps) {
  const assignable = useMemo(
    () => assignableStaffRolesForCreator(creatorRoles),
    [creatorRoles],
  )
  const canCreate = canCreateEmployeeUser(creatorRoles) || !configured
  const mayAssignCeo = canAssignCeoRole(creatorRoles)

  const [step, setStep] = useState<CreateStep>('form')
  const [loginId, setLoginId] = useState('')
  const [fullName, setFullName] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<CreateEmployeeResult | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    setStep('form')
    setLoginId('')
    setFullName('')
    setSelectedRoles([])
    setError(null)
    setSuccess(null)
    setCopied(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, submitting, onClose])

  if (!open || !canCreate) return null

  function toggleRole(role: AppRole, checked: boolean) {
    setSelectedRoles((prev) =>
      checked ? [...new Set([...prev, role])] : prev.filter((r) => r !== role),
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setCopied(false)

    const idError = validateLoginId(loginId)
    if (idError) {
      setError(idError)
      return
    }

    const normalized = normalizeLoginId(loginId)
    const name = fullName.trim()
    if (!name) {
      setError('กรุณากรอกชื่อ-นามสกุล')
      return
    }

    if (selectedRoles.length === 0) {
      setError('เลือกอย่างน้อย 1 บทบาท')
      return
    }

    setSubmitting(true)
    try {
      const available = await checkLoginIdAvailable(normalized)
      if (!available) {
        setError('รหัสผู้ใช้นี้ถูกใช้แล้ว')
        return
      }

      const result = await createEmployeeUser({
        login_id: normalized,
        full_name: name,
        roles: selectedRoles,
      })

      setSuccess(result)
      setStep('success')
      onCreated(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สร้างบัญชีไม่สำเร็จ')
    } finally {
      setSubmitting(false)
    }
  }

  function handleCreateAnother() {
    setStep('form')
    setLoginId('')
    setFullName('')
    setSelectedRoles([])
    setError(null)
    setSuccess(null)
    setCopied(false)
  }

  return (
    <div className="admin-sheet admin-sheet--create" role="presentation">
      <button
        type="button"
        className="admin-sheet__backdrop"
        aria-label="ปิด"
        onClick={() => !submitting && onClose()}
      />
      <div
        className="admin-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-create-sheet-title"
      >
        <header className="admin-sheet__head">
          <div>
            <p className="admin-sheet__eyebrow">เพิ่มพนักงาน</p>
            <h2 id="admin-create-sheet-title">
              {step === 'form' ? 'สร้างบัญชีใหม่' : 'สร้างสำเร็จ'}
            </h2>
            <p className="muted admin-sheet__sub">
              {step === 'form'
                ? 'กรอกข้อมูลแล้วระบบออกรหัสผ่านชั่วคราวให้อัตโนมัติ'
                : 'ส่งข้อมูลเข้าใช้ให้พนักงาน — login ครั้งแรกต้องเปลี่ยนรหัสผ่าน'}
            </p>
          </div>
          <button
            type="button"
            className="crm-btn crm-btn--ghost admin-sheet__close"
            onClick={onClose}
            disabled={submitting}
            aria-label="ปิด"
          >
            ✕
          </button>
        </header>

        <ol className="admin-flow-steps" aria-label="ขั้นตอน">
          <li className={step === 'form' ? 'is-active' : 'is-done'}>
            <span className="admin-flow-steps__num">1</span>
            ข้อมูลบัญชี
          </li>
          <li className={step === 'success' ? 'is-active' : ''}>
            <span className="admin-flow-steps__num">2</span>
            พร้อมใช้งาน
          </li>
        </ol>

        {step === 'form' ? (
          <form className="admin-sheet__body" onSubmit={(e) => void handleSubmit(e)}>
            <label className="task-field">
              <span className="task-field__label">รหัสผู้ใช้ *</span>
              <input
                className="crm-input"
                value={loginId}
                onChange={(e) => setLoginId(normalizeLoginId(e.target.value))}
                placeholder="เช่น sales01"
                minLength={3}
                maxLength={32}
                required
                autoComplete="off"
                disabled={submitting}
                autoFocus
              />
              <span className="muted admin-field-hint">a-z, 0-9, . _ - (3–32 ตัว)</span>
            </label>

            <label className="task-field">
              <span className="task-field__label">ชื่อ-นามสกุล *</span>
              <input
                className="crm-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="ชื่อที่แสดงในระบบ"
                maxLength={120}
                required
                disabled={submitting}
              />
            </label>

            <fieldset className="admin-create-employee__roles" disabled={submitting}>
              <legend className="task-field__label">บทบาท *</legend>
              {!mayAssignCeo && (
                <p className="muted admin-field-hint">มอบบทบาท CEO ได้เฉพาะ CEO</p>
              )}
              <div className="admin-roles">
                {assignable.map((role) => (
                  <label
                    key={role}
                    className={`admin-role-chip${selectedRoles.includes(role) ? ' admin-role-chip--on' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role)}
                      onChange={(e) => toggleRole(role, e.target.checked)}
                    />
                    {ROLE_LABELS[role]}
                  </label>
                ))}
              </div>
            </fieldset>

            {error && (
              <p className="crm-error" role="alert">
                {error}
              </p>
            )}


            <div className="admin-sheet__actions">
              <button type="submit" className="crm-btn crm-btn--primary" disabled={submitting}>
                {submitting ? 'กำลังสร้าง…' : 'สร้างบัญชี'}
              </button>
              <button type="button" className="crm-btn crm-btn--ghost" onClick={onClose} disabled={submitting}>
                ยกเลิก
              </button>
            </div>

          </form>
        ) : (

          <div className="admin-sheet__body admin-sheet__body--success">
            {success && (
              <div className="admin-temp-password-box crm-banner crm-banner--ok">
                <p>สร้างบัญชี <strong>{success.full_name}</strong> แล้ว</p>
                <dl className="admin-temp-password-box__credentials">
                  <dt>รหัสผู้ใช้</dt>
                  <dd><code>{success.login_id}</code></dd>
                  <dt>รหัสผ่านชั่วคราว</dt>
                  <dd>
                    <code className="admin-temp-password-box__secret">{success.temporary_password}</code>
                  </dd>
                </dl>
                <button
                  type="button"
                  className="crm-btn crm-btn--ghost"
                  onClick={() => {
                    copyText(
                      `รหัสผู้ใช้: ${success.login_id}\nรหัสผ่านชั่วคราว: ${success.temporary_password}`,
                    )
                    setCopied(true)
                  }}
                >
                  {copied ? 'คัดลอกแล้ว' : 'คัดลอกข้อมูลเข้าใช้'}
                </button>
                <p className="muted admin-temp-password-box__note">
                  CEO ดูรหัสชั่วคราวได้ในรายการผู้ใช้จนกว่าพนักงานจะเปลี่ยนรหัส
                </p>
              </div>
            )}
            <div className="admin-sheet__actions">
              <button type="button" className="crm-btn crm-btn--primary" onClick={handleCreateAnother}>
                + เพิ่มพนักงานอีกคน
              </button>
              <button type="button" className="crm-btn crm-btn--ghost" onClick={onClose}>
                ปิด
              </button>
            </div>
          </div>

        )}
      </div>
    </div>
  )
}
