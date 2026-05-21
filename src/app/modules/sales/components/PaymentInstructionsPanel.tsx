import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canSendPaymentInstructions } from '../../../../shared/auth/access'
import {
  buildPaymentInstructionsMessage,
  formatThaiBaht,
} from '../../../../shared/payment/buildPaymentInstructionsMessage'
import { openLineOaWithText } from '../../../../shared/line/staffLineMessaging'
import { PaymentInstructionsCard } from './PaymentInstructionsCard'
import { getLead } from '../../crm/api/leads'
import { getQuotation } from '../api/quotations'
import { fetchCompanyPaymentSettings } from '../../../../shared/payment/companyPaymentSettings'
import { markQuotationPaymentInstructionsSent } from '../api/paymentInstructions'
import { sendPaymentInstructionsViaLine } from '../sendPaymentInstructionsViaLine'
import type { Quotation } from '../types'
import '../sales.css'

function formatItemsSummary(quotation: Quotation): string {
  const items = quotation.items ?? []
  if (items.length === 0) return '—'
  return items
    .map(
      (i) =>
        `• ${i.description} × ${i.quantity} = ${(i.quantity * i.unit_price).toLocaleString('th-TH')} บาท`,
    )
    .join('\n')
}

interface PaymentInstructionsPanelProps {
  quotationId: string
  onClose: () => void
  onCompleted?: () => void
}

export function PaymentInstructionsPanel({
  quotationId,
  onClose,
  onCompleted,
}: PaymentInstructionsPanelProps) {
  const { profile } = useAuth()
  const roles = profile?.roles ?? []
  const userId = profile?.id ?? ''

  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState<'line' | 'mark' | 'line_mark' | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const brandName = quotation?.lead_brand_name?.trim() || 'ลูกค้า'
  const canSend = quotation
    ? canSendPaymentInstructions(roles, quotation.owner_id, userId)
    : false

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const q = await getQuotation(quotationId)
        if (cancelled) return
        if (!q) {
          setError('ไม่พบใบเสนอราคา')
          return
        }
        setQuotation(q)
        const paySettings = await fetchCompanyPaymentSettings()
        setMessage(
          buildPaymentInstructionsMessage(
            {
              brandName: q.lead_brand_name?.trim() || 'ลูกค้า',
              quotationNumber: q.quotation_number,
              total: q.total,
              itemsSummary: formatItemsSummary(q),
              contractMonths: q.contract_months,
            },
            paySettings,
          ),
        )
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [quotationId])

  async function handleSendLine() {
    if (!quotation?.lead_id) {
      setError('ไม่มี Lead — ส่งทาง LINE ไม่ได้')
      return
    }
    setBusy('line')
    setError(null)
    try {
      const lead = await getLead(quotation.lead_id)
      const r = await sendPaymentInstructionsViaLine({
        quotation,
        brandName,
        message,
        lineIds: lead
          ? {
              line_user_id: lead.line_user_id,
              line_oa_chat_user_id: lead.line_oa_chat_user_id,
            }
          : null,
      })
      if (!r.ok) {
        setError(r.error)
        return
      }
      setFeedback(
        r.mode === 'push'
          ? 'ส่งข้อมูลชำระเงินทาง LINE แล้ว'
          : 'เปิด LINE / คัดลอกแล้ว — ส่งข้อความให้ลูกค้า',
      )
    } finally {
      setBusy(null)
    }
  }

  async function handleMarkSent() {
    setBusy('mark')
    setError(null)
    try {
      await markQuotationPaymentInstructionsSent(quotationId)
      setFeedback('บันทึกแล้ว — สถานะรอชำระเงิน')
      onCompleted?.()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setBusy(null)
    }
  }

  async function handleSendLineAndMark() {
    if (!quotation?.lead_id) {
      setError('ไม่มี Lead — ส่งทาง LINE ไม่ได้')
      return
    }
    setBusy('line_mark')
    setError(null)
    try {
      const lead = await getLead(quotation.lead_id)
      const r = await sendPaymentInstructionsViaLine({
        quotation,
        brandName,
        message,
        lineIds: lead
          ? {
              line_user_id: lead.line_user_id,
              line_oa_chat_user_id: lead.line_oa_chat_user_id,
            }
          : null,
      })
      if (!r.ok) {
        setError(r.error)
        return
      }
      await markQuotationPaymentInstructionsSent(quotationId)
      setFeedback(
        r.mode === 'push'
          ? 'ส่ง LINE และบันทึกรอชำระเงินแล้ว'
          : 'เปิด LINE แล้ว — บันทึกรอชำระเงิน (ส่งข้อความให้ลูกค้า)',
      )
      onCompleted?.()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ดำเนินการไม่สำเร็จ')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      className="qt-payment-panel"
      role="dialog"
      aria-labelledby="qt-payment-panel-title"
      aria-modal="true"
    >
      <div className="qt-payment-panel__backdrop" onClick={onClose} aria-hidden />
      <div className="qt-payment-panel__sheet">
        <header className="qt-payment-panel__head">
          <div>
            <p className="qt-payment-panel__eyebrow">ส่งข้อมูลชำระเงิน</p>
            <h2 id="qt-payment-panel-title">
              {quotation?.quotation_number ?? '…'}
            </h2>
            {quotation ? (
              <p className="muted">
                {brandName} · ยอด {formatThaiBaht(quotation.total)}
              </p>
            ) : null}
          </div>
          <button type="button" className="crm-btn crm-btn--ghost" onClick={onClose}>
            ปิด
          </button>
        </header>

        {loading ? <p className="muted">กำลังโหลด…</p> : null}
        {error ? <p className="crm-error">{error}</p> : null}
        {feedback ? (
          <p className="crm-banner crm-banner--ok" role="status">
            {feedback}
          </p>
        ) : null}

        {quotation && !loading ? (
          <>
            <PaymentInstructionsCard
              brandName={brandName}
              quotationNumber={quotation.quotation_number}
              total={quotation.total}
              itemsSummary={formatItemsSummary(quotation)}
              contractMonths={quotation.contract_months}
            />

            <label className="qt-payment-panel__message">
              <span>ข้อความส่งลูกค้า</span>
              <textarea
                className="crm-input"
                rows={10}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={!canSend}
              />
            </label>

            <div className="qt-payment-panel__actions">
              {canSend ? (
                <>
                  <button
                    type="button"
                    className="crm-btn crm-btn--primary"
                    disabled={busy !== null}
                    onClick={() => void handleSendLineAndMark()}
                  >
                    {busy === 'line_mark'
                      ? 'กำลังส่งและบันทึก…'
                      : 'ส่ง LINE + บันทึกรอชำระ'}
                  </button>
                  <button
                    type="button"
                    className="crm-btn crm-btn--ghost"
                    disabled={busy !== null}
                    onClick={() => void handleSendLine()}
                  >
                    {busy === 'line' ? 'กำลังส่ง…' : 'ส่งไป LINE เท่านั้น'}
                  </button>
                  <button
                    type="button"
                    className="crm-btn crm-btn--ghost"
                    disabled={busy !== null}
                    onClick={() => openLineOaWithText(message)}
                  >
                    เปิด LINE
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className="crm-btn crm-btn--ghost"
                disabled={busy !== null || !canSend}
                onClick={() => void handleMarkSent()}
              >
                {busy === 'mark' ? 'กำลังบันทึก…' : 'บันทึกว่าส่งแล้ว (ไม่ส่ง LINE)'}
              </button>
              {quotation.lead_id ? (
                <Link
                  to={`/app/crm/${quotation.lead_id}`}
                  className="crm-btn crm-btn--ghost"
                >
                  แชท CRM
                </Link>
              ) : null}
              <Link
                to={`/app/sales/quotations/${quotation.id}`}
                className="crm-btn crm-btn--ghost"
              >
                เปิดใบเสนอราคา
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
