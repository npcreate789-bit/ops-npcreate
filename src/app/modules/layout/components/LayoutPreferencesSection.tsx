import { useSidebarLayout } from '../../../layout/SidebarLayoutContext'
import '../layout-prefs.css'

export function LayoutPreferencesSection() {
  const { collapsed, setCollapsed, toggleCollapsed } = useSidebarLayout()

  return (
    <>
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

      <ul className="flow-list" style={{ marginTop: '1rem' }}>
        <li>ใช้ปุ่มลูกศรที่มุมแถบเมนู (ใต้โลโก้ NP) เพื่อสลับได้ทันทีจากทุกหน้า</li>
        <li>หากเปิดหลายแท็บ การเปลี่ยนค่าจะซิงก์เมื่อสลับแท็บ (ผ่าน localStorage)</li>
      </ul>
    </>
  )
}
