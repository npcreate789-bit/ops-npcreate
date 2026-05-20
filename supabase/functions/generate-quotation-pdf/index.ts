import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { PDFDocument, rgb } from 'https://esm.sh/pdf-lib@1.17.1'
import fontkit from 'https://esm.sh/@pdf-lib/fontkit@1.1.1'

const PRIVILEGED = new Set(['ceo', 'operations', 'dev', 'admin', 'account', 'sales'])
const BUCKET = 'quotation-documents'
const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7

const FONT_REGULAR =
  'https://cdn.jsdelivr.net/npm/@fontsource/sarabun@5.2.5/files/sarabun-thai-400-normal.ttf'
const FONT_BOLD =
  'https://cdn.jsdelivr.net/npm/@fontsource/sarabun@5.2.5/files/sarabun-thai-700-normal.ttf'

const COMPANY_LEGAL_NAME = 'บริษัท เอ็นพี ครีเอ็ท จำกัด'
const COMPANY_BRAND_EN = 'NP CREATE'
const COMPANY_ADDRESS =
  '789 หมู่ 5 ต.พระลับ อ.เมืองขอนแก่น จ.ขอนแก่น 40000'
const COMPANY_TAX_ID = '0405566003636'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateBody {
  quotation_id?: string
  regenerate?: boolean
}

interface QuotationRow {
  id: string
  quotation_number: string
  lead_id: string | null
  status: string
  subtotal: number
  discount: number
  vat_rate: number
  vat_amount: number
  total: number
  contract_months: number | null
  terms: string | null
  notes: string | null
  created_at: string
  updated_at: string
  pdf_storage_path: string | null
  pdf_generated_at: string | null
  public_token: string | null
}

interface ItemRow {
  description: string
  quantity: number
  unit_price: number
  line_total: number
  sort_order: number
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function money(n: number): string {
  return Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatThaiDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Bangkok',
    })
  } catch {
    return iso.slice(0, 10)
  }
}

function safeFileSegment(s: string): string {
  return s.replace(/[^\w\u0E00-\u0E7F.-]+/g, '_').slice(0, 80)
}

function needsRegenerate(row: QuotationRow, force?: boolean): boolean {
  if (force) return true
  if (!row.pdf_storage_path || !row.pdf_generated_at) return true
  return new Date(row.updated_at).getTime() > new Date(row.pdf_generated_at).getTime()
}

async function loadFont(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`โหลดฟอนต์ไม่สำเร็จ (${res.status})`)
  return res.arrayBuffer()
}

async function buildQuotationPdf(opts: {
  quotation: QuotationRow
  brandName: string
  items: ItemRow[]
}): Promise<Uint8Array> {
  const [regularBytes, boldBytes] = await Promise.all([
    loadFont(FONT_REGULAR),
    loadFont(FONT_BOLD),
  ])

  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const font = await pdf.embedFont(regularBytes)
  const fontBold = await pdf.embedFont(boldBytes)

  const page = pdf.addPage([595.28, 841.89])
  const margin = 48
  const contentWidth = 595.28 - margin * 2
  let y = 841.89 - margin
  const black = rgb(0.1, 0.1, 0.1)
  const muted = rgb(0.35, 0.35, 0.35)
  const lineHeight = 16

  function drawLine(
    text: string,
    opts2: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb>; gap?: number } = {},
  ) {
    const size = opts2.size ?? 11
    const usedFont = opts2.bold ? fontBold : font
    const color = opts2.color ?? black
    const gap = opts2.gap ?? lineHeight
    const lines = usedFont.splitTextToSize(text, contentWidth)
    for (const line of lines) {
      if (y < margin + size) break
      page.drawText(line, { x: margin, y: y - size, size, font: usedFont, color })
      y -= gap
    }
  }

  drawLine(COMPANY_BRAND_EN, { bold: true, size: 13, gap: 18 })
  drawLine(COMPANY_LEGAL_NAME, { bold: true, size: 12, gap: 18 })
  drawLine(`เลขที่ผู้เสียภาษี ${COMPANY_TAX_ID}`, { size: 9, color: muted, gap: 14 })
  drawLine(COMPANY_ADDRESS, { size: 9, color: muted, gap: 22 })

  drawLine('ใบเสนอราคา', { bold: true, size: 18, gap: 24 })
  drawLine(`เลขที่ ${opts.quotation.quotation_number}`, { bold: true, size: 12, gap: 18 })
  drawLine(`วันที่ออกเอกสาร ${formatThaiDate(opts.quotation.created_at)}`, { gap: 16 })
  drawLine(`ลูกค้า / แบรนด์ ${opts.brandName}`, { gap: 16 })
  if (opts.quotation.contract_months) {
    drawLine(`ระยะสัญญา ${opts.quotation.contract_months} เดือน`, { gap: 20 })
  }

  y -= 6
  drawLine('รายการ', { bold: true, size: 11, gap: 18 })

  const items = opts.items.length ? opts.items : []
  if (items.length === 0) {
    drawLine('— ไม่มีรายการ —', { color: muted })
  } else {
    items.forEach((item, index) => {
      const lineTotal = item.quantity * item.unit_price
      drawLine(
        `${index + 1}. ${item.description}`,
        { bold: true, gap: 15 },
      )
      drawLine(
        `   จำนวน ${item.quantity} × ${money(item.unit_price)} บาท = ${money(lineTotal)} บาท`,
        { size: 10, color: muted, gap: 14 },
      )
    })
  }

  y -= 4
  drawLine(`ยอดรวมก่อนส่วนลด ${money(opts.quotation.subtotal)} บาท`, { gap: 15 })
  if (Number(opts.quotation.discount) > 0) {
    drawLine(`ส่วนลด -${money(opts.quotation.discount)} บาท`, { gap: 15 })
  }
  drawLine(`ภาษีมูลค่าเพิ่ม (${opts.quotation.vat_rate}%) ${money(opts.quotation.vat_amount)} บาท`, {
    gap: 15,
  })
  drawLine(`รวมทั้งสิ้น ${money(opts.quotation.total)} บาท`, { bold: true, size: 12, gap: 20 })

  if (opts.quotation.terms?.trim()) {
    y -= 4
    drawLine('เงื่อนไขและข้อตกลง', { bold: true, gap: 16 })
    drawLine(opts.quotation.terms.trim(), { size: 10, gap: 14 })
  }

  if (opts.quotation.notes?.trim()) {
    y -= 4
    drawLine('หมายเหตุ', { bold: true, gap: 16 })
    drawLine(opts.quotation.notes.trim(), { size: 10, gap: 14 })
  }

  return pdf.save()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !serviceKey || !anonKey) {
      return json({ error: 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า' }, 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'ไม่ได้รับอนุญาต' }, 401)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user: caller },
      error: callerErr,
    } = await userClient.auth.getUser()

    if (callerErr || !caller) {
      return json({ error: 'ไม่ได้รับอนุญาต' }, 401)
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: callerRoles, error: rolesReadErr } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)

    if (rolesReadErr) {
      console.error('generate-quotation-pdf roles', rolesReadErr)
      return json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, 500)
    }

    const roles = (callerRoles ?? []).map((r) => r.role as string)
    if (!roles.some((r) => PRIVILEGED.has(r))) {
      return json({ error: 'ไม่มีสิทธิ์สร้าง PDF ใบเสนอราคา' }, 403)
    }

    const body = (await req.json()) as GenerateBody
    const quotationId = body.quotation_id?.trim()
    if (!quotationId) {
      return json({ error: 'ต้องระบุ quotation_id' }, 400)
    }

    const { data: quotation, error: qErr } = await admin
      .from('quotations')
      .select(
        'id, quotation_number, lead_id, status, subtotal, discount, vat_rate, vat_amount, total, contract_months, terms, notes, created_at, updated_at, pdf_storage_path, pdf_generated_at, public_token, owner_id',
      )
      .eq('id', quotationId)
      .maybeSingle()

    if (qErr) {
      console.error('generate-quotation-pdf load', qErr)
      return json({ error: qErr.message }, 500)
    }
    if (!quotation) {
      return json({ error: 'ไม่พบใบเสนอราคา' }, 404)
    }

    const q = quotation as QuotationRow & { owner_id: string }
    const isOwner = q.owner_id === caller.id
    const isPrivileged = roles.some((r) => PRIVILEGED.has(r))
    if (!isOwner && !isPrivileged) {
      return json({ error: 'ไม่มีสิทธิ์เข้าถึงใบเสนอราคานี้' }, 403)
    }

    const sentLike = ['sent', 'viewed', 'accepted', 'awaiting_payment', 'paid'].includes(q.status)
    if (!sentLike) {
      return json({ error: 'ตั้งสถานะใบเสนอราคาเป็น "ส่งแล้ว" ขึ้นไปก่อนสร้าง PDF' }, 400)
    }

    const { data: items, error: itemsErr } = await admin
      .from('quotation_items')
      .select('description, quantity, unit_price, line_total, sort_order')
      .eq('quotation_id', quotationId)
      .order('sort_order')

    if (itemsErr) {
      return json({ error: itemsErr.message }, 500)
    }

    let brandName = 'ลูกค้า'
    if (q.lead_id) {
      const { data: lead } = await admin
        .from('leads')
        .select('brand_name')
        .eq('id', q.lead_id)
        .maybeSingle()
      if (lead?.brand_name) brandName = lead.brand_name as string
    }

    const storagePath =
      q.pdf_storage_path ??
      `${quotationId}/${safeFileSegment(q.quotation_number)}.pdf`

    if (!needsRegenerate(q, body.regenerate) && q.pdf_storage_path) {
      const { data: signed, error: signErr } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(q.pdf_storage_path, SIGNED_URL_SECONDS)

      if (signErr || !signed?.signedUrl) {
        console.warn('generate-quotation-pdf signed url', signErr)
      } else {
        return json({
          ok: true,
          pdf_url: signed.signedUrl,
          storage_path: q.pdf_storage_path,
          cached: true,
        })
      }
    }

    const pdfBytes = await buildQuotationPdf({
      quotation: q,
      brandName,
      items: (items ?? []) as ItemRow[],
    })

    const { error: uploadErr } = await admin.storage.from(BUCKET).upload(storagePath, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true,
    })

    if (uploadErr) {
      console.error('generate-quotation-pdf upload', uploadErr)
      return json({ error: uploadErr.message }, 500)
    }

    const now = new Date().toISOString()
    const { error: updateErr } = await admin
      .from('quotations')
      .update({
        pdf_storage_path: storagePath,
        pdf_generated_at: now,
      })
      .eq('id', quotationId)

    if (updateErr) {
      console.error('generate-quotation-pdf update row', updateErr)
    }

    const { data: signed, error: signErr } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_SECONDS)

    if (signErr || !signed?.signedUrl) {
      return json({ error: signErr?.message ?? 'สร้างลิงก์ดาวน์โหลดไม่สำเร็จ' }, 500)
    }

    await admin.from('audit_logs').insert({
      actor_id: caller.id,
      action: 'quotation.pdf.generate',
      entity_type: 'quotation',
      entity_id: quotationId,
      metadata: { storage_path: storagePath, quotation_number: q.quotation_number },
    })

    return json({
      ok: true,
      pdf_url: signed.signedUrl,
      storage_path: storagePath,
      cached: false,
    })
  } catch (e) {
    console.error('generate-quotation-pdf', e)
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
    return json({ error: message }, 500)
  }
})
