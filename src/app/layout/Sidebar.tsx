import { NavLink } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthProvider'
import { ROLE_LABELS } from '../../shared/types/roles'
import { navItemsForRoles } from '../config/navigation'
import './Sidebar.css'

export function Sidebar() {
  const { profile, signOut, configured } = useAuth()
  const roles = profile?.roles ?? (configured ? [] : ['ceo' as const])
  const items = navItemsForRoles(roles)

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
              {!item.ready && (
                <small className="sidebar__badge">Sprint {item.phase}</small>
              )}
            </span>
          </NavLink>
        ))}
      </nav>

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
