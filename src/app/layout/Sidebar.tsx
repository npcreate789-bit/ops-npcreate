import { NavLink } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthProvider'
import { canUseGlobalSearch } from '../../shared/auth/access'
import { ROLE_LABELS } from '../../shared/types/roles'
import { navItemsForRoles } from '../config/navigation'
import { useNotificationUnread } from '../modules/notifications/useNotificationUnread'
import './Sidebar.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

interface SidebarProps {
  onOpenSearch?: () => void
}

export function Sidebar({ onOpenSearch }: SidebarProps) {
  const { profile, signOut, configured } = useAuth()
  const roles = profile?.roles ?? (configured ? [] : ['ceo' as const])
  const items = navItemsForRoles(roles)
  const userId = profile?.id ?? DEV_OWNER
  const unreadNotif = useNotificationUnread(userId, roles)
  const showQuickSearch = (canUseGlobalSearch(roles) || !configured) && onOpenSearch

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__logo" aria-hidden>
          NP
        </span>
        <div>
          <strong>NP Create</strong>
          <span>Operating System</span>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="เมนูหลัก">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/app'}
            className={({ isActive }) =>
              `sidebar__link${isActive ? ' sidebar__link--active' : ''}${!item.ready ? ' sidebar__link--soon' : ''}`
            }
          >
            <span className="sidebar__icon" aria-hidden>
              {item.icon}
            </span>
            <span className="sidebar__label">
              {item.labelTh}
              {item.path === '/app/notifications' && unreadNotif > 0 && (
                <span className="sidebar__badge-count" aria-label={`${unreadNotif} ยังไม่อ่าน`}>
                  {unreadNotif > 99 ? '99+' : unreadNotif}
                </span>
              )}
              {!item.ready && (
                <small className="sidebar__badge">Sprint {item.phase}</small>
              )}
            </span>
          </NavLink>
        ))}
      </nav>

      {showQuickSearch && (
        <button type="button" className="sidebar__search" onClick={onOpenSearch}>
          <span className="sidebar__icon" aria-hidden>
            ⌕
          </span>
          <span className="sidebar__label">
            ค้นหาด่วน
            <kbd className="sidebar__kbd">⌘K</kbd>
          </span>
        </button>
      )}

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <span className="sidebar__avatar" aria-hidden>
            {(profile?.full_name ?? profile?.email ?? 'U').charAt(0).toUpperCase()}
          </span>
          <div>
            <strong>{profile?.full_name ?? 'ผู้ใช้งาน'}</strong>
            <span>{profile?.email ?? 'โหมดพัฒนา'}</span>
            {profile?.roles.map((r) => (
              <em key={r}>{ROLE_LABELS[r]}</em>
            ))}
          </div>
        </div>
        {configured && (
          <button type="button" className="sidebar__logout" onClick={() => void signOut()}>
            ออกจากระบบ
          </button>
        )}
      </div>
    </aside>
  )
}
