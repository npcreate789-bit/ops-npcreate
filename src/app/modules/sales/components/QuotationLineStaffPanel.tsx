import { useState } from 'react'
import { staffOpenChannelLabel } from '../../../../shared/crm/preferredContactChannel'
import {
  openStaffLineChat,
  staffLineChatUrl,
  staffLineDirectChatHint,
} from '../../../../shared/line/lineStaffOpenUrl'
import { formatServiceInterests } from '../../../../shared/packages/serviceInterests'
import {
  buildQuotationReferenceMessage,
  buildQuotationSendMessage,
  copyTextToClipboard,
  deliverLineMessageToCustomer,
  openLineOaWithText,
} from '../../../../shared/line/staffLineMessaging'
import { ensureQuotationPublicToken, quotationPublicUrl } from '../api/quotations'
import { isQuotationSentLike } from '../constants'
import type { Package, Quotation } from '../types'
import '../sales.css'

interface QuotationLineStaffPanelProps {
  quotation: Quotation
  brandName: string
  leadServiceCodes?: string[]
  lineUserId?: string | null
  packages: Package[]
  saved: boolean
}

function formatItemsSummary(quotation: Quotation): string {
  const items = quotation.items ?? []
  if (items.length === 0) return '— (บันทึกรายการในใบเสนอราคาก่อน)'
  return items
    .map(
      (i) =>
        `• ${i.description} × ${i.quantity} = ${(i.quantity * i.unit_price).toLocaleString('th-TH')} บาท`,
    )
    .join('\n')
}

export function QuotationLineStaffPanel({
  quotation,
  brandName,
  leadServiceCodes = [],
  lineUserId,
  packages,
  saved,
}: QuotationLineStaffPanelProps) {
  const [busy, setBusy] = useState<'ref' | 'send' | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const serviceOptions = packages.filter((p) => p.is_active).map((p) => ({ code: p.code, name: p.name }))
  const servicesLabel =
    leadServiceCodes.length > 0
      ? formatServiceInterests(leadServiceCodes, serviceOptions)
      : null
  const totalLabel = `${quotation.total.toLocaleString('th-TH')} บาท (รวม VAT)`

  function referenceMessage() {
    return buildQuotationReferenceMessage({
      brandName,
      servicesLabel,
      quotationNumber: quotation.quotation_number,
      itemsSummary: formatItemsSummary(quotation),
      totalLabel,
      staffNote: quotation.notes,
    })
  }

  async function handleReference() {
    setBusy('ref')
    setError(null)
    setFeedback(null)
    try {
      const text = referenceMessage()
      const copied = await copyTextToClipboard(text)
      if (lineUserId?.trim()) {
        const result = await deliverLineMessageToCustomer(lineUserId, text)
        setFeedback(result.message ?? 'ส่ง/เปิด LINE แล้ว')
      } else {
        openLineOaWithText(text, lineUserId)
        setFeedback(
          copied
            ? 'คัดลอกข้อความแล้ว — เปิด LINE OA (วางข้อความส่งลูกค้า)'
            : 'เปิด LINE OA แล้ว — พิมพ์หรือวางข้อความส่งลูกค้า',
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ดำเนินการไม่สำเร็จ')
    } finally {
      setBusy(null)
    }
  }

  async function handleSendQuotation() {
    if (!saved) {
      setError('บันทึกใบเสนอราคาก่อน แล้วค่อยส่งทาง LINE')
      return
    }
    if (!isQuotationSentLike(quotation.status)) {
      setError('ตั้งสถานะเป็น "ส่งแล้ว" ขึ้นไปก่อน จึงจะส่งใบเสนอราคาให้ลูกค้า')
      return
    }

    setBusy('send')
    setError(null)
    setFeedback(null)
    try {
      const token = quotation.public_token ?? (await ensureQuotationPublicToken(quotation.id))
      const text = buildQuotationSendMessage({
        brandName,
        quotationNumber: quotation.quotation_number,
        publicUrl: quotationPublicUrl(token),
        totalLabel,
        contractMonths: quotation.contract_months,
      })
      const result = await deliverLineMessageToCustomer(lineUserId, text)
      setFeedback(
        result.mode === 'push'
          ? 'ส่งใบเสนอราคาทาง LINE แล้ว'
          : (result.message ?? 'คัดลอก/เปิด LINE แล้ว — ส่งข้อความให้ลูกค้า'),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ส่งใบเสนอราคาไม่สำเร็จ')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="card card--wide qt-line-staff no-print" aria-label="ติดต่อลูกค้าทาง LINE">
      <header className="qt-line-staff__head">
        <h2 className="crm-section-title">ติดต่อลูกค้าทาง LINE</h2>
        <p className="muted">
          ส่งข้อมูลอ้างอิงก่อนคุย · หลังบันทึกแล้วส่งใบเสนอราคา —{' '}
          <a
            href={staffLineChatUrl(lineUserId)}
            target="_blank"
            rel="noopener noreferrer"
          >
            @npcreate
          </a>
        </p>
      </header>

      {lineUserId && (
        <p className="crm-preferred-channel__meta">
          LINE User ID: <strong>{lineUserId}</strong> — ส่ง push ได้เมื่อตั้ง Messaging API
        </p>
      )}

      {error && (
        <p className="crm-error" role="alert">
          {error}
        </p>
      )}
      {feedback && (
        <p className="crm-banner crm-banner--ok" role="status">
          {feedback}
        </p>
      )}

      <div className="qt-line-staff__actions">
        <button
          type="button"
          className="crm-btn crm-btn--primary"
          disabled={busy !== null}
          onClick={() => void handleReference()}
        >
          {busy === 'ref' ? 'กำลังดำเนินการ…' : 'เปิด LINE ส่งข้อมูลอ้างอิง'}
        </button>
        <button
          type="button"
          className="crm-btn"
          disabled={busy !== null || !saved}
          onClick={() => void handleSendQuotation()}
          title={!saved ? 'บันทึกใบเสนอราคาก่อน' : undefined}
        >
          {busy === 'send' ? 'กำลังส่ง…' : 'ส่งใบเสนอราคาทาง LINE'}
        </button>
        <button
          type="button"
          className="crm-btn crm-btn--ghost"
          title={staffLineDirectChatHint(lineUserId) ?? undefined}
          onClick={() => openStaffLineChat(lineUserId)}
        >
          {staffOpenChannelLabel('line')}
        </button>
      </div>

      {!saved && (
        <p className="muted qt-line-staff__hint">บันทึกใบเสนอราคาก่อน — ปุ่มส่งใบเสนอราคาจะเปิดใช้งาน</p>
      )}
    </section>
  )
}
