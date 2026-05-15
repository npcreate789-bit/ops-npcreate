import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  canCreateCrmLead,
  hasCrmTeamView,
  isCrmReadOnly,
} from '../../../../shared/auth/access'
import { formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import { fetchSalesSummary, listLeads } from '../api/leads'
import type { Lead, LeadFilters } from '../types'
import { channelLabel } from '../constants'
import { LeadFiltersBar } from '../components/LeadFilters'
import { LeadStatusBadge } from '../components/LeadStatusBadge'
import { SalesSummary } from '../components/SalesSummary'
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

  const roles = profile?.roles ?? []
  const teamView = hasCrmTeamView(roles) || !configured
  const canCreate = canCreateCrmLead(roles) || !configured
  const readOnly = isCrmReadOnly(roles) && configured

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

  return (
    <div className="page crm-page">
      <header className="page__header crm-page__header">
        <div>
          <h1>CRM — ลูกค้าเป้าหมาย</h1>
          <p>จัดการ Lead ใหม่ ติดตามสถานะ และ Reminder</p>
        </div>
        {canCreate && (
          <Link to="/app/crm/new" className="crm-btn crm-btn--primary">
            + เพิ่ม Lead
          </Link>
        )}
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

      {dueReminders > 0 && (
        <p className="crm-banner crm-banner--alert">
          มี {dueReminders} Lead ถึงเวลาติดตามแล้ว
        </p>
      )}

      {teamView && (
        <section className="card card--wide">
          <SalesSummary />
        </section>
      )}

      <section className="card card--wide">
        <LeadFiltersBar
          filters={filters}
          onChange={setFilters}
          showOwnerFilter={teamView}
          owners={owners}
        />

        {error && <p className="crm-error">{error}</p>}
        {loading && <p className="muted">กำลังโหลด...</p>}

        {!loading && !error && leads.length === 0 && (
          <p className="muted">ยังไม่มี Lead — กดเพิ่ม Lead เพื่อเริ่มต้น</p>
        )}

        {!loading && leads.length > 0 && (
          <div className="crm-table-wrap">
            <table className="crm-table crm-table--clickable">
              <thead>
                <tr>
                  <th>แบรนด์</th>
                  <th>ผู้ติดต่อ</th>
                  <th>ช่องทาง</th>
                  <th>สถานะ</th>
                  <th>Reminder</th>
                  <th>อัปเดต</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => navigate(`/app/crm/${lead.id}`)}
                    className={isReminderDue(lead) ? 'crm-row--due' : undefined}
                  >
                    <td>
                      <strong>{lead.brand_name}</strong>
                      {lead.business_type && (
                        <span className="crm-sub">{lead.business_type}</span>
                      )}
                    </td>
                    <td>
                      {lead.contact_name ?? '—'}
                      {lead.phone && <span className="crm-sub">{lead.phone}</span>}
                    </td>
                    <td>{channelLabel(lead.channel)}</td>
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
