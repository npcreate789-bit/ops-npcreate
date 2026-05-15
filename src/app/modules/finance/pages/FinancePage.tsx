import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canManageFinance } from '../../../../shared/auth/access'
import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import { getFinanceSummary, listPayments } from '../api/payments'
import type { FinanceSummary, Payment } from '../types'
import { serviceTypeLabel } from '../constants'
import { PaymentStatusBadge } from '../components/PaymentStatusBadge'
import '../../crm/crm.css'
import '../../sales/sales.css'
import '../finance.css'

export function FinancePage() {
  const { configured, profile } = useAuth()
  const canManage = canManageFinance(profile?.roles ?? []) || !configured
  const navigate = useNavigate()
  const [rows, setRows] = useState<Payment[]>([])
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([listPayments(), getFinanceSummary()])
      .then(([payments, sum]) => {
        if (!cancelled) {
          setRows(payments)
          setSummary(sum)
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
  }, [])

  return (
    <div className="page finance-page">
      <header className="page__header finance-page__header">
        <div>
          <h1>การเงิน</h1>
          <p>บันทึกชำระเงิน ใบเสร็จ ใบกำกับภาษี และติดตามลูกหนี้</p>
        </div>
        {canManage && (
          <Link to="/app/finance/payments/new" className="crm-btn crm-btn--primary">
            + บันทึกการชำระ
          </Link>
        )}
      </header>

      {!configured && (
        <p className="crm-banner crm-banner--warn">
          โหมดพัฒนา — ข้อมูลเก็บในเครื่อง (localStorage)
        </p>
      )}

      {summary && (
        <section className="card-grid">
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
          <article className="card">
            <h2>เกินกำหนด</h2>
            <p className="stat">{summary.overdue_count}</p>
            <span className="muted">รายการ</span>
          </article>
        </section>
      )}

      <section className="card card--wide">
        <h2 className="crm-section-title">รายการชำระเงิน</h2>
        {error && <p className="crm-error">{error}</p>}
        {loading && <p className="muted">กำลังโหลด...</p>}

        {!loading && rows.length === 0 && (
          <p className="muted">ยังไม่มีรายการชำระเงิน</p>
        )}

        {!loading && rows.length > 0 && (
          <div className="crm-table-wrap">
            <table className="crm-table crm-table--clickable">
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
                {rows.map((row) => (
                  <tr key={row.id} onClick={() => navigate(`/app/finance/payments/${row.id}`)}>
                    <td>{row.customer_brand_name ?? '—'}</td>
                    <td>{serviceTypeLabel(row.service_type)}</td>
                    <td>{row.total_amount.toLocaleString('th-TH')} บาท</td>
                    <td>
                      <PaymentStatusBadge status={row.status} />
                    </td>
                    <td>{row.receipt_number ?? '—'}</td>
                    <td>{formatBangkokDate(row.due_date)}</td>
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
