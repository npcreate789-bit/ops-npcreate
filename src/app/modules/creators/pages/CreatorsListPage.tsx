import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  canManageCreators,
  canViewCreators,
  canViewWorkHub,
  isCreatorsReadOnly,
} from '../../../../shared/auth/access'
import { listCreators } from '../api/creators'
import { CreatorsPipelineFilterBar } from '../components/CreatorsPipelineFilterBar'
import { CreatorsRoleGuide } from '../components/CreatorsRoleGuide'
import { CreatorStatusBadge } from '../components/CreatorStatusBadge'
import { matchesCreatorPipeline, type CreatorPipelineFilter } from '../pipeline'
import type { Creator, CreatorFilters } from '../types'
import '../../crm/crm.css'
import '../../sales/sales.css'
import '../creators.css'

const SEARCH_DEBOUNCE_MS = 320

export function CreatorsListPage() {
  const navigate = useNavigate()
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const allowed = canViewCreators(roles) || !configured
  const canManage = canManageCreators(roles) || !configured
  const readOnly = isCreatorsReadOnly(roles) && configured
  const showWorkLink = canViewWorkHub(roles) || !configured

  const [rows, setRows] = useState<Creator[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState<CreatorFilters>({})
  const [pipelineFilter, setPipelineFilter] = useState<CreatorPipelineFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput || undefined }))
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const load = useCallback(async () => {
    if (!allowed) return
    setLoading(true)
    setError(null)
    try {
      setRows(await listCreators(filters))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [allowed, filters])

  useEffect(() => {
    void load()
  }, [load])

  const pipelineCounts = useMemo(() => {
    const counts: Partial<Record<CreatorPipelineFilter, number>> = {
      all: rows.length,
      active: 0,
      inactive: 0,
      blacklist: 0,
    }
    for (const row of rows) {
      if (row.status === 'active') counts.active = (counts.active ?? 0) + 1
      if (row.status === 'inactive') counts.inactive = (counts.inactive ?? 0) + 1
      if (row.status === 'blacklist') counts.blacklist = (counts.blacklist ?? 0) + 1
    }
    return counts
  }, [rows])

  const displayedRows = useMemo(
    () => rows.filter((r) => matchesCreatorPipeline(r, pipelineFilter)),
    [rows, pipelineFilter],
  )

  const blacklistCount = pipelineCounts.blacklist ?? 0

  function openCreator(id: string) {
    navigate(`/app/creators/${id}`)
  }

  if (!allowed) {
    return (
      <div className="page">
        <h1>ครีเอเตอร์</h1>
        <p className="crm-error">ไม่มีสิทธิ์ดูฐานข้อมูลครีเอเตอร์</p>
      </div>
    )
  }

  return (
    <div className="page creators-page">
      <header className="page__header crm-page__header sales-page__header">
        <div>
          <h1>ครีเอเตอร์</h1>
          <p className="muted">
            ฐานข้อมูล Creator / UGC — ใช้คู่กับงานคอนเทนต์ · ลูกค้าไม่เข้าหน้านี้
          </p>
        </div>
        <div className="creators-page__header-actions">
          {showWorkLink && (
            <Link to="/app/work" className="crm-btn crm-btn--ghost">
              งานของฉัน
            </Link>
          )}
          <Link to="/app/content" className="crm-btn crm-btn--ghost">
            งานคอนเทนต์
          </Link>
          <Link to="/app/client" className="crm-btn crm-btn--ghost">
            พื้นที่ลูกค้า
          </Link>
          {canManage && (
            <Link to="/app/creators/new" className="crm-btn crm-btn--primary">
              + เพิ่มครีเอเตอร์
            </Link>
          )}
        </div>
      </header>

      <CreatorsRoleGuide />

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

      {blacklistCount > 0 && pipelineFilter !== 'blacklist' && (
        <div className="creators-hint-banner creators-hint-banner--warn" role="status">
          <p>
            มี <strong>{blacklistCount}</strong> รายการในแบล็กลิสต์
          </p>
          <button
            type="button"
            className="crm-btn crm-btn--ghost crm-btn--sm"
            onClick={() => setPipelineFilter('blacklist')}
          >
            ดูแบล็กลิสต์
          </button>
        </div>
      )}

      <section className="card-grid creators-kpi-grid">
        <article className="card card--accent">
          <h2>ทั้งหมด</h2>
          <p className="stat">{rows.length}</p>
        </article>
        <article className="card">
          <h2>ใช้งาน</h2>
          <p className="stat">{pipelineCounts.active ?? 0}</p>
        </article>
        <article className="card">
          <h2>พัก</h2>
          <p className="stat">{pipelineCounts.inactive ?? 0}</p>
        </article>
        <article className="card">
          <h2>แบล็กลิสต์</h2>
          <p className="stat">{blacklistCount}</p>
        </article>
      </section>

      <CreatorsPipelineFilterBar
        active={pipelineFilter}
        onSelect={setPipelineFilter}
        counts={pipelineCounts}
      />

      <section className="card card--wide">
        <div className="creators-filters crm-form__grid">
          <label className="crm-form__full">
            ค้นหา
            <input
              className="crm-input crm-input--search"
              placeholder="ชื่อ, TikTok, niche..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </label>
          <div className="creators-filters__refresh">
            <button type="button" className="crm-btn crm-btn--ghost" onClick={() => void load()}>
              รีเฟรช
            </button>
          </div>
        </div>

        {error && <p className="crm-error">{error}</p>}
        {loading && <p className="muted">กำลังโหลด...</p>}

        {!loading && rows.length === 0 && (
          <p className="muted">
            {canManage
              ? 'ยังไม่มีครีเอเตอร์ — กด「เพิ่มครีเอเตอร์」เพื่อเริ่ม'
              : 'ยังไม่มีครีเอเตอร์ในระบบ'}
          </p>
        )}

        {!loading && rows.length > 0 && displayedRows.length === 0 && (
          <p className="muted">ไม่พบรายการในตัวกรองนี้</p>
        )}

        {!loading && displayedRows.length > 0 && (
          <div className="crm-table-wrap">
            <table className="crm-table crm-table--clickable creators-table">
              <thead>
                <tr>
                  <th>ชื่อ</th>
                  <th>TikTok</th>
                  <th>Niche</th>
                  <th>เรท/คลิป (บาท)</th>
                  <th>สถานะ</th>
                  <th className="creators-table__actions-head">ลิงก์ด่วน</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => openCreator(row.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') openCreator(row.id)
                    }}
                    tabIndex={0}
                    role="button"
                  >
                    <td>
                      <strong>{row.display_name}</strong>
                    </td>
                    <td>{row.tiktok_handle ? `@${row.tiktok_handle.replace(/^@/, '')}` : '—'}</td>
                    <td>{row.niche ?? '—'}</td>
                    <td>
                      {row.rate_per_clip != null
                        ? row.rate_per_clip.toLocaleString('th-TH')
                        : '—'}
                    </td>
                    <td>
                      <CreatorStatusBadge status={row.status} />
                    </td>
                    <td className="creators-table__actions">
                      <Link
                        to={`/app/creators/${row.id}`}
                        className="creators-table__link creators-table__link--primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        เปิด
                      </Link>
                      <Link
                        to="/app/content/new"
                        className="creators-table__link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        งาน UGC
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
