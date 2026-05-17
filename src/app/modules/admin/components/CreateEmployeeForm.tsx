import { useMemo, useState, type FormEvent } from 'react'
import { ROLE_LABELS, type AppRole } from '../../../../shared/types/roles'
import { normalizeLoginId, validateLoginId } from '../../../../shared/auth/loginId'
import { assignableStaffRolesForCreator, canCreateEmployeeUser } from '../access'
import { checkLoginIdAvailable, createEmployeeUser } from '../api/createEmployee'
import type { CreateEmployeeResult } from '../types'

interface CreateEmployeeFormProps {
  creatorRoles: AppRole[]
  configured: boolean
  onCreated: (result: CreateEmployeeResult) => void
}

function copyText(text: string) {
  void navigator.clipboard?.writeText(text)
}

export function CreateEmployeeForm({
  creatorRoles,
  configured,
  onCreated,
}: CreateEmployeeFormProps) {
  const assignable = useMemo(
    () => assignableStaffRolesForCreator(creatorRoles),
    [creatorRoles],
  )

  const [loginId, setLoginId] = useState('')
  const [fullName, setFullName] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<CreateEmployeeResult | null>(null)
  const [copied, setCopied] = useState(false)

  const canCreate = canCreateEmployeeUser(creatorRoles) || !configured

  if (!canCreate) return null

  function toggleRole(role: AppRole, checked: boolean) {
    setSelectedRoles((prev) =>
      checked ? [...new Set([...prev, role])] : prev.filter((r) => r !== role),
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
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
      setLoginId('')
      setFullName('')
      setSelectedRoles([])
      onCreated(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สร้างบัญชีไม่สำเร็จ')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="admin-create-employee">
      <h2 className="crm-section-title">สร้างบัญชีพนักงาน</h2>
      <p className="muted admin-create-employee__intro">
        ระบบสร้าง <strong>รหัสผ่านชั่วคราว</strong> อัตโนมัติ — พนักงาน login ครั้งแรกแล้วต้องตั้งรหัสผ่านใหม่
        CEO ดูรหัสชั่วคราวได้ในรายการผู้ใช้จนกว่าจะเปลี่ยนรหัส
      </p>

      <form className="admin-create-employee__form" onSubmit={(e) => void handleSubmit(e)}>
        <div className="crm-form__grid admin-create-employee__grid">
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
            />
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
            />
          </label>
        </div>

        <fieldset className="admin-create-employee__roles">
          <legend className="task-field__label">บทบาท *</legend>
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
                  disabled={submitting}
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

        {success && (
          <div className="admin-temp-password-box crm-banner crm-banner--ok">
            <p>
              สร้างบัญชีสำเร็จ — แจ้งพนักงานดังนี้:
            </p>
            <dl className="admin-temp-password-box__credentials">
              <dt>รหัสผู้ใช้</dt>
              <dd>
                <code>{success.login_id}</code>
              </dd>
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
              พนักงานจะถูกบังคับเปลี่ยนรหัสผ่านหลัง login ครั้งแรก — CEO ยังเห็นรหัสชั่วคราวในรายการผู้ใช้
            </p>
          </div>
        )}

        <div className="admin-create-employee__actions">
          <button type="submit" className="crm-btn crm-btn--primary" disabled={submitting}>
            {submitting ? 'กำลังสร้าง…' : 'สร้างบัญชีพนักงาน'}
          </button>
        </div>
      </form>
    </section>
  )
}
