import { NavLink, Outlet } from 'react-router-dom'
import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  formatClientCustomerStatus,
  formatClientReadyForAds,
} from '../clientLabels'
import { withClientPreview } from '../clientNav'
import { ClientPreviewBar } from '../components/ClientPreviewBar'
import { ClientStaffToolbar } from '../components/ClientStaffToolbar'
import { ClientWorkspaceProvider, useClientWorkspaceContext } from '../context/ClientWorkspaceContext'
import '../client-workspace.css'

const TABS = [
  { to: '/app/client', end: true, label: 'ภาพรวม', hint: 'สรุปและสิ่งที่ควรทำ' },
  { to: '/app/client/brief', end: false, label: 'บรีฟงาน', hint: 'กรอกข้อมูลแบรนด์' },
  { to: '/app/client/projects', end: false, label: 'โปรเจกต์', hint: 'ความคืบหน้า' },
  { to: '/app/client/reports', end: false, label: 'รายงาน', hint: 'ผลโฆษณา' },
  { to: '/app/client/chat', end: false, label: 'แชท', hint: 'คุยกับทีม' },
  { to: '/app/client/payment', end: false, label: 'การชำระเงิน', hint: 'สัญญาและชำระ' },
] as const

function ClientWorkspaceShell() {
  const ws = useClientWorkspaceContext()
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const customer = ws.data?.customer
  const isStaffPreview = ws.canPreview && !ws.isClientOnly
  const previewForNav =
    isStaffPreview && (ws.previewId || customer?.id) ? ws.previewId || customer?.id : undefined

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
                สัญญาถึง {formatBangkokDate(customer.contract_end)} ·{' '}
                {formatClientCustomerStatus(customer.status)} ·{' '}
                {formatClientReadyForAds(
                  customer.ready_for_ads,
                  Boolean(ws.data?.brief_submitted),
                )}
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
          {customer && isStaffPreview && (
            <ClientStaffToolbar
              customerId={customer.id}
              roles={roles}
              configured={configured}
            />
          )}
        </>
      )}

      <nav className="client-workspace__nav" aria-label="พื้นที่ลูกค้า">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={withClientPreview(tab.to, previewForNav)}
            end={tab.end}
            title={tab.hint}
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
