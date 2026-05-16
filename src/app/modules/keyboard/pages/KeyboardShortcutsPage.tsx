import { Navigate } from 'react-router-dom'

/** ยุบเข้าหน้าช่วยเหลือ */
export function KeyboardShortcutsPage() {
  return <Navigate to="/app/help#keyboard" replace />
}
