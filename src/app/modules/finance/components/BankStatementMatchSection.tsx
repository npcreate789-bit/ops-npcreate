import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatThaiBaht } from '../../../../shared/payment/buildPaymentInstructionsMessage'
import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import { parseBankStatementCsv, type ParsedBankLine } from '../bank/parseBankStatementCsv'
import { invokeNotifyPaymentCustomerLine } from '../api/notifyPaymentCustomerLine'
import {
  confirmPaymentBankMatch,
  ignoreBankStatementLine,
  importBankStatementLines,
  listBankStatementQueue,
  runBankPaymentMatching,
  type BankStatementQueueItem,
} from '../api/bankStatement'
import '../finance.css'

interface CsvPreview {
  filename: string
  lines: ParsedBankLine[]
  errors: string[]
}

export function BankStatementMatchSection({ canManage }: { canManage: boolean }) {
  const [items, setItems] = useState<BankStatementQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [matching, setMatching] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [lastImportId, setLastImportId] = useState<string | null>(null)
  const [preview, setPreview] = useState<CsvPreview | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<'confirm' | 'ignore' | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    void listBankStatementQueue()
      .then(setItems)
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
        setItems([])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  async function handleCsv(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file || !canManage) return

    setFeedback(null)
    setError(null)
    try {
      const text = await file.text()
      const parsed = parseBankStatementCsv(text)
      if (parsed.errors.length > 0 && parsed.lines.length === 0) {
        setError(parsed.errors.join(' · '))
        return
      }
      setPreview({ filename: file.name, lines: parsed.lines, errors: parsed.errors })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'อ่านไฟล์ไม่สำเร็จ')
    }
  }

  async function handleConfirmImport() {
    if (!preview || !canManage) return
    setImporting(true)
    setError(null)
    setFeedback(null)
    try {
      const result = await importBankStatementLines(preview.lines, preview.filename)
      setLastImportId(result.import_id)
      const allSkipped = result.inserted === 0 && result.skipped > 0
      setFeedback(
        allSkipped
          ? `ไฟล์นี้เคยนำเข้าแล้ว — ข้าม ${result.skipped} รายการ`
          : `นำเข้า ${result.inserted} รายการ` +
              (result.skipped > 0 ? ` (ข้ามซ้ำ ${result.skipped})` : '') +
              (preview.errors.length > 0 ? ` — ${preview.errors[0]}` : ''),
      )
      if (result.inserted > 0) {
        const match = await runBankPaymentMatching(result.import_id)
        if (match.auto_confirmed > 0) {
          for (const payId of match.auto_confirmed_payment_ids) {
            void invokeNotifyPaymentCustomerLine(payId, 'payment_confirmed')
          }
          setFeedback(
            (prev) =>
              `${prev ?? ''} · ยืนยันอัตโนมัติ ${match.auto_confirmed} รายการ`,
          )
        }
      }
      setPreview(null)
      reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'นำเข้าไม่สำเร็จ')
    } finally {
      setImporting(false)
    }
  }

  async function handleRunMatch() {
    setMatching(true)
    setFeedback(null)
    try {
      const r = await runBankPaymentMatching(lastImportId ?? undefined)
      for (const payId of r.auto_confirmed_payment_ids) {
        void invokeNotifyPaymentCustomerLine(payId, 'payment_confirmed')
      }
      setFeedback(
        `แนะนำจับคู่ ${r.suggested} รายการ` +
          (r.auto_confirmed > 0 ? ` · auto-confirm ${r.auto_confirmed}` : ''),
      )
      reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'จับคู่ไม่สำเร็จ')
    } finally {
      setMatching(false)
    }
  }

  async function handleConfirm(item: BankStatementQueueItem) {
    const payId = item.suggested_match?.payment_id
    if (!payId || busyId) return
    setBusyId(item.id)
    setBusyAction('confirm')
    setFeedback(null)
    setError(null)
    try {
      await confirmPaymentBankMatch(item.id, payId)
      void invokeNotifyPaymentCustomerLine(payId, 'payment_confirmed')
      setFeedback('ยืนยันจากรายการธนาคารแล้ว')
      reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ยืนยันไม่สำเร็จ')
    } finally {
      setBusyId(null)
      setBusyAction(null)
    }
  }

  async function handleIgnore(item: BankStatementQueueItem) {
    if (busyId) return
    setBusyId(item.id)
    setBusyAction('ignore')
    setError(null)
    try {
      await ignoreBankStatementLine(item.id)
      reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ข้ามไม่สำเร็จ')
    } finally {
      setBusyId(null)
      setBusyAction(null)
    }
  }

  if (!canManage) return null

  const previewTotal =
    preview?.lines.reduce((sum, l) => sum + (l.amount || 0), 0) ?? 0
  const previewSample = preview?.lines.slice(0, 5) ?? []

  return (
    <section className="card card--wide finance-bank-match no-print">
      <header className="finance-bank-match__head">
        <div>
          <h2>จับคู่รายการเข้าบัญชี</h2>
          <p className="muted finance-bank-match__intro">
            นำเข้า CSV จาก KBank / statement แล้วจับคู่กับใบที่รอชำระ — หรือรับ webhook จากธนาคารในอนาคต
          </p>
        </div>
      </header>

      <div className="finance-bank-match__tools">
        <label className="crm-btn crm-btn--ghost">
          {importing ? 'กำลังนำเข้า…' : 'นำเข้า CSV'}
          <input
            type="file"
            accept=".csv,.txt,text/csv"
            className="finance-bank-match__file-input"
            disabled={importing || preview !== null}
            onChange={(e) => void handleCsv(e)}
          />
        </label>
        <button
          type="button"
          className="crm-btn crm-btn--ghost"
          disabled={matching || loading}
          onClick={() => void handleRunMatch()}
        >
          {matching ? 'กำลังจับคู่…' : 'รันจับคู่อีกครั้ง'}
        </button>
      </div>

      {preview ? (
        <div className="finance-bank-match__preview" role="dialog" aria-label="ตรวจก่อนนำเข้า">
          <h3 className="finance-bank-match__preview-title">
            ตรวจก่อนนำเข้า — {preview.filename}
          </h3>
          <p className="muted">
            พบ {preview.lines.length} รายการ · ยอดรวม {formatThaiBaht(previewTotal)}
          </p>
          {preview.errors.length > 0 ? (
            <p className="crm-error finance-bank-match__preview-warn">
              ⚠ {preview.errors.join(' · ')}
            </p>
          ) : null}
          {previewSample.length > 0 ? (
            <table className="finance-bank-match__preview-table">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>ยอด</th>
                  <th>รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {previewSample.map((l, idx) => (
                  <tr key={idx}>
                    <td>{formatBangkokDate(l.transaction_date)}</td>
                    <td>+{formatThaiBaht(l.amount)}</td>
                    <td className="muted">{l.description ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {preview.lines.length > previewSample.length ? (
            <p className="muted">…และอีก {preview.lines.length - previewSample.length} รายการ</p>
          ) : null}
          <div className="finance-bank-match__preview-actions">
            <button
              type="button"
              className="crm-btn crm-btn--primary"
              disabled={importing || preview.lines.length === 0}
              onClick={() => void handleConfirmImport()}
            >
              {importing ? 'กำลังนำเข้า…' : `ยืนยันนำเข้า ${preview.lines.length} รายการ`}
            </button>
            <button
              type="button"
              className="crm-btn crm-btn--ghost"
              disabled={importing}
              onClick={() => setPreview(null)}
            >
              ยกเลิก
            </button>
          </div>
        </div>
      ) : null}

      {feedback ? <p className="crm-banner crm-banner--ok">{feedback}</p> : null}
      {error ? <p className="crm-error">{error}</p> : null}

      {loading ? <p className="muted">กำลังโหลดคิว…</p> : null}

      {!loading && items.length === 0 ? (
        <p className="muted">ไม่มีรายการธนาคารรอจับคู่</p>
      ) : null}

      {!loading && items.length > 0 ? (
        <ul className="finance-bank-match__list">
          {items.map((item) => {
            const sug = item.suggested_match
            const conf =
              sug?.confidence != null ? Math.round(sug.confidence * 100) : null
            return (
              <li key={item.id} className="finance-bank-match__item">
                <div className="finance-bank-match__main">
                  <p className="finance-bank-match__amount">
                    +{formatThaiBaht(item.amount)}
                  </p>
                  <p className="muted">
                    {formatBangkokDate(item.transaction_date)}
                    {item.description ? ` · ${item.description}` : ''}
                  </p>
                  {item.match_notes ? (
                    <p className="finance-bank-match__hint">{item.match_notes}</p>
                  ) : null}
                  {sug ? (
                    <p className="finance-bank-match__suggest">
                      แนะนำ: {sug.quotation_number ?? 'รายการชำระ'}
                      {conf != null ? ` (${conf}%)` : ''}
                    </p>
                  ) : (
                    <p className="muted">ยังไม่พบรายการชำระที่ตรงยอด</p>
                  )}
                </div>
                <div className="finance-bank-match__actions">
                  {sug ? (
                    <button
                      type="button"
                      className="crm-btn crm-btn--primary"
                      disabled={busyId !== null}
                      onClick={() => void handleConfirm(item)}
                    >
                      {busyId === item.id && busyAction === 'confirm'
                        ? 'กำลังยืนยัน…'
                        : 'ยืนยันจับคู่'}
                    </button>
                  ) : null}
                  {sug ? (
                    <Link
                      to={`/app/finance/payments/${sug.payment_id}`}
                      className="crm-btn crm-btn--ghost"
                    >
                      เปิดรายการ
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className="crm-btn crm-btn--ghost"
                    disabled={busyId !== null}
                    onClick={() => void handleIgnore(item)}
                  >
                    {busyId === item.id && busyAction === 'ignore'
                      ? 'กำลังข้าม…'
                      : 'ข้าม'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
