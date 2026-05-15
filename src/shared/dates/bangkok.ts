export const BANGKOK_TZ = 'Asia/Bangkok'

/** วันที่ปฏิทิน Asia/Bangkok (YYYY-MM-DD) */
export function bangkokTodayIsoDate(base = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGKOK_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(base)
}

/** คำนำหน้า YYYY-MM สำหรับกรองรายรับรายเดือน */
export function bangkokYearMonthPrefix(base = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGKOK_TZ,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(base)
  const year = parts.find((p) => p.type === 'year')?.value ?? ''
  const month = parts.find((p) => p.type === 'month')?.value ?? ''
  return `${year}-${month}`
}

/** แสดงวันที่ (DATE / ISO) แบบไทย */
export function formatBangkokDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—'
  const d = isoDate.length <= 10 ? new Date(`${isoDate}T12:00:00+07:00`) : new Date(isoDate)
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: BANGKOK_TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

/** แสดงวันเวลา Asia/Bangkok */
export function formatBangkokDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: BANGKOK_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

/** ค่า input[type=datetime-local] จาก ISO (ตีความเป็นเวลาไทย) */
export function isoToDatetimeLocalBangkok(iso: string | null | undefined): string {
  if (!iso) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGKOK_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso))
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

/** บันทึก datetime-local เป็น ISO (ถือว่าเป็นเวลา Asia/Bangkok) */
export function datetimeLocalBangkokToIso(local: string): string | null {
  if (!local.trim()) return null
  return new Date(`${local}:00+07:00`).toISOString()
}

/** วันจันทร์ของสัปดาห์ปัจจุบัน (YYYY-MM-DD, Asia/Bangkok) */
export function bangkokWeekStartIso(base = new Date()): string {
  let cursor = new Date(`${bangkokTodayIsoDate(base)}T12:00:00+07:00`)
  for (let i = 0; i < 7; i++) {
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: BANGKOK_TZ,
      weekday: 'short',
    }).format(cursor)
    if (weekday === 'Mon') return bangkokTodayIsoDate(cursor)
    cursor = new Date(cursor.getTime() - 86_400_000)
  }
  return bangkokTodayIsoDate(cursor)
}
