import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ROLE_LABELS, type AppRole } from '../../../../shared/types/roles'
import { normalizeLoginId, validateLoginId } from '../../../../shared/auth/loginId'
import {
  assignableStaffRolesForCreator,
  canDeleteEmployeeUser,
  canEditEmployeeUser,
  canModifyUserRole,
  canViewStaffPasswords,
} from '../access'
import {
  deleteEmployeeUser,
  resetEmployeePassword,
  updateEmployeeProfile,
} from '../api/manageEmployee'
import { setUserActive, setUserRoles } from '../api/users'
import { adminUserKind, assertValidRoleMix } from '../userAudience'
import type { AdminUserRow } from '../types'

function copyText(text: string) {
  void navigator.clipboard?.writeText(text)
}

interface EmployeeEditSheetProps {
  user: AdminUserRow | null
  open: boolean
  actorId: string | undefined
  creatorRoles: AppRole[]
  configured: boolean
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

export function EmployeeEditSheet({
  user,
  open,
  actorId,
  creatorRoles,
  configured,
  onClose,
  onSaved,
  onDeleted,
}: EmployeeEditSheetProps) {
  const assignable = useMemo(
    () => assignableStaffRolesForCreator(creatorRoles),
    [creatorRoles],
  )

  const [fullName, setFullName] = useState('')
  const [loginId, setLoginId] = useState('')
  const [draftRoles, setDraftRoles] = useState<AppRole[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetPw, setResetPw] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copied, setCopied] = useState(false)

  const isSelf = Boolean(user && actorId && user.id === actorId)
  const canEdit = user
    ? canEditEmployeeUser(creatorRoles, user.roles, isSelf) || !configured
    : false
  const canDelete = user
    ? canDeleteEmployeeUser(creatorRoles, user.roles, isSelf) || !configured
    : false
  const showPasswords = canViewStaffPasswords(creatorRoles) || !configured

  const userKind = user ? adminUserKind(user) : null
  const isMixed = userKind === 'mixed'

  useEffect(() => {
    if (!user || !open) return
    setFullName(user.full_name ?? '')
    setLoginId(user.login_id)
    setDraftRoles(user.roles.filter((r) => r !== 'client'))
    setError(null)
    setResetPw(null)
    setConfirmDelete(false)
    setCopied(false)
  }, [user, open])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, busy, onClose])

  if (!open || !user) return null

  function toggleRole(role: AppRole, checked: boolean) {
    setDraftRoles((prev) =>
      checked ? [...new Set([...prev, role])] : prev.filter((r) => r !== role),
    )
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!canEdit) return

    const name = fullName.trim()
    if (!name) {
      setError('กรุณากรอกชื่อ-นามสกุล')
      return
    }

    const idError = validateLoginId(loginId)
    if (idError && loginId !== user!.login_id) {
      setError(idError)
      return
    }

    if (draftRoles.length === 0) {
      setError('ต้องมีอย่างน้อย 1 บทบาท')
      return
    }

    try {
      assertValidRoleMix(draftRoles)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บทบาทไม่ถูกต้อง')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const normalized = normalizeLoginId(loginId)
      if (name !== (user!.full_name ?? '') || normalized !== user!.login_id) {
        await updateEmployeeProfile({
          user_id: user!.id,
          full_name: name,
          login_id: normalized !== user!.login_id ? normalized : undefined,
        })
      }

      const rolesChanged =
        draftRoles.length !== user!.roles.length ||
        draftRoles.some((r) => !user!.roles.includes(r))

      if (rolesChanged && !isSelf) {
        await setUserRoles(user!.id, draftRoles, creatorRoles)
      }

      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleActive() {
    if (!user || isSelf) return
    setBusy(true)
    setError(null)
    try {
      await setUserActive(user.id, !user.is_active, creatorRoles, user.roles)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เปลี่ยนสถานะไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  async function handleResetPassword() {
    if (!user) return
    setBusy(true)
    setError(null)
    try {
      const result = await resetEmployeePassword(user.id)
      setResetPw(result.temporary_password)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'รีเซ็ตรหัสผ่านไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!user || !canDelete) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await deleteEmployeeUser(user.id)
      onDeleted()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ลบบัญชีไม่สำเร็จ')
      setConfirmDelete(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-sheet" role="presentation">
      <button
        type="button"
        className="admin-sheet__backdrop"
        aria-label="ปิด"
        onClick={() => !busy && onClose()}
      />
      <div
        className="admin-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-sheet-title"
      >
        <header className="admin-sheet__head">
          <div>
            <p className="admin-sheet__eyebrow">แก้ไขพนักงาน</p>
            <h2 id="admin-sheet-title">{user.full_name || user.login_id}</h2>
            <p className="muted admin-sheet__sub">
              <code>{user.login_id}</code> · {user.email}
            </p>
          </div>
          <button
            type="button"
            className="crm-btn crm-btn--ghost admin-sheet__close"
            onClick={onClose}
            disabled={busy}
            aria-label="ปิด"
          >
            ✕
          </button>
        </header>

        <form className="admin-sheet__body" onSubmit={(e) => void handleSave(e)}>
          {isMixed && (
            <p className="crm-banner crm-banner--warn admin-sheet__mixed-banner">
              บัญชีผสมบทบาท — บันทึกจะถอนบทบาทลูกค้าออก เหลือเฉพาะบทบาทพนักงานที่เลือกด้านล่าง
            </p>
          )}

          <label className="task-field">
            <span className="task-field__label">ชื่อ-นามสกุล</span>
            <input
              className="crm-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={!canEdit || busy}
              maxLength={120}
              required
            />
          </label>

          <label className="task-field">
            <span className="task-field__label">รหัสผู้ใช้</span>
            <input
              className="crm-input"
              value={loginId}
              onChange={(e) => setLoginId(normalizeLoginId(e.target.value))}
              disabled={!canEdit || busy || isSelf}
              minLength={3}
              maxLength={32}
            />
            {isSelf && (
              <span className="muted" style={{ fontSize: '0.78rem' }}>
                ไม่สามารถเปลี่ยนรหัสผู้ใช้ของตัวเองจากหน้านี้
              </span>
            )}
          </label>

          <fieldset className="admin-create-employee__roles" disabled={busy || isSelf}>
            <legend className="task-field__label">บทบาท</legend>
            <div className="admin-roles">
              {assignable.map((role) => {
                const on = draftRoles.includes(role)
                const roleLocked = !canModifyUserRole(creatorRoles, user.roles, role)
                return (
                  <label
                    key={role}
                    className={`admin-role-chip${on ? ' admin-role-chip--on' : ''}${roleLocked ? ' admin-role-chip--locked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={roleLocked || isSelf}
                      onChange={(e) => toggleRole(role, e.target.checked)}
                    />
                    {ROLE_LABELS[role]}
                  </label>
                )
              })}
            </div>
            {isSelf && (
              <p className="muted admin-create-employee__roles-hint">
                ไม่สามารถเปลี่ยนบทบาทของตัวเองได้
              </p>
            )}
          </fieldset>

          <div className="admin-sheet__status-row">
            <span className="task-field__label">สถานะบัญชี</span>
            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={user.is_active}
                disabled={busy || isSelf}
                onChange={() => void handleToggleActive()}
              />
              {user.is_active ? 'ใช้งานอยู่' : 'ปิดการใช้งาน'}
            </label>
          </div>

          {showPasswords && (
            <section className="admin-sheet__pw-block">
              <span className="task-field__label">รหัสผ่าน</span>
              {user.temporary_password && !resetPw && (
                <p className="admin-sheet__temp-pw">
                  ชั่วคราว: <code>{user.temporary_password}</code>
                </p>
              )}
              {resetPw && (
                <div className="admin-temp-password-box crm-banner crm-banner--ok">
                  <p>รหัสชั่วคราวใหม่:</p>
                  <code className="admin-temp-password-box__secret">{resetPw}</code>
                  <button
                    type="button"
                    className="crm-btn crm-btn--ghost"
                    onClick={() => {
                      copyText(
                        `รหัสผู้ใช้: ${user.login_id}\nรหัสผ่านชั่วคราว: ${resetPw}`,
                      )
                      setCopied(true)
                    }}
                  >
                    {copied ? 'คัดลอกแล้ว' : 'คัดลอกส่งพนักงาน'}
                  </button>
                </div>
              )}
              <button
                type="button"
                className="crm-btn crm-btn--ghost"
                disabled={busy}
                onClick={() => void handleResetPassword()}
              >
                ออกรหัสชั่วคราวใหม่
              </button>
            </section>
          )}

          {error && (
            <p className="crm-error" role="alert">
              {error}
            </p>
          )}

          <div className="admin-sheet__actions">
            <button type="submit" className="crm-btn crm-btn--primary" disabled={busy || !canEdit}>
              {busy ? 'กำลังบันทึก…' : 'บันทึกการเปลี่ยนแปลง'}
            </button>
            <button type="button" className="crm-btn crm-btn--ghost" onClick={onClose} disabled={busy}>
              ยกเลิก
            </button>
          </div>

          {canDelete && (
            <section className="admin-sheet__danger">
              <h3>ลบบัญชีพนักงาน</h3>
              <p className="muted">
                ลบถาวรจากระบบ — ไม่สามารถกู้คืนได้
              </p>
              <div className="admin-sheet__danger-actions">
                <button
                  type="button"
                  className={`crm-btn${confirmDelete ? ' crm-btn--danger' : ' crm-btn--ghost'}`}
                  disabled={busy}
                  onClick={() => void handleDelete()}
                >
                  {confirmDelete ? 'ยืนยันลบถาวร' : 'ลบบัญชีนี้'}
                </button>
                {confirmDelete && (
                  <button
                    type="button"
                    className="crm-btn crm-btn--ghost"
                    disabled={busy}
                    onClick={() => setConfirmDelete(false)}
                  >
                    ยกเลิกการลบ
                  </button>
                )}
              </div>
            </section>
          )}
        </form>
      </div>
    </div>
  )
}
