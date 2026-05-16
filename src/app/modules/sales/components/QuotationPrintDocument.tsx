import { COMPANY_LEGAL_NAME } from '../../../../shared/company/companyProfile'
import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import { DocumentLetterhead } from '../../../../shared/documents/DocumentLetterhead'
import { quotationStatusLabel } from '../constants'
import type { Quotation } from '../types'
import '../../../../shared/documents/document-letterhead.css'
import '../sales.css'

interface QuotationPrintDocumentProps {
  quotation: Quotation
  brandName: string | null
}

function money(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2 })
}

export function QuotationPrintDocument({ quotation, brandName }: QuotationPrintDocumentProps) {
  const issued = quotation.created_at ? formatBangkokDate(quotation.created_at.slice(0, 10)) : '—'

  return (
    <article className="qt-document">
      <DocumentLetterhead />

      <div className="qt-document__title-block">
        <h2 className="qt-document__title">ใบเสนอราคา</h2>
        <p className="qt-document__doc-no">
          เลขที่ <strong>{quotation.quotation_number}</strong>
        </p>
      </div>

      <dl className="qt-document__info">
        <div>
          <dt>ลูกค้า / แบรนด์</dt>
          <dd>{brandName ?? '—'}</dd>
        </div>
        <div>
          <dt>วันที่ออกเอกสาร</dt>
          <dd>{issued}</dd>
        </div>
        <div>
          <dt>ระยะสัญญา</dt>
          <dd>{quotation.contract_months ? `${quotation.contract_months} เดือน` : '—'}</dd>
        </div>
        <div>
          <dt>สถานะ</dt>
          <dd>{quotationStatusLabel(quotation.status)}</dd>
        </div>
      </dl>

      <table className="qt-document__table">
        <thead>
          <tr>
            <th scope="col">ลำดับ</th>
            <th scope="col">รายการ</th>
            <th scope="col" className="qt-document__num">
              จำนวน
            </th>
            <th scope="col" className="qt-document__num">
              ราคา/หน่วย (บาท)
            </th>
            <th scope="col" className="qt-document__num">
              จำนวนเงิน (บาท)
            </th>
          </tr>
        </thead>
        <tbody>
          {(quotation.items ?? []).map((item, index) => (
            <tr key={item.id}>
              <td>{index + 1}</td>
              <td>{item.description}</td>
              <td className="qt-document__num">{item.quantity}</td>
              <td className="qt-document__num">{money(item.unit_price)}</td>
              <td className="qt-document__num">{money(item.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="qt-document__totals">
        <div>
          <dt>ยอดรวมก่อนส่วนลด</dt>
          <dd>{money(quotation.subtotal)}</dd>
        </div>
        {quotation.discount > 0 && (
          <div>
            <dt>ส่วนลด</dt>
            <dd>-{money(quotation.discount)}</dd>
          </div>
        )}
        <div>
          <dt>ภาษีมูลค่าเพิ่ม ({quotation.vat_rate}%)</dt>
          <dd>{money(quotation.vat_amount)}</dd>
        </div>
        <div className="qt-document__totals-grand">
          <dt>รวมทั้งสิ้น</dt>
          <dd>{money(quotation.total)} บาท</dd>
        </div>
      </dl>

      {quotation.terms ? (
        <section className="qt-document__terms">
          <h3>เงื่อนไขและข้อตกลง</h3>
          <p>{quotation.terms}</p>
        </section>
      ) : null}

      {quotation.notes ? (
        <section className="qt-document__terms">
          <h3>หมายเหตุ</h3>
          <p>{quotation.notes}</p>
        </section>
      ) : null}

      <footer className="qt-document__footer">
        <p>เอกสารนี้ออกโดยระบบ NP Create Operating System</p>
        <p className="qt-document__footer-legal">{COMPANY_LEGAL_NAME}</p>
      </footer>
    </article>
  )
}
