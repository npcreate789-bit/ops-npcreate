import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canViewCustomer360 } from '../access'
import { downloadCsv } from '../../../../shared/export/csv'
import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import { listCustomers } from '../api/customers'
import { CUSTOMER_STATUS_OPTIONS, customerStatusLabel } from '../constants'
import type { CustomerListFilters, CustomerListRow } from '../types'
import '../../crm/crm.css'
import '../../phase2/phase2.css'
import '../customers.css'

export function CustomersListPage() {
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const allowed = canViewCustomer360(roles) || !configured
  const navigate = useNavigate()

  const [filters, setFilters] = useState<CustomerListFilters>({ search: '', status: '' })
  const [rows, setRows] = useState<CustomerListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  function exportCsv() {
    downloadCsv(
      'customers',
      ['แบรนด์', 'ผู้ติดต่อ', 'สถานะ', 'แพ็กเกจ', 'สัญญาถึง', 'พร้อมยิงแอด'],
      rows.map((r) => [
        r.brand_name,
        r.contact_name ?? '',
        customerStatusLabel(r.status),
        r.package_name ?? '',
        r.contract_end ? formatBangkokDate(r.contract_end) : '',
        r.ready_for_ads ? 'ใช่' : 'ไม่',
      ]),
    )
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
    <div className="page">
      <header className="page__header crm-page__header phase2-page__header">
        <div>
          <h1>ลูกค้า 360</h1>
          <p className="muted">ศูนย์กลางข้อมูลลูกค้า — เชื่อมทุกโมดูลจากจุดเดียว</p>
        </div>
        <div className="crm-page__actions">
          <button
            type="button"
            className="crm-btn crm-btn--ghost"
            disabled={rows.length === 0}
            onClick={exportCsv}
          >
            ส่งออก CSV
          </button>
          <button type="button" className="crm-btn crm-btn--ghost" onClick={() => void load()}>
            รีเฟรช
          </button>
        </div>
      </header>

      {!configured && (
        <p className="crm-banner crm-banner--warn">โหมดพัฒนา — ข้อมูลตัวอย่าง</p>
      )}

      <section className="card-grid">
        <article className="card card--accent">
          <h2>ลูกค้าที่มองเห็น</h2>
          <p className="stat">{rows.length}</p>
          <span className="muted">ตาม RLS ของบทบาทคุณ</span>
        </article>
        <article className="card">
          <h2>Active</h2>
          <p className="stat">{activeCount}</p>
        </article>
        <article className="card">
          <h2>พร้อมยิงแอด</h2>
          <p className="stat">{rows.filter((r) => r.ready_for_ads).length}</p>
        </article>
      </section>

      <section className="card card--wide">
        <div className="task-filters">
          <label className="task-field task-field--grow">
            <span className="task-field__label">ค้นหา</span>
            <input
              className="crm-input"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="แบรนด์, ผู้ติดต่อ, เบอร์..."
            />
          </label>
          <label className="task-field">
            <span className="task-field__label">สถานะ</span>
            <select
              className="task-select"
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
        {loading && <p className="muted">กำลังโหลด...</p>}

        {!loading && rows.length === 0 && (
          <p className="muted">ไม่พบลูกค้าที่ตรงกับตัวกรอง</p>
        )}

        {!loading && rows.length > 0 && (
          <div className="crm-table-wrap">
            <table className="crm-table crm-table--clickable">
              <thead>
                <tr>
                  <th>แบรนด์</th>
                  <th>สถานะ</th>
                  <th>แพ็กเกจ</th>
                  <th>สัญญา</th>
                  <th>แอด</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/app/customers/${row.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navigate(`/app/customers/${row.id}`)
                    }}
                    tabIndex={0}
                    role="button"
                  >
                    <td>
                      <strong>{row.brand_name}</strong>
                      {row.contact_name && (
                        <span className="activity-meta">
                          <br />
                          {row.contact_name}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`customer-status--${row.status}`}>
                        {customerStatusLabel(row.status)}
                      </span>
                    </td>
                    <td>{row.package_name ?? '—'}</td>
                    <td>
                      {row.contract_end
                        ? formatBangkokDate(row.contract_end)
                        : '—'}
                    </td>
                    <td>{row.ready_for_ads ? 'พร้อม' : 'รอบรีฟ'}</td>
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
