import { Link } from 'react-router-dom'
import {
  NAV_ITEMS,
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
} from '../config/navigation'
import { useAuth } from '../../shared/auth/AuthProvider'
import { canUseQuickAccess } from '../../shared/auth/access'
import { QuickAccessPanel } from '../modules/quick-access/components/QuickAccessPanel'
import './pages.css'

export function HomePage() {
  const { configured, profile, profileLoadError } = useAuth()
  const roles = profile?.roles ?? []
  const showQuickAccess = canUseQuickAccess(roles) || !configured
  const readyCount = NAV_ITEMS.filter((i) => i.ready && i.path !== '/app').length
  const moduleCount = NAV_ITEMS.filter((i) => i.path !== '/app').length
  const phase2Ready = PHASE2_NAV_ITEMS.filter((i) => i.ready).length
  const phase2Total = PHASE2_NAV_ITEMS.length
  const phase3Ready = PHASE3_NAV_ITEMS.filter((i) => i.ready).length
  const phase3Total = PHASE3_NAV_ITEMS.length
  const phase4Ready = PHASE4_NAV_ITEMS.filter((i) => i.ready).length
  const phase4Total = PHASE4_NAV_ITEMS.length
  const phase5Ready = PHASE5_NAV_ITEMS.filter((i) => i.ready).length
  const phase5Total = PHASE5_NAV_ITEMS.length
  const phase6Ready = PHASE6_NAV_ITEMS.filter((i) => i.ready).length
  const phase6Total = PHASE6_NAV_ITEMS.length
  const phase7Ready = PHASE7_NAV_ITEMS.filter((i) => i.ready).length
  const phase7Total = PHASE7_NAV_ITEMS.length
  const phase8Ready = PHASE8_NAV_ITEMS.filter((i) => i.ready).length
  const phase8Total = PHASE8_NAV_ITEMS.length
  const phase9Ready = PHASE9_NAV_ITEMS.filter((i) => i.ready).length
  const phase9Total = PHASE9_NAV_ITEMS.length
  const phase10Ready = PHASE10_NAV_ITEMS.filter((i) => i.ready).length
  const phase10Total = PHASE10_NAV_ITEMS.length
  const phase11Ready = PHASE11_NAV_ITEMS.filter((i) => i.ready).length
  const phase11Total = PHASE11_NAV_ITEMS.length
  const phase13Ready = PHASE13_NAV_ITEMS.filter((i) => i.ready).length
  const phase13Total = PHASE13_NAV_ITEMS.length
  const phase14Ready = PHASE14_NAV_ITEMS.filter((i) => i.ready).length
  const phase14Total = PHASE14_NAV_ITEMS.length
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
          <p className="stat">{profile?.roles.length ?? 0}</p>
          <span className="muted">บทบาทที่ได้รับมอบหมาย</span>
        </article>
      </section>

      <section className="card card--wide">
        <h2>Phase 1 MVP</h2>
        <p>
          โมดูลหลักพร้อมใช้งานครบแล้ว — ไปที่{' '}
          <Link to="/app/dashboard">ภาพรวมผู้บริหาร</Link> เพื่อดูสรุปทั้งระบบ
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 2</h2>
        <p>
          ครบ {phase2Ready}/{phase2Total} โมดูล —{' '}
          <Link to="/app/admin">ผู้ใช้</Link>,{' '}
          <Link to="/app/content">คอนเทนต์</Link>,{' '}
          <Link to="/app/client">รายงานลูกค้า</Link>
        </p>
        <p className="muted">
          CEO ดูสรุปคอนเทนต์และแจ้งเตือนได้ที่{' '}
          <Link to="/app/dashboard">ภาพรวมผู้บริหาร</Link>
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 3</h2>
        <p>
          ครบ {phase3Ready}/{phase3Total} โมดูล —{' '}
          <Link to="/app/notifications">แจ้งเตือน</Link>,{' '}
          <Link to="/app/creators">ครีเอเตอร์</Link>
        </p>
        <p className="muted">
          แจ้งเตือนซิงก์จากงานค้างในระบบอัตโนมัติ — ฐานข้อมูล Creator สำหรับ UGC / TikTok One
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 4</h2>
        <p>
          ครบ {phase4Ready}/{phase4Total} โมดูล —{' '}
          <Link to="/app/renewals">ต่อสัญญา</Link>,{' '}
          <Link to="/app/reports">รายงานขั้นสูง</Link>
        </p>
        <p className="muted">
          ติดตามสัญญาใกล้หมดอายุ ขยายสัญญาได้จากระบบ — รายงานรายเดือนพร้อมคำแนะนำอัตโนมัติ
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 5</h2>
        <p>
          ครบ {phase5Ready}/{phase5Total} โมดูลหลัก —{' '}
          <Link to="/app/assistant">ผู้ช่วย AI</Link>
          {' · '}
          <Link to="/app/client">รายงานลูกค้า + ถามผู้ช่วย</Link>
        </p>
        <p className="muted">
          เทมเพลตอัจฉริยะจากข้อมูลในระบบ (ไม่ใช้ OpenAI) — ลูกค้าถามได้เฉพาะในรายงานของตัวเอง
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 6</h2>
        <p>
          ครบ {phase6Ready}/{phase6Total} โมดูล —{' '}
          <Link to="/app/timeline">ไทม์ไลน์งาน</Link>
          {' · '}
          <Link to="/app/settings">ตั้งค่าบัญชี</Link>
        </p>
        <p className="muted">
          รวมงานค้าง สัญญา นัด Lead และครบกำหนดชำระ — ดูเอกสารการเงินที่ออกแล้วในหน้าการเงิน
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 7</h2>
        <p>
          ครบ {phase7Ready}/{phase7Total} โมดูล —{' '}
          <Link to="/app/activity">บันทึกกิจกรรม</Link>
          {' · '}
          <Link to="/app/weekly">สรุปรายสัปดาห์</Link>
        </p>
        <p className="muted">
          ติดตามการเปลี่ยนแปลงในระบบและสรุป KPI 7 วัน พร้อมคำแนะนำอัตโนมัติ
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 8</h2>
        <p>
          ครบ {phase8Ready}/{phase8Total} โมดูล —{' '}
          <Link to="/app/customers">ลูกค้า 360</Link>
        </p>
        <p className="muted">
          ศูนย์กลางข้อมูลลูกค้าเชื่อมทุกโมดูล พร้อมส่งออก CSV ในรายงานและบันทึกกิจกรรม
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 9</h2>
        <p>
          ครบ {phase9Ready}/{phase9Total} โมดูล —{' '}
          <Link to="/app/search">ค้นหารวม</Link>
        </p>
        <p className="muted">
          ค้นหา Lead · ลูกค้า · งาน ตาม RLS ของบทบาท — พร้อม deploy SPA บน Vercel
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 10</h2>
        <p>
          ครบ {phase10Ready}/{phase10Total} ฟีเจอร์ —{' '}
          <Link to="/app/customers">ลูกค้า 360 + ไทม์ไลน์</Link>
        </p>
        <p className="muted">
          รวมเหตุการณ์งาน การเงิน คอนเทนต์ สัญญา และกิจกรรมต่อลูกค้า — กรองตามบทบาท
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 11</h2>
        <p>
          ครบ {phase11Ready}/{phase11Total} โมดูล —{' '}
          <Link to="/app/ops">ศูนย์ Ops</Link>
          {' · '}
          กด <kbd>⌘K</kbd> เพื่อค้นหาด่วน
        </p>
        <p className="muted">
          Command palette ค้นหารวมทุกหน้า + เช็กลิสต์ deploy สำหรับทีม Ops
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 12</h2>
        <p>
          หน้าล่าสุดและปักหมุด — บันทึกอัตโนมัติตามที่คุณเปิดดู · กด ☆ เพื่อปักหมุด · แสดงใน{' '}
          <kbd>⌘K</kbd> เมื่อยังไม่พิมพ์ค้นหา
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
          ครบ {phase13Ready}/{phase13Total} โมดูล —{' '}
          <Link to="/app/work">งานของฉัน</Link>
        </p>
        <p className="muted">
          รวมงานค้าง นัด Lead สัญญา การเงิน และแจ้งเตือน — เรียงตามความเร่งด่วน กรองตามบทบาท
        </p>
      </section>

      <section className="card card--wide">
        <h2>Phase 14</h2>
        <p>
          ครบ {phase14Ready}/{phase14Total} โมดูล —{' '}
          <Link to="/app/help">ช่วยเหลือ</Link>
          {' · '}
          กด <kbd>?</kbd> จากทุกหน้า
        </p>
        <p className="muted">
          Breadcrumb ด้านบน + ปุ่มลัด + เมนูตามบทบาท
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
