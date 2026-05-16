import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { keyboardShortcutsForRoles } from '../access'
import '../../crm/crm.css'
import '../../phase2/phase2.css'
import '../keyboard.css'

export function KeyboardShortcutsPage() {
  const { profile, configured } = useAuth()
  const rows = keyboardShortcutsForRoles(profile?.roles ?? [], configured)

  return (
    <div className="page">
      <header className="page__header crm-page__header phase2-page__header">
        <div>
          <h1>ศูนย์คีย์ลัด</h1>
          <p className="muted">ปุ่มลัดสำคัญในระบบ — ใช้ร่วมกับหน้าช่วยเหลือ</p>
        </div>
        <Link to="/app/help" className="crm-btn crm-btn--ghost">
          ช่วยเหลือ
        </Link>
      </header>

      <section className="card card--wide">
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
      </section>

      <section className="card card--wide">
        <h2>คำแนะนำ</h2>
        <ul className="flow-list">
          <li>
            เมนูและข้อมูลส่วนใหญ่ยังใช้เมาส์หรือแตะบนหน้าจอ — คีย์ลัดรองรับงานซ้ำที่เร็วขึ้น
          </li>
          <li>
            คีย์ลัดที่ขึ้นกับบทบาทดูเพิ่มที่{' '}
            <Link to="/app/help">ช่วยเหลือ</Link>
          </li>
        </ul>
      </section>
    </div>
  )
}
