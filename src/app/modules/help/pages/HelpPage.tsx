import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { ROLE_LABELS } from '../../../../shared/types/roles'
import { useScrollToHash } from '../../../hooks/useScrollToHash'
import { StartChecklistSection } from '../../start/components/StartChecklistSection'
import { KeyboardShortcutsSection } from '../../keyboard/components/KeyboardShortcutsSection'
import {
  helpFlowStepsForRoles,
  helpNavItemsForRoles,
  helpShortcutsForRoles,
} from '../access'
import '../../crm/crm.css'
import '../../phase2/phase2.css'
import '../../start/start.css'
import '../../keyboard/keyboard.css'
import '../help.css'

export function HelpPage() {
  useScrollToHash()
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const shortcuts = helpShortcutsForRoles(roles, configured)
  const modules = helpNavItemsForRoles(roles, configured)
  const flowSteps = helpFlowStepsForRoles(roles, configured)
  const isClientOnly = configured && roles.length > 0 && roles.every((r) => r === 'client')

  return (
    <div className="page">
      <header className="page__header crm-page__header phase2-page__header">
        <div>
          <h1>ช่วยเหลือ</h1>
          <p className="muted">เช็กลิสต์เริ่มต้น ปุ่มลัด Flow งาน และเมนูตามบทบาท</p>
        </div>
        <Link to="/app" className="crm-btn crm-btn--ghost">
          หน้าหลัก
        </Link>
      </header>

      {!configured && (
        <p className="crm-banner crm-banner--warn">โหมดพัฒนา — แสดงเมนูครบสำหรับทดสอบ</p>
      )}

      {configured && roles.length === 0 && (
        <p className="crm-banner crm-banner--warn">กำลังโหลดบทบาท...</p>
      )}

      <section id="start" className="card card--wide help-anchor">
        <h2>เริ่มใช้งาน</h2>
        <p className="muted help-section-intro">
          เช็กลิสต์แรกตามบทบาท — เก็บความคืบหน้าในเบราว์เซอร์นี้
        </p>
        <StartChecklistSection />
      </section>

      <section className="card card--wide">
        <h2>ปุ่มลัด</h2>
        {shortcuts.length === 0 ? (
          <p className="muted">ไม่มีปุ่มลัดเพิ่มเติมสำหรับบทบาทนี้</p>
        ) : (
          <ul className="help-shortcuts">
            {shortcuts.map((item) => (
              <li key={`${item.keys}-${item.label}`}>
                <kbd className="help-shortcuts__keys">{item.keys}</kbd>
                <div>
                  <strong>{item.label}</strong>
                  <span className="muted">{item.detail}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="keyboard" className="card card--wide help-anchor">
        <h2>ตารางคีย์ลัด</h2>
        <p className="muted help-section-intro">รายละเอียดปุ่มลัดทั้งหมดในระบบ</p>
        <KeyboardShortcutsSection />
      </section>

      <section className="card card--wide">
        <h2>{isClientOnly ? 'การใช้งานสำหรับลูกค้า' : 'Flow งานหลัก'}</h2>
        <ol className="flow-list">
          {flowSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="card card--wide">
        <h2>เมนูงาน (ตามบทบาท)</h2>
        <p className="muted help-modules__intro">
          {modules.length} โมดูล
          {profile?.roles.length
            ? ` (${profile.roles.map((r) => ROLE_LABELS[r]).join(', ')})`
            : ''}
        </p>
        {modules.length === 0 ? (
          <p className="muted">ยังไม่มีเมนูที่แสดงได้ — รอโหลดบทบาทหรือติดต่อผู้ดูแล</p>
        ) : (
          <ul className="help-modules">
            {modules.map((item) => (
              <li key={item.path}>
                <Link to={item.path} className="help-modules__item">
                  <span className="help-modules__icon" aria-hidden>
                    {item.icon}
                  </span>
                  <span>
                    <strong>{item.labelTh}</strong>
                    <span className="muted">{item.label}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="muted" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
          ค้นหารวมใช้ <kbd>⌘K</kbd> · แจ้งเตือนจัดการจาก{' '}
          <Link to="/app/notifications">หน้าแจ้งเตือน</Link>
          {' · '}
          <Link to="/app/status">สถานะระบบ</Link>
        </p>
      </section>
    </div>
  )
}
