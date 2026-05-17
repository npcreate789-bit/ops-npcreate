import { Link } from 'react-router-dom'
import type { CustomerOption } from '../../finance/types'
import type { ClientReport } from '../types'

interface ClientPreviewBarProps {
  configured: boolean
  canPreview: boolean
  customers: CustomerOption[]
  previewId: string
  onPreviewChange: (id: string) => void
  data: ClientReport | null
  error: string | null
  isClientOnly: boolean
}

export function ClientPreviewBar({
  configured,
  canPreview,
  customers,
  previewId,
  onPreviewChange,
  data,
  error,
  isClientOnly,
}: ClientPreviewBarProps) {
  if (!data && !canPreview) {
    return (
      <section className="card card--wide">
        <p className="crm-error">
          {error ?? 'ยังไม่มีสิทธิ์เข้าถึง — ติดต่อทีมงาน NP Create'}
        </p>
      </section>
    )
  }

  if (!data) {
    return (
      <>
        {!configured && (
          <p className="crm-banner crm-banner--warn">โหมดพัฒนา — ข้อมูลตัวอย่างในเครื่อง</p>
        )}
        {canPreview && customers.length > 0 && (
          <section className="card card--wide">
            <label className="task-field">
              <span className="task-field__label">ดูตัวอย่าง (ทีมงาน)</span>
              <select
                className="task-select"
                value={previewId}
                onChange={(e) => onPreviewChange(e.target.value)}
              >
                <option value="">— เลือกลูกค้า —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.brand_name}
                  </option>
                ))}
              </select>
            </label>
          </section>
        )}
        <section className="card card--wide">
          <p className="crm-error">
            {error ??
              'เลือกลูกค้าด้านบนเพื่อดูตัวอย่าง หรือผูกบัญชี client ที่หน้าจัดการผู้ใช้'}
          </p>
          {canPreview && (
            <p className="muted admin-hint">
              <Link to="/app/admin">จัดการผู้ใช้</Link> → มอบบทบาท client + เลือกลูกค้า
            </p>
          )}
        </section>
      </>
    )
  }

  return (
    <>
      {canPreview && !isClientOnly && (
        <p className="phase2-scope-badge">โหมดตัวอย่าง (ทีมงาน)</p>
      )}
      {canPreview && (
        <label className="task-field" style={{ minWidth: '12rem', marginBottom: '1rem' }}>
          <span className="task-field__label">เปลี่ยนลูกค้า</span>
          <select
            className="task-select"
            value={previewId || data.customer.id}
            onChange={(e) => onPreviewChange(e.target.value)}
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.brand_name}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  )
}
