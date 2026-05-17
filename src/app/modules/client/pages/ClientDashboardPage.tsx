import { Link } from 'react-router-dom'
import { formatBangkokDate, formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import { ClientAiPanel } from '../components/ClientAiPanel'
import { ClientPreviewBar } from '../components/ClientPreviewBar'
import { useClientWorkspace } from '../hooks/useClientWorkspace'
import '../../crm/crm.css'
import '../../phase2/phase2.css'
import '../client.css'
import '../client-workspace.css'

function formatMoney(n: number) {
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
}

export function ClientDashboardPage() {
  const ws = useClientWorkspace()

  if (ws.loading) {
    return (
      <div className="page">
        <p className="muted">กำลังโหลด...</p>
      </div>
    )
  }

  if (!ws.data) {
    return (
      <div className="page">
        <header className="page__header client-hero">
          <h1>Client Workspace</h1>
          <p className="muted">ภาพรวมงานและสิ่งที่ต้องทำ</p>
        </header>
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

  const { customer, onboarding_progress, ads_summary, delivered_content } = ws.data

  return (
    <div className="page">
      <header className="page__header client-hero">
        <div>
          <p className="muted">Client Workspace</p>
          <h1>{customer.brand_name}</h1>
          <p className="muted">
            สัญญาถึง {formatBangkokDate(customer.contract_end)} · {customer.status}
            {customer.ready_for_ads ? ' · พร้อมยิงแอด' : ''}
          </p>
        </div>
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

      <section className="card-grid">
        <article className="card">
          <h2>ความคืบหน้าบรีฟ</h2>
          <p className="stat">{onboarding_progress}%</p>
          <div className="phase2-progress" aria-hidden>
            <div
              className="phase2-progress__bar"
              style={{ width: `${Math.min(100, onboarding_progress)}%` }}
            />
          </div>
          <p className="muted" style={{ marginTop: '0.75rem' }}>
            <Link to="/app/client/brief">กรอก / แก้บรีฟ</Link>
          </p>
        </article>
        <article className="card">
          <h2>Spend 7 วัน</h2>
          <p className="stat">{formatMoney(ads_summary.last_7_days_spend)}</p>
        </article>
        <article className="card">
          <h2>GMV 7 วัน</h2>
          <p className="stat">{formatMoney(ads_summary.last_7_days_gmv)}</p>
        </article>
        <article className="card">
          <h2>ROI 7 วัน</h2>
          <p className="stat">
            {ads_summary.last_7_days_roi != null
              ? ads_summary.last_7_days_roi.toFixed(2)
              : '—'}
          </p>
        </article>
      </section>

      <section className="card card--wide">
        <h2>สิ่งที่ควรทำ</h2>
        <ul className="client-content-list">
          {onboarding_progress < 100 && (
            <li>
              กรอกบรีฟให้ครบ — <Link to="/app/client/brief">ไปที่ฟอร์มบรีฟ</Link>
            </li>
          )}
          <li>
            ดูรายงานล่าสุด — <Link to="/app/client/reports">เปิดรายงาน</Link>
          </li>
          <li>
            แชทกับทีม — <Link to="/app/client/chat">เปิดแชท</Link> (เร็ว ๆ นี้)
          </li>
        </ul>
      </section>

      <section className="card card--wide">
        <h2>คอนเทนต์ที่ส่งมอบแล้ว</h2>
        {delivered_content.length === 0 && <p className="muted">ยังไม่มีไฟล์ส่งมอบ</p>}
        <ul className="client-content-list">
          {delivered_content.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong>
              <span className="muted"> · {item.format}</span>
              <br />
              <small className="muted">{formatBangkokDateTime(item.delivered_at)}</small>
            </li>
          ))}
        </ul>
      </section>

      <ClientAiPanel report={ws.data} />
    </div>
  )
}
