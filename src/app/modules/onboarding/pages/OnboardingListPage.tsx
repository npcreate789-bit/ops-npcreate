import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { listOnboardingCustomers } from '../api/onboarding'
import type { OnboardingCustomer } from '../types'
import '../../crm/crm.css'
import '../../sales/sales.css'
import '../onboarding.css'

export function OnboardingListPage() {
  const { configured } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState<OnboardingCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listOnboardingCustomers()
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

  const incomplete = rows.filter((r) => !r.ready_for_ads).length

  return (
    <div className="page">
      <header className="page__header sales-page__header">
        <div>
          <h1>รับบรีฟลูกค้า</h1>
          <p>Brand Onboarding — ข้อมูลแบรนด์และ checklist ก่อนเริ่มยิงแอด</p>
        </div>
      </header>

      {!configured && (
        <p className="crm-banner crm-banner--warn">
          โหมดพัฒนา — ข้อมูลเก็บในเครื่อง (localStorage)
        </p>
      )}

      <section className="card-grid">
        <article className="card card--accent">
          <h2>ลูกค้าที่ดูแล</h2>
          <p className="stat">{rows.length}</p>
        </article>
        <article className="card">
          <h2>ยังไม่พร้อมยิงแอด</h2>
          <p className="stat">{incomplete}</p>
        </article>
        <article className="card">
          <h2>พร้อมยิงแอดแล้ว</h2>
          <p className="stat">{rows.length - incomplete}</p>
        </article>
      </section>

      <section className="card card--wide">
        {error && <p className="crm-error">{error}</p>}
        {loading && <p className="muted">กำลังโหลด...</p>}

        {!loading && rows.length === 0 && (
          <p className="muted">ยังไม่มีลูกค้าที่ชำระเงินแล้ว — รอ Finance ยืนยันก่อน</p>
        )}

        {!loading && rows.length > 0 && (
          <div className="crm-table-wrap">
            <table className="crm-table crm-table--clickable">
              <thead>
                <tr>
                  <th>แบรนด์</th>
                  <th>ความครบ</th>
                  <th>พร้อมยิงแอด</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} onClick={() => navigate(`/app/onboarding/${row.id}`)}>
                    <td>
                      <strong>{row.brand_name}</strong>
                      {!row.has_form && <span className="crm-sub">ยังไม่กรอกบรีฟ</span>}
                    </td>
                    <td>
                      <div className="onboarding-progress">
                        <div
                          className="onboarding-progress__bar"
                          style={{ width: `${row.progress}%` }}
                        />
                      </div>
                      {row.progress}%
                    </td>
                    <td>
                      <span
                        className={
                          row.ready_for_ads
                            ? 'onboarding-ready onboarding-ready--yes'
                            : 'onboarding-ready onboarding-ready--no'
                        }
                      >
                        {row.ready_for_ads ? 'พร้อม' : 'ยังไม่พร้อม'}
                      </span>
                    </td>
                    <td>{row.status}</td>
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
