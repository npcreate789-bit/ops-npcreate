import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { canAccessNavPath } from '../../../config/navigation'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  canUseGlobalSearch,
  canViewActivityLog,
  canViewCustomer360,
  canViewRenewals,
  canViewReportFinanceMetrics,
  canViewReports,
  canViewWeeklyReport,
  canViewWorkHub,
  hasClientPortalStaffPreview,
} from '../../../../shared/auth/access'
import { bangkokTodayIsoDate } from '../../../../shared/dates/bangkok'
import { DashboardRoleGuide } from '../components/DashboardRoleGuide'
import { fetchExecutiveDashboard } from '../api/dashboard'
import type { ExecutiveDashboard } from '../types'
import '../../crm/crm.css'
import '../../sales/sales.css'
import '../dashboard.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

function formatMoney(n: number) {
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
}

function DashStat({
  to,
  title,
  stat,
  meta,
  accent,
}: {
  to: string
  title: string
  stat: string
  meta: string
  accent?: boolean
}) {
  return (
    <Link
      to={to}
      className={`card dashboard-stat${accent ? ' card--accent' : ''}`}
    >
      <h2>{title}</h2>
      <p className="stat">{stat}</p>
      <span className="muted">{meta}</span>
    </Link>
  )
}

export function DashboardPage() {
  const { profile, configured } = useAuth()
  const userId = profile?.id ?? DEV_OWNER
  const roles = profile?.roles ?? []
  const showFinance = canViewReportFinanceMetrics(roles) || !configured
  const showWeekly = canViewWeeklyReport(roles) || !configured
  const showReports = canViewReports(roles) || !configured
  const showActivity = canViewActivityLog(roles) || !configured
  const showCustomers = canViewCustomer360(roles) || !configured
  const showRenewals = canViewRenewals(roles) || !configured
  const showSearch = canUseGlobalSearch(roles) || !configured
  const showWork = canViewWorkHub(roles) || !configured
  const showClient = hasClientPortalStaffPreview(roles) || !configured
  const today = bangkokTodayIsoDate()

  const [data, setData] = useState<ExecutiveDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchExecutiveDashboard(userId, roles)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, roles])

  const alerts = useMemo(() => {
    if (!data) return []
    return data.alerts.filter(
      (a) => !configured || canAccessNavPath(roles, a.link),
    )
  }, [data, roles, configured])

  const shortcutGroups = useMemo(() => {
    const can = (path: string) => !configured || canAccessNavPath(roles, path)
    return [
      {
        title: 'การเงินและลูกค้า',
        links: [
          { to: '/app/finance', label: 'การเงิน', show: can('/app/finance') },
          { to: '/app/customers', label: 'ลูกค้า 360°', show: showCustomers && can('/app/customers') },
          { to: '/app/renewals', label: 'ต่อสัญญา', show: showRenewals && can('/app/renewals') },
          { to: '/app/client', label: 'พื้นที่ลูกค้า', show: showClient && can('/app/client') },
        ],
      },
      {
        title: 'ขาย · แอด · คอนเทนต์',
        links: [
          { to: '/app/crm', label: 'CRM', show: can('/app/crm') },
          { to: '/app/sales', label: 'ขาย', show: can('/app/sales') },
          { to: '/app/onboarding', label: 'รับบรีฟ', show: can('/app/onboarding') },
          { to: '/app/ads', label: 'งานยิงแอด', show: can('/app/ads') },
          { to: '/app/content', label: 'งานคอนเทนต์', show: can('/app/content') },
          { to: '/app/creators', label: 'ครีเอเตอร์', show: can('/app/creators') },
        ],
      },
      {
        title: 'งานและรายงาน',
        links: [
          { to: '/app/tasks', label: 'งานภายใน', show: can('/app/tasks') },
          { to: '/app/work', label: 'งานของฉัน', show: showWork && can('/app/work') },
          { to: '/app/weekly', label: 'สรุปรายสัปดาห์', show: showWeekly && can('/app/weekly') },
          { to: '/app/reports', label: 'รายงานขั้นสูง', show: showReports && can('/app/reports') },
          { to: '/app/activity', label: 'บันทึกกิจกรรม', show: showActivity && can('/app/activity') },
          { to: '/app/search', label: 'ค้นหารวม', show: showSearch && can('/app/search') },
        ],
      },
      {
        title: 'ระบบ',
        links: [
          { to: '/app/admin', label: 'จัดการผู้ใช้', show: can('/app/admin') },
          { to: '/app/settings', label: 'ตั้งค่า', show: can('/app/settings') },
        ],
      },
    ]
  }, [
    roles,
    configured,
    showCustomers,
    showRenewals,
    showClient,
    showWork,
    showWeekly,
    showReports,
    showActivity,
    showSearch,
  ])

  if (loading) {
    return (
      <div className="page">
        <p className="muted">กำลังโหลดภาพรวม...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="page">
        <p className="crm-error">{error ?? 'ไม่สามารถโหลดข้อมูลได้'}</p>
      </div>
    )
  }

  const { finance, leads, customers, contracts_expiring_30d, ads, tasks, content } = data
  const adsReportPct =
    ads.reports_expected > 0
      ? Math.round((ads.reports_submitted / ads.reports_expected) * 100)
      : 0

  return (
    <div className="page dashboard-page">
      <header className="page__header crm-page__header sales-page__header">
        <div>
          <h1>ภาพรวมผู้บริหาร</h1>
          <p className="muted">
            ตัวเลขจากระบบจริง ณ วันที่ {today} — คลิกการ์ดเพื่อเปิดโมดูลที่เกี่ยวข้อง
          </p>
        </div>
        <div className="dashboard-page__header-actions">
          {showWork && (
            <Link to="/app/work" className="crm-btn crm-btn--ghost">
              งานของฉัน
            </Link>
          )}
          {showWeekly && (
            <Link to="/app/weekly" className="crm-btn crm-btn--ghost">
              สรุปรายสัปดาห์
            </Link>
          )}
          {showReports && (
            <Link to="/app/reports" className="crm-btn crm-btn--ghost">
              รายงานรายเดือน
            </Link>
          )}
          {showCustomers && (
            <Link to="/app/customers" className="crm-btn crm-btn--ghost">
              ลูกค้า 360°
            </Link>
          )}
        </div>
      </header>

      <DashboardRoleGuide />

      {(showWeekly || showReports) && (
        <div className="dashboard-hint-banner">
          <p>
            แดชบอร์ด = ภาพรวมวันนี้
            {showReports ? ' · รายเดือนลึก → รายงานขั้นสูง' : ''}
            {showWeekly ? ' · ช่วง 7 วัน → สรุปรายสัปดาห์' : ''}
          </p>
        </div>
      )}

      {!configured && (
        <p className="crm-banner crm-banner--warn">
          โหมดพัฒนา — ข้อมูลจาก localStorage
        </p>
      )}

      {error && <p className="crm-error">{error}</p>}

      {alerts.length > 0 && (
        <section className="card card--wide">
          <div className="dashboard-section-head">
            <h2 className="dashboard-section-title">ต้องดำเนินการ</h2>
            <span className="muted">{alerts.length} รายการ</span>
          </div>
          <ul className="dashboard-alerts">
            {alerts.map((a) => (
              <li key={a.id} className={`dashboard-alert dashboard-alert--${a.severity}`}>
                <span>{a.message}</span>
                <Link to={a.link}>ดู →</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showFinance && (
        <section className="dashboard-block">
          <div className="dashboard-section-head">
            <h2 className="dashboard-section-title">การเงิน · เดือนนี้</h2>
            <Link to="/app/finance" className="crm-btn crm-btn--ghost">
              เปิดการเงิน
            </Link>
          </div>
          <div className="card-grid">
            <DashStat
              to="/app/finance"
              title="รายรับเดือนนี้"
              stat={formatMoney(finance.revenue_this_month)}
              meta={`บาท · ${finance.paid_count_this_month} รายการ`}
              accent
            />
            <DashStat
              to="/app/finance"
              title="ลูกหนี้ค้าง"
              stat={formatMoney(finance.pending_total)}
              meta={
                finance.overdue_count > 0
                  ? `เกินกำหนด ${finance.overdue_count} รายการ`
                  : 'รอชำระ + เกินกำหนด'
              }
            />
          </div>
        </section>
      )}

      <section className="dashboard-block">
        <div className="dashboard-section-head">
          <h2 className="dashboard-section-title">ลูกค้าและขาย</h2>
          <div className="dashboard-section-head__links">
            {showCustomers && (
              <Link to="/app/customers" className="crm-btn crm-btn--ghost">
                ลูกค้า 360°
              </Link>
            )}
            <Link to="/app/crm" className="crm-btn crm-btn--ghost">
              CRM
            </Link>
            <Link to="/app/onboarding" className="crm-btn crm-btn--ghost">
              รับบรีฟ
            </Link>
          </div>
        </div>
        <div className="card-grid">
          <DashStat
            to="/app/customers"
            title="ลูกค้า Active"
            stat={String(customers.active)}
            meta={`พร้อมยิงแอด ${customers.ready_for_ads} · รอรับบรีฟ ${customers.pending_onboarding}`}
          />
          {showRenewals && (
            <DashStat
              to="/app/renewals"
              title="สัญญาหมดใน 30 วัน"
              stat={String(contracts_expiring_30d)}
              meta="ควรเปิดเคสต่อสัญญา"
            />
          )}
          <DashStat
            to="/app/crm"
            title="Lead Pipeline"
            stat={String(leads.pipeline)}
            meta={`จากทั้งหมด ${leads.total} · ปิดแล้ว ${leads.won}`}
          />
        </div>
      </section>

      <section className="dashboard-block">
        <div className="dashboard-section-head">
          <h2 className="dashboard-section-title">แอดวันนี้</h2>
          <Link to="/app/ads" className="crm-btn crm-btn--ghost">
            งานยิงแอด
          </Link>
        </div>
        <div className="card-grid">
          <DashStat
            to="/app/ads"
            title="Spend วันนี้"
            stat={formatMoney(ads.spend_today)}
            meta="จากรายงานรายวัน"
          />
          <DashStat
            to="/app/ads"
            title="GMV วันนี้"
            stat={formatMoney(ads.gmv_today)}
            meta={`ROI เฉลี่ย ${ads.avg_roi != null ? ads.avg_roi.toFixed(2) : '—'}`}
          />
          <DashStat
            to="/app/ads"
            title="ส่งรายงานแอดวันนี้"
            stat={`${adsReportPct}%`}
            meta={`${ads.reports_submitted}/${ads.reports_expected} แบรนด์`}
          />
        </div>
      </section>

      <section className="dashboard-block">
        <div className="dashboard-section-head">
          <h2 className="dashboard-section-title">งานภายในและคอนเทนต์</h2>
          <div className="dashboard-section-head__links">
            <Link to="/app/tasks" className="crm-btn crm-btn--ghost">
              งานภายใน
            </Link>
            <Link to="/app/content" className="crm-btn crm-btn--ghost">
              คอนเทนต์
            </Link>
          </div>
        </div>
        <div className="card-grid">
          <DashStat
            to="/app/tasks"
            title="งานภายใน"
            stat={String(tasks.open_count)}
            meta={`ติดขัด ${tasks.blocked_count} · เกินกำหนด ${tasks.overdue_count}`}
          />
          <DashStat
            to="/app/content"
            title="งานคอนเทนต์"
            stat={String(content.in_production_count)}
            meta={`รอตรวจ ${content.review_count} · เกินกำหนด ${content.overdue_count}`}
          />
        </div>
      </section>

      <section className="card card--wide">
        <h2 className="dashboard-section-title">ทางลัดตามหมวด</h2>
        <div className="dashboard-shortcut-groups">
          {shortcutGroups.map((group) => {
            const links = group.links.filter((l) => l.show)
            if (links.length === 0) return null
            return (
              <div key={group.title} className="dashboard-shortcut-group">
                <h3>{group.title}</h3>
                <div className="dashboard-links">
                  {links.map((l) => (
                    <Link key={l.to} to={l.to}>
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
