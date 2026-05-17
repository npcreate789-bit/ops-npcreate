import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import { DocumentLetterhead } from '../../../../shared/documents/DocumentLetterhead'
import { clientAdsMonthLabel, type ClientMonthlyAdsReport } from '../api/clientAdsReport'
import '../../../../shared/documents/document-letterhead.css'
import '../client.css'

function money(n: number) {
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
}

interface ClientMonthlyAdsPrintDocumentProps {
  report: ClientMonthlyAdsReport
}

export function ClientMonthlyAdsPrintDocument({ report }: ClientMonthlyAdsPrintDocumentProps) {
  return (
    <article className="client-ads-report-doc">
      <DocumentLetterhead />

      <div className="client-ads-report-doc__title-block">
        <h2 className="client-ads-report-doc__title">รายงานผลการยิงแอดรายเดือน</h2>
        <p className="client-ads-report-doc__subtitle">
          {report.brand_name} — {clientAdsMonthLabel(report.month)}
        </p>
      </div>

      <dl className="client-ads-report-doc__summary">
        <div>
          <dt>Spend รวม</dt>
          <dd>{money(report.totals.spend)} บาท</dd>
        </div>
        <div>
          <dt>GMV รวม</dt>
          <dd>{money(report.totals.gmv)} บาท</dd>
        </div>
        <div>
          <dt>ออเดอร์รวม</dt>
          <dd>{report.totals.orders.toLocaleString('th-TH')}</dd>
        </div>
        <div>
          <dt>ROI เฉลี่ย</dt>
          <dd>{report.totals.roi != null ? report.totals.roi.toFixed(2) : '—'}</dd>
        </div>
        <div>
          <dt>วันที่มีรายงาน</dt>
          <dd>
            {report.submitted_days} / {report.days_in_month} วัน
          </dd>
        </div>
      </dl>

      {report.days.length > 0 ? (
        <table className="client-ads-report-doc__table">
          <thead>
            <tr>
              <th scope="col">วันที่</th>
              <th scope="col" className="client-ads-report-doc__num">
                Spend
              </th>
              <th scope="col" className="client-ads-report-doc__num">
                GMV
              </th>
              <th scope="col" className="client-ads-report-doc__num">
                ออเดอร์
              </th>
              <th scope="col" className="client-ads-report-doc__num">
                ROI
              </th>
            </tr>
          </thead>
          <tbody>
            {report.days.map((row) => (
              <tr key={row.report_date}>
                <td>{formatBangkokDate(row.report_date)}</td>
                <td className="client-ads-report-doc__num">{money(row.spend)}</td>
                <td className="client-ads-report-doc__num">{money(row.gmv)}</td>
                <td className="client-ads-report-doc__num">{row.orders}</td>
                <td className="client-ads-report-doc__num">
                  {row.roi != null ? row.roi.toFixed(2) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">ยังไม่มีข้อมูลรายวันในเดือนนี้</p>
      )}

      <p className="client-ads-report-doc__footer muted">
        รายงานจาก NP Create OS — ข้อมูลที่ทีมบันทึกในระบบ Ads Operations
      </p>
    </article>
  )
}
