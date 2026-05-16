import {
  effectiveRolesForNav,
  navItemsForRoles,
  PHASE2_NAV_ITEMS,
  PHASE3_NAV_ITEMS,
  PHASE4_NAV_ITEMS,
  PHASE5_NAV_ITEMS,
  PHASE6_NAV_ITEMS,
  PHASE7_NAV_ITEMS,
  PHASE8_NAV_ITEMS,
  PHASE9_NAV_ITEMS,
  PHASE10_NAV_ITEMS,
  PHASE11_NAV_ITEMS,
  PHASE13_NAV_ITEMS,
  PHASE14_NAV_ITEMS,
  PHASE15_NAV_ITEMS,
  PHASE16_NAV_ITEMS,
  PHASE17_NAV_ITEMS,
  PHASE18_NAV_ITEMS,
  PHASE19_NAV_ITEMS,
} from '../config/navigation'
import { useAuth } from '../../shared/auth/AuthProvider'
import { canUseGlobalSearch, canUseQuickAccess } from '../../shared/auth/access'
import { QuickAccessPanel } from '../modules/quick-access/components/QuickAccessPanel'
import { HomeLinks, HomeNavLink, phaseCountsForRoles } from './homeAccess'
import './pages.css'

export function HomePage() {
  const { configured, profile, profileLoadError } = useAuth()
  const roles = profile?.roles ?? []
  const navRoles = effectiveRolesForNav(roles, configured)
  const showQuickAccess = canUseQuickAccess(roles) || !configured
  const showPaletteHint = canUseGlobalSearch(roles) || !configured
  const navModules = navItemsForRoles(navRoles).filter((i) => i.path !== '/app')
  const readyCount = navModules.filter((i) => i.ready).length
  const moduleCount = navModules.length
  const phase2 = phaseCountsForRoles(PHASE2_NAV_ITEMS, navRoles)
  const phase3 = phaseCountsForRoles(PHASE3_NAV_ITEMS, navRoles)
  const phase4 = phaseCountsForRoles(PHASE4_NAV_ITEMS, navRoles)
  const phase5 = phaseCountsForRoles(PHASE5_NAV_ITEMS, navRoles)
  const phase6 = phaseCountsForRoles(PHASE6_NAV_ITEMS, navRoles)
  const phase7 = phaseCountsForRoles(PHASE7_NAV_ITEMS, navRoles)
  const phase8 = phaseCountsForRoles(PHASE8_NAV_ITEMS, navRoles)
  const phase9 = phaseCountsForRoles(PHASE9_NAV_ITEMS, navRoles)
  const phase10 = phaseCountsForRoles(PHASE10_NAV_ITEMS, navRoles)
  const phase11 = phaseCountsForRoles(PHASE11_NAV_ITEMS, navRoles)
  const phase13 = phaseCountsForRoles(PHASE13_NAV_ITEMS, navRoles)
  const phase14 = phaseCountsForRoles(PHASE14_NAV_ITEMS, navRoles)
  const phase15 = phaseCountsForRoles(PHASE15_NAV_ITEMS, navRoles)
  const phase16 = phaseCountsForRoles(PHASE16_NAV_ITEMS, navRoles)
  const phase17 = phaseCountsForRoles(PHASE17_NAV_ITEMS, navRoles)
  const phase18 = phaseCountsForRoles(PHASE18_NAV_ITEMS, navRoles)
  const phase19 = phaseCountsForRoles(PHASE19_NAV_ITEMS, navRoles)
  const roleStat = profileLoadError ? '—' : String(profile?.roles.length ?? 0)
  return (
    <div className="page">
      <header className="page__header">
        <h1>NP Create Operating System</h1>
        <p>ระบบบริหารงานกลาง — รวมงานขาย ลูกค้า แอด คอนเทนต์ การเงิน และรายงาน</p>
      </header>

      {profileLoadError ? (
        <section className="card card--wide card--warn" role="alert">
          <h2>โหลดบทบาทไม่สมบูรณ์</h2>
          <p className="muted">{profileLoadError}</p>
          <p>ลองรีเฟรชหน้า หรือติดต่อผู้ดูแลหากปัญหายังอยู่</p>
        </section>
      ) : null}

      <section className="card-grid">
        <article className="card card--accent">
          <h2>สถานะระบบ</h2>
          <p className="stat">{readyCount} / {moduleCount}</p>
          <span className="muted">โมดูลพร้อมใช้งาน (ไม่นับหน้าหลัก)</span>
        </article>
        <article className="card">
          <h2>Backend</h2>
          <p className="stat">{configured ? 'Supabase' : 'โหมดพัฒนา'}</p>
          <span className="muted">
            {configured
              ? 'เชื่อมต่อแล้ว'
              : 'ตั้งค่า VITE_SUPABASE_URL ใน .env.local'}
          </span>
        </article>
        <article className="card">
          <h2>ผู้ใช้</h2>
          <p className="stat">{roleStat}</p>
          <span className="muted">บทบาทที่ได้รับมอบหมาย</span>
        </article>
      </section>

      <section className="card card--wide">
        <h2>Phase 1 MVP</h2>
        <p>
          โมดูลหลักพร้อมใช้งานครบแล้ว
          <HomeNavLink path="/app/dashboard" roles={navRoles}>
            {' '}
            — ไปที่ภาพรวมผู้บริหาร
          </HomeNavLink>{' '}
          เพื่อดูสรุปทั้งระบบ
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 2</h2>
        <p>
          ครบ {phase2.ready}/{phase2.total} โมดูล —{' '}
          <HomeLinks
            roles={navRoles}
            items={[
              { path: '/app/admin', label: 'ผู้ใช้' },
              { path: '/app/content', label: 'คอนเทนต์' },
              { path: '/app/client', label: 'รายงานลูกค้า' },
            ]}
          />
        </p>
        <p className="muted">
          CEO ดูสรุปคอนเทนต์และแจ้งเตือนได้ที่{' '}
          <HomeNavLink path="/app/dashboard" roles={navRoles}>
            ภาพรวมผู้บริหาร
          </HomeNavLink>
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 3</h2>
        <p>
          ครบ {phase3.ready}/{phase3.total} โมดูล —{' '}
          <HomeLinks
            roles={navRoles}
            items={[
              { path: '/app/notifications', label: 'แจ้งเตือน' },
              { path: '/app/creators', label: 'ครีเอเตอร์' },
            ]}
          />
        </p>
        <p className="muted">
          แจ้งเตือนซิงก์จากงานค้างในระบบอัตโนมัติ — ฐานข้อมูล Creator สำหรับ UGC / TikTok One
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 4</h2>
        <p>
          ครบ {phase4.ready}/{phase4.total} โมดูล —{' '}
          <HomeLinks
            roles={navRoles}
            items={[
              { path: '/app/renewals', label: 'ต่อสัญญา' },
              { path: '/app/reports', label: 'รายงานขั้นสูง' },
            ]}
          />
        </p>
        <p className="muted">
          ติดตามสัญญาใกล้หมดอายุ ขยายสัญญาได้จากระบบ — รายงานรายเดือนพร้อมคำแนะนำอัตโนมัติ
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 5</h2>
        <p>
          ครบ {phase5.ready}/{phase5.total} โมดูลหลัก —{' '}
          <HomeLinks
            roles={navRoles}
            items={[
              { path: '/app/assistant', label: 'ผู้ช่วย AI' },
              { path: '/app/client', label: 'รายงานลูกค้า + ถามผู้ช่วย' },
            ]}
          />
        </p>
        <p className="muted">
          เทมเพลตอัจฉริยะจากข้อมูลในระบบ (ไม่ใช้ OpenAI) — ลูกค้าถามได้เฉพาะในรายงานของตัวเอง
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 6</h2>
        <p>
          ครบ {phase6.ready}/{phase6.total} โมดูล —{' '}
          <HomeLinks
            roles={navRoles}
            items={[
              { path: '/app/timeline', label: 'ไทม์ไลน์งาน' },
              { path: '/app/settings', label: 'ตั้งค่าบัญชี' },
            ]}
          />
        </p>
        <p className="muted">
          รวมงานค้าง สัญญา นัด Lead และครบกำหนดชำระ — ดูเอกสารการเงินที่ออกแล้วในหน้าการเงิน
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 7</h2>
        <p>
          ครบ {phase7.ready}/{phase7.total} โมดูล —{' '}
          <HomeLinks
            roles={navRoles}
            items={[
              { path: '/app/activity', label: 'บันทึกกิจกรรม' },
              { path: '/app/weekly', label: 'สรุปรายสัปดาห์' },
            ]}
          />
        </p>
        <p className="muted">
          ติดตามการเปลี่ยนแปลงในระบบและสรุป KPI 7 วัน พร้อมคำแนะนำอัตโนมัติ
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 8</h2>
        <p>
          ครบ {phase8.ready}/{phase8.total} โมดูล —{' '}
          <HomeNavLink path="/app/customers" roles={navRoles}>
            ลูกค้า 360
          </HomeNavLink>
        </p>
        <p className="muted">
          ศูนย์กลางข้อมูลลูกค้าเชื่อมทุกโมดูล พร้อมส่งออก CSV ในรายงานและบันทึกกิจกรรม
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 9</h2>
        <p>
          ครบ {phase9.ready}/{phase9.total} โมดูล —{' '}
          <HomeNavLink path="/app/search" roles={navRoles}>
            ค้นหารวม
          </HomeNavLink>
        </p>
        <p className="muted">
          ค้นหา Lead · ลูกค้า · งาน ตาม RLS ของบทบาท — พร้อม deploy SPA บน Vercel
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 10</h2>
        <p>
          ครบ {phase10.ready}/{phase10.total} ฟีเจอร์ —{' '}
          <HomeNavLink path="/app/customers" roles={navRoles}>
            ลูกค้า 360 + ไทม์ไลน์
          </HomeNavLink>
        </p>
        <p className="muted">
          รวมเหตุการณ์งาน การเงิน คอนเทนต์ สัญญา และกิจกรรมต่อลูกค้า — กรองตามบทบาท
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 11</h2>
        <p>
          ครบ {phase11.ready}/{phase11.total} โมดูล
          <HomeNavLink path="/app/ops" roles={navRoles}>
            {' '}
            — ศูนย์ Ops
          </HomeNavLink>
          {showPaletteHint ? (
            <>
              {' · '}
              กด <kbd>⌘K</kbd> เพื่อค้นหาด่วน
            </>
          ) : null}
        </p>
        <p className="muted">
          Command palette ค้นหารวมทุกหน้า + เช็กลิสต์ deploy สำหรับทีม Ops
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 12</h2>
        <p>
          หน้าล่าสุดและปักหมุด — บันทึกอัตโนมัติตามที่คุณเปิดดู · กด ☆ เพื่อปักหมุด
          {showPaletteHint ? (
            <>
              {' '}
              · แสดงใน <kbd>⌘K</kbd> เมื่อยังไม่พิมพ์ค้นหา
            </>
          ) : null}
        </p>
        {showQuickAccess ? (
          <>
            {configured && (
              <p className="muted" style={{ marginBottom: '0.75rem' }}>
                เก็บในเบราว์เซอร์ของคุณ — กรองตามเมนูที่เข้าถึงได้
              </p>
            )}
            <QuickAccessPanel variant="home" />
          </>
        ) : (
          <p className="muted">บทบาท client อย่างเดียวไม่มีการเข้าถึงด่วน</p>
        )}
      </section>

      <section className="card card--wide">
        <h2>Phase 13</h2>
        <p>
          ครบ {phase13.ready}/{phase13.total} โมดูล —{' '}
          <HomeNavLink path="/app/work" roles={navRoles}>
            งานของฉัน
          </HomeNavLink>
        </p>
        <p className="muted">
          รวมงานค้าง นัด Lead สัญญา การเงิน และแจ้งเตือน — เรียงตามความเร่งด่วน กรองตามบทบาท
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 14</h2>
        <p>
          ครบ {phase14.ready}/{phase14.total} โมดูล —{' '}
          <HomeNavLink path="/app/help" roles={navRoles}>
            ช่วยเหลือ
          </HomeNavLink>
          {' · '}
          กด <kbd>?</kbd> จากทุกหน้า
        </p>
        <p className="muted">
          Breadcrumb ด้านบน + ปุ่มลัด + เมนูตามบทบาท
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 15</h2>
        <p>
          ครบ {phase15.ready}/{phase15.total} โมดูล —{' '}
          <HomeNavLink path="/app/keyboard" roles={navRoles}>
            ศูนย์คีย์ลัด
          </HomeNavLink>
          {showPaletteHint ? (
            <>
              {' · '}
              ใน <kbd>⌘K</kbd> เลือกผลด้วย <kbd>↑</kbd>
              <kbd>↓</kbd> แล้วกด <kbd>Enter</kbd>
            </>
          ) : null}
        </p>
        <p className="muted">
          ตารางปุ่มลัดรวมศูนย์ + นำทางผลค้นหาด้วยคีย์บอร์ดใน Command palette
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 16</h2>
        <p>
          ครบ {phase16.ready}/{phase16.total} โมดูล —{' '}
          <HomeNavLink path="/app/layout" roles={navRoles}>
            การจัดวางหน้าจอ
          </HomeNavLink>
          {' · '}
          พับแถบเมนูเป็นไอคอน (ปุ่ม‹/› ใต้โลโก้)
        </p>
        <p className="muted">
          เลือกความกว้างแถบเมนู เก็บในเบราว์เซอร์ — แจ้งเตือนยังเห็นจุดแดงเมื่อพับ
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 17</h2>
        <p>
          ครบ {phase17.ready}/{phase17.total} โมดูล —{' '}
          <HomeNavLink path="/app/start" roles={navRoles}>
            เริ่มใช้งาน
          </HomeNavLink>
          {' · '}
          เช็กลิสต์แรกตามบทบาท เก็บในเครื่อง
        </p>
        <p className="muted">
          ลิงก์ไปโมดูลสำคัญ พร้อมทำเครื่องหมายเมื่อทำแล้ว — รีเซ็ตได้ตลอด
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 18</h2>
        <p>
          ครบ {phase18.ready}/{phase18.total} โมดูล —{' '}
          <HomeNavLink path="/app/about" roles={navRoles}>
            เกี่ยวกับระบบ
          </HomeNavLink>
          {' · '}
          เวอร์ชันแอปและสภาพแวดล้อม
        </p>
        <p className="muted">
          ดึงเวอร์ชันจาก package.json แสดงโหมดรันไทม์และสถานะ Supabase
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 19</h2>
        <p>
          ครบ {phase19.ready}/{phase19.total} โมดูล —{' '}
          <HomeNavLink path="/app/status" roles={navRoles}>
            สถานะระบบ
          </HomeNavLink>
          {' · '}
          ตรวจ Supabase และเซสชัน
        </p>
        <p className="muted">
          ทดสอบการเชื่อมต่อฐานข้อมูล แสดง latency และสรุป auth / โปรไฟล์
        </p>
      </section>

      <section className="card card--wide">
        <h2>Flow งานหลัก</h2>
        <ol className="flow-list">
          <li>Lead ลูกค้าใหม่ (CRM)</li>
          <li>Sales เสนอแพ็กเกจ / ใบเสนอราคา</li>
          <li>ปิดการขาย → Admin บันทึกชำระเงิน</li>
          <li>Account รับบรีฟ (Onboarding)</li>
          <li>Ads + Content ดำเนินงาน</li>
          <li>รายงานลูกค้า → CEO ดูภาพรวม</li>
        </ol>
      </section>
    </div>
  )
}
