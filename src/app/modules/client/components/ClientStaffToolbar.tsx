import { Link } from 'react-router-dom'
import type { AppRole } from '../../../../shared/types/roles'
import {
  canLinkCustomerAds,
  canLinkCustomerFinance,
  canLinkCustomerOnboarding,
  canLinkCustomerRenewals,
  canShowCustomer360Link,
} from '../../customers/access'
import {
  adsUrlForCustomer,
  financeUrlForCustomer,
  renewalsUrlForCustomer,
} from '../../customers/customerLinks'

interface ClientStaffToolbarProps {
  customerId: string
  roles: AppRole[]
  configured: boolean
}

export function ClientStaffToolbar({ customerId, roles, configured }: ClientStaffToolbarProps) {
  const show360 = canShowCustomer360Link(roles, '/app/customers') || !configured
  const showOnboarding = canLinkCustomerOnboarding(roles) || !configured
  const showFinance = canLinkCustomerFinance(roles) || !configured
  const showRenewals = canLinkCustomerRenewals(roles) || !configured
  const showAds = canLinkCustomerAds(roles) || !configured

  const hasAny =
    show360 || showOnboarding || showFinance || showRenewals || showAds

  if (!hasAny) return null

  return (
    <nav className="client-staff-toolbar" aria-label="ลิงก์ทีมงาน">
      <span className="client-staff-toolbar__label">ทีม:</span>
      {show360 && (
        <Link to={`/app/customers/${customerId}`} className="crm-btn crm-btn--ghost crm-btn--sm">
          360°
        </Link>
      )}
      {showOnboarding && (
        <Link
          to={`/app/onboarding/${customerId}`}
          className="crm-btn crm-btn--ghost crm-btn--sm"
        >
          รับบรีฟ
        </Link>
      )}
      {showAds && (
        <Link to={adsUrlForCustomer(customerId)} className="crm-btn crm-btn--ghost crm-btn--sm">
          งานแอด
        </Link>
      )}
      <Link to="/app/content" className="crm-btn crm-btn--ghost crm-btn--sm">
        คอนเทนต์
      </Link>
      {showRenewals && (
        <Link
          to={renewalsUrlForCustomer(customerId)}
          className="crm-btn crm-btn--ghost crm-btn--sm"
        >
          ต่อสัญญา
        </Link>
      )}
      {showFinance && (
        <Link
          to={financeUrlForCustomer(customerId)}
          className="crm-btn crm-btn--ghost crm-btn--sm"
        >
          การเงิน
        </Link>
      )}
    </nav>
  )
}
