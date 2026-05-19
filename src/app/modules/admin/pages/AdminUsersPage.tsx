import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canManageAdminUsers } from '../../../../shared/auth/access'
import { listCustomersForSelect } from '../../finance/api/payments'
import { clientWorkspaceUrl } from '../../customers/customerLinks'
import { canManageCeoUserStatus, canViewStaffPasswords } from '../access'
import { listAdminUsers, setClientCustomerAccess, setUserActive } from '../api/users'
import { AdminRoleGuide } from '../components/AdminRoleGuide'
import { CreateClientAccountWizard } from '../components/CreateClientAccountWizard'
import {
  AdminFlowTabs,
  parseAdminFlowSection,
  type AdminFlowSection,
} from '../components/AdminFlowTabs'
import { CreateEmployeeForm } from '../components/CreateEmployeeForm'
import { EmployeeEditSheet } from '../components/EmployeeEditSheet'
import { StaffUserCards } from '../components/StaffUserCards'
import { ChatTemplatesAdmin } from '../components/ChatTemplatesAdmin'
import { DefaultLeadOwnerSettingCard } from '../components/DefaultLeadOwnerSetting'
import { adminUserKind, type AdminUserKind, countAdminAudience } from '../userAudience'
import type { AdminUserRow } from '../types'
import '../../crm/crm.css'
import '../../tasks/tasks.css'
import '../../phase2/phase2.css'
import '../admin.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

type StaffListFilter = 'all' | 'mixed'

export function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const presetCustomerId = searchParams.get('customerId')
  const tabParam = searchParams.get('tab')

  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const canManage = canManageAdminUsers(roles) || !configured
  const showPasswords = canViewStaffPasswords(roles) || !configured

  const defaultSection = presetCustomerId ? 'client' : 'staff'
  const section = parseAdminFlowSection(tabParam, defaultSection)

  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [customers, setCustomers] = useState<{ id: string; brand_name: string }[]>([])
  const [staffFilter, setStaffFilter] = useState<StaffListFilter>('all')
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null)

  const setSection = useCallback(
    (next: AdminFlowSection) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.set('tab', next)
          return p
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

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
    if (!presetCustomerId) return
    setSection('client')
  }, [presetCustomerId, setSection])

  useEffect(() => {
    if (!presetCustomerId || loading || section !== 'client') return
    document.getElementById('admin-create-client')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [presetCustomerId, loading, section])

  useEffect(() => {
    listCustomersForSelect()
      .then((list) => setCustomers(list.map((c) => ({ id: c.id, brand_name: c.brand_name }))))
      .catch(() => setCustomers([]))
  }, [])

  const audienceCounts = useMemo(() => countAdminAudience(rows), [rows])

  const clientUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((u) => {
      if (adminUserKind(u) !== 'client') return false
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
  }, [rows, query, customers])

  const staffForCards = useMemo(() => {
    const q = query.trim().toLowerCase()
    const staffKinds: AdminUserKind[] =
      staffFilter === 'mixed' ? ['mixed'] : ['staff', 'mixed', 'none']
    return rows.filter((u) => {
      if (!staffKinds.includes(adminUserKind(u))) return false
      if (!q) return true
      return (
        u.login_id.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.full_name?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [rows, query, staffFilter])

  const editingUserLive = useMemo(() => {
    if (!editingUser) return null
    return rows.find((r) => r.id === editingUser.id) ?? editingUser
  }, [rows, editingUser])

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

  function showMixedAccounts() {
    setSection('staff')
    setStaffFilter('mixed')
    document.getElementById('admin-staff-list')?.scrollIntoView({ behavior: 'smooth' })
  }

  if (!canManage) {
    return (
      <div className="page">
        <p className="crm-error">เฉพาะ CEO / Operations / Dev เท่านั้นที่จัดการผู้ใช้ได้</p>
      </div>
    )
  }

  const mixedCount = audienceCounts.mixed ?? 0

  return (
    <div className="page admin-page">
      <header className="page__header admin-page__header">
        <div>
          <h1>จัดการผู้ใช้</h1>
          <p className="muted">
            แยกบัญชีพนักงานกับลูกค้าพอร์ทัล — สร้าง · แก้ไข · ลบ ตาม Flow ด้านล่าง
          </p>
          <nav className="phase2-subnav admin-page__subnav" aria-label="เมนู admin">
            <Link to="/app/admin/logs">Audit ผู้ดูแล</Link>
            <Link to="/app/activity">บันทึกกิจกรรม</Link>
          </nav>
        </div>
      </header>

      <AdminRoleGuide />

      {mixedCount > 0 && staffFilter !== 'mixed' && (
        <p className="crm-banner crm-banner--warn admin-mixed-banner">
          มีบัญชีผสมบทบาท {mixedCount} รายการ —{' '}
          <button type="button" className="crm-btn crm-btn--ghost" onClick={showMixedAccounts}>
            ดูและแยกบัญชี
          </button>
        </p>
      )}

      <div className="admin-summary-grid">
        <button
          type="button"
          className={`admin-summary-card admin-summary-card--btn${section === 'staff' ? ' admin-summary-card--active' : ''}`}
          onClick={() => {
            setSection('staff')
            setStaffFilter('all')
          }}
        >
          <span className="muted">พนักงาน</span>
          <strong>{(audienceCounts.staff ?? 0) + (audienceCounts.none ?? 0)}</strong>
        </button>
        <button
          type="button"
          className={`admin-summary-card admin-summary-card--btn admin-summary-card--client${section === 'client' ? ' admin-summary-card--active' : ''}`}
          onClick={() => setSection('client')}
        >
          <span className="muted">ลูกค้าพอร์ทัล</span>
          <strong>{audienceCounts.client ?? 0}</strong>
        </button>
        {mixedCount > 0 && (
          <button
            type="button"
            className={`admin-summary-card admin-summary-card--btn admin-summary-card--warn${staffFilter === 'mixed' ? ' admin-summary-card--active' : ''}`}
            onClick={showMixedAccounts}
          >
            <span className="muted">ผสมบทบาท</span>
            <strong>{mixedCount}</strong>
          </button>
        )}
      </div>

      <AdminFlowTabs
        active={section}
        onSelect={(tab) => {
          setSection(tab)
          if (tab === 'staff') setStaffFilter('all')
        }}
        staffCount={staffForCards.length}
        clientCount={audienceCounts.client ?? 0}
      />

      {section === 'staff' && (
        <>
          <section className="card card--wide admin-create-card admin-create-card--staff" id="admin-create-staff">
            <CreateEmployeeForm
              creatorRoles={roles}
              configured={configured}
              onCreated={() => void load()}
            />
          </section>

          <section className="card card--wide admin-staff-list-panel" id="admin-staff-list">
            <header className="admin-panel-head">
              <div>
                <h2 className="crm-section-title">รายการพนักงาน</h2>
                <p className="muted admin-list-intro">
                  กดการ์ดเพื่อแก้ไขชื่อ บทบาท รหัสผ่าน หรือลบบัญชี
                </p>
              </div>
              <div className="admin-panel-head__actions">
                {staffFilter === 'mixed' && (
                  <button
                    type="button"
                    className="crm-btn crm-btn--ghost"
                    onClick={() => setStaffFilter('all')}
                  >
                    แสดงทั้งหมด
                  </button>
                )}
                <button
                  type="button"
                  className="crm-btn crm-btn--ghost"
                  onClick={() => {
                    document.getElementById('admin-create-staff')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  + เพิ่มพนักงาน
                </button>
              </div>
            </header>

            {staffFilter === 'mixed' && (
              <p className="crm-banner crm-banner--warn">
                แสดงเฉพาะบัญชีที่มีทั้งบทบาทพนักงานและลูกค้า — เปิดแก้ไขแล้วถอนบทบาท client หรือลบบทบาทพนักงานที่ไม่ใช้
              </p>
            )}

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
              <StaffUserCards
                users={staffForCards}
                actorId={profile?.id}
                mixedOnly={staffFilter === 'mixed'}
                onEdit={setEditingUser}
              />
            )}
          </section>
        </>
      )}

      {section === 'client' && (
        <>
          <section className="card card--wide admin-create-card admin-create-card--client" id="admin-create-client">
            <CreateClientAccountWizard
              creatorRoles={roles}
              configured={configured}
              initialCustomerId={presetCustomerId}
              onCreated={() => void load()}
            />
          </section>

          <section className="card card--wide">
            <h2 className="crm-section-title">บัญชีลูกค้าพอร์ทัล</h2>
            <p className="muted admin-list-intro">
              ลูกค้าเข้าระบบที่ <Link to="/client/login">/client/login</Link> — ผูก 1 แบรนด์ต่อบัญชี
            </p>

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
                      <th>ผู้ใช้</th>
                      {showPasswords && <th>รหัสชั่วคราว</th>}
                      <th>แบรนด์ / พอร์ทัล</th>
                      <th>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientUsers.map((user) => {
                      const busy = savingId === user.id
                      const isSelf = user.id === profile?.id
                      const brand = brandNameFor(user)
                      const statusLocked = !canManageCeoUserStatus(roles, user.roles)
                      return (
                        <tr key={user.id} className={!user.is_active ? 'is-inactive' : ''}>
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
                            <div className="admin-client-cell">
                              <select
                                className="task-select crm-select"
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
                          </td>
                          <td>
                            <label
                              className={`admin-toggle${statusLocked ? ' admin-toggle--locked' : ''}`}
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
                {clientUsers.length === 0 && (
                  <p className="muted admin-empty">
                    {query.trim()
                      ? 'ไม่พบผู้ใช้ที่ตรงกับคำค้น'
                      : 'ยังไม่มีบัญชีลูกค้าพอร์ทัล — สร้างจากวิซาร์ดด้านบน'}
                  </p>
                )}
              </div>
            )}

            <p className="muted admin-hint">
              บัญชีลูกค้าพอร์ทัลผูกได้ 1 แบรนด์ต่อบัญชี
            </p>
          </section>
        </>
      )}

      {section === 'settings' && (
        <section className="card card--wide admin-settings-panel">
          <h2 className="crm-section-title">การตั้งค่าระบบ</h2>
          <DefaultLeadOwnerSettingCard actorId={profile?.id ?? DEV_OWNER} disabled={!canManage} />
          <ChatTemplatesAdmin disabled={!canManage} />
        </section>
      )}

      <EmployeeEditSheet
        user={editingUserLive}
        open={editingUserLive != null}
        actorId={profile?.id}
        creatorRoles={roles}
        configured={configured}
        onClose={() => setEditingUser(null)}
        onSaved={() => void load()}
        onDeleted={() => {
          setEditingUser(null)
          void load()
        }}
      />

      <p className="muted admin-hint admin-page__footer-hint">
        บัญชี CEO จัดการได้เฉพาะ CEO
      </p>
    </div>
  )
}
