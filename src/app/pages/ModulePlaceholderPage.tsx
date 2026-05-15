import { useLocation } from 'react-router-dom'
import { NAV_ITEMS } from '../config/navigation'
import './pages.css'

export function ModulePlaceholderPage() {
  const { pathname } = useLocation()
  const item = NAV_ITEMS.find((n) => n.path === pathname)

  if (!item) {
    return (
      <div className="page">
        <h1>ไม่พบโมดูล</h1>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__header">
        <h1>{item.labelTh}</h1>
        <p>{item.label}</p>
      </header>
      <article className="card card--wide">
        <p>
          โมดูลนี้จะเปิดใช้ใน <strong>Sprint {item.phase}</strong>
          {item.phase2 ? ' (Phase 2)' : ''} ตามแผนพัฒนา
        </p>
        <p className="muted">
          โครงสร้าง Auth, เมนู และฐานข้อมูลถูกเตรียมไว้แล้ว — จะเพิ่มฟีเจอร์โดยไม่กระทบโมดูลที่ทำเสร็จแล้ว
        </p>
      </article>
    </div>
  )
}
