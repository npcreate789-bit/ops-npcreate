import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canManageSalesPackages } from '../../../../shared/auth/access'
import { isSupabaseConfigured } from '../../../../shared/supabase/client'
import { listAllPackages } from '../api/packages'
import type { Package } from '../types'
import '../../crm/crm.css'
import '../sales.css'

type ActiveFilter = 'all' | 'active' | 'inactive'

export function PackagesListPage() {
  const navigate = useNavigate()
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const canManage = canManageSalesPackages(roles) || !configured

  const [filter, setFilter] = useState<ActiveFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [allRows, setAllRows] = useState<Package[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setAllRows(await listAllPackages())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const counts = useMemo(() => {
    const active = allRows.filter((r) => r.is_active).length
    return { all: allRows.length, active, inactive: allRows.length - active }
  }, [allRows])

  const rows = useMemo(() => {
    if (filter === 'active') return allRows.filter((r) => r.is_active)
    if (filter === 'inactive') return allRows.filter((r) => !r.is_active)
    return allRows
  }, [allRows, filter])

  return (
    <div className="page sales-page">
      <header className="page__header sales-page__header">
        <div>
          <Link to="/app/sales" className="crm-back">
            ← กลับขาย / ใบเสนอราคา
          </Link>
          <h1>จัดการแพ็กเกจบริการ</h1>
          <p className="muted">
            แหล่งความจริงเดียวสำหรับฟอร์มติดต่อ (/contact), CRM (บริการที่สนใจ) และใบเสนอราคา —
            รหัส (code) ต้องคงที่ ชื่อ (name) แสดงให้ลูกค้าและทีม
          </p>
        </div>
        <div className="sales-page__header-actions">
          <Link to="/app/sales/line-snippets" className="crm-btn crm-btn--ghost">
            ชุดข้อความ LINE
          </Link>
          {canManage && (
            <Link to="/app/sales/packages/new" className="crm-btn crm-btn--primary">
              + เพิ่มแพ็กเกจ
            </Link>
          )}
        </div>
      </header>

      {!isSupabaseConfigured && (
        <p className="crm-banner crm-banner--warn">โหมดพัฒนา — ข้อมูลเก็บในเครื่อง (localStorage)</p>
      )}

      {!canManage && configured && (
        <p className="crm-banner crm-banner--warn">
          ดูรายการได้อย่างเดียว — แก้ไขได้เฉพาะทีมขาย / Operations / CEO / Dev
        </p>
      )}

      <section className="card card--wide">
        <div className="sales-pipeline-bar" role="tablist" aria-label="กรองสถานะ">
          {(
            [
              ['all', 'ทั้งหมด', counts.all],
              ['active', 'ใช้งาน', counts.active],
              ['inactive', 'ปิดใช้งาน', counts.inactive],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              className={`sales-pipeline-bar__stage${
                filter === key ? ' sales-pipeline-bar__stage--active' : ''
              }`}
              onClick={() => setFilter(key)}
            >
              <span className="sales-pipeline-bar__label">{label}</span>
              <span className="sales-pipeline-bar__meta">{count}</span>
            </button>
          ))}
        </div>

        {error && <p className="crm-error">{error}</p>}
        {loading && <p className="muted">กำลังโหลด...</p>}

        {!loading && rows.length === 0 && (
          <p className="muted">
            {filter === 'all'
              ? 'ยังไม่มีแพ็กเกจ — กดเพิ่มแพ็กเกจหรือรัน migration บน Supabase'
              : 'ไม่มีรายการในตัวกรองนี้'}
          </p>
        )}

        {!loading && rows.length > 0 && (
          <div className="crm-table-wrap">
            <table className="crm-table crm-table--clickable">
              <thead>
                <tr>
                  <th>รหัส</th>
                  <th>ชื่อ</th>
                  <th>ราคาฐาน</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} onClick={() => navigate(`/app/sales/packages/${row.id}`)}>
                    <td>
                      <code>{row.code}</code>
                    </td>
                    <td>
                      <strong>{row.name}</strong>
                      {row.description && <span className="crm-sub">{row.description}</span>}
                    </td>
                    <td>{row.base_price.toLocaleString('th-TH')} บาท</td>
                    <td>{row.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}</td>
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
