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
      <section className="card card--wide client-preview-bar">
        <p className="crm-error">
          {error ?? 'ยังไม่มีสิทธิ์เข้าถึง — ติดต่อทีมงาน NP Create'}
        </p>
      </section>
    )
  }

  if (!data) {
    return (
      <div className="client-preview-bar">
        {!configured && (
          <p className="crm-banner crm-banner--warn">โหมดพัฒนา — ข้อมูลตัวอย่างในเครื่อง</p>
        )}
        {canPreview && customers.length > 0 && (
          <section className="card card--wide">
            <label className="client-preview-bar__select">
              เลือกลูกค้าเพื่อดูตัวอย่าง (ทีมงาน)
              <select
                className="crm-select"
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
            <p className="muted">
              <Link to="/app/admin">จัดการผู้ใช้</Link> → มอบบทบาท client + เลือกลูกค้า
            </p>
          )}
        </section>
      </div>
    )
  }

  if (isClientOnly) {
    return null
  }

  return (
    <div className="client-preview-bar client-preview-bar--staff">
      <p className="client-preview-bar__badge">โหมดตัวอย่าง — มุมมองลูกค้า</p>
      {canPreview && customers.length > 1 && (
        <label className="client-preview-bar__select">
          เปลี่ยนลูกค้า
          <select
            className="crm-select"
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
    </div>
  )
}
