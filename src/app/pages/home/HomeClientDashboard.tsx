import { Link } from 'react-router-dom'
import { formatBangkokDate } from '../../../shared/dates/bangkok'
import { ClientPreviewBar } from '../../modules/client/components/ClientPreviewBar'
import { useClientWorkspace } from '../../modules/client/hooks/useClientWorkspace'
import { bangkokGreeting } from './access'
import { HOME_CLIENT_ACTIONS } from './constants'

function formatMoney(n: number) {
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
}

interface HomeClientDashboardProps {
  displayName: string
  profileLoadError: string | null
}

export function HomeClientDashboard({ displayName, profileLoadError }: HomeClientDashboardProps) {
  const ws = useClientWorkspace()

  if (ws.loading) {
    return (
      <div className="page home-dashboard home-dashboard--client">
        <p className="muted">กำลังโหลดข้อมูลของคุณ…</p>
      </div>
    )
  }

  if (!ws.data) {
    return (
      <div className="page home-dashboard home-dashboard--client">
        <header className="home-hero home-hero--client">
          <div>
            <p className="home-hero__eyebrow">{bangkokGreeting()}</p>
            <h1>{displayName}</h1>
            <p className="home-hero__sub">ยังไม่พบข้อมูลแบรนด์ที่ผูกกับบัญชีนี้</p>
          </div>
        </header>
        {profileLoadError ? (
          <section className="card card--wide card--warn" role="alert">
            <p className="muted">{profileLoadError}</p>
          </section>
        ) : null}
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

  const { customer, brief_progress, brief_submitted, ads_summary } = ws.data
  const briefNeedsAction = !brief_submitted && brief_progress < 100

  const todos: { label: string; path: string; urgent?: boolean }[] = []
  if (briefNeedsAction) {
    todos.push({
      label: `กรอกบรีฟให้ครบ (ตอนนี้ ${brief_progress}%)`,
      path: '/app/client/brief',
      urgent: brief_progress < 50,
    })
  } else if (brief_submitted && !customer.ready_for_ads) {
    todos.push({
      label: 'ส่งบรีฟแล้ว — รอทีม Account ตรวจ',
      path: '/app/client',
    })
  }
  todos.push({ label: 'แชทกับทีม — สอบถามหรือส่งไฟล์', path: '/app/client/chat' })
  todos.push({ label: 'ดูรายงานผลโฆษณา', path: '/app/client/reports' })

  return (
    <div className="page home-dashboard home-dashboard--client">
      <header className="home-hero home-hero--client">
        <div>
          <p className="home-hero__eyebrow">{bangkokGreeting()}</p>
          <h1>{customer.brand_name}</h1>
          <p className="home-hero__sub">
            สวัสดี {displayName} · สัญญาถึง {formatBangkokDate(customer.contract_end)}
            {customer.ready_for_ads ? ' · พร้อมยิงแอด' : ''}
          </p>
        </div>
        <div className="home-hero__actions">
          <Link
            to={briefNeedsAction ? '/app/client/brief' : '/app/client'}
            className="crm-btn crm-btn--primary"
          >
            {briefNeedsAction ? 'กรอกบรีฟต่อ' : brief_submitted ? 'เปิดภาพรวม' : 'ส่งบรีฟ'}
          </Link>
          <Link to="/app/client/chat" className="crm-btn crm-btn--ghost">
            เปิดแชท
          </Link>
        </div>
      </header>

      {ws.canPreview && !ws.isClientOnly && (
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
      )}

      <section className="home-kpi-grid" aria-label="ภาพรวมสั้น">
        <Link
          to="/app/client/brief"
          className={`home-kpi${briefNeedsAction ? ' home-kpi--warn' : ' home-kpi--accent'}`}
        >
          <span className="home-kpi__label">บรีฟ</span>
          <span className="home-kpi__value">{brief_progress}%</span>
          <span className="home-kpi__hint">
            {brief_submitted
              ? 'ส่งแล้ว — รอทีมตรวจ'
              : briefNeedsAction
                ? 'ยังไม่ครบ — กรอกต่อ'
                : 'พร้อมส่ง'}
          </span>
        </Link>
        <Link to="/app/client/reports" className="home-kpi">
          <span className="home-kpi__label">Spend 7 วัน</span>
          <span className="home-kpi__value">{formatMoney(ads_summary.last_7_days_spend)}</span>
          <span className="home-kpi__hint">ดูรายงานเต็ม →</span>
        </Link>
        <Link to="/app/client/reports" className="home-kpi">
          <span className="home-kpi__label">ROI 7 วัน</span>
          <span className="home-kpi__value">
            {ads_summary.last_7_days_roi != null
              ? ads_summary.last_7_days_roi.toFixed(2)
              : '—'}
          </span>
          <span className="home-kpi__hint">จากรายงานล่าสุด</span>
        </Link>
        <Link to="/app/client/chat" className="home-kpi">
          <span className="home-kpi__label">แชททีม</span>
          <span className="home-kpi__value">→</span>
          <span className="home-kpi__hint">ตอบเร็วในเวลาทำการ</span>
        </Link>
      </section>

      <section className="home-panel" aria-labelledby="home-client-menu">
        <header className="home-panel__head">
          <h2 id="home-client-menu">เมนูหลัก</h2>
          <span className="muted">เหมือนแท็บใน Client Workspace</span>
        </header>
        <div className="home-client-actions">
          {HOME_CLIENT_ACTIONS.map((item) => (
            <Link key={item.path} to={item.path} className="home-client-action">
              <span className="home-client-action__icon" aria-hidden>
                {item.icon}
              </span>
              <strong>{item.label}</strong>
              <span className="muted">{item.hint}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-panel" aria-labelledby="home-client-todos">
        <h2 id="home-client-todos">แนะนำวันนี้</h2>
        <ul className="home-client-todos">
          {todos.map((item) => (
            <li key={item.path + item.label}>
              <Link
                to={item.path}
                className={`home-client-todos__link${item.urgent ? ' home-client-todos__link--urgent' : ''}`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="home-footer-links">
        <Link to="/app/help">ช่วยเหลือ</Link>
        <Link to="/app/help#start">เริ่มใช้งาน</Link>
        <Link to="/app/settings">ตั้งค่าบัญชี</Link>
      </footer>
    </div>
  )
}
