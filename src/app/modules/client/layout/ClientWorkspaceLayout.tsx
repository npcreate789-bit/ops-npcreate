import { NavLink, Outlet } from 'react-router-dom'
import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import { ClientPreviewBar } from '../components/ClientPreviewBar'
import { ClientWorkspaceProvider, useClientWorkspaceContext } from '../context/ClientWorkspaceContext'
import '../client-workspace.css'

const TABS = [
  { to: '/app/client', end: true, label: 'ภาพรวม' },
  { to: '/app/client/projects', end: false, label: 'โปรเจกต์' },
  { to: '/app/client/brief', end: false, label: 'บรีฟงาน' },
  { to: '/app/client/reports', end: false, label: 'รายงาน' },
  { to: '/app/client/chat', end: false, label: 'แชท' },
  { to: '/app/client/payment', end: false, label: 'การชำระเงิน' },
] as const

function ClientWorkspaceShell() {
  const ws = useClientWorkspaceContext()
  const customer = ws.data?.customer

  return (
    <div className="client-workspace">
      {ws.loading ? (
        <p className="client-workspace__loading muted" role="status">
          กำลังโหลดพื้นที่ลูกค้า…
        </p>
      ) : (
        <>
          {customer ? (
            <header className="client-workspace__header">
              <p className="client-workspace__eyebrow">พื้นที่ลูกค้า</p>
              <h1 className="client-workspace__title">{customer.brand_name}</h1>
              <p className="muted client-workspace__meta">
                สัญญาถึง {formatBangkokDate(customer.contract_end)} · {customer.status}
                {customer.ready_for_ads ? ' · พร้อมยิงแอด' : ''}
              </p>
            </header>
          ) : null}
          <ClientPreviewBar
            configured={ws.configured}
            canPreview={ws.canPreview}
            customers={ws.customers}
            previewId={ws.previewId}
            onPreviewChange={ws.setPreviewId}
            data={ws.data}
            error={ws.error}
            isClientOnly={ws.isClientOnly}
          />
        </>
      )}

      <nav className="client-workspace__nav" aria-label="พื้นที่ลูกค้า">
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

      <div className="client-workspace__body">
        <Outlet />
      </div>
    </div>
  )
}

export function ClientWorkspaceLayout() {
  return (
    <ClientWorkspaceProvider>
      <ClientWorkspaceShell />
    </ClientWorkspaceProvider>
  )
}
