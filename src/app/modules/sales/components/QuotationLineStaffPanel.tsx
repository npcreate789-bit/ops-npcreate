import { useState } from 'react'
import { Link } from 'react-router-dom'
import { staffOpenChannelLabel } from '../../../../shared/crm/preferredContactChannel'
import {
  openStaffLineChat,
  staffLineChatUrl,
  staffLineDirectChatHint,
} from '../../../../shared/line/lineStaffOpenUrl'
import type { LeadLineIds } from '../../../../shared/line/lineUserIdResolution'
import {
  lineLoginAndOaIdsMismatch,
  resolveLineStaffChatOpenUserId,
} from '../../../../shared/line/lineUserIdResolution'
import { resolveLeadLinePushRecipient } from '../../../../shared/line/resolveLeadLinePushRecipient'
import { formatServiceInterests } from '../../../../shared/packages/serviceInterests'
import {
  buildQuotationReferenceMessage,
  copyTextToClipboard,
  deliverLineMessageToCustomer,
  openLineOaWithText,
} from '../../../../shared/line/staffLineMessaging'
import { getLead } from '../../crm/api/leads'
import { sendQuotationLinkViaLine } from '../sendQuotationViaLine'
import { isQuotationSentLike } from '../constants'
import type { Package, Quotation } from '../types'
import '../sales.css'

interface QuotationLineStaffPanelProps {
  quotation: Quotation
  brandName: string
  leadServiceCodes?: string[]
  lineIds?: LeadLineIds | null
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
  lineIds,
  packages,
  saved,
}: QuotationLineStaffPanelProps) {
  const oaOpenId = resolveLineStaffChatOpenUserId(lineIds ?? {})
  const loginId = lineIds?.line_user_id?.trim()
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

  async function freshLineIds(): Promise<LeadLineIds | null> {
    const lid = quotation.lead_id?.trim()
    if (!lid) return lineIds ?? null
    try {
      const lead = await getLead(lid)
      if (!lead) return lineIds ?? null
      return {
        line_user_id: lead.line_user_id,
        line_oa_chat_user_id: lead.line_oa_chat_user_id,
      }
    } catch {
      return lineIds ?? null
    }
  }

  async function handleReference() {
    setBusy('ref')
    setError(null)
    setFeedback(null)
    try {
      const text = referenceMessage()
      const copied = await copyTextToClipboard(text)
      const ids = await freshLineIds()
      const leadId = quotation.lead_id?.trim()
      const canPush = Boolean(
        leadId &&
          ids &&
          (await resolveLeadLinePushRecipient({
            id: leadId,
            line_user_id: ids.line_user_id,
            line_oa_chat_user_id: ids.line_oa_chat_user_id,
          })),
      )
      if (canPush) {
        const meta = quotation.lead_id
          ? {
              leadId: quotation.lead_id,
              metadata: {
                ...(quotation.id && quotation.id !== 'new'
                  ? {
                      quotation_id: quotation.id,
                      quotation_number: quotation.quotation_number,
                    }
                  : {}),
                source: 'quotation_reference_preview',
              } as Record<string, unknown>,
            }
          : undefined
        const result = await deliverLineMessageToCustomer(ids, text, meta)
        setFeedback(result.message ?? 'ส่ง/เปิด LINE แล้ว')
      } else {
        openLineOaWithText(text, oaOpenId ?? loginId)
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
      const ids = await freshLineIds()
      const r = await sendQuotationLinkViaLine({
        quotation,
        brandName,
        lineIds: ids,
        metadataSource: 'quotation_line_panel',
      })
      if (!r.ok) {
        setError(r.error)
        return
      }
      setFeedback(
        r.mode === 'push'
          ? 'ส่งการ์ดใบเสนอราคา (ปุ่มเปิดดู + PDF) ทาง LINE แล้ว'
          : 'คัดลอก/เปิด LINE แล้ว — ส่งข้อความให้ลูกค้า',
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
          ส่งข้อมูลอ้างอิงก่อนคุย · หลังบันทึกใบเสนอราคาแล้วส่งลิงก์/ไฟล์ให้ลูกค้า —{' '}
          <a
            href={staffLineChatUrl(oaOpenId ?? loginId, oaOpenId ? { mode: 'direct' } : undefined)}
            target="_blank"
            rel="noopener noreferrer"
          >
            @npcreate
          </a>
        </p>
      </header>

      {(loginId || oaOpenId) && (
        <p className="crm-preferred-channel__meta">
          {loginId && (
            <>
              LINE Login: <strong>{loginId}</strong>
              {oaOpenId ? ' · ' : ''}
            </>
          )}
          {oaOpenId && (
            <>
              แชท OA: <strong>{oaOpenId}</strong>
            </>
          )}
          {lineIds && lineLoginAndOaIdsMismatch(lineIds) && (
            <>
              {' '}
              — LINE Login กับแชท OA ไม่ตรงกัน ส่ง Push ใช้ ID แชท OA / ประวัติทัก OA ไม่ใช้
              Login
            </>
          )}
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
          className="crm-btn crm-btn--primary"
          disabled={busy !== null || !saved}
          onClick={() => void handleSendQuotation()}
          title={!saved ? 'บันทึกใบเสนอราคาก่อน' : undefined}
        >
          {busy === 'send' ? 'กำลังส่ง…' : 'ส่งลิงก์ใบเสนอราคาไปแชท LINE'}
        </button>
        {quotation.lead_id ? (
          <Link
            to={`/app/crm/${quotation.lead_id}`}
            className="crm-btn crm-btn--ghost"
          >
            เปิดแชท CRM
          </Link>
        ) : null}
        <button
          type="button"
          className="crm-btn crm-btn--ghost"
          title={staffLineDirectChatHint(oaOpenId ?? loginId) ?? undefined}
          onClick={() =>
            void openStaffLineChat(oaOpenId ?? loginId, {
              mode: oaOpenId ? 'direct' : 'auto',
            })
          }
        >
          {staffOpenChannelLabel('line')}
        </button>
      </div>

      {!saved && (
        <p className="muted qt-line-staff__hint">
          บันทึกใบเสนอราคาก่อน — จากนั้นตั้งสถานะ &quot;ส่งแล้ว&quot; แล้วกดส่งลิงก์ไปแชท LINE
          (ลูกค้าเปิดลิงก์แล้วพิมพ์/บันทึกเป็น PDF ได้)
        </p>
      )}
    </section>
  )
}
