import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  contractEndHint,
  daysUntilContractEnd,
  formatClientReadyForAds,
} from '../clientLabels'
import { withClientPreview } from '../clientNav'
import type { ClientReport } from '../types'

interface Props {
  report: ClientReport
  previewCustomerId?: string | null
  pendingPaymentCount?: number
}

export function ClientStatusBanner({
  report,
  previewCustomerId,
  pendingPaymentCount = 0,
}: Props) {
  const { customer, brief_progress, brief_submitted, team_checklist_progress } = report
  const briefNeedsAction = !brief_submitted && brief_progress < 100
  const contractHint = contractEndHint(daysUntilContractEnd(customer.contract_end))

  let tone: 'info' | 'warn' | 'ok' = 'info'
  let title = ''
  let detail: ReactNode = null
  let cta: { label: string; to: string } | null = null

  if (pendingPaymentCount > 0) {
    tone = 'warn'
    title = `มี ${pendingPaymentCount} รายการรอชำระ`
    detail = 'ชำระตามกำหนดแล้วแจ้งสลิปผ่านแชท'
    cta = {
      label: 'ไปการชำระเงิน',
      to: withClientPreview('/app/client/payment', previewCustomerId),
    }
  } else if (briefNeedsAction) {
    tone = 'warn'
    title = `บรีฟยังไม่ครบ (${brief_progress}%)`
    detail = 'กรอกข้อมูลแบรนด์แล้วกดส่งบรีฟ — ทีมจะเริ่มเตรียมยิงแอด'
    cta = {
      label: 'ไปบรีฟงาน',
      to: withClientPreview('/app/client/brief', previewCustomerId),
    }
  } else if (brief_submitted && !customer.ready_for_ads) {
    tone = 'info'
    title = 'ส่งบรีฟแล้ว — รอทีมตรวจ'
    detail = `ทีมตรวจความครบประมาณ ${team_checklist_progress}% · ${formatClientReadyForAds(false, true)}`
    cta = {
      label: 'แชทถามทีม',
      to: withClientPreview('/app/client/chat', previewCustomerId),
    }
  } else if (customer.ready_for_ads) {
    tone = 'ok'
    title = 'พร้อมยิงแอดแล้ว'
    detail = 'ดูผลรายงานและติดตามโปรเจกต์ได้จากเมนูด้านบน'
    cta = {
      label: 'ดูรายงาน',
      to: withClientPreview('/app/client/reports', previewCustomerId),
    }
  }

  if (!title && contractHint) {
    tone = 'warn'
    title = contractHint
    cta = {
      label: 'ดูสัญญา',
      to: withClientPreview('/app/client/payment', previewCustomerId),
    }
  } else if (contractHint && title && tone !== 'warn') {
    detail = (
      <>
        {detail}
        {detail ? ' · ' : null}
        {contractHint}
      </>
    )
  }

  if (!title) return null

  const className =
    tone === 'warn'
      ? 'crm-banner crm-banner--warn client-status-banner'
      : tone === 'ok'
        ? 'crm-banner client-status-banner'
        : 'crm-banner client-status-banner'

  return (
    <section className={className} aria-live="polite">
      <div className="client-status-banner__inner">
        <div>
          <strong>{title}</strong>
          {detail ? <p className="muted client-status-banner__detail">{detail}</p> : null}
        </div>
        {cta ? (
          <Link to={cta.to} className="crm-btn crm-btn--ghost crm-btn--sm">
            {cta.label}
          </Link>
        ) : null}
      </div>
    </section>
  )
}
