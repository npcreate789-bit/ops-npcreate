import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canViewWorkHub } from '../../../../shared/auth/access'
import { downloadCsv } from '../../../../shared/export/csv'
import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import {
  canLinkCustomerClient,
  canLinkCustomerFinance,
  canLinkCustomerOnboarding,
  canViewCustomer360,
  isCustomer360Scoped,
} from '../access'
import { listCustomers } from '../api/customers'
import { CustomersBriefFilterBar } from '../components/CustomersBriefFilterBar'
import { CustomersRoleGuide } from '../components/CustomersRoleGuide'
import { EmptyState } from '../../../components/EmptyState'
import { TableSkeleton } from '../../../components/TableSkeleton'
import { CUSTOMER_STATUS_OPTIONS, customerStatusLabel } from '../constants'
import { clientWorkspaceUrl } from '../customerLinks'
import {
  customerBriefStageClass,
  customerBriefStageLabel,
  customerStatusLabelTh,
  matchesBriefFilter,
  type CustomerBriefFilter,
} from '../pipeline'
import type { CustomerListFilters, CustomerListRow } from '../types'
import '../../crm/crm.css'
import '../../sales/sales.css'
import '../../phase2/phase2.css'
import '../customers.css'

const SEARCH_DEBOUNCE_MS = 320

export function CustomersListPage() {
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const allowed = canViewCustomer360(roles) || !configured
  const scoped = isCustomer360Scoped(roles) && configured
  const showWorkLink = canViewWorkHub(roles) || !configured
  const showOnboarding = canLinkCustomerOnboarding(roles) || !configured
  const showFinance = canLinkCustomerFinance(roles) || !configured
  const showClient = canLinkCustomerClient(roles) || !configured
  const navigate = useNavigate()

  const [filters, setFilters] = useState<CustomerListFilters>({ search: '', status: '' })
  const [briefFilter, setBriefFilter] = useState<CustomerBriefFilter>('all')
  const [searchInput, setSearchInput] = useState('')
  const [rows, setRows] = useState<CustomerListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput }))
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const load = useCallback(async () => {
    if (!allowed) return
    setLoading(true)
    setError(null)
    try {
      setRows(await listCustomers(filters))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [allowed, filters])

  useEffect(() => {
    void load()
  }, [load])

  const briefCounts = useMemo(() => {
    const counts: Partial<Record<CustomerBriefFilter, number>> = {
      all: rows.length,
      awaiting_brief: 0,
      ready_for_ads: 0,
    }
    for (const row of rows) {
      if (!row.ready_for_ads) counts.awaiting_brief = (counts.awaiting_brief ?? 0) + 1
      else counts.ready_for_ads = (counts.ready_for_ads ?? 0) + 1
    }
    return counts
  }, [rows])

  const displayedRows = useMemo(
    () => rows.filter((r) => matchesBriefFilter(r, briefFilter)),
    [rows, briefFilter],
  )

  const awaitingBrief = briefCounts.awaiting_brief ?? 0

  function exportCsv() {
    downloadCsv(
      'customers',
      ['แบรนด์', 'ผู้ติดต่อ', 'สถานะ', 'ขั้นตอน', 'แพ็กเกจ', 'สัญญาถึง'],
      displayedRows.map((r) => [
        r.brand_name,
        r.contact_name ?? '',
        customerStatusLabelTh(r.status),
        customerBriefStageLabel(r),
        r.package_name ?? '',
        r.contract_end ? formatBangkokDate(r.contract_end) : '',
      ]),
    )
  }

  function open360(id: string) {
    navigate(`/app/customers/${id}`)
  }

  if (!allowed) {
    return (
      <div className="page">
        <h1>ลูกค้า 360</h1>
        <p className="crm-error">ไม่มีสิทธิ์ดูข้อมูลลูกค้า</p>
      </div>
    )
  }

  const activeCount = rows.filter((r) => r.status === 'active').length

  return (
    <div className="page customers-page">
      <header className="page__header crm-page__header sales-page__header">
        <div>
          <h1>ลูกค้า 360</h1>
          <p className="muted">
            ศูนย์กลางลูกค้า — คลิกแบรนด์เพื่อเปิด 360° แล้วไปรับบรีฟ · โปรเจกต์ · พื้นที่ลูกค้า
          </p>
        </div>
        <div className="customers-page__header-actions">
          {showWorkLink && (
            <Link to="/app/work" className="crm-btn crm-btn--ghost">
              งานของฉัน
            </Link>
          )}
          {showOnboarding && (
            <Link to="/app/onboarding" className="crm-btn crm-btn--ghost">
              รับบรีฟ
            </Link>
          )}
          {showFinance && (
            <Link to="/app/finance" className="crm-btn crm-btn--ghost">
              การเงิน
            </Link>
          )}
          {showClient && (
            <Link to="/app/client" className="crm-btn crm-btn--ghost">
              พื้นที่ลูกค้า
            </Link>
          )}
          <button
            type="button"
            className="crm-btn crm-btn--ghost"
            disabled={displayedRows.length === 0}
            onClick={exportCsv}
          >
            ส่งออก CSV
          </button>
          <button type="button" className="crm-btn crm-btn--ghost" onClick={() => void load()}>
            รีเฟรช
          </button>
        </div>
      </header>

      <CustomersRoleGuide />

      {!configured && (
        <p className="crm-banner crm-banner--warn">โหมดพัฒนา — ข้อมูลตัวอย่าง</p>
      )}

      {scoped && (
        <p className="crm-banner crm-banner--warn phase2-scope-banner">
          รายการถูกกรองตามสิทธิ์ — เห็นเฉพาะลูกค้าที่รับผิดชอบ
        </p>
      )}

      {awaitingBrief > 0 && briefFilter !== 'awaiting_brief' && (
        <div className="customers-hint-banner" role="status">
          <p>
            มี <strong>{awaitingBrief}</strong> รายการที่ยังไม่พร้อมยิงแอด — แจ้งลูกค้ากรอกบรีฟในพื้นที่ลูกค้า
          </p>
          <button
            type="button"
            className="crm-btn crm-btn--ghost crm-btn--sm"
            onClick={() => setBriefFilter('awaiting_brief')}
          >
            ดูรายการรอบรีฟ
          </button>
        </div>
      )}

      <section className="card-grid customers-kpi-grid">
        <article className="card card--accent">
          <h2>ลูกค้าที่มองเห็น</h2>
          <p className="stat">{rows.length}</p>
        </article>
        <article className="card">
          <h2>ใช้งานอยู่</h2>
          <p className="stat">{activeCount}</p>
        </article>
        <article className="card">
          <h2>รอบรีฟ</h2>
          <p className="stat">{awaitingBrief}</p>
          <span className="muted">ยังไม่พร้อมยิงแอด</span>
        </article>
        <article className="card">
          <h2>พร้อมยิงแอด</h2>
          <p className="stat">{briefCounts.ready_for_ads ?? 0}</p>
        </article>
      </section>

      <CustomersBriefFilterBar
        active={briefFilter}
        onSelect={setBriefFilter}
        counts={briefCounts}
      />

      <section className="card card--wide">
        <div className="customers-filters crm-form__grid">
          <label className="crm-form__full">
            ค้นหา
            <input
              className="crm-input crm-input--search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="แบรนด์, ผู้ติดต่อ, เบอร์..."
            />
          </label>
          <label>
            สถานะสัญญา
            <select
              className="crm-select"
              style={{ width: '100%', minWidth: 0 }}
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  status: e.target.value as CustomerListFilters['status'],
                }))
              }
            >
              {CUSTOMER_STATUS_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="crm-error">{error}</p>}
        {loading && (
          <div className="crm-table-wrap" aria-hidden>
            <TableSkeleton rows={5} columns={6} ariaLabel="กำลังโหลดรายการลูกค้า" />
          </div>
        )}

        {!loading && displayedRows.length === 0 && (
          filters.search.trim() || filters.status || briefFilter !== 'all' ? (
            <EmptyState
              icon="users"
              title="ไม่พบลูกค้าที่ตรงกับตัวกรอง"
              description="ลองล้างตัวกรองหรือเปลี่ยนคำค้นหา"
              secondary={{ label: 'ดูทั้งหมด', to: '/app/customers' }}
            />
          ) : (
            <EmptyState
              icon="users"
              title="ยังไม่มีลูกค้าในระบบ"
              description="ลูกค้าใหม่จะปรากฏที่นี่หลัง Finance ยืนยันการชำระ — ติดตามคิวรอชำระได้ที่ Finance"
              secondary={showFinance ? { label: 'ไปที่การเงิน', to: '/app/finance' } : undefined}
            />
          )
        )}

        {!loading && displayedRows.length > 0 && (
          <div className="crm-table-wrap">
            <table className="crm-table crm-table--clickable customers-table">
              <thead>
                <tr>
                  <th>แบรนด์</th>
                  <th>ขั้นตอน</th>
                  <th>สถานะสัญญา</th>
                  <th>สัญญาถึง</th>
                  <th className="customers-table__actions-head">ลิงก์ด่วน</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => open360(row.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') open360(row.id)
                    }}
                    tabIndex={0}
                    role="button"
                  >
                    <td>
                      <strong>{row.brand_name}</strong>
                      {row.contact_name && (
                        <span className="crm-sub">{row.contact_name}</span>
                      )}
                      {row.package_name && (
                        <span className="crm-sub">{row.package_name}</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`customers-stage-badge ${customerBriefStageClass(row)}`}
                      >
                        {customerBriefStageLabel(row)}
                      </span>
                    </td>
                    <td>
                      <span className={`customer-status--${row.status}`}>
                        {customerStatusLabel(row.status)}
                      </span>
                    </td>
                    <td>
                      {row.contract_end ? formatBangkokDate(row.contract_end) : '—'}
                    </td>
                    <td className="customers-table__actions">
                      {showOnboarding && (
                        <Link
                          to={`/app/onboarding/${row.id}`}
                          className="customers-table__link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          บรีฟ
                        </Link>
                      )}
                      {showClient && (
                        <Link
                          to={clientWorkspaceUrl(row.id)}
                          className="customers-table__link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ลูกค้า
                        </Link>
                      )}
                      <Link
                        to={`/app/customers/${row.id}`}
                        className="customers-table__link customers-table__link--primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        360°
                      </Link>
                    </td>
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
