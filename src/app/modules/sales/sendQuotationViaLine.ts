import { resolveLeadLinePushRecipient } from '../../../shared/line/resolveLeadLinePushRecipient'
import type { LeadLineIds } from '../../../shared/line/lineUserIdResolution'
import { lineLoginAndOaIdsMismatch } from '../../../shared/line/lineUserIdResolution'
import { buildQuotationFlexMessage } from '../../../shared/line/quotationFlexMessage'
import {
  buildQuotationSendMessage,
  deliverLineMessageToCustomer,
  type LineDeliveryMode,
} from '../../../shared/line/staffLineMessaging'
import { ensureQuotationPdfDownloadUrl } from './api/quotationPdf'
import { ensureQuotationPublicToken, quotationPublicUrl } from './api/quotations'
import { isQuotationSentLike } from './constants'
import type { Quotation } from './types'

export type QuotationLineSendResult =
  | { ok: true; mode: LineDeliveryMode }
  | { ok: false; error: string }

/** ส่งลิงก์ใบเสนอราคาออนไลน์ทาง LINE และบันทึกใน lead_line_messages (ผ่าน send-line-push) */
export async function sendQuotationLinkViaLine(opts: {
  quotation: Quotation
  brandName: string
  lineIds: LeadLineIds | null
  metadataSource?: string
}): Promise<QuotationLineSendResult> {
  const leadId = opts.quotation.lead_id
  if (!leadId) {
    return { ok: false, error: 'ใบเสนอราคาไม่ผูก Lead — เลือก Lead หรือเปิดจากหน้า CRM' }
  }
  const pushTo = await resolveLeadLinePushRecipient({
    id: leadId,
    line_user_id: opts.lineIds?.line_user_id,
    line_oa_chat_user_id: opts.lineIds?.line_oa_chat_user_id,
  })
  if (!pushTo) {
    const mismatch = opts.lineIds && lineLoginAndOaIdsMismatch(opts.lineIds)
    return {
      ok: false,
      error: mismatch
        ? 'LINE Login ID กับแชท OA ไม่ตรงกัน — บันทึก ID จาก URL แชท OA ในหน้า Lead แล้วให้ลูกค้าทัก OA อย่างน้อยหนึ่งครั้ง'
        : 'ยังไม่มี LINE User ID สำหรับ Push — บันทึก ID จาก URL แชท OA (chat.line.biz/…/chat/U…) ในหน้า Lead',
    }
  }
  const oaId = opts.lineIds?.line_oa_chat_user_id?.trim()
  if (
    opts.lineIds &&
    lineLoginAndOaIdsMismatch(opts.lineIds) &&
    !oaId &&
    pushTo.toLowerCase() === opts.lineIds.line_user_id?.trim().toLowerCase()
  ) {
    return {
      ok: false,
      error:
        'ยังใช้เฉพาะ LINE Login ID — บันทึก ID แชท OA จาก URL ในหน้า Lead ก่อนส่งลิงก์ใบเสนอราคา',
    }
  }
  if (!isQuotationSentLike(opts.quotation.status)) {
    return {
      ok: false,
      error: 'ตั้งสถานะใบเสนอราคาเป็น "ส่งแล้ว" ขึ้นไปจึงจะส่งลิงก์ลูกค้าได้',
    }
  }

  try {
    const token = opts.quotation.public_token ?? (await ensureQuotationPublicToken(opts.quotation.id))
    const publicUrl = quotationPublicUrl(token)

    let pdfDownloadUrl: string | null = null
    const pdfResult = await ensureQuotationPdfDownloadUrl(opts.quotation.id)
    if (pdfResult.ok) {
      pdfDownloadUrl = pdfResult.pdfUrl
    }

    const totalLabel = `${opts.quotation.total.toLocaleString('th-TH')} บาท (รวม VAT)`
    const metadata = {
      quotation_id: opts.quotation.id,
      quotation_number: opts.quotation.quotation_number,
      public_quotation_url: publicUrl,
      ...(pdfDownloadUrl ? { pdf_download_url: pdfDownloadUrl } : {}),
      source: opts.metadataSource ?? 'quotation_save',
    }

    const flex = buildQuotationFlexMessage({
      brandName: opts.brandName,
      quotationNumber: opts.quotation.quotation_number,
      publicUrl,
      totalLabel,
      contractMonths: opts.quotation.contract_months,
      pdfDownloadUrl,
    })
    const greeting = `สวัสดีครับ/ค่ะ — ทีม NP Create ส่งใบเสนอราคา ${opts.quotation.quotation_number} ให้ ${opts.brandName} ครับ/ค่ะ`

    let result: { mode: LineDeliveryMode; message?: string }
    try {
      result = await deliverLineMessageToCustomer(opts.lineIds, greeting, {
        leadId,
        metadata,
        flex,
      })
    } catch {
      const text = buildQuotationSendMessage({
        brandName: opts.brandName,
        quotationNumber: opts.quotation.quotation_number,
        publicUrl,
        totalLabel,
        contractMonths: opts.quotation.contract_months,
        pdfDownloadUrl,
      })
      result = await deliverLineMessageToCustomer(opts.lineIds, text, {
        leadId,
        metadata,
      })
    }
    return { ok: true, mode: result.mode }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'ส่งลิงก์ใบเสนอราคาไม่สำเร็จ',
    }
  }
}
