import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthProvider'
import { canOpenHelpNavLink } from '../modules/help/access'
import { resolveBreadcrumbChain, resolvePageMeta } from '../modules/quick-access/pathMeta'
import { usePageHeading } from '../layout/PageHeadingContext'
import './breadcrumb.css'

export function BreadcrumbNav() {
  const { pathname } = useLocation()
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const meta = resolvePageMeta(pathname)
  const heading = usePageHeading()

  if (pathname === '/app' || pathname === '/app/') {
    return null
  }

  const chain = resolveBreadcrumbChain(pathname)
  const homeLinkable = canOpenHelpNavLink(roles, '/app', configured)
  const currentLabel = heading.entityLabel
    ? `${meta.title}: ${heading.entityLabel}`
    : meta.title

  return (
    <nav className="breadcrumb" aria-label="ตำแหน่งปัจจุบัน">
      {homeLinkable ? (
        <Link to="/app" className="breadcrumb__link">
          หน้าหลัก
        </Link>
      ) : (
        <span className="breadcrumb__muted">หน้าหลัก</span>
      )}
      {chain.map((crumb) => {
        const linkable =
          crumb.linkable && canOpenHelpNavLink(roles, crumb.path, configured)
        return (
          <span key={crumb.path} className="breadcrumb__chain">
            <span className="breadcrumb__sep" aria-hidden>
              /
            </span>
            {linkable ? (
              <Link to={crumb.path} className="breadcrumb__link">
                {crumb.label}
              </Link>
            ) : (
              <span className="breadcrumb__muted" title="ยังไม่มีหน้ารายการกลาง">
                {crumb.label}
              </span>
            )}
          </span>
        )
      })}
      <span className="breadcrumb__sep" aria-hidden>
        /
      </span>
      <span className="breadcrumb__current" aria-current="page">
        {currentLabel}
      </span>
    </nav>
  )
}
