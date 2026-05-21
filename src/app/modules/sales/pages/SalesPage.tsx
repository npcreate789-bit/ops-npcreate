import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  canCreateSalesQuotation,
  canViewWorkHub,
  hasCrmTeamView,
} from '../../../../shared/auth/access'
import { formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import { listQuotations } from '../api/quotations'
import type { Quotation, QuotationStatus } from '../types'
import { QuotationStatusBadge } from '../components/QuotationStatusBadge'
import { SalesPipelineBar } from '../components/SalesPipelineBar'
import { SalesRoleGuide } from '../components/SalesRoleGuide'
import { EmptyState } from '../../../components/EmptyState'
import { TableSkeleton } from '../../../components/TableSkeleton'
import '../../crm/crm.css'
import '../sales.css'

export function SalesPage() {
  const { configured, profile } = useAuth()
  const roles = profile?.roles ?? []
  const canCreate = canCreateSalesQuotation(roles) || !configured
  const showCrmLink = hasCrmTeamView(roles) || !configured
  const showWorkLink = canViewWorkHub(roles) || !configured
  const navigate = useNavigate()
  const [rows, setRows] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'all'>('all')

  useEffect(() => {
    let cancelled = false
    listQuotations()
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

  const statusCounts = useMemo(() => {
    const map: Partial<Record<QuotationStatus, number>> = {}
    for (const row of rows) {
      map[row.status] = (map[row.status] ?? 0) + 1
    }
    return map
  }, [rows])

  const displayedRows = useMemo(() => {
    if (statusFilter === 'all') return rows
    return rows.filter((r) => r.status === statusFilter)
  }, [rows, statusFilter])

  const paidTotal = useMemo(
    () => rows.filter((r) => r.status === 'paid').reduce((s, r) => s + r.total, 0),
    [rows],
  )

  const awaitingCount = statusCounts.awaiting_payment ?? 0

  return (
    <div className="page sales-page">
      <header className="page__header sales-page__header">
        <div>
          <h1>ขาย / ใบเสนอราคา</h1>
          <p className="muted">
            CRM Lead → ใบเสนอราคา → Finance ชำระ → Account บรีฟ → ลูกค้า Client Workspace
          </p>
        </div>
        <div className="sales-page__header-actions">
          <Link to="/app/sales/packages" className="crm-btn crm-btn--ghost">
            จัดการแพ็กเกจ
          </Link>
          <Link to="/app/sales/line-snippets" className="crm-btn crm-btn--ghost">
            ชุดข้อความ LINE
          </Link>
          {showWorkLink && (
            <Link to="/app/work" className="crm-btn crm-btn--ghost">
              งานของฉัน
            </Link>
          )}
          {showCrmLink && (
            <Link to="/app/crm" className="crm-btn crm-btn--ghost">
              CRM
            </Link>
          )}
          {canCreate && (
            <Link to="/app/sales/quotations/new" className="crm-btn crm-btn--primary">
              + สร้างใบเสนอราคา
            </Link>
          )}
        </div>
      </header>

      {!configured && (
        <p className="crm-banner crm-banner--warn">
          โหมดพัฒนา — ข้อมูลเก็บในเครื่อง (localStorage)
        </p>
      )}

      {awaitingCount > 0 && (
        <p className="crm-banner crm-banner--alert">
          มี {awaitingCount} ใบเสนอราคารอชำระ —{' '}
          <Link to="/app/finance">ไปการเงิน</Link>
        </p>
      )}

      <section className="card-grid sales-kpi-grid" aria-label="สรุปใบเสนอราคา">
        <article className="card card--accent">
          <h2>ยอดปิดการขาย</h2>
          <p className="stat">{paidTotal.toLocaleString('th-TH')}</p>
          <span className="muted">บาท (ชำระแล้ว)</span>
        </article>
        <article className="card">
          <h2>รอชำระ</h2>
          <p className="stat">{awaitingCount}</p>
        </article>
        <article className="card">
          <h2>แบบร่าง</h2>
          <p className="stat">{statusCounts.draft ?? 0}</p>
        </article>
        <article className="card">
          <h2>ทั้งหมด</h2>
          <p className="stat">{rows.length}</p>
        </article>
      </section>

      <SalesRoleGuide />

      <section className="card card--wide">
        <SalesPipelineBar
          activeStatus={statusFilter}
          onSelectStatus={setStatusFilter}
          counts={statusCounts}
        />

        <h2 className="crm-section-title">รายการใบเสนอราคา</h2>
        {error && <p className="crm-error">{error}</p>}
        {loading && (
          <div className="crm-table-wrap" aria-hidden>
            <TableSkeleton rows={5} columns={5} ariaLabel="กำลังโหลดใบเสนอราคา" />
          </div>
        )}

        {!loading && displayedRows.length === 0 && (
          statusFilter === 'all' ? (
            <EmptyState
              icon="fileText"
              title="ยังไม่มีใบเสนอราคา"
              description="สร้างใบเสนอราคาจาก Lead ใน CRM เพื่อบันทึกข้อมูลและส่งให้ลูกค้าผ่านลิงก์ LINE"
              action={
                canCreate
                  ? { label: '+ สร้างใบเสนอราคา', to: '/app/sales/quotations/new' }
                  : undefined
              }
              secondary={showCrmLink ? { label: 'ไปที่ CRM', to: '/app/crm' } : undefined}
            />
          ) : (
            <EmptyState
              icon="fileText"
              title="ไม่มีรายการในสถานะนี้"
              description="ลองเลือกสถานะอื่น หรือดูใบเสนอราคาทั้งหมด"
              secondary={{ label: 'ดูทั้งหมด', to: '/app/sales' }}
            />
          )
        )}

        {!loading && displayedRows.length > 0 && (
          <div className="crm-table-wrap">
            <table className="crm-table crm-table--clickable">
              <thead>
                <tr>
                  <th>เลขที่</th>
                  <th>แบรนด์ / Lead</th>
                  <th>สถานะ</th>
                  <th>ยอดรวม</th>
                  <th>อัปเดต</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row) => (
                  <tr key={row.id} onClick={() => navigate(`/app/sales/quotations/${row.id}`)}>
                    <td>{row.quotation_number}</td>
                    <td>
                      <strong>{row.lead_brand_name ?? '—'}</strong>
                      {row.lead_id && (
                        <span className="crm-sub">
                          <Link
                            to={`/app/crm/${row.lead_id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            ดู Lead
                          </Link>
                          {row.customer_id ? ' · มี Customer' : ''}
                        </span>
                      )}
                    </td>
                    <td>
                      <QuotationStatusBadge status={row.status} />
                    </td>
                    <td>{row.total.toLocaleString('th-TH')} บาท</td>
                    <td>{formatBangkokDateTime(row.updated_at)}</td>
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
