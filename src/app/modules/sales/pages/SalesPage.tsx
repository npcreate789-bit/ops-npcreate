import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canCreateSalesQuotation } from '../../../../shared/auth/access'
import { formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import { listQuotations } from '../api/quotations'
import type { Quotation, QuotationStatus } from '../types'
import { PIPELINE_STAGES } from '../constants'
import { QuotationStatusBadge } from '../components/QuotationStatusBadge'
import '../../crm/crm.css'
import '../sales.css'

export function SalesPage() {
  const { configured, profile } = useAuth()
  const canCreate =
    canCreateSalesQuotation(profile?.roles ?? []) || !configured
  const navigate = useNavigate()
  const [rows, setRows] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const pipeline = useMemo(() => {
    const map = new Map<QuotationStatus, number>()
    for (const stage of PIPELINE_STAGES) map.set(stage.status, 0)
    for (const row of rows) {
      map.set(row.status, (map.get(row.status) ?? 0) + 1)
    }
    return PIPELINE_STAGES.map((s) => ({
      ...s,
      count: map.get(s.status) ?? 0,
    }))
  }, [rows])

  const paidTotal = useMemo(
    () => rows.filter((r) => r.status === 'paid').reduce((s, r) => s + r.total, 0),
    [rows],
  )

  return (
    <div className="page sales-page">
      <header className="page__header sales-page__header">
        <div>
          <h1>ขาย / ใบเสนอราคา</h1>
          <p>Pipeline การขาย — สร้างใบเสนอราคาและปิดการขาย</p>
        </div>
        {canCreate && (
          <Link to="/app/sales/quotations/new" className="crm-btn crm-btn--primary">
            + สร้างใบเสนอราคา
          </Link>
        )}
      </header>

      {!configured && (
        <p className="crm-banner crm-banner--warn">
          โหมดพัฒนา — ข้อมูลเก็บในเครื่อง (localStorage)
        </p>
      )}

      <section className="sales-pipeline">
        {pipeline.map((col) => (
          <div key={col.status} className="sales-pipeline__col">
            <h3>{col.label}</h3>
            <p className="sales-pipeline__count">{col.count}</p>
          </div>
        ))}
      </section>

      <section className="card-grid">
        <article className="card card--accent">
          <h2>ยอดปิดการขาย</h2>
          <p className="stat">{paidTotal.toLocaleString('th-TH')}</p>
          <span className="muted">บาท (สถานะชำระแล้ว)</span>
        </article>
        <article className="card">
          <h2>ใบเสนอราคาทั้งหมด</h2>
          <p className="stat">{rows.length}</p>
        </article>
      </section>

      <section className="card card--wide">
        <h2 className="crm-section-title">รายการใบเสนอราคา</h2>
        {error && <p className="crm-error">{error}</p>}
        {loading && <p className="muted">กำลังโหลด...</p>}

        {!loading && rows.length === 0 && (
          <p className="muted">ยังไม่มีใบเสนอราคา</p>
        )}

        {!loading && rows.length > 0 && (
          <div className="crm-table-wrap">
            <table className="crm-table crm-table--clickable">
              <thead>
                <tr>
                  <th>เลขที่</th>
                  <th>แบรนด์</th>
                  <th>สถานะ</th>
                  <th>ยอดรวม</th>
                  <th>อัปเดต</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} onClick={() => navigate(`/app/sales/quotations/${row.id}`)}>
                    <td>{row.quotation_number}</td>
                    <td>{row.lead_brand_name ?? '—'}</td>
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
