import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listQuotationsByLead } from '../../sales/api/quotations'
import { QuotationStatusBadge } from '../../sales/components/QuotationStatusBadge'
import type { Quotation } from '../../sales/types'
import '../crm.css'

interface LeadQuotationsSectionProps {
  leadId: string
  canCreate: boolean
  /** เมื่อกด "+ สร้างใบเสนอราคา" — ส่ง flow ผ่าน parent ที่จัด status auto */
  onCreateRequest: () => void
}

function formatTHB(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return value
  }
}

export function LeadQuotationsSection({
  leadId,
  canCreate,
  onCreateRequest,
}: LeadQuotationsSectionProps) {
  const [items, setItems] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    listQuotationsByLead(leadId)
      .then((rows) => {
        if (!cancelled) setItems(rows)
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'โหลดรายการใบเสนอราคาไม่สำเร็จ')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [leadId])

  return (
    <section className="card card--wide crm-lead-quotations">
      <header className="crm-lead-form-card__head">
        <div>
          <h2>ใบเสนอราคาของ Lead นี้</h2>
          <p className="crm-lead-form-card__hint">
            ติดตามใบเสนอราคาที่ออกไป — เปิดดูสถานะหรือสร้างเพิ่ม
          </p>
        </div>
        {canCreate ? (
          <button
            type="button"
            className="crm-btn crm-btn--ghost"
            onClick={onCreateRequest}
          >
            + สร้างใบเสนอราคา
          </button>
        ) : null}
      </header>

      {loading ? (
        <p className="muted">กำลังโหลด…</p>
      ) : error ? (
        <p className="crm-error">{error}</p>
      ) : items.length === 0 ? (
        <p className="muted">
          ยังไม่มีใบเสนอราคา — กดปุ่ม “+ สร้างใบเสนอราคา” เพื่อเปิดฟอร์มใหม่
        </p>
      ) : (
        <ul className="crm-lead-quotations__list">
          {items.map((q) => (
            <li key={q.id} className="crm-lead-quotations__item">
              <div className="crm-lead-quotations__main">
                <Link
                  to={`/app/sales/quotations/${q.id}`}
                  className="crm-inline-link"
                >
                  {q.quotation_number || `ฉบับ ${q.id.slice(0, 8)}`}
                </Link>
                <p className="muted">
                  {formatDate(q.sent_at ?? q.created_at)} ·{' '}
                  {formatTHB(q.total ?? 0)}
                </p>
              </div>
              <QuotationStatusBadge status={q.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
