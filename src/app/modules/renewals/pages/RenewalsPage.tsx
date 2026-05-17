import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  canManageRenewals,
  canViewRenewals,
  canViewWorkHub,
  isRenewalsReadOnly,
} from '../../../../shared/auth/access'
import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import {
  canLinkCustomerClient,
  canLinkCustomerFinance,
  canLinkCustomerOnboarding,
  canViewCustomer360,
} from '../../customers/access'
import {
  clientWorkspaceUrl,
  financeUrlForCustomer,
} from '../../customers/customerLinks'
import {
  extendCustomerContract,
  listRenewalRows,
  upsertRenewal,
} from '../api/renewals'
import { RenewalStatusBadge } from '../components/RenewalStatusBadge'
import { RenewalsPipelineFilterBar } from '../components/RenewalsPipelineFilterBar'
import { RenewalsRoleGuide } from '../components/RenewalsRoleGuide'
import { WITHIN_DAYS_OPTIONS } from '../constants'
import { matchesRenewalPipeline, type RenewalPipelineFilter } from '../pipeline'
import type { ContractRenewalStatus, RenewalFilters, RenewalRow } from '../types'
import '../../crm/crm.css'
import '../../sales/sales.css'
import '../renewals.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'
const SEARCH_DEBOUNCE_MS = 320

function formatDaysLeft(days: number | null): string {
  if (days == null) return '—'
  if (days < 0) return `หมดแล้ว ${Math.abs(days)} วัน`
  if (days === 0) return 'วันนี้'
  return `${days} วัน`
}

export function RenewalsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const customerFilter =
    searchParams.get('customerId') ?? searchParams.get('customer') ?? undefined
  const { profile, configured } = useAuth()
  const userId = profile?.id ?? DEV_OWNER
  const roles = profile?.roles ?? []
  const canView = canViewRenewals(roles) || !configured
  const canManage = canManageRenewals(roles) || !configured
  const readOnly = isRenewalsReadOnly(roles) && configured
  const showWorkLink = canViewWorkHub(roles) || !configured
  const showOnboarding = canLinkCustomerOnboarding(roles) || !configured
  const showClient = canLinkCustomerClient(roles) || !configured
  const show360 = canViewCustomer360(roles) || !configured
  const showFinance = canLinkCustomerFinance(roles) || !configured

  const [rows, setRows] = useState<RenewalRow[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState<RenewalFilters>({
    within_days: 60,
    customer_id: customerFilter,
  })
  const [pipelineFilter, setPipelineFilter] = useState<RenewalPipelineFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    setFilters((f) => ({ ...f, customer_id: customerFilter }))
  }, [customerFilter])

  useEffect(() => {
    const t = window.setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput || undefined }))
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [searchInput])

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

  const pipelineCounts = useMemo(() => {
    const counts: Partial<Record<RenewalPipelineFilter, number>> = {
      all: rows.length,
      no_case: 0,
      urgent: 0,
      in_progress: 0,
      renewed: 0,
      declined: 0,
      expired: 0,
    }
    for (const row of rows) {
      if (matchesRenewalPipeline(row, 'no_case')) counts.no_case = (counts.no_case ?? 0) + 1
      if (matchesRenewalPipeline(row, 'urgent')) counts.urgent = (counts.urgent ?? 0) + 1
      if (matchesRenewalPipeline(row, 'in_progress')) {
        counts.in_progress = (counts.in_progress ?? 0) + 1
      }
      if (matchesRenewalPipeline(row, 'renewed')) counts.renewed = (counts.renewed ?? 0) + 1
      if (matchesRenewalPipeline(row, 'declined')) counts.declined = (counts.declined ?? 0) + 1
      if (matchesRenewalPipeline(row, 'expired')) counts.expired = (counts.expired ?? 0) + 1
    }
    return counts
  }, [rows])

  const displayedRows = useMemo(
    () => rows.filter((r) => matchesRenewalPipeline(r, pipelineFilter)),
    [rows, pipelineFilter],
  )

  const urgentCount = pipelineCounts.urgent ?? 0
  const noCaseCount = pipelineCounts.no_case ?? 0
  const contextBrand = rows.find((r) => r.customer_id === customerFilter)?.brand_name

  function open360(customerId: string) {
    navigate(`/app/customers/${customerId}`)
  }

  function clearCustomerFilter() {
    setSearchParams({})
  }

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
    <div className="page renewals-page">
      <header className="page__header crm-page__header sales-page__header">
        <div>
          <h1>ต่อสัญญา</h1>
          <p className="muted">
            ติดตามสัญญาใกล้หมด — ลูกค้าดูวันสิ้นสัญญาที่พื้นที่ลูกค้า → การชำระเงิน
            {readOnly ? ' (คุณดูอย่างเดียว)' : ''}
          </p>
        </div>
        <div className="renewals-page__header-actions">
          {showWorkLink && (
            <Link to="/app/work" className="crm-btn crm-btn--ghost">
              งานของฉัน
            </Link>
          )}
          {show360 && (
            <Link to="/app/customers" className="crm-btn crm-btn--ghost">
              ลูกค้า 360°
            </Link>
          )}
          {showFinance && (
            <Link to="/app/finance" className="crm-btn crm-btn--ghost">
              การเงิน
            </Link>
          )}
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

      <RenewalsRoleGuide />

      {!configured && (
        <p className="crm-banner crm-banner--warn">โหมดพัฒนา — ข้อมูลเก็บในเครื่อง</p>
      )}

      {readOnly && (
        <p className="crm-banner crm-banner--warn phase2-scope-banner">
          โหมดดูอย่างเดียว — ไม่สามารถขยายสัญญาหรืออัปเดตสถานะเคสได้ (ติดต่อ Account)
        </p>
      )}

      {customerFilter && (
        <div className="renewals-context-banner" role="status">
          <p>
            กรองตามลูกค้า
            {contextBrand ? (
              <>
                : <strong>{contextBrand}</strong>
              </>
            ) : null}
          </p>
          <div className="renewals-context-banner__actions">
            {show360 && (
              <Link
                to={`/app/customers/${customerFilter}`}
                className="crm-btn crm-btn--ghost crm-btn--sm"
              >
                ลูกค้า 360°
              </Link>
            )}
            {showClient && (
              <Link
                to={clientWorkspaceUrl(customerFilter, 'payment')}
                className="crm-btn crm-btn--ghost crm-btn--sm"
              >
                การชำระ (ลูกค้า)
              </Link>
            )}
            <button
              type="button"
              className="crm-btn crm-btn--ghost crm-btn--sm"
              onClick={clearCustomerFilter}
            >
              ดูทั้งหมด
            </button>
          </div>
        </div>
      )}

      {urgentCount > 0 && pipelineFilter !== 'urgent' && !customerFilter && (
        <div className="renewals-hint-banner" role="status">
          <p>
            มี <strong>{urgentCount}</strong> รายการสัญญาหมดภายใน 14 วัน
          </p>
          <button
            type="button"
            className="crm-btn crm-btn--ghost crm-btn--sm"
            onClick={() => setPipelineFilter('urgent')}
          >
            ดูเร่งด่วน
          </button>
        </div>
      )}

      {noCaseCount > 0 && pipelineFilter !== 'no_case' && !customerFilter && (
        <div className="renewals-hint-banner renewals-hint-banner--muted" role="status">
          <p>
            มี <strong>{noCaseCount}</strong> รายการที่ยังไม่เปิดเคสต่อสัญญา
          </p>
          <button
            type="button"
            className="crm-btn crm-btn--ghost crm-btn--sm"
            onClick={() => setPipelineFilter('no_case')}
          >
            ดูรายการรอเปิดเคส
          </button>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <section className="card-grid renewals-kpi-grid">
          <article className="card card--accent">
            <h2>ในช่วงที่เลือก</h2>
            <p className="stat">{rows.length}</p>
          </article>
          <article className="card">
            <h2>เร่งด่วน ≤14 วัน</h2>
            <p className="stat">{urgentCount}</p>
          </article>
          <article className="card">
            <h2>ยังไม่เปิดเคส</h2>
            <p className="stat">{noCaseCount}</p>
          </article>
          <article className="card">
            <h2>กำลังติดตาม</h2>
            <p className="stat">{pipelineCounts.in_progress ?? 0}</p>
          </article>
        </section>
      )}

      <RenewalsPipelineFilterBar
        active={pipelineFilter}
        onSelect={setPipelineFilter}
        counts={pipelineCounts}
      />

      <section className="card card--wide">
        <div className="renewals-filters crm-form__grid">
          <label className="crm-form__full">
            ค้นหาแบรนด์
            <input
              className="crm-input crm-input--search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </label>
          <label>
            ช่วงหมดอายุ
            <select
              className="crm-select"
              style={{ width: '100%', minWidth: 0 }}
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
          <label className="renewals-filters__check">
            <input
              type="checkbox"
              checked={Boolean(filters.include_expired)}
              onChange={(e) =>
                setFilters((f) => ({ ...f, include_expired: e.target.checked || undefined }))
              }
            />
            รวมหมดอายุแล้ว
          </label>
          <div className="renewals-filters__refresh">
            <button type="button" className="crm-btn crm-btn--ghost" onClick={() => void load()}>
              รีเฟรช
            </button>
          </div>
        </div>

        {error && <p className="crm-error">{error}</p>}
        {loading && <p className="muted">กำลังโหลด...</p>}

        {!loading && rows.length === 0 && (
          <p className="muted">ไม่มีลูกค้าที่สัญญาใกล้หมดอายุในช่วงที่เลือก</p>
        )}

        {!loading && rows.length > 0 && displayedRows.length === 0 && (
          <p className="muted">ไม่พบรายการในตัวกรองนี้</p>
        )}

        {!loading && displayedRows.length > 0 && (
          <div className="crm-table-wrap">
            <table className="crm-table crm-table--clickable renewals-table">
              <thead>
                <tr>
                  <th>แบรนด์</th>
                  <th>สิ้นสัญญา</th>
                  <th>เหลือ</th>
                  <th>สถานะเคส</th>
                  <th className="renewals-table__links-head">ลิงก์ด่วน</th>
                  {canManage && <th>จัดการ</th>}
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row) => {
                  const days = row.days_until_end
                  const expired = days != null && days < 0
                  const urgent = days != null && days >= 0 && days <= 14
                  const soon = days != null && days > 14 && days <= 30
                  return (
                    <tr
                      key={row.customer_id}
                      onClick={() => open360(row.customer_id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') open360(row.customer_id)
                      }}
                      tabIndex={0}
                      role="button"
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
                      <td>
                        <RenewalStatusBadge status={row.renewal_status} />
                      </td>
                      <td className="renewals-table__links" onClick={(e) => e.stopPropagation()}>
                        {show360 && (
                          <Link
                            to={`/app/customers/${row.customer_id}`}
                            className="renewals-table__link renewals-table__link--primary"
                          >
                            360°
                          </Link>
                        )}
                        {showOnboarding && (
                          <Link
                            to={`/app/onboarding/${row.customer_id}`}
                            className="renewals-table__link"
                          >
                            บรีฟ
                          </Link>
                        )}
                        {showFinance && (
                          <Link
                            to={financeUrlForCustomer(row.customer_id)}
                            className="renewals-table__link"
                          >
                            การเงิน
                          </Link>
                        )}
                        {showClient && (
                          <Link
                            to={clientWorkspaceUrl(row.customer_id, 'payment')}
                            className="renewals-table__link"
                          >
                            ลูกค้า
                          </Link>
                        )}
                      </td>
                      {canManage && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="renewal-actions">
                            <button
                              type="button"
                              className="crm-btn crm-btn--ghost crm-btn--sm"
                              disabled={busyId === row.customer_id}
                              onClick={() => void handleStatus(row, 'contacted')}
                            >
                              ติดต่อ
                            </button>
                            <button
                              type="button"
                              className="crm-btn crm-btn--ghost crm-btn--sm"
                              disabled={busyId === row.customer_id}
                              onClick={() => void handleStatus(row, 'quoted')}
                            >
                              ใบเสนอราคา
                            </button>
                            <button
                              type="button"
                              className="crm-btn crm-btn--ghost crm-btn--sm"
                              disabled={busyId === row.customer_id || expired}
                              onClick={() => void handleExtend(row, 3)}
                            >
                              +3 เดือน
                            </button>
                            <button
                              type="button"
                              className="crm-btn crm-btn--ghost crm-btn--sm"
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
