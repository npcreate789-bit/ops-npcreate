import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  canCreateCrmLead,
  canViewWorkHub,
  hasCrmTeamView,
  isCrmReadOnly,
} from '../../../../shared/auth/access'
import { formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import { fetchSalesSummary, listLeads } from '../api/leads'
import type { Lead, LeadFilters, LeadStatus } from '../types'
import { ACTIVE_STATUSES, channelLabel, preferredChannelLabel } from '../constants'
import { LeadFiltersBar } from '../components/LeadFilters'
import { LeadStatusBadge } from '../components/LeadStatusBadge'
import { SalesSummary } from '../components/SalesSummary'
import { CrmPipelineBar } from '../components/CrmPipelineBar'
import { CrmRoleGuide } from '../components/CrmRoleGuide'
import { leadDisplayName } from '../leadDisplay'
import '../../tasks/tasks.css'
import '../../phase2/phase2.css'
import '../crm.css'

function isReminderDue(lead: Lead) {
  if (!lead.reminder_at) return false
  return new Date(lead.reminder_at) <= new Date()
}

export function CrmLeadsPage() {
  const { profile, configured } = useAuth()
  const navigate = useNavigate()
  const [leads, setLeads] = useState<Lead[]>([])
  const [filters, setFilters] = useState<LeadFilters>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [owners, setOwners] = useState<{ id: string; name: string }[]>([])
  const [dueOnly, setDueOnly] = useState(false)

  const roles = profile?.roles ?? []
  const teamView = hasCrmTeamView(roles) || !configured
  const canCreate = canCreateCrmLead(roles) || !configured
  const readOnly = isCrmReadOnly(roles) && configured
  const showWorkLink = canViewWorkHub(roles) || !configured

  useEffect(() => {
    if (!teamView) return
    let cancelled = false
    fetchSalesSummary()
      .then((rows) => {
        if (!cancelled) {
          setOwners(
            rows.map((r) => ({
              id: r.owner_id,
              name: r.owner_name ?? r.owner_id.slice(0, 8),
            })),
          )
        }
      })
      .catch(() => {
        if (!cancelled) setOwners([])
      })
    return () => {
      cancelled = true
    }
  }, [teamView])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listLeads(filters)
      setLeads(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void load()
  }, [load])

  const dueReminders = useMemo(
    () => leads.filter(isReminderDue).length,
    [leads],
  )

  const statusCounts = useMemo(() => {
    const map: Partial<Record<LeadStatus, number>> = {}
    for (const lead of leads) {
      map[lead.status] = (map[lead.status] ?? 0) + 1
    }
    return map
  }, [leads])

  const activeCount = useMemo(
    () => leads.filter((l) => ACTIVE_STATUSES.includes(l.status)).length,
    [leads],
  )

  const displayedLeads = useMemo(
    () => (dueOnly ? leads.filter(isReminderDue) : leads),
    [dueOnly, leads],
  )

  const pipelineStatus =
    filters.status && filters.status !== 'all' ? filters.status : 'all'

  function handlePipelineSelect(status: LeadStatus | 'all') {
    setDueOnly(false)
    setFilters((f) => ({
      ...f,
      status: status === 'all' ? undefined : status,
    }))
  }

  return (
    <div className="page crm-page">
      <header className="page__header crm-page__header">
        <div>
          <h1>CRM — ลูกค้าเป้าหมาย</h1>
          <p className="muted">
            Sales ดูแล Lead → Finance ชำระ → Account รับบรีฟ → ลูกค้าใช้ Client Workspace
          </p>
        </div>
        <div className="crm-page__header-actions">
          {showWorkLink && (
            <Link to="/app/work" className="crm-btn crm-btn--ghost">
              งานของฉัน
            </Link>
          )}
          {canCreate && (
            <Link to="/app/crm/new" className="crm-btn crm-btn--primary">
              + เพิ่ม Lead
            </Link>
          )}
        </div>
      </header>

      {readOnly && (
        <p className="crm-banner crm-banner--warn phase2-scope-banner">
          โหมดดูอย่างเดียว — บทบาท Admin ดู Lead ทั้งทีมได้แต่ไม่สามารถสร้างหรือแก้ไขได้
        </p>
      )}

      {!configured && (
        <p className="crm-banner crm-banner--warn">
          โหมดพัฒนา — ข้อมูลเก็บในเครื่อง (localStorage)
        </p>
      )}

      <section className="card-grid crm-kpi-grid" aria-label="สรุป Lead">
        <article className="card">
          <h2>กำลังติดตาม</h2>
          <p className="stat">{activeCount}</p>
        </article>
        <article className={`card${dueReminders > 0 ? ' card--warn' : ''}`}>
          <h2>ถึงเวลานัด</h2>
          <p className="stat">{dueReminders}</p>
          {dueReminders > 0 && showWorkLink && (
            <p className="muted" style={{ marginTop: '0.5rem' }}>
              <Link to="/app/work">ดูในงานของฉัน</Link>
            </p>
          )}
        </article>
        <article className="card">
          <h2>รอชำระ</h2>
          <p className="stat">{statusCounts.awaiting_payment ?? 0}</p>
        </article>
        <article className="card card--accent">
          <h2>ปิดการขาย</h2>
          <p className="stat">{statusCounts.won ?? 0}</p>
        </article>
      </section>

      {dueReminders > 0 && (
        <p className="crm-banner crm-banner--alert">
          มี {dueReminders} Lead ถึงเวลาติดตามแล้ว —{' '}
          <button
            type="button"
            className="crm-inline-link"
            onClick={() => setDueOnly((v) => !v)}
          >
            {dueOnly ? 'แสดงทั้งหมด' : 'แสดงเฉพาะที่ถึงเวลา'}
          </button>
        </p>
      )}

      <CrmRoleGuide />

      {teamView && (
        <section className="card card--wide">
          <SalesSummary />
        </section>
      )}

      <section className="card card--wide">
        <CrmPipelineBar
          activeStatus={pipelineStatus}
          onSelectStatus={handlePipelineSelect}
          counts={statusCounts}
        />

        <LeadFiltersBar
          filters={filters}
          onChange={(next) => {
            setDueOnly(false)
            setFilters(next)
          }}
          showOwnerFilter={teamView}
          owners={owners}
        />

        {error && <p className="crm-error">{error}</p>}
        {loading && <p className="muted">กำลังโหลด...</p>}

        {!loading && !error && displayedLeads.length === 0 && (
          <p className="muted">
            {dueOnly
              ? 'ไม่มี Lead ถึงเวลาติดตามในชุดที่กรอง'
              : 'ยังไม่มี Lead — กดเพิ่ม Lead เพื่อเริ่มต้น'}
          </p>
        )}

        {!loading && displayedLeads.length > 0 && (
          <div className="crm-table-wrap">
            <table className="crm-table crm-table--clickable">
              <thead>
                <tr>
                  <th>ชื่อร้าน / ผู้ติดต่อ</th>
                  <th>ผู้ติดต่อ</th>
                  <th>ที่มา</th>
                  <th>ติดต่อกลับ</th>
                  <th>สถานะ</th>
                  <th>Reminder</th>
                  <th>อัปเดต</th>
                </tr>
              </thead>
              <tbody>
                {displayedLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => navigate(`/app/crm/${lead.id}`)}
                    className={isReminderDue(lead) ? 'crm-row--due' : undefined}
                  >
                    <td>
                      <strong>{leadDisplayName(lead)}</strong>
                      {lead.business_type && (
                        <span className="crm-sub">{lead.business_type}</span>
                      )}
                      {lead.customer_id && (
                        <span className="crm-sub crm-sub--ok">มี Customer แล้ว</span>
                      )}
                    </td>
                    <td>
                      {lead.contact_name ?? '—'}
                      {lead.phone && <span className="crm-sub">{lead.phone}</span>}
                    </td>
                    <td>{channelLabel(lead.channel)}</td>
                    <td>
                      {lead.preferred_contact_channel ? (
                        <span
                          className={`crm-preferred-pill crm-preferred-pill--${lead.preferred_contact_channel}`}
                        >
                          {preferredChannelLabel(lead.preferred_contact_channel)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <LeadStatusBadge status={lead.status} />
                    </td>
                    <td>{formatBangkokDateTime(lead.reminder_at)}</td>
                    <td>{formatBangkokDateTime(lead.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
