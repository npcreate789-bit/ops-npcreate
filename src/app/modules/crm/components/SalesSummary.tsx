import { useEffect, useState } from 'react'
import type { SalesSummaryRow } from '../types'
import { fetchSalesSummary } from '../api/leads'
import '../crm.css'

export function SalesSummary() {
  const [rows, setRows] = useState<SalesSummaryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchSalesSummary()
      .then((data) => {
        if (!cancelled) setRows(data)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'โหลดสรุปไม่สำเร็จ')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <p className="muted">กำลังโหลดสรุปยอดขาย...</p>
  if (error) return <p className="crm-error">{error}</p>
  if (!rows.length) return <p className="muted">ยังไม่มีข้อมูล Lead</p>

  return (
    <div className="crm-summary">
      <h2>สรุปยอดขาย Sales</h2>
      <div className="crm-table-wrap">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Sales</th>
              <th>Lead ทั้งหมด</th>
              <th>กำลังติดตาม</th>
              <th>ปิดการขาย</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.owner_id}>
                <td>{row.owner_name ?? row.owner_id.slice(0, 8)}</td>
                <td>{row.total}</td>
                <td>{row.active}</td>
                <td>{row.won}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
