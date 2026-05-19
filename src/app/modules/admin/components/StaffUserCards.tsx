import { ROLE_LABELS, type AppRole } from '../../../../shared/types/roles'
import { adminUserKind, adminUserKindLabel } from '../userAudience'
import type { AdminUserRow } from '../types'

interface StaffUserCardsProps {
  users: AdminUserRow[]
  actorId: string | undefined
  onEdit: (user: AdminUserRow) => void
}

export function StaffUserCards({ users, actorId, onEdit }: StaffUserCardsProps) {
  if (users.length === 0) {
    return (
      <p className="muted admin-staff-empty">
        ยังไม่มีบัญชีพนักงาน — กด「เพิ่มพนักงานใหม่」ด้านบน
      </p>
    )
  }

  return (
    <ul className="admin-staff-grid">
      {users.map((user) => {
        const kind = adminUserKind(user)
        const isSelf = user.id === actorId
        const staffRoles = user.roles.filter((r) => r !== 'client') as AppRole[]

        return (
          <li key={user.id} className={`admin-staff-card${!user.is_active ? ' is-inactive' : ''}`}>
            <div className="admin-staff-card__head">
              <span className={`admin-audience-badge admin-audience-badge--${kind}`}>
                {adminUserKindLabel(kind)}
              </span>
              <span className={`admin-staff-card__status${user.is_active ? '' : ' is-off'}`}>
                {user.is_active ? 'ใช้งาน' : 'ปิด'}
              </span>
            </div>
            <h3 className="admin-staff-card__name">{user.full_name || user.login_id}</h3>
            <p className="admin-staff-card__login">
              <code>{user.login_id}</code>
            </p>
            <p className="muted admin-staff-card__email">{user.email}</p>
            {staffRoles.length > 0 ? (
              <div className="admin-staff-card__roles">
                {staffRoles.map((role) => (
                  <span key={role} className="admin-staff-card__role-pill">
                    {ROLE_LABELS[role]}
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted admin-staff-card__no-roles">ยังไม่มีบทบาท</p>
            )}
            {user.must_change_password && (
              <p className="admin-staff-card__hint">รอตั้งรหัสผ่านใหม่</p>
            )}
            {isSelf && <p className="muted admin-staff-card__hint">บัญชีของคุณ</p>}
            <button
              type="button"
              className="crm-btn crm-btn--ghost admin-staff-card__edit"
              onClick={() => onEdit(user)}
            >
              แก้ไข / ลบ
            </button>
          </li>
        )
      })}
    </ul>
  )
}
