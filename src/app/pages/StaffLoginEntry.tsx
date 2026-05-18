import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { CLIENT_LOGIN_PATH, isClientAppPath } from '../../shared/auth/postLoginPath'
import { LoginPage } from './LoginPage'

/** หน้า login ทีมงาน — redirect ลูกค้าและ legacy ?mode=client ไป /client/login */
export function StaffLoginEntry() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ?? null

  if (searchParams.get('mode') === 'client' || (from && isClientAppPath(from))) {
    return <Navigate to={CLIENT_LOGIN_PATH} state={location.state} replace />
  }

  return <LoginPage audience="staff" />
}
