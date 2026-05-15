import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  canManageRenewals,
  canViewRenewals,
  isRenewalsReadOnly,
} from '../../../../shared/auth/access'
import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import {
  extendCustomerContract,
  listRenewalRows,
  upsertRenewal,
} from '../api/renewals'
import {
  RENEWAL_STATUS_OPTIONS,
  WITHIN_DAYS_OPTIONS,
  renewalStatusLabel,
} from '../constants'
import type { ContractRenewalStatus, RenewalFilters, RenewalRow } from '../types'
import '../../crm/crm.css'
import '../../tasks/tasks.css'
import '../../phase2/phase2.css'
import '../renewals.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

function formatDaysLeft(days: number | null): string {
  if (days == null) return '—'
  if (days < 0) return `หมดแล้ว ${Math.abs(days)} วัน`
  if (days === 0) return 'วันนี้'
  return String(days)
}

export function RenewalsPage() {
  const navigate = useNavigate()
  const { profile, configured } = useAuth()
  const userId = profile?.id ?? DEV_OWNER
  const roles = profile?.roles ?? []
  const canView = canViewRenewals(roles) || !configured
  const canManage = canManageRenewals(roles) || !configured
  const readOnly = isRenewalsReadOnly(roles) && configured

  const [rows, setRows] = useState<RenewalRow[]>([])
  const [filters, setFilters] = useState<RenewalFilters>({ within_days: 60 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!canView) return
    setLoading(true)
    setError(null)
    try {
      setRows(await listRenewalRows(filters))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [filters, canView])

  useEffect(() => {
    void load()
  }, [load])

  const summary = useMemo(() => {
    const active = rows.filter((r) => (r.days_until_end ?? -1) >= 0)
    return {
      total: rows.length,
      urgent: active.filter((r) => (r.days_until_end ?? 99) <= 14).length,
      noCase: rows.filter((r) => !r.renewal_status).length,
    }
  }, [rows])

  async function handleStatus(row: RenewalRow, status: ContractRenewalStatus) {
    if (!canManage || !row.contract_end) return
    setBusyId(row.customer_id)
    setError(null)
    try {
      await upsertRenewal({
        customer_id: row.customer_id,
        contract_end: row.contract_end,
        status,
        owner_id: row.owner_id ?? userId,
        notes: row.notes,
        created_by: userId,
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setBusyId(null)
    }
  }

  async function handleExtend(row: RenewalRow, months: number) {
    if (!canManage) return
    if (!window.confirm(`ขยายสัญญา ${row.brand_name} อีก ${months} เดือน?`)) return
    setBusyId(row.customer_id)
    setError(null)
    try {
      await extendCustomerContract(row.customer_id, months)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ขยายสัญญาไม่สำเร็จ')
    } finally {
      setBusyId(null)
    }
  }

  if (!canView) {
    return (
      <div className="page">
        <h1>ต่อสัญญา</h1>
        <p className="crm-error">ไม่มีสิทธิ์เข้าถึงโมดูลนี้</p>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__header crm-page__header phase2-page__header">
        <div>
          <h1>ต่อสัญญา</h1>
          <p className="muted">
            ติดตามลูกค้าที่สัญญาใกล้หมดอายุ — Account / Operations จัดการได้
            {readOnly ? ' (คุณดูอย่างเดียว)' : ''}
          </p>
        </div>
        <div className="notif-header-actions">
          {canManage && (
            <Link to="/app/sales" className="crm-btn crm-btn--primary">
              ใบเสนอราคา
            </Link>
          )}
          {readOnly && roles.includes('sales') && (
            <Link to="/app/sales" className="crm-btn crm-btn--ghost">
              Sales
            </Link>
          )}
        </div>
      </header>

      {!configured && (
        <p className="crm-banner crm-banner--warn">โหมดพัฒนา — ข้อมูลเก็บในเครื่อง</p>
      )}

      {readOnly && (
        <p className="crm-banner crm-banner--warn phase2-scope-banner">
          โหมดดูอย่างเดียว — ไม่สามารถขยายสัญญาหรืออัปเดตสถานะเคสได้ (ติดต่อ Account)
        </p>
      )}

      {!loading && rows.length > 0 && (
        <p className="crm-banner crm-banner--warn phase2-scope-banner">
          {summary.total} รายการ · เร่งด่วน ≤14 วัน: {summary.urgent} · ยังไม่เปิดเคส:{' '}
          {summary.noCase}
        </p>
      )}

      <section className="card card--wide">
        <div className="task-filters">
          <label className="task-field task-field--grow">
            <span className="task-field__label">ค้นหาแบรนด์</span>
            <input
              className="crm-input"
              value={filters.search ?? ''}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value || undefined }))
              }
            />
          </label>
          <label className="task-field">
            <span className="task-field__label">ช่วงหมดอายุ</span>
            <select
              className="task-select"
              value={filters.within_days ?? 60}
              onChange={(e) =>
                setFilters((f) => ({ ...f, within_days: Number(e.target.value) }))
              }
            >
              {WITHIN_DAYS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="task-field">
            <span className="task-field__label">สถานะเคส</span>
            <select
              className="task-select"
              value={filters.renewal_status ?? ''}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  renewal_status: (e.target.value || undefined) as RenewalFilters['renewal_status'],
                }))
              }
            >
              <option value="">ทั้งหมด</option>
              <option value="no_case">ยังไม่เปิดเคส</option>
              {RENEWAL_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="task-field task-field--check">
            <input
              type="checkbox"
              checked={Boolean(filters.include_expired)}
              onChange={(e) =>
                setFilters((f) => ({ ...f, include_expired: e.target.checked || undefined }))
              }
            />
            <span>รวมหมดอายุแล้ว</span>
          </label>
        </div>

        {error && <p className="crm-error">{error}</p>}
        {loading && <p className="muted">กำลังโหลด...</p>}

        {!loading && rows.length === 0 && (
          <p className="muted">ไม่มีลูกค้าที่สัญญาใกล้หมดอายุในช่วงที่เลือก</p>
        )}

        {!loading && rows.length > 0 && (
          <div className="crm-table-wrap">
            <table className="crm-table crm-table--clickable">
              <thead>
                <tr>
                  <th>แบรนด์</th>
                  <th>สิ้นสัญญา</th>
                  <th>เหลือ</th>
                  <th>สถานะเคส</th>
                  {canManage && <th>จัดการ</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const days = row.days_until_end
                  const expired = days != null && days < 0
                  const urgent = days != null && days >= 0 && days <= 14
                  const soon = days != null && days > 14 && days <= 30
                  return (
                    <tr
                      key={row.customer_id}
                      onClick={() => navigate(`/app/onboarding/${row.customer_id}`)}
                    >
                      <td>
                        <strong>{row.brand_name}</strong>
                      </td>
                      <td>{formatBangkokDate(row.contract_end)}</td>
                      <td
                        className={
                          expired
                            ? 'renewal-days--expired'
                            : urgent
                              ? 'renewal-days--urgent'
                              : soon
                                ? 'renewal-days--soon'
                                : undefined
                        }
                      >
                        {formatDaysLeft(days)}
                      </td>
                      <td>{renewalStatusLabel(row.renewal_status)}</td>
                      {canManage && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="renewal-actions">
                            <button
                              type="button"
                              className="crm-btn crm-btn--ghost"
                              disabled={busyId === row.customer_id}
                              onClick={() => void handleStatus(row, 'contacted')}
                            >
                              ติดต่อ
                            </button>
                            <button
                              type="button"
                              className="crm-btn crm-btn--ghost"
                              disabled={busyId === row.customer_id}
                              onClick={() => void handleStatus(row, 'quoted')}
                            >
                              ใบเสนอราคา
                            </button>
                            <button
                              type="button"
                              className="crm-btn crm-btn--ghost"
                              disabled={busyId === row.customer_id || expired}
                              onClick={() => void handleExtend(row, 3)}
                            >
                              +3 เดือน
                            </button>
                            <button
                              type="button"
                              className="crm-btn crm-btn--ghost"
                              disabled={busyId === row.customer_id}
                              onClick={() => void handleStatus(row, 'declined')}
                            >
                              ไม่ต่อ
                            </button>
                          </div>
                        </td>
                      )}
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
