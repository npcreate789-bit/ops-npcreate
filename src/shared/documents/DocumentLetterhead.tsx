import {
  COMPANY_BRAND_NAME_EN,
  COMPANY_LEGAL_NAME,
  COMPANY_LOGO_SRC,
  COMPANY_REGISTERED_ADDRESS,
  COMPANY_TAGLINE_EN,
  COMPANY_TAX_ID,
} from '../company/companyProfile'
import './document-letterhead.css'

interface DocumentLetterheadProps {
  className?: string
}

/** หัวเอกสารมาตรฐาน — โลโก้และข้อมูลบริษัท */
export function DocumentLetterhead({ className = '' }: DocumentLetterheadProps) {
  return (
    <header className={`doc-letterhead${className ? ` ${className}` : ''}`}>
      <div className="doc-letterhead__row">
        <img
          className="doc-letterhead__logo"
          src={COMPANY_LOGO_SRC}
          alt={COMPANY_BRAND_NAME_EN}
          width={88}
          height={88}
        />
        <div className="doc-letterhead__titles">
          <p className="doc-letterhead__brand-en">{COMPANY_BRAND_NAME_EN}</p>
          <p className="doc-letterhead__legal">{COMPANY_LEGAL_NAME}</p>
          <p className="doc-letterhead__tagline">{COMPANY_TAGLINE_EN}</p>
        </div>
      </div>
      <dl className="doc-letterhead__meta">
        <div className="doc-letterhead__meta-row">
          <dt>สถานที่ตั้งสำนักงานใหญ่</dt>
          <dd>{COMPANY_REGISTERED_ADDRESS}</dd>
        </div>
        <div className="doc-letterhead__meta-row">
          <dt>เลขที่ผู้เสียภาษี</dt>
          <dd className="doc-letterhead__tax">{COMPANY_TAX_ID}</dd>
        </div>
      </dl>
    </header>
  )
}
