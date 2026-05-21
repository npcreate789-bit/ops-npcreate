import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { NavIcon, type NavIconKey } from '../layout/NavIcons'
import './empty-state.css'

interface EmptyStateProps {
  /** ไอคอนภาพรวม (จาก NAV icon set) */
  icon?: NavIconKey
  /** หัวข้อ — ตอบคำถาม "ยังไม่มีอะไร" */
  title: string
  /** อธิบายขั้นถัดไปที่ผู้ใช้ทำได้ */
  description?: ReactNode
  /** ปุ่ม primary — ถ้าเป็น string ใช้เป็น path (ใช้ <Link>) ถ้าเป็น object ใช้ onClick */
  action?:
    | { label: string; to: string }
    | { label: string; onClick: () => void; busy?: boolean }
  /** ปุ่ม ghost รอง */
  secondary?: { label: string; to: string }
  /** layout — `compact` = padding น้อยใช้ในการ์ดเล็ก / `default` = สำหรับหน้ารายการ */
  size?: 'compact' | 'default'
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondary,
  size = 'default',
}: EmptyStateProps) {
  return (
    <div className={`empty-state empty-state--${size}`} role="status">
      {icon ? (
        <span className="empty-state__icon" aria-hidden>
          <NavIcon name={icon} />
        </span>
      ) : null}
      <div className="empty-state__copy">
        <h3 className="empty-state__title">{title}</h3>
        {description ? (
          <p className="empty-state__desc">{description}</p>
        ) : null}
      </div>
      {(action || secondary) && (
        <div className="empty-state__actions">
          {action ? (
            'to' in action ? (
              <Link to={action.to} className="crm-btn crm-btn--primary">
                {action.label}
              </Link>
            ) : (
              <button
                type="button"
                className="crm-btn crm-btn--primary"
                onClick={action.onClick}
                disabled={action.busy}
              >
                {action.busy ? 'กำลังดำเนินการ…' : action.label}
              </button>
            )
          ) : null}
          {secondary ? (
            <Link to={secondary.to} className="crm-btn crm-btn--ghost">
              {secondary.label}
            </Link>
          ) : null}
        </div>
      )}
    </div>
  )
}
