import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  canCreateSalesQuotation,
  canConfirmFinancePayment,
  canManageFinance,
  canViewFinance,
  canViewFinanceDocuments,
  canViewWorkHub,
  FINANCE_CONFIRM_ROLES,
  FINANCE_MANAGE_ROLES,
  formatRoleList,
  hasCrmTeamView,
  isFinanceReadOnly,
} from '../../../../shared/auth/access'
import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import { getFinanceSummary, listFinanceDocuments, listPayments } from '../api/payments'
import { FinancePipelineBar } from '../components/FinancePipelineBar'
import { FinanceRoleGuide } from '../components/FinanceRoleGuide'
import { BankStatementMatchSection } from '../components/BankStatementMatchSection'
import { PaymentStatusBadge } from '../components/PaymentStatusBadge'
import { serviceTypeLabel } from '../constants'
import { EmptyState } from '../../../components/EmptyState'
import { TableSkeleton } from '../../../components/TableSkeleton'
import { isPaymentOverdue } from '../pipeline'
import type { FinanceSummary, Payment, PaymentStatus } from '../types'
import '../../crm/crm.css'
import '../../sales/sales.css'
import '../finance.css'

type FinanceFilter = PaymentStatus | 'all' | 'overdue'

export function FinancePage() {
  const { configured, profile } = useAuth()
  const roles = profile?.roles ?? []
  const canView = canViewFinance(roles) || !configured
  const canManage = canManageFinance(roles) || !configured
  const canConfirm = canConfirmFinancePayment(roles) || !configured
  const readOnly = isFinanceReadOnly(roles) && configured
  const canViewDocs = canViewFinanceDocuments(roles) || !configured
  const showCrmLink = hasCrmTeamView(roles) || !configured
  const showSalesLink = canCreateSalesQuotation(roles) || !configured
  const showWorkLink = canViewWorkHub(roles) || !configured
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const customerFilter = searchParams.get('customerId') ?? undefined
  const [rows, setRows] = useState<Payment[]>([])
  const [documents, setDocuments] = useState<Payment[]>([])
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<FinanceFilter>('all')

  useEffect(() => {
    if (!canView) {
      setLoading(false)
      return
    }
    let cancelled = false
    Promise.all([
      listPayments(),
      getFinanceSummary(),
      canViewDocs ? listFinanceDocuments() : Promise.resolve([]),
    ])
      .then(([payments, sum, docs]) => {
        if (!cancelled) {
          setRows(payments)
          setSummary(sum)
          setDocuments(docs)
        }
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
  }, [canView, canViewDocs])

  const pipelineCounts = useMemo(() => {
    const counts: Partial<Record<PaymentStatus | 'overdue', number>> = {}
    for (const row of rows) {
      counts[row.status] = (counts[row.status] ?? 0) + 1
      if (isPaymentOverdue(row)) counts.overdue = (counts.overdue ?? 0) + 1
    }
    return counts
  }, [rows])

  const displayedRows = useMemo(() => {
    let list = rows
    if (customerFilter) {
      list = list.filter((r) => r.customer_id === customerFilter)
    }
    if (statusFilter === 'all') return list
    if (statusFilter === 'overdue') return list.filter((r) => isPaymentOverdue(r))
    return list.filter((r) => r.status === statusFilter)
  }, [rows, statusFilter, customerFilter])

  const overdueCount = pipelineCounts.overdue ?? 0

  if (!canView) {
    return (
      <div className="page">
        <h1>การเงิน</h1>
        <p className="crm-error">ไม่มีสิทธิ์ดูข้อมูลการเงิน</p>
      </div>
    )
  }

  return (
    <div className="page finance-page">
      <header className="page__header finance-page__header">
        <div>
          <h1>การเงิน</h1>
          <p className="muted">
            Sales ใบเสนอราคารอชำระ → ลูกค้าแจ้งสลิปใน Client Workspace → ยืนยันที่นี่ →
            Account รับบรีฟ
          </p>
        </div>
        <div className="finance-page__header-actions">
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
          {showSalesLink && (
            <Link to="/app/sales" className="crm-btn crm-btn--ghost">
              Sales
            </Link>
          )}
          <Link to="/app/client/payment" className="crm-btn crm-btn--ghost">
            มุมลูกค้า
          </Link>
          {canManage && (
            <Link to="/app/finance/payments/new" className="crm-btn crm-btn--primary">
              + บันทึกการชำระ
            </Link>
          )}
        </div>
      </header>

      <FinanceRoleGuide />

      <BankStatementMatchSection canManage={canConfirm} />

      {!configured && (
        <p className="crm-banner crm-banner--warn">
          โหมดพัฒนา — ข้อมูลเก็บในเครื่อง (localStorage)
        </p>
      )}

      {readOnly && (
        <p className="crm-banner crm-banner--warn phase2-scope-banner">
          โหมดดูอย่างเดียว — บันทึกฟอร์มเฉพาะ {formatRoleList(FINANCE_MANAGE_ROLES)}
          {' '}· ยืนยันชำระ {formatRoleList(FINANCE_CONFIRM_ROLES)}
        </p>
      )}

      {customerFilter && (
        <p className="crm-banner">
          แสดงเฉพาะรายการของลูกค้านี้ —{' '}
          <Link to="/app/finance">ดูการเงินทั้งหมด</Link>
          {customerFilter && (
            <>
              {' '}
              ·{' '}
              <Link to={`/app/customers/${customerFilter}`}>ลูกค้า 360°</Link>
            </>
          )}
        </p>
      )}

      {overdueCount > 0 && statusFilter !== 'overdue' && (
        <div className="finance-overdue-banner" role="status">
          <p>
            มีรายการเกินกำหนดชำระ <strong>{overdueCount}</strong> รายการ — ติดตามลูกค้าหรือยืนยันหลังได้รับสลิป
          </p>
          <button
            type="button"
            className="crm-btn crm-btn--ghost crm-btn--sm"
            onClick={() => setStatusFilter('overdue')}
          >
            ดูรายการเกินกำหนด
          </button>
        </div>
      )}

      {summary && (
        <section className="card-grid finance-kpi-grid">
          <article className="card card--accent">
            <h2>รายรับเดือนนี้</h2>
            <p className="stat">{summary.revenue_this_month.toLocaleString('th-TH')}</p>
            <span className="muted">บาท · {summary.paid_count_this_month} รายการ</span>
          </article>
          <article className="card">
            <h2>รอชำระ</h2>
            <p className="stat">{summary.pending_total.toLocaleString('th-TH')}</p>
            <span className="muted">บาท</span>
          </article>
          <article className="card finance-kpi--warn">
            <h2>เกินกำหนด</h2>
            <p className="stat">{summary.overdue_count}</p>
            <span className="muted">รายการ</span>
          </article>
        </section>
      )}

      <FinancePipelineBar
        activeStatus={statusFilter}
        onSelectStatus={setStatusFilter}
        counts={pipelineCounts}
      />

      <section className="card card--wide">
        <h2 className="crm-section-title">รายการชำระเงิน</h2>
        {error && <p className="crm-error">{error}</p>}
        {loading && (
          <div className="crm-table-wrap" aria-hidden>
            <TableSkeleton rows={5} columns={6} ariaLabel="กำลังโหลดรายการชำระเงิน" />
          </div>
        )}

        {!loading && displayedRows.length === 0 && (
          statusFilter === 'all' ? (
            <EmptyState
              icon="wallet"
              title="ยังไม่มีรายการชำระเงิน"
              description="บันทึกการชำระจะเกิดขึ้นเมื่อลูกค้ายืนยันใบเสนอราคาแล้ว — เริ่มจาก Sales หรือบันทึกชำระใหม่"
              action={
                canManage
                  ? { label: '+ บันทึกชำระใหม่', to: '/app/finance/payments/new' }
                  : undefined
              }
              secondary={showSalesLink ? { label: 'ไปที่ Sales', to: '/app/sales' } : undefined}
            />
          ) : (
            <EmptyState
              icon="wallet"
              title="ไม่มีรายการในสถานะนี้"
              description="ลองเลือกสถานะอื่นเพื่อดูรายการที่เหลือ"
              secondary={{ label: 'ดูทั้งหมด', to: '/app/finance' }}
            />
          )
        )}

        {!loading && displayedRows.length > 0 && (
          <div className="crm-table-wrap">
            <table className="crm-table crm-table--clickable finance-table">
              <thead>
                <tr>
                  <th>ลูกค้า</th>
                  <th>บริการ</th>
                  <th>ยอดรวม</th>
                  <th>สถานะ</th>
                  <th>ใบเสร็จ</th>
                  <th>ครบกำหนด</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row) => {
                  const overdue = isPaymentOverdue(row)
                  return (
                    <tr
                      key={row.id}
                      className={overdue ? 'finance-table__row--overdue' : undefined}
                      onClick={() => navigate(`/app/finance/payments/${row.id}`)}
                    >
                      <td>
                        <Link
                          to={`/app/customers/${row.customer_id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {row.customer_brand_name ?? '—'}
                        </Link>
                        {row.quotation_id && (
                          <div className="finance-table__sub">
                            <Link
                              to={`/app/sales/quotations/${row.quotation_id}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              ใบเสนอราคา
                            </Link>
                          </div>
                        )}
                      </td>
                      <td>{serviceTypeLabel(row.service_type)}</td>
                      <td>{row.total_amount.toLocaleString('th-TH')} บาท</td>
                      <td>
                        {overdue && row.status === 'pending' ? (
                          <span className="pay-badge pay-badge--red">เกินกำหนด</span>
                        ) : (
                          <PaymentStatusBadge status={row.status} />
                        )}
                      </td>
                      <td>{row.receipt_number ?? '—'}</td>
                      <td>{formatBangkokDate(row.due_date)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {canViewDocs && (
        <section className="card card--wide">
          <h2 className="crm-section-title">ใบเสร็จ / ใบกำกับที่ออกแล้ว</h2>
          {documents.length === 0 && <p className="muted">ยังไม่มีเอกสารที่ออกเลขแล้ว</p>}
          {documents.length > 0 && (
            <div className="crm-table-wrap">
              <table className="crm-table crm-table--clickable">
                <thead>
                  <tr>
                    <th>ลูกค้า</th>
                    <th>ใบเสร็จ</th>
                    <th>ใบกำกับ</th>
                    <th>ยอดรวม</th>
                    <th>ชำระเมื่อ</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((row) => (
                    <tr key={row.id} onClick={() => navigate(`/app/finance/payments/${row.id}`)}>
                      <td>{row.customer_brand_name ?? '—'}</td>
                      <td>{row.receipt_number ?? '—'}</td>
                      <td>{row.tax_invoice_number ?? '—'}</td>
                      <td>{row.total_amount.toLocaleString('th-TH')} บาท</td>
                      <td>{formatBangkokDate(row.payment_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
