import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { COMPANY_ICON_SRC } from '../../../../shared/company/companyProfile'
import './client-portal-shell.css'

export function ClientPortalHeader() {
  const { profile, signOut, configured } = useAuth()

  return (
    <header className="client-portal-header">
      <div className="client-portal-header__brand">
        <img
          className="client-portal-header__logo"
          src={COMPANY_ICON_SRC}
          alt="NP Create"
          width={40}
          height={40}
        />
        <div className="client-portal-header__titles">
          <strong>พื้นที่ลูกค้า</strong>
          <span>{profile?.full_name ?? profile?.login_id ?? 'NP Create'}</span>
        </div>
      </div>
      <nav className="client-portal-header__actions" aria-label="บัญชีลูกค้า">
        <Link to="/app/settings" className="client-portal-header__link">
          ตั้งค่า
        </Link>
        {configured ? (
          <button
            type="button"
            className="client-portal-header__logout"
            onClick={() => void signOut()}
          >
            ออกจากระบบ
          </button>
        ) : null}
      </nav>
    </header>
  )
}
