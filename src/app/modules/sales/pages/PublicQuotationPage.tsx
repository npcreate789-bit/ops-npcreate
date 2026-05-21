import { useEffect, useMemo, useState, type FormEvent } from 'react'
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
import { PaymentInstructionsCard } from '../components/PaymentInstructionsCard'
import { PublicPaymentSlipUpload } from '../components/PublicPaymentSlipUpload'
import { PublicPaymentStatusCard } from '../components/PublicPaymentStatusCard'
import { PublicQuotationProgressStepper } from '../components/PublicQuotationProgressStepper'
import { usePublicQuotationPoll } from '../hooks/usePublicQuotationPoll'
import { fetchCompanyPaymentSettings } from '../../../../shared/payment/companyPaymentSettings'
import { showPublicProgressStepper } from '../publicPaymentFlow'
import {
  formatPublicItemsSummary,
  showPublicAcceptedPendingInstructions,
  showPublicPaidConfirmation,
  showPublicPaymentInstructions,
} from '../publicQuotationPayment'
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
  const showPayment = data != null && showPublicPaymentInstructions(data.status)
  const showAcceptedPending =
    data != null && showPublicAcceptedPendingInstructions(data.status)
  const showPaid = data != null && showPublicPaidConfirmation(data.status)
  const itemsSummary = useMemo(
    () => (data ? formatPublicItemsSummary(data.items) : null),
    [data],
  )

  usePublicQuotationPoll(token, data, setData)

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
        await fetchCompanyPaymentSettings()
        const viewed = await markPublicQuotationViewed(linkToken)
        if (!cancelled) {
          if (viewed) {
            setData(viewed)
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

        {!loading && data && showPublicProgressStepper(data) ? (
          <PublicQuotationProgressStepper data={data} />
        ) : null}

        {!loading && data && (
          <>
            {showAcceptedPending ? (
              <section className="public-qt-banner public-qt-banner--success">
                <h2>ขอบคุณที่ยอมรับใบเสนอราคา</h2>
                <p>
                  เลขที่ {data.quotation_number}
                  {data.brand_name ? ` · ${data.brand_name}` : ''}
                </p>
                {data.accepted_at ? (
                  <p className="muted">ยืนยันเมื่อ {formatBangkokDateTime(data.accepted_at)}</p>
                ) : null}
                <p className="public-qt-card__lead" style={{ marginTop: '0.75rem' }}>
                  ทีมงานจะส่งเลขบัญชีและ QR ชำระเงินให้ทาง LINE หรือช่องทางที่ติดต่อ — กรุณารอสักครู่
                </p>
              </section>
            ) : null}

            {showPayment ? (
              <>
                <section className="public-qt-banner public-qt-banner--success">
                  <h2>ชำระเงินตามใบเสนอราคา</h2>
                  <p>
                    เลขที่ {data.quotation_number}
                    {data.brand_name ? ` · ${data.brand_name}` : ''}
                  </p>
                </section>
                <section
                  className="public-qt-card public-qt-card--payment"
                  aria-labelledby="public-qt-payment-heading"
                >
                  <h2 id="public-qt-payment-heading">ชำระเงิน</h2>
                  <p className="muted public-qt-card__lead">
                    โอนตามยอดด้านล่าง หรือสแกน QR แล้วอัปโหลดสลิป — ทีมงานจะยืนยันเมื่อตรวจสอบแล้ว
                  </p>
                  <PaymentInstructionsCard
                    variant="public"
                    brandName={data.brand_name?.trim() || 'ลูกค้า'}
                    quotationNumber={data.quotation_number}
                    total={data.total}
                    itemsSummary={itemsSummary}
                    contractMonths={data.contract_months}
                  />
                  <PublicPaymentStatusCard data={data} />
                  {data.can_upload_slip && token ? (
                    <PublicPaymentSlipUpload
                      token={token}
                      onSubmitted={() => {
                        void fetchPublicQuotation(token).then((next) => {
                          if (next) setData(next)
                        })
                      }}
                    />
                  ) : null}
                </section>
              </>
            ) : showPaid ? (
              <section className="public-qt-banner public-qt-banner--success">
                <h2>รับชำระเงินแล้ว</h2>
                <p>
                  เลขที่ {data.quotation_number}
                  {data.brand_name ? ` · ${data.brand_name}` : ''}
                </p>
                {data.paid_at ? (
                  <p className="muted">ยืนยันการชำระเมื่อ {formatBangkokDateTime(data.paid_at)}</p>
                ) : null}
                <p className="public-qt-card__lead" style={{ marginTop: '0.75rem' }}>
                  ขอบคุณที่ชำระเงิน — ทีมงานจะติดต่อขั้นตอนถัดไป (รับบรีฟ / เริ่มงาน) ผ่าน LINE หรือช่องทางที่คุณใช้ติดต่อเรา
                </p>
                <div
                  className="public-qt-banner__actions"
                  style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '1rem' }}
                >
                  <Link to="/client/login" className="crm-btn crm-btn--primary">
                    เข้าพื้นที่ลูกค้า
                  </Link>
                  <Link to="/contact" className="crm-btn">
                    ติดต่อทีมงาน
                  </Link>
                </div>
                <p className="muted" style={{ marginTop: '0.55rem', fontSize: '0.78rem' }}>
                  หากยังไม่ได้รับบัญชีพื้นที่ลูกค้า ทีมงานจะส่งรหัสเข้าใช้งานทาง LINE หลังเปิดใช้งานสัญญา
                </p>
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

            <section className="public-qt-document-wrap">
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
