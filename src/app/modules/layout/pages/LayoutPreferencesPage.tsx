import { Navigate } from 'react-router-dom'

/** ยุบเข้าหน้าตั้งค่า */
export function LayoutPreferencesPage() {
  return <Navigate to="/app/settings#layout" replace />
}
