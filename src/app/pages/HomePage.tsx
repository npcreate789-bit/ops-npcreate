import { Link, Navigate } from 'react-router-dom'
import { effectiveRolesForNav, sidebarNavItemsForRoles } from '../config/navigation'
import { useAuth } from '../../shared/auth/AuthProvider'
import {
  canAccessNotifications,
  canUseGlobalSearch,
  canUseQuickAccess,
  canViewSystemStatus,
  canViewWorkHub,
} from '../../shared/auth/access'
import { ROLE_LABELS } from '../../shared/types/roles'
import { QuickAccessPanel } from '../modules/quick-access/components/QuickAccessPanel'
import { useNotificationUnread } from '../modules/notifications/useNotificationUnread'
import '../modules/crm/crm.css'
import {
  bangkokGreeting,
  canOpenHomePath,
  homeAllModuleCount,
  homeModulesForRoles,
  homePriorityActions,
  isClientOnlyHome,
} from './home/access'
import { HOME_MODULE_HINTS } from './home/constants'
import { HomeContactInquiries } from './home/HomeContactInquiries'
import { HomeWorkPreview } from './home/HomeWorkPreview'
import { canViewHomeContactInquiries } from './home/access'
import { useHomeContactInquiries } from './home/useHomeContactInquiries'
import { useHomeDashboard } from './home/useHomeDashboard'
import './pages.css'
import './home/home-dashboard.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

export function HomePage() {
  const { configured, profile, profileLoadError } = useAuth()
  const roles = profile?.roles ?? []
  const navRoles = effectiveRolesForNav(roles, configured)
  const userId = profile?.id ?? DEV_OWNER
  const displayName = profile?.full_name?.trim() || profile?.email?.split('@')[0] || 'ผู้ใช้งาน'

  const clientOnly = isClientOnlyHome(roles, configured)

  if (clientOnly) {
    return <Navigate to="/app/client" replace />
  }

  const showWork = canViewWorkHub(roles) || !configured
  const showQuickAccess = canUseQuickAccess(roles) || !configured
  const showPaletteHint = canUseGlobalSearch(roles) || !configured
  const showNotifKpi = canAccessNotifications(roles) || !configured

  const {
    loading: workLoading,
    error: workError,
    summary,
    previewItems,
    totalItems,
    hasKinds,
    enabled: workEnabled,
  } = useHomeDashboard(userId, roles, configured)

  const showContactInquiries = canViewHomeContactInquiries(roles, configured)
  const {
    items: contactInquiries,
    loading: contactLoading,
    error: contactError,
    total: contactTotal,
  } = useHomeContactInquiries(roles, configured)

  const unreadNotif = useNotificationUnread(userId, roles)
  const priorityActions = homePriorityActions(navRoles, clientOnly)
  const modules = homeModulesForRoles(roles, configured)
  const moduleTotal = homeAllModuleCount(roles, configured)
  const navModuleCount = sidebarNavItemsForRoles(navRoles).filter((i) => i.path !== '/app').length

  const primaryCta = showWork
    ? { path: '/app/work', label: 'ดูงานทั้งหมด' }
    : priorityActions[0]
      ? { path: priorityActions[0].path, label: priorityActions[0].labelTh }
      : null

  return (
    <div className="page home-dashboard">
      <section className="home-hero" aria-labelledby="home-greeting">
        <div>
          <p className="home-hero__eyebrow">{bangkokGreeting()}</p>
          <h1 id="home-greeting">{displayName}</h1>
          <p className="home-hero__sub">
            ภาพรวมงานวันนี้ แจ้งเตือน และทางลัดไปโมดูลที่คุณใช้บ่อย
          </p>
          {profile?.roles.length ? (
            <div className="home-hero__roles" aria-label="บทบาท">
              {profile.roles.map((r) => (
                <span key={r} className="home-hero__role">
                  {ROLE_LABELS[r]}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="home-hero__actions">
          {primaryCta && (
            <Link to={primaryCta.path} className="crm-btn crm-btn--primary">
              {primaryCta.label}
            </Link>
          )}
          {showPaletteHint && (
            <span className="muted" style={{ fontSize: '0.82rem' }}>
              <kbd>⌘K</kbd> ค้นหาด่วน
            </span>
          )}
        </div>
      </section>

      {profileLoadError ? (
        <section className="card card--wide card--warn" role="alert">
          <h2>โหลดบทบาทไม่สมบูรณ์</h2>
          <p className="muted">{profileLoadError}</p>
          <p>ลองรีเฟรชหน้า หรือติดต่อผู้ดูแลหากปัญหายังอยู่</p>
        </section>
      ) : null}

      {!configured && (
        <p className="crm-banner crm-banner--warn">โหมดพัฒนา — ข้อมูลตัวอย่างและเมนูครบสำหรับทดสอบ</p>
      )}

      {configured && roles.length === 0 && !profileLoadError && (
        <p className="crm-banner crm-banner--warn">กำลังโหลดบทบาท…</p>
      )}

      {showContactInquiries && (
        <section className="home-panel home-panel--contact" aria-labelledby="home-contact-heading">
          <header className="home-panel__head">
            <div>
              <h2 id="home-contact-heading">ลูกค้าติดต่อจากฟอร์ม</h2>
              <p className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.8rem' }}>
                สอบถามจาก /contact → CRM — กดรายการเพื่อเปิด Lead
              </p>
            </div>
            {canOpenHomePath(roles, '/app/crm') && (
              <Link to="/app/crm" className="muted">
                CRM ทั้งหมด{contactTotal > 0 ? ` · ${contactTotal} รายการล่าสุด` : ''} →
              </Link>
            )}
          </header>
          <ol className="home-flow" aria-label="ขั้นตอนการติดต่อลูกค้า">
            <li>ลูกค้ากรอกฟอร์มที่หน้า /contact (LINE หรือ Facebook)</li>
            <li>ระบบสร้าง Lead ใน CRM อัตโนมัติ</li>
            <li>ทีม Sales ติดต่อกลับ → ใบเสนอราคา → Finance → Client Workspace</li>
          </ol>
          <HomeContactInquiries
            items={contactInquiries}
            roles={roles}
            loading={contactLoading}
            error={contactError}
          />
        </section>
      )}

      {workEnabled && (
        <section className="home-kpi-grid" aria-label="สรุปงาน">
          <Link to="/app/work" className={`home-kpi${summary.overdue > 0 ? ' home-kpi--warn' : ''}`}>
            <span className="home-kpi__label">เกินกำหนด</span>
            <span className="home-kpi__value">{workLoading ? '…' : summary.overdue}</span>
            <span className="home-kpi__hint">ต้องจัดการก่อน</span>
          </Link>
          <Link to="/app/work" className="home-kpi home-kpi--accent">
            <span className="home-kpi__label">วันนี้</span>
            <span className="home-kpi__value">{workLoading ? '…' : summary.due_today}</span>
            <span className="home-kpi__hint">ครบกำหนดวันนี้</span>
          </Link>
          {showNotifKpi && (
            <Link to="/app/notifications" className="home-kpi">
              <span className="home-kpi__label">แจ้งเตือน</span>
              <span className="home-kpi__value">{unreadNotif}</span>
              <span className="home-kpi__hint">ยังไม่อ่าน</span>
            </Link>
          )}
          <Link to="/app/work" className="home-kpi">
            <span className="home-kpi__label">งานในรายการ</span>
            <span className="home-kpi__value">{workLoading ? '…' : totalItems}</span>
            <span className="home-kpi__hint">30 วันถัดไป</span>
          </Link>
        </section>
      )}

      <div className="home-layout">
        {showWork && hasKinds && (
          <section className="home-panel" aria-labelledby="home-work-heading">
            <header className="home-panel__head">
              <h2 id="home-work-heading">งานที่ต้องทำ</h2>
              {totalItems > 0 && (
                <Link to="/app/work" className="muted">
                  ทั้งหมด {totalItems} รายการ →
                </Link>
              )}
            </header>
            <HomeWorkPreview
              items={previewItems}
              roles={roles}
              loading={workLoading}
              error={workError}
            />
            {showNotifKpi && (
              <p className="muted" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                <Link to="/app/notifications">จัดการแจ้งเตือน</Link>
                {' · '}
                <Link to="/app/work">งานทั้งหมด</Link>
              </p>
            )}
          </section>
        )}

        {showWork && !hasKinds && configured && (
          <section className="home-panel">
            <h2>งานของฉัน</h2>
            <p className="muted">ไม่มีประเภทงานที่แสดงได้สำหรับบทบาทนี้</p>
          </section>
        )}

        <aside className="home-panel home-quick-access">
          <header className="home-panel__head">
            <h2>เข้าถึงด่วน</h2>
          </header>
          {showQuickAccess ? (
            <>
              <p className="muted" style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                หน้าที่เปิดล่าสุดและปักหมุด — กด ☆ เพื่อปักหมุด
                {showPaletteHint ? (
                  <>
                    {' '}
                    · แสดงใน <kbd>⌘K</kbd> เมื่อยังไม่พิมพ์ค้นหา
                  </>
                ) : null}
              </p>
              <QuickAccessPanel variant="home" />
            </>
          ) : (
            <p className="muted">บทบาท client อย่างเดียวไม่มีการเข้าถึงด่วน</p>
          )}
        </aside>
      </div>

      {priorityActions.length > 0 && (
        <section className="home-panel" aria-labelledby="home-actions-heading">
          <header className="home-panel__head">
            <h2 id="home-actions-heading">ทางลัด</h2>
            <span className="muted">ตามลำดับงานจริง</span>
          </header>
          <div className="home-actions">
            {priorityActions.map((item) => (
              <Link key={item.path} to={item.path} className="home-action">
                <span className="home-action__icon" aria-hidden>
                  {item.icon}
                </span>
                <strong>{item.labelTh}</strong>
                <span className="muted">
                  {HOME_MODULE_HINTS[item.path] ?? item.label}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {modules.length > 0 && (
        <section className="home-panel" aria-labelledby="home-modules-heading">
          <header className="home-panel__head">
            <h2 id="home-modules-heading">โมดูล</h2>
            <span className="muted">
              {moduleTotal === modules.length
                ? `${moduleTotal} โมดูล`
                : `แสดง ${modules.length} จาก ${moduleTotal}`}
              {moduleTotal > modules.length && (
                <>
                  {' '}
                  · <Link to="/app/help">ดูทั้งหมด</Link>
                </>
              )}
            </span>
          </header>
          <ul className="home-modules">
            {modules.map((item) => (
              <li key={item.path} className="home-modules__item">
                <Link to={item.path}>
                  <span className="home-modules__icon" aria-hidden>
                    {item.icon}
                  </span>
                  <span>
                    <strong>{item.labelTh}</strong>
                    <span className="muted">
                      {HOME_MODULE_HINTS[item.path] ?? item.label}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="home-footer-links">
        <Link to="/app/help">ช่วยเหลือ</Link>
        <Link to="/app/help#start">เริ่มใช้งาน</Link>
        <Link to="/app/settings">ตั้งค่า</Link>
        {(canViewSystemStatus(roles) || !configured) && (
          <Link to="/app/status">สถานะระบบ</Link>
        )}
        <span className="muted">
          {configured ? `${navModuleCount} เมนูพร้อมใช้` : 'โหมดพัฒนา'}
        </span>
      </footer>
    </div>
  )
}
