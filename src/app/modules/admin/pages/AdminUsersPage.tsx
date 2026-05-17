import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canManageAdminUsers } from '../../../../shared/auth/access'
import { ROLE_LABELS, type AppRole } from '../../../../shared/types/roles'
import { listCustomersForSelect } from '../../finance/api/payments'
import { clientWorkspaceUrl } from '../../customers/customerLinks'
import {
  canManageCeoUserStatus,
  canModifyUserRole,
  canViewStaffPasswords,
} from '../access'
import {
  listAdminUsers,
  setClientCustomerAccess,
  setUserActive,
  setUserRoles,
} from '../api/users'
import { AdminAudienceFilterBar } from '../components/AdminAudienceFilterBar'
import { AdminRoleGuide } from '../components/AdminRoleGuide'
import { CreateClientAccountWizard } from '../components/CreateClientAccountWizard'
import { CreateEmployeeForm } from '../components/CreateEmployeeForm'
import { ChatTemplatesAdmin } from '../components/ChatTemplatesAdmin'
import { DefaultLeadOwnerSettingCard } from '../components/DefaultLeadOwnerSetting'
import {
  adminUserKind,
  adminUserKindLabel,
  countAdminAudience,
  matchesAdminAudience,
  STAFF_MANAGEABLE_ROLES,
  type AdminAudienceFilter,
} from '../userAudience'
import type { AdminUserRow } from '../types'
import '../../crm/crm.css'
import '../../tasks/tasks.css'
import '../../phase2/phase2.css'
import '../admin.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

export function AdminUsersPage() {
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const canManage = canManageAdminUsers(roles) || !configured
  const showPasswords = canViewStaffPasswords(roles) || !configured

  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [query, setQuery] = useState('')
  const [audienceFilter, setAudienceFilter] = useState<AdminAudienceFilter>('staff')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [customers, setCustomers] = useState<{ id: string; brand_name: string }[]>([])

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
      .then((list) => setCustomers(list.map((c) => ({ id: c.id, brand_name: c.brand_name }))))
      .catch(() => setCustomers([]))
  }, [])

  const audienceCounts = useMemo(() => countAdminAudience(rows), [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((u) => {
      if (!matchesAdminAudience(u, audienceFilter)) return false
      if (!q) return true
      const brand =
        customers.find((c) => c.id === u.client_customer_id)?.brand_name?.toLowerCase() ?? ''
      return (
        u.login_id.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.full_name?.toLowerCase().includes(q) ?? false) ||
        brand.includes(q)
      )
    })
  }, [rows, query, audienceFilter, customers])

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
    const kind = adminUserKind(user)

    if (kind === 'client' && role !== 'client') {
      setError(
        'บัญชีลูกค้าพอร์ทัลไม่ควรมีบทบาทพนักงาน — สร้างบัญชีพนักงานแยกถ้าต้องการทีมภายใน',
      )
      return
    }
    if (kind === 'staff' && role === 'client' && checked) {
      setError('บัญชีลูกค้าให้สร้างจาก「สร้างบัญชีลูกค้า (พอร์ทัล)」ด้านบน ไม่ใช่มอบบทบาท client ให้พนักงาน')
      return
    }
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

  function brandNameFor(user: AdminUserRow): string | null {
    if (!user.client_customer_id) return null
    return customers.find((c) => c.id === user.client_customer_id)?.brand_name ?? null
  }

  if (!canManage) {
    return (
      <div className="page">
        <p className="crm-error">เฉพาะ CEO / Operations / Dev เท่านั้นที่จัดการผู้ใช้ได้</p>
      </div>
    )
  }

  const showStaffRolesColumn = audienceFilter !== 'client'
  const showClientColumn = audienceFilter !== 'staff'

  return (
    <div className="page admin-page">
      <header className="page__header admin-page__header">
        <div>
          <h1>จัดการผู้ใช้</h1>
          <p className="muted">
            แยกบัญชีพนักงานกับลูกค้าพอร์ทัล — สร้างคนละขั้นตอน ไม่ปนกัน
          </p>
          <nav className="phase2-subnav admin-page__subnav" aria-label="เมนู admin">
            <Link to="/app/admin/logs">Audit ผู้ดูแล</Link>
            <Link to="/app/activity">บันทึกกิจกรรม</Link>
          </nav>
        </div>
      </header>

      <AdminRoleGuide />

      <DefaultLeadOwnerSettingCard actorId={profile?.id ?? DEV_OWNER} disabled={!canManage} />

      <ChatTemplatesAdmin disabled={!canManage} />

      <section className="card card--wide admin-create-card admin-create-card--client">
        <CreateClientAccountWizard
          creatorRoles={roles}
          configured={configured}
          onCreated={() => void load()}
        />
      </section>

      <section className="card card--wide admin-create-card admin-create-card--staff">
        <CreateEmployeeForm
          creatorRoles={roles}
          configured={configured}
          onCreated={() => void load()}
        />
      </section>

      <section className="card card--wide">
        <h2 className="crm-section-title">รายการบัญชีในระบบ</h2>
        <p className="muted admin-list-intro">
          กรองตามประเภทก่อนแก้บทบาท — ลูกค้าเห็นเฉพาะแบรนด์ที่ผูก · พนักงานเห็นเฉพาะบทบาททีม
        </p>

        <AdminAudienceFilterBar
          active={audienceFilter}
          onSelect={setAudienceFilter}
          counts={audienceCounts}
        />

        <div className="admin-toolbar">
          <input
            type="search"
            className="crm-input"
            placeholder="ค้นหารหัสผู้ใช้ อีเมล ชื่อ หรือแบรนด์..."
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
                  <th>ประเภท</th>
                  <th>ผู้ใช้</th>
                  {showPasswords && <th>รหัสชั่วคราว</th>}
                  {showStaffRolesColumn && <th>บทบาทพนักงาน</th>}
                  {showClientColumn && <th>ลูกค้า / พอร์ทัล</th>}
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const busy = savingId === user.id
                  const isSelf = user.id === profile?.id
                  const kind = adminUserKind(user)
                  const statusLocked = !canManageCeoUserStatus(roles, user.roles)
                  const brand = brandNameFor(user)

                  return (
                    <tr
                      key={user.id}
                      className={[
                        !user.is_active ? 'is-inactive' : '',
                        kind === 'mixed' ? 'is-mixed-audience' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <td>
                        <span className={`admin-audience-badge admin-audience-badge--${kind}`}>
                          {adminUserKindLabel(kind)}
                        </span>
                        {kind === 'mixed' && (
                          <p className="admin-mixed-hint">ควรแยกบัญชีพนักงาน/ลูกค้า</p>
                        )}
                      </td>
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
                          {kind !== 'client' && user.temporary_password ? (
                            <code className="admin-user-temp-pw">{user.temporary_password}</code>
                          ) : kind === 'client' && user.temporary_password ? (
                            <code className="admin-user-temp-pw">{user.temporary_password}</code>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                      )}
                      {showStaffRolesColumn && (
                        <td>
                          {kind === 'client' ? (
                            <span className="muted">ไม่ใช้บทบาทพนักงาน</span>
                          ) : (
                            <div className="admin-roles">
                              {STAFF_MANAGEABLE_ROLES.map((role) => {
                                const on = user.roles.includes(role)
                                const roleLocked = !canModifyUserRole(roles, user.roles, role)
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
                          )}
                        </td>
                      )}
                      {showClientColumn && (
                        <td>
                          {kind === 'staff' ? (
                            <span className="muted">— ใช้วิซาร์ดสร้างลูกค้าด้านบน</span>
                          ) : (
                            <div className="admin-client-cell">
                              <label className="task-field admin-client-field">
                                <span className="task-field__label">แบรนด์</span>
                                <select
                                  className="task-select crm-select"
                                  disabled={busy || !user.roles.includes('client')}
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
                              {user.client_customer_id && (
                                <Link
                                  to={clientWorkspaceUrl(user.client_customer_id)}
                                  className="crm-btn crm-btn--ghost admin-client-preview-link"
                                >
                                  เปิดพื้นที่ลูกค้า
                                </Link>
                              )}
                              {brand && (
                                <p className="muted admin-client-brand-hint">ผูกกับ {brand}</p>
                              )}
                            </div>
                          )}
                        </td>
                      )}
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
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="muted admin-empty">
                {query.trim()
                  ? 'ไม่พบผู้ใช้ที่ตรงกับคำค้น'
                  : audienceFilter === 'client'
                    ? 'ยังไม่มีบัญชีลูกค้าพอร์ทัล — สร้างจากวิซาร์ดด้านบน'
                    : audienceFilter === 'staff'
                      ? 'ยังไม่มีบัญชีพนักงาน — สร้างจากฟอร์มด้านบน'
                      : 'ยังไม่มีผู้ใช้ในระบบ'}
              </p>
            )}
          </div>
        )}

        <p className="muted admin-hint">
          บัญชี CEO จัดการได้เฉพาะ CEO · ลูกค้าพอร์ทัลผูกได้ 1 แบรนด์ต่อบัญชี
        </p>
      </section>
    </div>
  )
}
