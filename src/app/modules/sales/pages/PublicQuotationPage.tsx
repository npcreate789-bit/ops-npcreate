import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  COMPANY_BRAND_NAME,
  COMPANY_ICON_SRC,
} from '../../../../shared/company/companyProfile'
import { formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import { QuotationPrintDocument } from '../components/QuotationPrintDocument'
import {
  acceptPublicQuotation,
  fetchPublicQuotation,
  markPublicQuotationViewed,
  publicQuotationToPrintModel,
} from '../api/publicQuotation'
import type { PublicQuotation } from '../types'
import '../public-quotation.css'
import '../sales.css'

export function PublicQuotationPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<PublicQuotation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acceptName, setAcceptName] = useState('')
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setError('ลิงก์ไม่ถูกต้อง')
      return
    }

    let cancelled = false

    const linkToken = token

    async function load() {
      try {
        const viewed = await markPublicQuotationViewed(linkToken)
        if (!cancelled) {
          if (viewed) {
            setData(viewed)
            if (viewed.status === 'accepted') setAccepted(true)
          } else {
            const fallback = await fetchPublicQuotation(linkToken)
            if (!fallback) setError('ไม่พบใบเสนอราคาหรือลิงก์หมดอายุ')
            else setData(fallback)
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [token])

  async function handleAccept(e: FormEvent) {
    e.preventDefault()
    if (!token || !data?.can_accept) return
    setAccepting(true)
    setAcceptError(null)
    try {
      const result = await acceptPublicQuotation(token, acceptName.trim() || undefined)
      if (!result) {
        setAcceptError('ไม่สามารถยอมรับใบเสนอราคาได้')
        return
      }
      setData(result)
      setAccepted(true)
    } catch (err) {
      setAcceptError(err instanceof Error ? err.message : 'ยอมรับไม่สำเร็จ')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="public-qt-page">
      <div className="public-qt-page__bg" aria-hidden />
      <header className="public-qt-page__header">
        <img src={COMPANY_ICON_SRC} alt="" className="public-qt-page__logo" width={48} height={48} />
        <div>
          <p className="public-qt-page__brand">{COMPANY_BRAND_NAME}</p>
          <p className="muted">ใบเสนอราคาออนไลน์</p>
        </div>
      </header>

      <main className="public-qt-page__main">
        {loading && <p className="muted">กำลังโหลดใบเสนอราคา...</p>}

        {!loading && error && (
          <section className="public-qt-card public-qt-card--error">
            <h1>ไม่พบเอกสาร</h1>
            <p>{error}</p>
            <Link to="/contact" className="crm-btn">
              ติดต่อทีมงาน
            </Link>
          </section>
        )}

        {!loading && data && (
          <>
            {accepted || data.status === 'accepted' ? (
              <section className="public-qt-banner public-qt-banner--success">
                <h2>ขอบคุณที่ยอมรับใบเสนอราคา</h2>
                <p>
                  เลขที่ {data.quotation_number} — ทีม Sales จะติดต่อเรื่องชำระเงินและเริ่มงานต่อไป
                </p>
                {data.accepted_at && (
                  <p className="muted">ยืนยันเมื่อ {formatBangkokDateTime(data.accepted_at)}</p>
                )}
              </section>
            ) : data.can_accept ? (
              <section className="public-qt-card public-qt-card--accept">
                <h2>ยอมรับใบเสนอราคา</h2>
                <p className="muted">
                  กรุณาตรวจสอบรายการด้านล่าง หากตกลงตามเงื่อนไข กดยืนยันเพื่อแจ้งทีมงาน
                </p>
                <form className="public-qt-accept-form" onSubmit={(e) => void handleAccept(e)}>
                  <label className="public-qt-field">
                    <span>ชื่อผู้ยืนยัน (ไม่บังคับ)</span>
                    <input
                      type="text"
                      value={acceptName}
                      onChange={(ev) => setAcceptName(ev.target.value)}
                      placeholder="ชื่อ-นามสกุล หรือชื่อแบรนด์"
                      autoComplete="name"
                    />
                  </label>
                  {acceptError && <p className="crm-error">{acceptError}</p>}
                  <button
                    type="submit"
                    className="crm-btn crm-btn--primary"
                    disabled={accepting}
                  >
                    {accepting ? 'กำลังบันทึก...' : 'ยอมรับใบเสนอราคา'}
                  </button>
                </form>
              </section>
            ) : (
              <section className="public-qt-banner">
                <p className="muted">ใบเสนอราคานี้อยู่ในขั้นตอนถัดไปแล้ว — หากมีคำถามติดต่อทีมงาน</p>
              </section>
            )}

            <section className="public-qt-document-wrap card card--wide">
              <QuotationPrintDocument
                quotation={publicQuotationToPrintModel(data)}
                brandName={data.brand_name}
                audience="public"
              />
            </section>
          </>
        )}
      </main>

      <footer className="public-qt-page__footer muted">
        <Link to="/contact">ติดต่อ NP Create</Link>
      </footer>
    </div>
  )
}
