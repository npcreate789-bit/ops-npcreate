import { useAuth } from '../../../../shared/auth/AuthProvider'
import { keyboardShortcutsForRoles } from '../access'
import '../keyboard.css'

export function KeyboardShortcutsSection() {
  const { profile, configured } = useAuth()
  const rows = keyboardShortcutsForRoles(profile?.roles ?? [], configured)

  return (
    <div className="keyboard-table-wrap">
      <table className="keyboard-table">
        <thead>
          <tr>
            <th scope="col">หมวด</th>
            <th scope="col">ปุ่ม</th>
            <th scope="col">การทำงาน</th>
            <th scope="col">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.category}-${row.keys}-${row.label}`}>
              <td>{row.category}</td>
              <td>
                <kbd className="keyboard-table__kbd">{row.keys}</kbd>
              </td>
              <td>{row.label}</td>
              <td className="muted">{row.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
