import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { ROLE_LABELS } from '../../../../shared/types/roles'
import {
  helpFlowStepsForRoles,
  helpNavItemsForRoles,
  helpQuickLinksForRoles,
  helpShortcutsForRoles,
} from '../access'
import '../../crm/crm.css'
import '../../phase2/phase2.css'
import '../help.css'

export function HelpPage() {
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const shortcuts = helpShortcutsForRoles(roles, configured)
  const quickLinks = helpQuickLinksForRoles(roles, configured)
  const modules = helpNavItemsForRoles(roles, configured)
  const flowSteps = helpFlowStepsForRoles(roles, configured)
  const isClientOnly = configured && roles.length > 0 && roles.every((r) => r === 'client')

  return (
    <div className="page">
      <header className="page__header crm-page__header phase2-page__header">
        <div>
          <h1>ช่วยเหลือ</h1>
          <p className="muted">ปุ่มลัด ลิงก์ด่วน และเมนูที่เข้าถึงได้ตามบทบาทของคุณ</p>
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

      {quickLinks.length > 0 && (
        <section className="card card--wide">
          <h2>ลิงก์ด่วน</h2>
          <ul className="help-links">
            {quickLinks.map((link) => (
              <li key={link.path}>
                <Link to={link.path} className="help-links__item">
                  <strong>{link.label}</strong>
                  <span className="muted">{link.detail}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card card--wide">
        <h2>เมนูที่เข้าถึงได้</h2>
        <p className="muted help-modules__intro">
          {modules.length} โมดูล — ตามบทบาท
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
      </section>

      <section className="card card--wide">
        <h2>{isClientOnly ? 'การใช้งานสำหรับลูกค้า' : 'Flow งานหลัก'}</h2>
        <ol className="flow-list">
          {flowSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </div>
  )
}
