import { NavLink } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthProvider'
import { canUseGlobalSearch } from '../../shared/auth/access'
import { ROLE_LABELS } from '../../shared/types/roles'
import { navItemsForRoles } from '../config/navigation'
import { useNotificationUnread } from '../modules/notifications/useNotificationUnread'
import { useSidebarLayout } from './SidebarLayoutContext'
import './Sidebar.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

interface SidebarProps {
  onOpenSearch?: () => void
}

export function Sidebar({ onOpenSearch }: SidebarProps) {
  const { profile, signOut, configured } = useAuth()
  const { collapsed, toggleCollapsed } = useSidebarLayout()
  const roles = profile?.roles ?? (configured ? [] : ['ceo' as const])
  const items = navItemsForRoles(roles)
  const userId = profile?.id ?? DEV_OWNER
  const unreadNotif = useNotificationUnread(userId, roles)
  const showQuickSearch = (canUseGlobalSearch(roles) || !configured) && onOpenSearch

  return (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      <div className="sidebar__brand">
        <div className="sidebar__brand-main">
          <span className="sidebar__logo" aria-hidden>
            NP
          </span>
          {!collapsed && (
            <div className="sidebar__brand-text">
              <strong>NP Create</strong>
              <span>Operating System</span>
            </div>
          )}
        </div>
        <button
          type="button"
          className="sidebar__collapse"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'ขยายแถบเมนู' : 'พับแถบเมนู'}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      <nav className="sidebar__nav" aria-label="เมนูหลัก">
        {items.map((item) => {
          const isNotif = item.path === '/app/notifications'
          const notifTitle =
            isNotif && unreadNotif > 0 ? `${item.labelTh} (${unreadNotif} ยังไม่อ่าน)` : item.labelTh
          const linkTitle = item.ready ? notifTitle : `${item.labelTh} — Sprint ${item.phase}`
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/app'}
              title={linkTitle}
              className={({ isActive }) =>
                `sidebar__link${isActive ? ' sidebar__link--active' : ''}${!item.ready ? ' sidebar__link--soon' : ''}`
              }
            >
              <span
                className={`sidebar__icon${isNotif && unreadNotif > 0 ? ' sidebar__icon--notif' : ''}`}
                aria-hidden
              >
                {item.icon}
              </span>
              <span className="sidebar__label">
                {item.labelTh}
                {isNotif && unreadNotif > 0 && (
                  <span className="sidebar__badge-count" aria-label={`${unreadNotif} ยังไม่อ่าน`}>
                    {unreadNotif > 99 ? '99+' : unreadNotif}
                  </span>
                )}
                {!item.ready && (
                  <small className="sidebar__badge">Sprint {item.phase}</small>
                )}
              </span>
            </NavLink>
          )
        })}
      </nav>

      {showQuickSearch && (
        <button
          type="button"
          className="sidebar__search"
          title="ค้นหาด่วน (⌘K)"
          onClick={onOpenSearch}
        >
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
          <div className="sidebar__user-meta">
            <strong>{profile?.full_name ?? 'ผู้ใช้งาน'}</strong>
            <span>{profile?.email ?? 'โหมดพัฒนา'}</span>
            {(profile?.roles ?? []).map((r) => (
              <em key={r}>{ROLE_LABELS[r]}</em>
            ))}
          </div>
        </div>
        {configured && (
          <button
            type="button"
            className="sidebar__logout"
            title="ออกจากระบบ"
            onClick={() => void signOut()}
          >
            {collapsed ? 'ออก' : 'ออกจากระบบ'}
          </button>
        )}
      </div>
    </aside>
  )
}
