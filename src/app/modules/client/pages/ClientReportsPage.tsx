import { Link } from 'react-router-dom'
import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import { ClientPreviewBar } from '../components/ClientPreviewBar'
import { useClientWorkspace } from '../hooks/useClientWorkspace'
import '../../crm/crm.css'
import '../../phase2/phase2.css'
import '../client.css'

function formatMoney(n: number) {
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
}

export function ClientReportsPage() {
  const ws = useClientWorkspace()

  if (ws.loading) return <p className="muted">กำลังโหลดรายงาน...</p>

  if (!ws.data) {
    return (
      <div className="page">
        <h1>รายงาน</h1>
        <ClientPreviewBar
          configured={ws.configured}
          canPreview={ws.canPreview}
          customers={ws.customers}
          previewId={ws.previewId}
          onPreviewChange={ws.setPreviewId}
          data={null}
          error={ws.error}
          isClientOnly={ws.isClientOnly}
        />
      </div>
    )
  }

  const { ads_summary } = ws.data

  return (
    <div className="page">
      <header className="page__header">
        <h1>รายงานผล</h1>
        <p className="muted">ดึงจากข้อมูลแอดเดียวกับที่ทีมบันทึก</p>
      </header>

      <ClientPreviewBar
        configured={ws.configured}
        canPreview={ws.canPreview}
        customers={ws.customers}
        previewId={ws.previewId}
        onPreviewChange={ws.setPreviewId}
        data={ws.data}
        error={ws.error}
        isClientOnly={ws.isClientOnly}
      />

      <section className="card card--wide">
        <h2>สรุป 7 วันล่าสุด</h2>
        <p className="muted">รายงานล่าสุด: {formatBangkokDate(ads_summary.latest_report_date)}</p>
        <div className="client-metrics">
          <div className="client-metric">
            <span className="muted">Spend</span>
            <strong>{formatMoney(ads_summary.last_7_days_spend)}</strong>
          </div>
          <div className="client-metric">
            <span className="muted">GMV</span>
            <strong>{formatMoney(ads_summary.last_7_days_gmv)}</strong>
          </div>
          <div className="client-metric">
            <span className="muted">ROI</span>
            <strong>
              {ads_summary.last_7_days_roi != null
                ? ads_summary.last_7_days_roi.toFixed(2)
                : '—'}
            </strong>
          </div>
        </div>
        <p className="muted" style={{ marginTop: '1rem' }}>
          รายงานรายเดือนและ PDF — <Link to="/app/reports">โมดูลรายงานขั้นสูง</Link> (ทีมงาน)
        </p>
      </section>
    </div>
  )
}
