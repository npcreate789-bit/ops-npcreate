import { Link } from 'react-router-dom'
import { formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import { ClientAiPanel } from '../components/ClientAiPanel'
import { useClientWorkspaceContext } from '../context/ClientWorkspaceContext'
import '../../crm/crm.css'
import '../../phase2/phase2.css'
import '../client.css'
import '../client-workspace.css'

function formatMoney(n: number) {
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
}

const QUICK_LINKS = [
  { to: '/app/client/brief', label: 'บรีฟงาน', hint: 'กรอกข้อมูลแบรนด์' },
  { to: '/app/client/reports', label: 'รายงาน', hint: 'ผลโฆษณา' },
  { to: '/app/client/chat', label: 'แชท', hint: 'คุยกับทีม' },
  { to: '/app/client/projects', label: 'โปรเจกต์', hint: 'ความคืบหน้างาน' },
] as const

export function ClientDashboardPage() {
  const ws = useClientWorkspaceContext()

  if (ws.loading) {
    return null
  }

  if (!ws.data) {
    return (
      <div className="page client-page">
        <p className="muted">เลือกลูกค้าหรือผูกบัญชีเพื่อดูภาพรวม</p>
      </div>
    )
  }

  const { brief_progress, brief_submitted, ads_summary, delivered_content } = ws.data
  const briefNeedsAction = !brief_submitted && brief_progress < 100

  return (
    <div className="page client-page">
      <section className="client-quick-links" aria-label="ทางลัด">
        {QUICK_LINKS.map((item) => (
          <Link key={item.to} to={item.to} className="client-quick-link">
            <strong>{item.label}</strong>
            <span className="muted">{item.hint}</span>
          </Link>
        ))}
      </section>

      <section className="card-grid">
        <Link
          to="/app/client/brief"
          className={`card client-metric-card${briefNeedsAction ? ' client-metric-card--warn' : ''}`}
        >
          <h2>ความคืบหน้าบรีฟ</h2>
          <p className="stat">{brief_progress}%</p>
          <div className="phase2-progress" aria-hidden>
            <div
              className="phase2-progress__bar"
              style={{ width: `${Math.min(100, brief_progress)}%` }}
            />
          </div>
          <p className="muted" style={{ marginTop: '0.75rem' }}>
            {brief_submitted
              ? 'ส่งบรีฟแล้ว — รอทีมตรวจ'
              : briefNeedsAction
                ? 'กรอกต่อ →'
                : 'พร้อมส่ง — กดส่งบรีฟในหน้าบรีฟงาน'}
          </p>
        </Link>
        <Link to="/app/client/reports" className="card client-metric-card">
          <h2>ใช้จ่ายแอด 7 วัน</h2>
          <p className="stat">{formatMoney(ads_summary.last_7_days_spend)}</p>
          <span className="muted">บาท</span>
        </Link>
        <Link to="/app/client/reports" className="card client-metric-card">
          <h2>GMV 7 วัน</h2>
          <p className="stat">{formatMoney(ads_summary.last_7_days_gmv)}</p>
          <span className="muted">บาท</span>
        </Link>
        <Link to="/app/client/reports" className="card client-metric-card">
          <h2>ROI 7 วัน</h2>
          <p className="stat">
            {ads_summary.last_7_days_roi != null
              ? ads_summary.last_7_days_roi.toFixed(2)
              : '—'}
          </p>
        </Link>
      </section>

      <section className="card card--wide">
        <h2>สิ่งที่ควรทำ</h2>
        <ul className="client-todo-list">
          {briefNeedsAction && (
            <li>
              <Link to="/app/client/brief">กรอกบรีฟให้ครบ ({brief_progress}%)</Link>
            </li>
          )}
          {brief_submitted && !ws.data.customer.ready_for_ads && (
            <li className="muted">ส่งบรีฟแล้ว — ทีม Account กำลังตรวจความครบ</li>
          )}
          <li>
            <Link to="/app/client/reports">ดูรายงานผลโฆษณา</Link>
          </li>
          <li>
            <Link to="/app/client/chat">แชทกับทีม NP Create</Link>
          </li>
          {ws.projects.length > 0 && (
            <li>
              <Link to="/app/client/projects">
                ติดตาม {ws.projects.length} โปรเจกต์
              </Link>
            </li>
          )}
        </ul>
      </section>

      <section className="card card--wide">
        <h2>คอนเทนต์ที่ส่งมอบแล้ว</h2>
        {delivered_content.length === 0 && (
          <p className="muted">ยังไม่มีไฟล์ส่งมอบ — ทีมจะอัปโหลดเมื่องานเสร็จ</p>
        )}
        <ul className="client-content-list">
          {delivered_content.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong>
              <span className="muted"> · {item.format}</span>
              <br />
              <small className="muted">{formatBangkokDateTime(item.delivered_at)}</small>
              {item.deliverable_url ? (
                <>
                  <br />
                  <a href={item.deliverable_url} target="_blank" rel="noreferrer">
                    เปิดไฟล์
                  </a>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <ClientAiPanel report={ws.data} />
    </div>
  )
}
