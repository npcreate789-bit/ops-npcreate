export interface ParsedBankLine {
  transaction_date: string
  amount: number
  description: string | null
  reference_text: string | null
  external_id: string | null
}

function parseThaiDate(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const dmy = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
  if (dmy) {
    let y = Number(dmy[3])
    if (y < 100) y += 2000
    if (y > 2400) y -= 543
    const m = dmy[2].padStart(2, '0')
    const d = dmy[1].padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return null
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[,\s฿บาท]/g, '').trim()
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) && n > 0 ? n : null
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuote = !inQuote
      continue
    }
    if ((ch === ',' || ch === ';' || ch === '\t') && !inQuote) {
      out.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur.trim())
  return out
}

function headerIndex(headers: string[], patterns: string[]): number {
  const lower = headers.map((h) => h.toLowerCase())
  for (const p of patterns) {
    const idx = lower.findIndex((h) => h.includes(p))
    if (idx >= 0) return idx
  }
  return -1
}

/** รองรับ CSV ส่งออกจากธนาคารไทย (ฝากเงิน = เงินเข้า) */
export function parseBankStatementCsv(text: string): {
  lines: ParsedBankLine[]
  errors: string[]
} {
  const errors: string[] = []
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (rows.length < 2) {
    return { lines: [], errors: ['ไฟล์ว่างหรือมีแค่หัวตาราง'] }
  }

  const headers = splitCsvLine(rows[0])
  const dateIdx = headerIndex(headers, ['วันที่', 'date', 'txn date'])
  const depositIdx = headerIndex(headers, ['ฝาก', 'เงินเข้า', 'credit', 'deposit', 'รับ'])
  const withdrawIdx = headerIndex(headers, ['ถอน', 'เงินออก', 'debit', 'withdraw'])
  const amountIdx = headerIndex(headers, ['จำนวน', 'amount', 'ยอด'])
  const descIdx = headerIndex(headers, ['รายการ', 'รายละเอียด', 'description', 'memo', 'หมายเหตุ'])

  if (dateIdx < 0) {
    errors.push('ไม่พบคอลัมน์วันที่ — ใช้หัวคอลัมน์ที่มีคำว่า "วันที่" หรือ "Date"')
  }

  const lines: ParsedBankLine[] = []

  for (let i = 1; i < rows.length; i++) {
    const cols = splitCsvLine(rows[i])
    const dateRaw = dateIdx >= 0 ? cols[dateIdx] : ''
    const date = parseThaiDate(dateRaw)
    if (!date) continue

    let amount: number | null = null
    if (depositIdx >= 0) {
      amount = parseAmount(cols[depositIdx] ?? '')
    }
    if (amount == null && amountIdx >= 0) {
      const w = withdrawIdx >= 0 ? parseAmount(cols[withdrawIdx] ?? '') : null
      const a = parseAmount(cols[amountIdx] ?? '')
      if (a && !w) amount = a
      else if (depositIdx < 0 && a) amount = a
    }

    if (amount == null || amount <= 0) continue

    const description = descIdx >= 0 ? cols[descIdx]?.trim() || null : cols.join(' ').trim() || null

    const descPart = (description ?? '').replace(/\s+/g, ' ').trim().slice(0, 64)
    const externalId = `csv-${date}-${amount.toFixed(2)}-${descPart || `row${i}`}`

    lines.push({
      transaction_date: date,
      amount,
      description,
      reference_text: description,
      external_id: externalId,
    })
  }

  if (lines.length === 0 && errors.length === 0) {
    errors.push('ไม่พบรายการเงินเข้า — ตรวจสอบคอลัมน์ฝาก/เงินเข้า')
  }

  return { lines, errors }
}
