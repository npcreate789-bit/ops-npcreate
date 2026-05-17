import { NavLink, Outlet } from 'react-router-dom'
import '../client-workspace.css'

const TABS = [
  { to: '/app/client', end: true, label: 'ภาพรวม' },
  { to: '/app/client/projects', end: false, label: 'โปรเจกต์' },
  { to: '/app/client/brief', end: false, label: 'บรีฟงาน' },
  { to: '/app/client/reports', end: false, label: 'รายงาน' },
  { to: '/app/client/chat', end: false, label: 'แชท' },
  { to: '/app/client/payment', end: false, label: 'การชำระเงิน' },
] as const

export function ClientWorkspaceLayout() {
  return (
    <div className="client-workspace">
      <nav className="client-workspace__nav" aria-label="Client Workspace">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `client-workspace__tab${isActive ? ' client-workspace__tab--active' : ''}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
