import { Navigate } from 'react-router-dom'

/** ยุบเข้าหน้าสถานะระบบ */
export function AboutPage() {
  return <Navigate to="/app/status#about" replace />
}
