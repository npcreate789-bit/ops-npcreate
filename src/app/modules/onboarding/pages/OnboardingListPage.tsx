import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canViewWorkHub } from '../../../../shared/auth/access'
import { listOnboardingCustomers } from '../api/onboarding'
import { OnboardingPipelineBar } from '../components/OnboardingPipelineBar'
import { OnboardingRoleGuide } from '../components/OnboardingRoleGuide'
import { customerStatusLabelTh, getOnboardingStage, type OnboardingFilter } from '../pipeline'
import type { OnboardingCustomer } from '../types'
import '../../crm/crm.css'
import '../../sales/sales.css'
import '../onboarding.css'

export function OnboardingListPage() {
  const { configured, profile } = useAuth()
  const roles = profile?.roles ?? []
  const showWorkLink = canViewWorkHub(roles) || !configured
  const navigate = useNavigate()
  const [rows, setRows] = useState<OnboardingCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stageFilter, setStageFilter] = useState<OnboardingFilter>('all')

  useEffect(() => {
    let cancelled = false
    listOnboardingCustomers()
      .then((data) => {
        if (!cancelled) setRows(data)
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
  }, [])

  const stageCounts = useMemo(() => {
    const counts: Partial<Record<OnboardingFilter, number>> = { all: rows.length }
    for (const row of rows) {
      const stage = getOnboardingStage(row)
      counts[stage] = (counts[stage] ?? 0) + 1
    }
    return counts
  }, [rows])

  const displayedRows = useMemo(() => {
    if (stageFilter === 'all') return rows
    return rows.filter((r) => getOnboardingStage(r) === stageFilter)
  }, [rows, stageFilter])

  const awaitingBrief = stageCounts.awaiting_brief ?? 0

  return (
    <div className="page onboarding-page">
      <header className="page__header sales-page__header">
        <div>
          <h1>รับบรีฟลูกค้า</h1>
          <p className="muted">
            หลัง Finance ยืนยันชำระ → ลูกค้ากรอกบรีฟ → Account ตรวจ checklist → ยิงแอด
          </p>
        </div>
        <div className="onboarding-page__header-actions">
          {showWorkLink && (
            <Link to="/app/work" className="crm-btn crm-btn--ghost">
              งานของฉัน
            </Link>
          )}
          <Link to="/app/finance" className="crm-btn crm-btn--ghost">
            การเงิน
          </Link>
          <Link to="/app/client/brief" className="crm-btn crm-btn--ghost">
            มุมลูกค้า (บรีฟ)
          </Link>
        </div>
      </header>

      <OnboardingRoleGuide />

      {!configured && (
        <p className="crm-banner crm-banner--warn">
          โหมดพัฒนา — ข้อมูลเก็บในเครื่อง (localStorage)
        </p>
      )}

      {awaitingBrief > 0 && stageFilter !== 'awaiting_brief' && (
        <div className="onboarding-hint-banner" role="status">
          <p>
            มี <strong>{awaitingBrief}</strong> รายการที่ลูกค้ายังไม่ส่งบรีฟ — แจ้งให้กรอกใน Client
            Workspace
          </p>
          <button
            type="button"
            className="crm-btn crm-btn--ghost crm-btn--sm"
            onClick={() => setStageFilter('awaiting_brief')}
          >
            ดูรายการรอบรีฟ
          </button>
        </div>
      )}

      <section className="card-grid">
        <article className="card card--accent">
          <h2>ลูกค้าที่ดูแล</h2>
          <p className="stat">{rows.length}</p>
        </article>
        <article className="card">
          <h2>รอลูกค้าส่งบรีฟ</h2>
          <p className="stat">{awaitingBrief}</p>
        </article>
        <article className="card">
          <h2>พร้อมยิงแอด</h2>
          <p className="stat">{stageCounts.ready ?? 0}</p>
        </article>
      </section>

      <OnboardingPipelineBar active={stageFilter} onSelect={setStageFilter} counts={stageCounts} />

      <section className="card card--wide">
        {error && <p className="crm-error">{error}</p>}
        {loading && <p className="muted">กำลังโหลด...</p>}

        {!loading && displayedRows.length === 0 && (
          <p className="muted">
            {stageFilter === 'all'
              ? 'ยังไม่มีลูกค้าหลังชำระเงิน — รอ Finance ยืนยันชำระก่อน'
              : 'ไม่มีรายการในขั้นตอนนี้'}
          </p>
        )}

        {!loading && displayedRows.length > 0 && (
          <div className="crm-table-wrap">
            <table className="crm-table crm-table--clickable">
              <thead>
                <tr>
                  <th>แบรนด์</th>
                  <th>ขั้นตอน</th>
                  <th>ความครบ</th>
                  <th>พร้อมยิงแอด</th>
                  <th>สถานะลูกค้า</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row) => {
                  const stage = getOnboardingStage(row)
                  const stageLabel =
                    stage === 'awaiting_brief'
                      ? 'รอบรีฟ'
                      : stage === 'in_review'
                        ? 'ตรวจ checklist'
                        : 'พร้อมยิงแอด'
                  return (
                    <tr key={row.id} onClick={() => navigate(`/app/onboarding/${row.id}`)}>
                      <td>
                        <strong>{row.brand_name}</strong>
                        {row.client_submitted && (
                          <span className="crm-sub onboarding-sub--ok">ลูกค้าส่งแล้ว</span>
                        )}
                        {!row.has_form && (
                          <span className="crm-sub">ยังไม่มีข้อมูลบรีฟ</span>
                        )}
                      </td>
                      <td>
                        <span className={`onboarding-stage-badge onboarding-stage-badge--${stage}`}>
                          {stageLabel}
                        </span>
                      </td>
                      <td>
                        <div className="onboarding-progress">
                          <div
                            className="onboarding-progress__bar"
                            style={{ width: `${row.progress}%` }}
                          />
                        </div>
                        {row.progress}%
                      </td>
                      <td>
                        <span
                          className={
                            row.ready_for_ads
                              ? 'onboarding-ready onboarding-ready--yes'
                              : 'onboarding-ready onboarding-ready--no'
                          }
                        >
                          {row.ready_for_ads ? 'พร้อม' : 'ยังไม่พร้อม'}
                        </span>
                      </td>
                      <td>{customerStatusLabelTh(row.status)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
