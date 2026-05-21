import { Link } from 'react-router-dom'
import { quotationStatusLabel } from '../constants'
import type { QuotationStatus } from '../types'
import { QuotationStatusBadge } from './QuotationStatusBadge'
import '../../crm/crm.css'

interface QuotationEditorHeaderProps {
  isNew: boolean
  quotationNumber?: string | null
  status?: QuotationStatus
  leadBrandName?: string | null
  leadId?: string | null
  backTo?: string
  backLabel?: string
}

/** สร้างข้อความปุ่มย้อนตาม backTo เพื่อไม่ให้ขัดแย้งกับปลายทางจริง */
function deriveBackLabel(backTo: string, explicit?: string): string {
  if (explicit) return explicit
  if (backTo.startsWith('/app/crm')) return 'กลับ Lead'
  if (backTo.startsWith('/app/customers')) return 'กลับลูกค้า'
  if (backTo.startsWith('/app/onboarding')) return 'กลับ Onboarding'
  if (backTo.startsWith('/app/projects')) return 'กลับโปรเจกต์'
  return 'กลับ Sales'
}

export function QuotationEditorHeader({
  isNew,
  quotationNumber,
  status,
  leadBrandName,
  leadId,
  backTo = '/app/sales',
  backLabel,
}: QuotationEditorHeaderProps) {
  const title = isNew ? 'สร้างใบเสนอราคา' : `ใบเสนอราคา ${quotationNumber ?? ''}`.trim()
  const subtitleParts: string[] = []
  if (leadBrandName) subtitleParts.push(leadBrandName)
  if (!isNew && status) subtitleParts.push(quotationStatusLabel(status))
  const backText = deriveBackLabel(backTo, backLabel)

  return (
    <header className="crm-lead-header no-print">
      <Link to={backTo} className="crm-lead-header__back">
        <span className="crm-lead-header__back-icon" aria-hidden>
          ←
        </span>
        {backText}
      </Link>

      <div className="crm-lead-header__panel">
        <div className="crm-lead-header__main">
          <p className="crm-lead-header__eyebrow">Sales · ใบเสนอราคา</p>
          <h1 className="crm-lead-header__title">{title}</h1>
          {subtitleParts.length > 0 ? (
            <p className="crm-lead-header__subtitle">
              {subtitleParts.join(' · ')}
              {leadId ? (
                <>
                  {' '}
                  ·{' '}
                  <Link to={`/app/crm/${leadId}`} className="crm-inline-link">
                    แชท CRM
                  </Link>
                </>
              ) : null}
            </p>
          ) : leadId ? (
            <p className="crm-lead-header__subtitle">
              <Link to={`/app/crm/${leadId}`} className="crm-inline-link">
                เปิด Lead / แชท CRM
              </Link>
            </p>
          ) : null}
        </div>

        {!isNew && status ? (
          <div className="crm-lead-header__meta">
            <QuotationStatusBadge status={status} />
          </div>
        ) : null}
      </div>
    </header>
  )
}
