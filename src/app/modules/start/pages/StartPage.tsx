import { Navigate } from 'react-router-dom'

/** ยุบเข้าหน้าช่วยเหลือ */
export function StartPage() {
  return <Navigate to="/app/help#start" replace />
}
