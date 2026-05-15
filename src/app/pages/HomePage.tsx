import { Link } from 'react-router-dom'
import { NAV_ITEMS, PHASE2_NAV_ITEMS } from '../config/navigation'
import { useAuth } from '../../shared/auth/AuthProvider'
import './pages.css'

export function HomePage() {
  const { configured, profile, profileLoadError } = useAuth()
  const readyCount = NAV_ITEMS.filter((i) => i.ready && i.path !== '/app').length
  const moduleCount = NAV_ITEMS.filter((i) => i.path !== '/app').length
  const phase2Ready = PHASE2_NAV_ITEMS.filter((i) => i.ready).length
  const phase2Total = PHASE2_NAV_ITEMS.length
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
