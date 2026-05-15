import { Link, useLocation } from 'react-router-dom'
import { resolvePageMeta } from '../modules/quick-access/pathMeta'
import './breadcrumb.css'

export function BreadcrumbNav() {
  const { pathname } = useLocation()
  const meta = resolvePageMeta(pathname)

  if (pathname === '/app' || pathname === '/app/') {
    return null
  }

  const parentPath = meta.path.includes('/') ? meta.path.replace(/\/[^/]+$/, '') : null
  const showParent =
    parentPath &&
    parentPath !== meta.path &&
    parentPath.startsWith('/app/') &&
    parentPath.length > '/app'.length

  return (
    <nav className="breadcrumb" aria-label="ตำแหน่งปัจจุบัน">
      <Link to="/app" className="breadcrumb__link">
        หน้าหลัก
      </Link>
      <span className="breadcrumb__sep" aria-hidden>
        /
      </span>
      {showParent && (
        <>
          <Link to={parentPath} className="breadcrumb__link">
            {resolvePageMeta(parentPath).title}
          </Link>
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
