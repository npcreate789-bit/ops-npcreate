import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthProvider'
import { canOpenHelpNavLink } from '../modules/help/access'
import { resolvePageMeta } from '../modules/quick-access/pathMeta'
import './breadcrumb.css'

export function BreadcrumbNav() {
  const { pathname } = useLocation()
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const meta = resolvePageMeta(pathname)

  if (pathname === '/app' || pathname === '/app/') {
    return null
  }

  const parentPath = meta.path.replace(/\/[^/]+$/, '')
  const showParent =
    parentPath !== meta.path &&
    parentPath.startsWith('/app/') &&
    parentPath.length > '/app'.length

  const homeLinkable = canOpenHelpNavLink(roles, '/app', configured)
  const parentLinkable =
    showParent && canOpenHelpNavLink(roles, parentPath, configured)

  return (
    <nav className="breadcrumb" aria-label="ตำแหน่งปัจจุบัน">
      {homeLinkable ? (
        <Link to="/app" className="breadcrumb__link">
          หน้าหลัก
        </Link>
      ) : (
        <span className="breadcrumb__muted">หน้าหลัก</span>
      )}
      <span className="breadcrumb__sep" aria-hidden>
        /
      </span>
      {showParent && (
        <>
          {parentLinkable ? (
            <Link to={parentPath} className="breadcrumb__link">
              {resolvePageMeta(parentPath).title}
            </Link>
          ) : (
            <span className="breadcrumb__muted">{resolvePageMeta(parentPath).title}</span>
          )}
          <span className="breadcrumb__sep" aria-hidden>
            /
          </span>
        </>
      )}
      <span className="breadcrumb__current" aria-current="page">
        {meta.title}
      </span>
    </nav>
  )
}
