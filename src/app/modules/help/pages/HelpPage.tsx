import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canUseGlobalSearch, canViewSystemStatus } from '../../../../shared/auth/access'
import { useScrollToHash } from '../../../hooks/useScrollToHash'
import { effectiveRolesForNav } from '../../../config/navigation'
import { StartChecklistSection } from '../../start/components/StartChecklistSection'
import { KeyboardShortcutsSection } from '../../keyboard/components/KeyboardShortcutsSection'
import { helpNavItemsForRoles, helpRelatedLinksForRoles, helpShortcutsForRoles } from '../access'
import { HelpNextActionBanner } from '../components/HelpNextActionBanner'
import { HelpRelatedToolbar } from '../components/HelpRelatedToolbar'
import { HelpRoleGuide } from '../components/HelpRoleGuide'
import { labelHelpRoles, labelModulesSection } from '../helpLabels'
import { withHelpContext } from '../helpNav'
import '../../crm/crm.css'
import '../../phase2/phase2.css'
import '../../start/start.css'
import '../../keyboard/keyboard.css'
import '../help.css'

export function HelpPage() {
  useScrollToHash()
  const location = useLocation()
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const navRoles = effectiveRolesForNav(roles, configured)
  const search = location.search
  const shortcuts = helpShortcutsForRoles(roles, configured)
  const modules = helpNavItemsForRoles(roles, configured)
  const relatedLinks = helpRelatedLinksForRoles(roles, configured)
  const isClientOnly =
    navRoles.length > 0 && navRoles.every((r) => r === 'client')
  const homeTo = withHelpContext('/app', search)

  return (
    <div className="page">
      <header className="page__header crm-page__header phase2-page__header help-page__header">
        <div>
          <h1>ช่วยเหลือ</h1>
          <p className="muted">เช็กลิสต์ · คีย์ลัด · Flow งาน · เมนูตามบทบาท</p>
          <nav className="help-page__jump" aria-label="ข้ามไปส่วนในหน้า">
            <a href="#start">เริ่มต้น</a>
            <a href="#guide">Flow</a>
            <a href="#keyboard">คีย์ลัด</a>
            <a href="#modules">เมนู</a>
          </nav>
        </div>
        <Link to={homeTo} className="crm-btn crm-btn--ghost">
          หน้าหลัก
        </Link>
      </header>

      <HelpNextActionBanner configured={configured} profile={profile} search={search} />

      {!configured && (
        <p className="crm-banner crm-banner--warn">โหมดพัฒนา — แสดงเมนูครบสำหรับทดสอบ</p>
      )}

      <section id="start" className="card card--wide help-anchor">
        <h2>เริ่มใช้งาน</h2>
        <p className="muted help-section-intro">
          เช็กลิสต์แรกตามบทบาท — เก็บความคืบหน้าในเบราว์เซอร์นี้
        </p>
        <StartChecklistSection />
      </section>

      <HelpRoleGuide roles={roles} configured={configured} search={search} />

      <HelpRelatedToolbar links={relatedLinks} search={search} />

      <section className="card card--wide">
        <h2>ปุ่มลัดที่ใช้บ่อย</h2>
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
        <p className="muted help-section-intro">รายละเอียดปุ่มลัดทั้งหมดในระบบ (ตามบทบาท)</p>
        <KeyboardShortcutsSection />
      </section>

      <section id="modules" className="card card--wide help-anchor">
        <h2>{labelModulesSection()}</h2>
        <p className="muted help-modules__intro">
          {modules.length} โมดูล
          {navRoles.length > 0 ? ` · ${labelHelpRoles(navRoles)}` : ''}
        </p>
        {modules.length === 0 ? (
          <p className="muted">ยังไม่มีเมนูที่แสดงได้ — ติดต่อผู้ดูแลเพื่อมอบสิทธิ์</p>
        ) : (
          <ul className="help-modules">
            {modules.map((item) => (
              <li key={item.path}>
                <Link
                  to={withHelpContext(item.path, search)}
                  className="help-modules__item"
                >
                  <span className="help-modules__icon" aria-hidden>
                    {item.icon}
                  </span>
                  <strong>{item.labelTh}</strong>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="muted help-modules__footer">
          {isClientOnly ? (
            <>
              สลับงานในแท็บ{' '}
              <Link to={withHelpContext('/app/client', search)}>พื้นที่ลูกค้า</Link>
            </>
          ) : (
            <>
              {(canUseGlobalSearch(navRoles) || !configured) && (
                <>
                  ค้นหารวม <kbd>⌘K</kbd> · แจ้งเตือน{' '}
                  <Link to={withHelpContext('/app/notifications', search)}>หน้าแจ้งเตือน</Link>
                </>
              )}
              {(canViewSystemStatus(navRoles) || !configured) && (
                <>
                  {(canUseGlobalSearch(navRoles) || !configured) && ' · '}
                  <Link to={withHelpContext('/app/status', search)}>สถานะระบบ</Link>
                </>
              )}
            </>
          )}
        </p>
      </section>
    </div>
  )
}
