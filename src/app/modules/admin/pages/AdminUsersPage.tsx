import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canManageAdminUsers } from '../../../../shared/auth/access'
import {
  canManageCeoUserStatus,
  canModifyUserRole,
  canViewStaffPasswords,
} from '../access'
import { APP_ROLES, ROLE_LABELS, type AppRole } from '../../../../shared/types/roles'
import { listCustomersForSelect } from '../../finance/api/payments'
import type { CustomerOption } from '../../finance/types'
import { CreateEmployeeForm } from '../components/CreateEmployeeForm'
import {
  listAdminUsers,
  setClientCustomerAccess,
  setUserActive,
  setUserRoles,
} from '../api/users'
import type { AdminUserRow } from '../types'
import '../../crm/crm.css'
import '../../tasks/tasks.css'
import '../../phase2/phase2.css'
import '../admin.css'

const MANAGEABLE_ROLES = APP_ROLES.filter((r) => r !== 'dev')

export function AdminUsersPage() {
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const canManage = canManageAdminUsers(roles) || !configured
  const showPasswords = canViewStaffPasswords(roles) || !configured

  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [customers, setCustomers] = useState<CustomerOption[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await listAdminUsers())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    listCustomersForSelect()
      .then(setCustomers)
      .catch(() => setCustomers([]))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (u) =>
        u.login_id.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.full_name?.toLowerCase().includes(q) ?? false),
    )
  }, [rows, query])

  async function handleToggleActive(user: AdminUserRow) {
    if (!canManage || user.id === profile?.id) return
    if (!canManageCeoUserStatus(roles, user.roles)) {
      setError('เฉพาะ CEO เท่านั้นที่เปิด/ปิดบัญชี CEO ได้')
      return
    }
    setSavingId(user.id)
    setError(null)
    try {
      await setUserActive(user.id, !user.is_active, roles, user.roles)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSavingId(null)
    }
  }

  async function handleRoleToggle(user: AdminUserRow, role: AppRole, checked: boolean) {
    if (!canManage) return
    if (!canModifyUserRole(roles, user.roles, role)) {
      setError(
        user.roles.includes('ceo') || role === 'ceo'
          ? 'เฉพาะ CEO เท่านั้นที่จัดการบทบาท CEO ได้'
          : 'ไม่มีสิทธิ์แก้ไขบทบาทนี้',
      )
      return
    }
    const next = checked
      ? [...new Set([...user.roles, role])]
      : user.roles.filter((r) => r !== role)
    if (next.length === 0) {
      setError('ต้องมีอย่างน้อย 1 บทบาท')
      return
    }
    setSavingId(user.id)
    setError(null)
    try {
      await setUserRoles(user.id, next, roles)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกบทบาทไม่สำเร็จ')
    } finally {
      setSavingId(null)
    }
  }

  async function handleClientLink(user: AdminUserRow, customerId: string) {
    if (!canManage) return
    setSavingId(user.id)
    setError(null)
    try {
      await setClientCustomerAccess(user.id, customerId || null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ผูกลูกค้าไม่สำเร็จ')
    } finally {
      setSavingId(null)
    }
  }

  if (!canManage) {
    return (
      <div className="page">
        <p className="crm-error">เฉพาะ CEO / Operations / Dev เท่านั้นที่จัดการผู้ใช้ได้</p>
      </div>
    )
  }

  return (
    <div className="page admin-page">
      <header className="page__header admin-page__header">
        <div>
          <h1>จัดการผู้ใช้</h1>
          <p className="muted">มอบหมายบทบาทและเปิด/ปิดบัญชีพนักงาน</p>
          <nav className="phase2-subnav" aria-label="เมนู admin">
            <Link to="/app/admin/logs">Audit Log</Link>
          </nav>
          <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
            CEO / ผู้จัดการ (Operations) สร้างรหัสผู้ใช้พนักงานได้ — มอบบทบาท client + ผูกลูกค้าเพื่อพอร์ทัลรายงาน
          </p>
        </div>
      </header>

      <section className="card card--wide admin-create-card">
        <CreateEmployeeForm
          creatorRoles={roles}
          configured={configured}
          onCreated={() => void load()}
        />
      </section>

      <section className="card card--wide">
        <div className="admin-toolbar">
          <input
            type="search"
            className="crm-input"
            placeholder="ค้นหารหัสผู้ใช้ อีเมล หรือชื่อ..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className="crm-btn crm-btn--ghost" onClick={() => void load()}>
            รีเฟรช
          </button>
        </div>

        {error && <p className="crm-error">{error}</p>}
        {loading && <p className="muted">กำลังโหลด...</p>}

        {!loading && (
          <div className="crm-table-wrap">
            <table className="admin-user-table">
              <thead>
                <tr>
                  <th>ผู้ใช้</th>
                  {showPasswords && <th>รหัสชั่วคราว (CEO)</th>}
                  <th>บทบาท</th>
                  <th>สถานะ</th>
                  <th>ลูกค้า (client)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const busy = savingId === user.id
                  const isSelf = user.id === profile?.id
                  const statusLocked = !canManageCeoUserStatus(roles, user.roles)
                  return (
                    <tr key={user.id} className={!user.is_active ? 'is-inactive' : undefined}>
                      <td>
                        <strong>{user.full_name || user.login_id}</strong>
                        <br />
                        <code className="admin-user-login-id">{user.login_id}</code>
                        <br />
                        <span className="muted">{user.email}</span>
                        {isSelf && (
                          <>
                            <br />
                            <small className="muted">(บัญชีของคุณ)</small>
                          </>
                        )}
                        {user.must_change_password && (
                          <>
                            <br />
                            <small className="admin-user-pending-pw">รอตั้งรหัสผ่านใหม่</small>
                          </>
                        )}
                      </td>
                      {showPasswords && (
                        <td>
                          {user.temporary_password ? (
                            <code className="admin-user-temp-pw">{user.temporary_password}</code>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                      )}
                      <td>
                        <div className="admin-roles">
                          {MANAGEABLE_ROLES.map((role) => {
                            const on = user.roles.includes(role)
                            const roleLocked =
                              !canModifyUserRole(roles, user.roles, role)
                            return (
                              <label
                                key={role}
                                className={`admin-role-chip${on ? ' admin-role-chip--on' : ''}${roleLocked ? ' admin-role-chip--locked' : ''}`}
                                title={
                                  roleLocked
                                    ? 'เฉพาะ CEO เท่านั้นที่จัดการบัญชี CEO ได้'
                                    : undefined
                                }
                              >
                                <input
                                  type="checkbox"
                                  checked={on}
                                  disabled={busy || isSelf || roleLocked}
                                  onChange={(e) =>
                                    void handleRoleToggle(user, role, e.target.checked)
                                  }
                                />
                                {ROLE_LABELS[role]}
                              </label>
                            )
                          })}
                        </div>
                      </td>
                      <td>
                        <label
                          className={`admin-toggle${statusLocked ? ' admin-toggle--locked' : ''}`}
                          title={
                            statusLocked
                              ? 'เฉพาะ CEO เท่านั้นที่เปิด/ปิดบัญชี CEO ได้'
                              : undefined
                          }
                        >
                          <input
                            type="checkbox"
                            checked={user.is_active}
                            disabled={busy || isSelf || statusLocked}
                            onChange={() => void handleToggleActive(user)}
                          />
                          {user.is_active ? 'ใช้งาน' : 'ปิด'}
                        </label>
                      </td>
                      <td>
                        {user.roles.includes('client') ? (
                          <label className="task-field admin-client-field">
                            <select
                              className="task-select"
                              disabled={busy}
                              value={user.client_customer_id ?? ''}
                              onChange={(e) => void handleClientLink(user, e.target.value)}
                            >
                            <option value="">— เลือกลูกค้า —</option>
                            {customers.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.brand_name}
                              </option>
                            ))}
                            </select>
                          </label>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="muted">ไม่พบผู้ใช้</p>}
          </div>
        )}

        <p className="muted admin-hint">
          แก้บทบาทหรือปิดบัญชีได้ด้านล่าง — บัญชี CEO จัดการได้เฉพาะ CEO — client ต้องผูกลูกค้า 1 ราย
        </p>
      </section>
    </div>
  )
}
