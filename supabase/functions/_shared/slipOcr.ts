export interface SlipOcrResult {
  detected_amount: number | null
  transfer_date: string | null
  reference_text: string | null
  confidence: number
  ocr_provider: string
  error: string | null
  raw_summary: string | null
}

const OCR_PROMPT = `You analyze Thai bank transfer slip images (PromptPay / mobile banking).
Return ONLY valid JSON with no markdown:
{
  "detected_amount": number or null (total transferred amount in THB, no commas),
  "transfer_date": "YYYY-MM-DD" or null (date on slip, Bangkok calendar),
  "reference_text": string or null (memo / reference / quotation number if visible),
  "confidence": number between 0 and 1 (how sure you are),
  "summary": string (one short Thai sentence)
}
If unreadable, set confidence below 0.5 and detected_amount null.`

function parseJsonFromText(text: string): Record<string, unknown> | null {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1].trim() : trimmed
  try {
    return JSON.parse(candidate) as Record<string, unknown>
  } catch {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>
      } catch {
        return null
      }
    }
    return null
  }
}

function coerceAmount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const digits = value.replace(/[^\d.]/g, '')
  const n = Number(digits)
  return Number.isFinite(n) && n > 0 ? n : null
}

export async function runSlipOcr(
  bytes: Uint8Array,
  mimeType: string,
): Promise<SlipOcrResult> {
  const apiKey =
    Deno.env.get('SLIP_OCR_OPENAI_API_KEY')?.trim() ||
    Deno.env.get('OPENAI_API_KEY')?.trim()

  if (!apiKey) {
    return {
      detected_amount: null,
      transfer_date: null,
      reference_text: null,
      confidence: 0,
      ocr_provider: 'none',
      error: 'ยังไม่ได้ตั้งค่า SLIP_OCR_OPENAI_API_KEY — ส่งเข้าคิวตรวจมือ',
      raw_summary: null,
    }
  }

  if (mimeType === 'application/pdf') {
    return {
      detected_amount: null,
      transfer_date: null,
      reference_text: null,
      confidence: 0,
      ocr_provider: 'none',
      error: 'ไฟล์ PDF ยังไม่รองรับ OCR อัตโนมัติ',
      raw_summary: null,
    }
  }

  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  const b64 = btoa(binary)
  const dataUrl = `data:${mimeType};base64,${b64}`

  const timeoutMs = Number(Deno.env.get('SLIP_OCR_TIMEOUT_MS')?.trim() || '45000')
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  let res: Response
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: Deno.env.get('SLIP_OCR_OPENAI_MODEL')?.trim() || 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 400,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: OCR_PROMPT },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    })
  } catch (e) {
    clearTimeout(timeoutId)
    const aborted = (e as Error)?.name === 'AbortError'
    console.error('slip OCR network error', aborted ? 'timeout' : (e as Error)?.message)
    return {
      detected_amount: null,
      transfer_date: null,
      reference_text: null,
      confidence: 0,
      ocr_provider: 'openai',
      error: aborted
        ? 'OCR ใช้เวลานานเกินไป — ส่งเข้าคิวตรวจมือ'
        : 'ติดต่อ OCR ไม่สำเร็จ — ส่งเข้าคิวตรวจมือ',
      raw_summary: null,
    }
  }
  clearTimeout(timeoutId)

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    console.error('slip OCR API error', res.status, errText.slice(0, 200))
    return {
      detected_amount: null,
      transfer_date: null,
      reference_text: null,
      confidence: 0,
      ocr_provider: 'openai',
      error: 'OCR ไม่สำเร็จ — ส่งเข้าคิวตรวจมือ',
      raw_summary: null,
    }
  }

  let payload: { choices?: Array<{ message?: { content?: string } }> }
  try {
    payload = (await res.json()) as typeof payload
  } catch (e) {
    console.error('slip OCR parse error', (e as Error)?.message)
    return {
      detected_amount: null,
      transfer_date: null,
      reference_text: null,
      confidence: 0,
      ocr_provider: 'openai',
      error: 'อ่านผล OCR ไม่ได้ — ส่งเข้าคิวตรวจมือ',
      raw_summary: null,
    }
  }
  const content = payload.choices?.[0]?.message?.content?.trim() ?? ''
  const parsed = parseJsonFromText(content)

  if (!parsed) {
    return {
      detected_amount: null,
      transfer_date: null,
      reference_text: null,
      confidence: 0,
      ocr_provider: 'openai',
      error: 'อ่านสลิปไม่ได้ — ส่งเข้าคิวตรวจมือ',
      raw_summary: content.slice(0, 200) || null,
    }
  }

  const confidenceRaw = Number(parsed.confidence)
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.min(1, Math.max(0, confidenceRaw))
    : 0.5

  return {
    detected_amount: coerceAmount(parsed.detected_amount),
    transfer_date:
      typeof parsed.transfer_date === 'string' ? parsed.transfer_date : null,
    reference_text:
      typeof parsed.reference_text === 'string' ? parsed.reference_text : null,
    confidence,
    ocr_provider: 'openai',
    error: null,
    raw_summary: typeof parsed.summary === 'string' ? parsed.summary : null,
  }
}
