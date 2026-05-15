import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canManageCreators, isCreatorsReadOnly } from '../../../../shared/auth/access'
import { listCreators } from '../api/creators'
import { creatorStatusLabel, CREATOR_STATUS_OPTIONS } from '../constants'
import type { Creator, CreatorFilters } from '../types'
import '../../crm/crm.css'
import '../../tasks/tasks.css'
import '../../phase2/phase2.css'
import '../creators.css'

export function CreatorsListPage() {
  const navigate = useNavigate()
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const canManage = canManageCreators(roles) || !configured
  const readOnly = isCreatorsReadOnly(roles) && configured

  const [rows, setRows] = useState<Creator[]>([])
  const [filters, setFilters] = useState<CreatorFilters>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await listCreators(filters))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="page">
      <header className="page__header crm-page__header">
        <div>
          <h1>ครีเอเตอร์</h1>
          <p className="muted">ฐานข้อมูล Creator / UGC สำหรับ TikTok One และงานคอนเทนต์</p>
        </div>
        {canManage && (
          <Link to="/app/creators/new" className="crm-btn crm-btn--primary">
            + เพิ่มครีเอเตอร์
          </Link>
        )}
      </header>

      {!configured && (
        <p className="crm-banner crm-banner--warn">
          โหมดพัฒนา — ข้อมูลครีเอเตอร์เก็บในเครื่อง
        </p>
      )}

      {readOnly && (
        <p className="crm-banner crm-banner--warn phase2-scope-banner">
          โหมดดูอย่างเดียว — ไม่สามารถแก้ไขข้อมูลครีเอเตอร์ได้
        </p>
      )}

      <section className="card card--wide">
        <div className="task-filters">
          <label className="task-field task-field--grow">
            <span className="task-field__label">ค้นหา</span>
            <input
              className="crm-input"
              placeholder="ชื่อ, TikTok, niche..."
              value={filters.search ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
            />
          </label>
          <label className="task-field">
            <span className="task-field__label">สถานะ</span>
            <select
              className="task-select"
              value={filters.status ?? ''}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  status: e.target.value as CreatorFilters['status'],
                }))
              }
            >
              <option value="">ทั้งหมด</option>
              {CREATOR_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="crm-error">{error}</p>}
        {loading && <p className="muted">กำลังโหลด...</p>}

        {!loading && rows.length === 0 && <p className="muted">ยังไม่มีครีเอเตอร์ในระบบ</p>}

        {!loading && rows.length > 0 && (
          <div className="crm-table-wrap">
            <table className="crm-table crm-table--clickable">
              <thead>
                <tr>
                  <th>ชื่อ</th>
                  <th>TikTok</th>
                  <th>Niche</th>
                  <th>เรท/คลิป</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} onClick={() => navigate(`/app/creators/${row.id}`)}>
                    <td>
                      <strong>{row.display_name}</strong>
                    </td>
                    <td>{row.tiktok_handle ?? '—'}</td>
                    <td>{row.niche ?? '—'}</td>
                    <td>
                      {row.rate_per_clip != null
                        ? row.rate_per_clip.toLocaleString('th-TH')
                        : '—'}
                    </td>
                    <td>{creatorStatusLabel(row.status)}</td>
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
