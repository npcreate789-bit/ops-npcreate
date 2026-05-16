import { COMPANY_LEGAL_NAME, COMPANY_TAX_ID } from '../../../../shared/company/companyProfile'
import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import { DocumentLetterhead } from '../../../../shared/documents/DocumentLetterhead'
import { paymentStatusLabel, serviceTypeLabel } from '../constants'
import type { Payment } from '../types'
import '../../../../shared/documents/document-letterhead.css'
import '../../sales/sales.css'

export type FinanceDocumentKind = 'receipt' | 'tax_invoice'

const TITLES: Record<FinanceDocumentKind, string> = {
  receipt: 'ใบเสร็จรับเงิน',
  tax_invoice: 'ใบกำกับภาษี',
}

interface FinancePrintDocumentProps {
  payment: Payment
  kind: FinanceDocumentKind
  className?: string
}

function money(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2 })
}

function vatRatePercent(payment: Payment): number {
  if (payment.amount <= 0) return 7
  return Math.round((payment.vat_amount / payment.amount) * 10000) / 100
}

export function FinancePrintDocument({ payment, kind, className = '' }: FinancePrintDocumentProps) {
  const docNo =
    kind === 'receipt' ? payment.receipt_number : payment.tax_invoice_number
  const issued = payment.payment_date
    ? formatBangkokDate(payment.payment_date)
    : payment.created_at
      ? formatBangkokDate(payment.created_at.slice(0, 10))
      : '—'
  const vatRate = vatRatePercent(payment)
  const customerName = payment.customer_brand_name ?? '—'

  return (
    <article
      className={`qt-document finance-print-target finance-print-target--${kind}${className ? ` ${className}` : ''}`}
    >
      <DocumentLetterhead />

      <div className="qt-document__title-block">
        <h2 className="qt-document__title">{TITLES[kind]}</h2>
        <p className="qt-document__doc-no">
          เลขที่ <strong>{docNo ?? '—'}</strong>
        </p>
        {kind === 'tax_invoice' && (
          <p className="qt-document__doc-sub muted">ต้นฉบับ / สำเนา</p>
        )}
      </div>

      <div className="finance-doc__parties">
        <section className="finance-doc__party">
          <h3>ผู้ขาย</h3>
          <p>
            <strong>{COMPANY_LEGAL_NAME}</strong>
          </p>
          <p className="muted">เลขประจำตัวผู้เสียภาษี {COMPANY_TAX_ID}</p>
        </section>
        <section className="finance-doc__party">
          <h3>ผู้ซื้อ / ลูกค้า</h3>
          <p>
            <strong>{customerName}</strong>
          </p>
          {kind === 'tax_invoice' && (
            <p className="muted">ออกในนามลูกค้าตามที่บันทึกในระบบ</p>
          )}
        </section>
      </div>

      <dl className="qt-document__info">
        <div>
          <dt>วันที่ออกเอกสาร</dt>
          <dd>{issued}</dd>
        </div>
        <div>
          <dt>วิธีชำระ</dt>
          <dd>{paymentStatusLabel(payment.status)}</dd>
        </div>
        {payment.quotation_id && (
          <div>
            <dt>อ้างอิงใบเสนอราคา</dt>
            <dd>มีการเชื่อมโยงในระบบ</dd>
          </div>
        )}
      </dl>

      <table className="qt-document__table">
        <thead>
          <tr>
            <th scope="col">ลำดับ</th>
            <th scope="col">รายการ</th>
            <th scope="col" className="qt-document__num">
              จำนวนเงิน (บาท)
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>{serviceTypeLabel(payment.service_type)}</td>
            <td className="qt-document__num">{money(payment.amount)}</td>
          </tr>
        </tbody>
      </table>

      <dl className="qt-document__totals">
        <div>
          <dt>มูลค่าสินค้า/บริการ (ไม่รวม VAT)</dt>
          <dd>{money(payment.amount)}</dd>
        </div>
        <div>
          <dt>ภาษีมูลค่าเพิ่ม ({vatRate}%)</dt>
          <dd>{money(payment.vat_amount)}</dd>
        </div>
        <div className="qt-document__totals-grand">
          <dt>จำนวนเงินทั้งสิ้น</dt>
          <dd>{money(payment.total_amount)} บาท</dd>
        </div>
      </dl>

      {payment.notes ? (
        <section className="qt-document__terms">
          <h3>หมายเหตุ</h3>
          <p>{payment.notes}</p>
        </section>
      ) : null}

      {kind === 'receipt' && (
        <section className="qt-document__terms finance-doc__sign">
          <p>ได้รับเงินจำนวนดังกล่าวถูกต้องแล้ว</p>
          <div className="finance-doc__sign-line">
            <span>ผู้รับเงิน</span>
            <span className="finance-doc__sign-space" />
            <span>วันที่ ........../........../..........</span>
          </div>
        </section>
      )}

      {kind === 'tax_invoice' && (
        <section className="qt-document__terms finance-doc__sign">
          <p className="muted">
            ใบกำกับภาษีฉบับนี้ออกตามความจริง — กรุณาตรวจสอบข้อมูลก่อนนำไปใช้ทางภาษี
          </p>
        </section>
      )}

      <footer className="qt-document__footer">
        <p>เอกสารนี้ออกโดยระบบ NP Create Operating System</p>
        <p className="qt-document__footer-legal">{COMPANY_LEGAL_NAME}</p>
      </footer>
    </article>
  )
}
