import { useSidebarLayout } from '../../../layout/SidebarLayoutContext'
import '../../crm/crm.css'
import '../../phase2/phase2.css'
import '../layout-prefs.css'

export function LayoutPreferencesPage() {
  const { collapsed, setCollapsed, toggleCollapsed } = useSidebarLayout()

  return (
    <div className="page">
      <header className="page__header crm-page__header phase2-page__header">
        <div>
          <h1>การจัดวางหน้าจอ</h1>
          <p className="muted">ปรับแถบเมนูด้านข้าง — เก็บค่าในเบราว์เซอร์นี้</p>
        </div>
      </header>

      <section className="card card--wide">
        <h2>แถบเมนู</h2>
        <p className="muted" style={{ marginBottom: '1rem' }}>
          โหมดพับจะแสดงเฉพาะไอคอนเพื่อเพิ่มพื้นที่เนื้อหา — ชี้ที่ไอคอนเพื่อดูชื่อเมนู (tooltip)
        </p>

        <div className="layout-prefs-row">
          <button type="button" className="crm-btn crm-btn--primary" onClick={toggleCollapsed}>
            {collapsed ? 'ขยายแถบเมนู' : 'พับแถบเมนู'}
          </button>
          <label className="layout-prefs-check">
            <input
              type="checkbox"
              checked={collapsed}
              onChange={(e) => setCollapsed(e.target.checked)}
            />
            <span>แสดงเมนูแบบพับ (ไอคอนอย่างเดียว)</span>
          </label>
        </div>
      </section>

      <section className="card card--wide">
        <h2>คำแนะนำ</h2>
        <ul className="flow-list">
          <li>ใช้ปุ่มลูกศรที่มุมแถบเมนู (ใต้โลโก้ NP) เพื่อสลับได้ทันทีจากทุกหน้า</li>
          <li>หากเปิดหลายแท็บ การเปลี่ยนค่าจะซิงก์เมื่อสลับแท็บ (ผ่าน localStorage)</li>
        </ul>
      </section>
    </div>
  )
}
